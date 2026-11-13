
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

    // Guarda os picos em andamento:
    // parametroId -> (ciclos restantes, valor do pico)
    private readonly Dictionary<int, (int Restantes, double Nivel)> _picos = new();

    public SimuladorLeituras(
        IServiceScopeFactory scopeFactory,
        ILogger<SimuladorLeituras> logger,
        IHubContext<DashboardHub> hub,
        IConfiguration config)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
        _hub = hub;
        _config = config;
    }

    protected override async Task ExecuteAsync(CancellationToken ct)
    {
        // Permite desativar o simulador por configuração.
        if (!_config.GetValue<bool>("Simulador:Ativo", true))
        {
            _logger.LogInformation("Simulador de leituras desativado.");
            return;
        }

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

        var novas = new List<object>();

        foreach (var p in parametros)
        {
            var valor = GerarValor(p);

            await VerificarAnomaliaAsync(db, p, valor, agora, ct);

            db.Leituras.Add(new Leitura
            {
                ParametroId = p.Id,
                Valor = valor,
                DataHora = agora
            });

            await AvaliarAlertaAsync(db, p, valor, agora, ct);

            novas.Add(new
            {
                parametroId = p.Id,
                valor,
                dataHora = agora
            });
        }

        await db.SaveChangesAsync(ct);

        await _hub.Clients.All.SendAsync(
            "NovasLeituras", novas, ct);
    }

    // ---------- Geração do valor ----------
    private double GerarValor(Parametro p)
    {
        // Pico em andamento: mantém o valor alto por alguns ciclos.
        if (_picos.TryGetValue(p.Id, out var pico) && pico.Restantes > 0)
        {
            _picos[p.Id] = (pico.Restantes - 1, pico.Nivel);

            return Math.Round(
                pico.Nivel + Gaussiano() * pico.Nivel * 0.005, 2);
        }

        var baseline = p.LimiteAtencao * 0.75;
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
                DataHora = agora
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
            Descricao = $"Valor {valor:F1} {p.Unidade} fora do padrão recente " +
                        $"(média {media:F1}, {z:F1} desvios-padrão)."
        });
    }
}
