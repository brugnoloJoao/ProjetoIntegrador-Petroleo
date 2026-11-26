
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using ProjetoIntegrador_Petroleo.Hubs;
using ProjetoIntegrador_Petroleo.Data;
using ProjetoIntegrador_Petroleo.Models;

namespace ProjetoIntegrador_Petroleo.Services;

public class SimuladorLeituras : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<SimuladorLeituras> _logger;
    private readonly IHubContext<DashboardHub> _hub;
    private readonly IConfiguration _config;
    private readonly SimuladorEstado _estado;
    private readonly Maquina3DControleEstado _controles;

    // Guarda os picos em andamento:
    // parametroId -> (ciclos restantes, valor do pico)
    private readonly Dictionary<int, (int Restantes, double Nivel)> _picos = new();
    private readonly HashSet<int> _ativosEmFalha = new();

    public SimuladorLeituras(
        IServiceScopeFactory scopeFactory,
        ILogger<SimuladorLeituras> logger,
        IHubContext<DashboardHub> hub,
        IConfiguration config,
        SimuladorEstado estado,
        Maquina3DControleEstado controles)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
        _hub = hub;
        _config = config;
        _estado = estado;
        _controles = controles;
    }

    protected override async Task ExecuteAsync(CancellationToken ct)
    {
        _estado.Ativo = _config.GetValue<bool>("Simulador:Ativo", true);

        var segundos = _config.GetValue<int>(
            "Simulador:IntervaloSegundos", 5);

        var intervalo = TimeSpan.FromSeconds(Math.Max(1, segundos));

        _logger.LogInformation(
            "Simulador iniciado. Intervalo: {Intervalo} segundos.",
            intervalo.TotalSeconds);

        // Aguarda a aplicação terminar de inicializar.
        await Task.Delay(TimeSpan.FromSeconds(5), ct);

        using var timer = new PeriodicTimer(intervalo);

        do
        {
            try
            {
                if (_estado.Ativo)
                    await GerarCicloAsync(ct);
            }
            catch (OperationCanceledException) when (ct.IsCancellationRequested)
            {
                break;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Erro no simulador de leituras");
            }
        }
        while (await timer.WaitForNextTickAsync(ct));
    }

    // ---------- Ciclo de geração ----------
    private async Task GerarCicloAsync(CancellationToken ct)
    {
        using var scope = _scopeFactory.CreateScope();

        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var agora = DateTime.UtcNow;

        var parametros = await db.Parametros
            .Include(p => p.Ativo)
            .Where(p => p.Ativo!.Status == StatusAtivo.Operando)
            .ToListAsync(ct);

        // Cada máquina tem sua própria velocidade e falha simulada.
        var controlesPorAtivo = parametros
            .Select(p => p.AtivoId)
            .Distinct()
            .ToDictionary(id => id, _controles.Ler);

        // Ao encerrar a falha de uma máquina, descarta os picos pendentes dela.
        foreach (var (ativoId, controle) in controlesPorAtivo)
        {
            if (controle.FalhaSimulada)
            {
                _ativosEmFalha.Add(ativoId);
            }
            else if (_ativosEmFalha.Remove(ativoId))
            {
                foreach (var parametroId in parametros.Where(p => p.AtivoId == ativoId).Select(p => p.Id))
                    _picos.Remove(parametroId);
            }
        }

        var novas = new List<object>();

        foreach (var p in parametros)
        {
            var valor = GerarValor(p, controlesPorAtivo[p.AtivoId]);

            await VerificarAnomaliaAsync(db, p, valor, agora, ct);

            db.Leituras.Add(new Leitura
            {
                ParametroId = p.Id,
                Valor = valor,
                DataHora = agora,
                Simulada = true
            });

            await AvaliarAlertaAsync(db, p, valor, agora, ct);

            novas.Add(new
            {
                parametroId = p.Id,
                valor,
                dataHora = agora,
                simulada = true,
                nome = p.Nome,
                unidade = p.Unidade,
                limiteAtencao = p.LimiteAtencao,
                limiteCritico = p.LimiteCritico,
                ativo = p.Ativo!.Nome,
                tagAtivo = p.Ativo.Tag
            });
        }

        await db.SaveChangesAsync(ct);

        await _hub.Clients.All.SendAsync(
            "NovasLeituras", novas, ct);
    }

    // ---------- Geração do valor ----------
    private double GerarValor(Parametro p, Maquina3DControleSnapshot controles)
    {
        var nomeParametro = p.Nome.ToLowerInvariant();
        var proporcaoVelocidade = controles.Cadencia / Maquina3DControleEstado.CadenciaNominal;
        var impactoVelocidade = nomeParametro.Contains("vaz")
            ? proporcaoVelocidade
            : nomeParametro.Contains("vibra")
                ? Math.Pow(proporcaoVelocidade, 1.35)
                : 0.85 + proporcaoVelocidade * 0.15;
        var baseline = p.LimiteAtencao * 0.75 * impactoVelocidade;

        if (controles.FalhaSimulada)
        {
            if (nomeParametro.Contains("vibra") || nomeParametro.Contains("temper") || nomeParametro.Contains("press"))
            {
                var fatorFalha = 1.04 + Random.Shared.NextDouble() * 0.06;
                return Math.Round(Math.Max(p.LimiteCritico * fatorFalha, baseline), 2);
            }

            if (nomeParametro.Contains("vaz") || nomeParametro.Contains("flux"))
                return Math.Round(Math.Max(0, baseline * 0.35 + Gaussiano() * baseline * 0.01), 2);
        }

        // Picos aleatórios seguem ativos para os demais ciclos simulados.
        if (_picos.TryGetValue(p.Id, out var pico) && pico.Restantes > 0)
        {
            _picos[p.Id] = (pico.Restantes - 1, pico.Nivel);

            return Math.Round(
                pico.Nivel + Gaussiano() * pico.Nivel * 0.005, 2);
        }

        var valor = baseline + Gaussiano() * baseline * 0.03;

        // 2% de chance por ciclo de iniciar um pico.
        // Duração: 12 ciclos.
        if (Random.Shared.NextDouble() < 0.02)
        {
            var nivel = p.LimiteAtencao
                + Random.Shared.NextDouble()
                * (p.LimiteCritico * 1.05 - p.LimiteAtencao);

            _picos[p.Id] = (12, nivel);

            return Math.Round(nivel, 2);
        }

        return Math.Round(valor, 2);
    }

    // Distribuição normal (Box-Muller).
    private static double Gaussiano()
    {
        var u1 = 1.0 - Random.Shared.NextDouble();
        var u2 = Random.Shared.NextDouble();

        return Math.Sqrt(-2.0 * Math.Log(u1))
            * Math.Cos(2.0 * Math.PI * u2);
    }

    // ---------- Alertas (RF4, UC02) ----------
    private static async Task AvaliarAlertaAsync(
        AppDbContext db,
        Parametro p,
        double valor,
        DateTime agora,
        CancellationToken ct)
    {
        Severidade? sev =
            valor >= p.LimiteCritico ? Severidade.Critico :
            valor >= p.LimiteAtencao ? Severidade.Atencao :
            (Severidade?)null;

        var aberto = await db.Alertas
            .FirstOrDefaultAsync(
                a => a.ParametroId == p.Id
                && a.Status != StatusAlerta.Normalizado,
                ct);

        if (sev == null)
        {
            // Valor voltou ao normal: encerra o alerta aberto.
            if (aberto != null)
                aberto.Status = StatusAlerta.Normalizado;

            return;
        }

        var limite = sev == Severidade.Critico
            ? p.LimiteCritico
            : p.LimiteAtencao;

        if (aberto == null)
        {
            db.Alertas.Add(new Alerta
            {
                ParametroId = p.Id,
                Severidade = sev.Value,
                Status = StatusAlerta.Ativo,
                ValorMedido = valor,
                LimiteViolado = limite,
                DataHora = agora,
                Simulada = true
            });
        }
        else if (sev == Severidade.Critico
            && aberto.Severidade == Severidade.Atencao)
        {
            // Escalou de atenção para crítico.
            aberto.Severidade = Severidade.Critico;
            aberto.ValorMedido = valor;
            aberto.LimiteViolado = limite;
        }
    }

    // ---------- Anomalias (HU5) ----------
    private static async Task VerificarAnomaliaAsync(
        AppDbContext db,
        Parametro p,
        double valor,
        DateTime agora,
        CancellationToken ct)
    {
        var ultimos = await db.Leituras
            .Where(l => l.ParametroId == p.Id)
            .OrderByDescending(l => l.DataHora)
            .Take(30)
            .Select(l => l.Valor)
            .ToListAsync(ct);

        // Histórico insuficiente.
        if (ultimos.Count < 20)
            return;

        var media = ultimos.Average();

        var desvio = Math.Sqrt(
            ultimos.Average(v => Math.Pow(v - media, 2)));

        if (desvio < 0.0001)
            return;

        var z = Math.Abs(valor - media) / desvio;

        // Só registra desvios acima de 3 desvios-padrão.
        if (z < 3)
            return;

        // No máximo uma anomalia por parâmetro a cada 5 minutos.
        var recente = await db.Anomalias
            .AnyAsync(
                a => a.ParametroId == p.Id
                && a.DataHora > agora.AddMinutes(-5),
                ct);

        if (recente)
            return;

        db.Anomalias.Add(new Anomalia
        {
            ParametroId = p.Id,
            ValorMedido = valor,
            Score = Math.Round(z, 2),
            DataHora = agora,
            Simulada = true,
            Descricao = $"Valor {valor:F1} {p.Unidade} fora do padrão recente " +
                        $"(média {media:F1}, {z:F1} desvios-padrão)."
        });
    }
}
