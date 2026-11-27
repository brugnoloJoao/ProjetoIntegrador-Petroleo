using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using ProjetoIntegrador_Petroleo.Data;
using ProjetoIntegrador_Petroleo.Hubs;
using ProjetoIntegrador_Petroleo.Models;
using ProjetoIntegrador_Petroleo.Services;

namespace ProjetoIntegrador_Petroleo.Controllers;

[Authorize(Roles = "Operador,Engenheiro,Gestor")]
public sealed class Maquina3DController : Controller
{
    // Componentes da unidade de bombeio que podem ter cadastro próprio.
    private static readonly string[] TagsUnidadeBombeio = ["UB-04", "SEP-02", "ANM-07", "MTR-75HP"];
    private static readonly JsonSerializerOptions OpcoesJson = new(JsonSerializerDefaults.Web);

    private readonly AppDbContext _db;
    private readonly SimuladorEstado _simulador;
    private readonly Maquina3DControleEstado _controles;
    private readonly IHubContext<DashboardHub> _hub;
    private readonly PlanejamentoManutencao _planejamento;

    public Maquina3DController(
        AppDbContext db,
        SimuladorEstado simulador,
        Maquina3DControleEstado controles,
        IHubContext<DashboardHub> hub,
        PlanejamentoManutencao planejamento)
    {
        _db = db;
        _simulador = simulador;
        _controles = controles;
        _hub = hub;
        _planejamento = planejamento;
    }

    [HttpGet]
    public async Task<IActionResult> Index(int? ativoId)
    {
        ViewData["Maquina3D"] = JsonSerializer.Serialize(await MontarDadosAsync(ativoId), OpcoesJson);
        return View();
    }

    // Visão de todas as máquinas juntas; os dados vêm da mesma consulta da tela individual.
    [HttpGet]
    public IActionResult Planta() => View();

    [HttpGet]
    [ResponseCache(Duration = 0, Location = ResponseCacheLocation.None, NoStore = true)]
    public async Task<IActionResult> Dados(int? ativoId, bool comLeituras = true) =>
        Json(await MontarDadosAsync(ativoId, comLeituras));

    [HttpPost]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> AtualizarControles(
        [FromQuery] int ativoId,
        [FromQuery] double cadencia,
        [FromQuery] bool falhaSimulada)
    {
        if (!double.IsFinite(cadencia) || cadencia is < 6 or > 18)
            return BadRequest(new { mensagem = "A velocidade deve ficar entre 6 e 18 ciclos por minuto." });

        if (!await _db.Ativos.AnyAsync(a => a.Id == ativoId))
            return BadRequest(new { mensagem = "Equipamento não encontrado." });

        var atual = _controles.Ler(ativoId);
        if (falhaSimulada && !atual.FalhaSimulada)
        {
            if (!_simulador.Ativo)
                return BadRequest(new { mensagem = "A simulação está pausada. Ative-a para forçar uma falha." });
            if (!await _db.Parametros.AnyAsync(p => p.AtivoId == ativoId))
                return BadRequest(new { mensagem = "Cadastre parâmetros neste equipamento antes de forçar uma falha." });
        }
        else if (!falhaSimulada && atual.FalhaSimulada
            && await _db.Alertas.AnyAsync(a => a.Parametro!.AtivoId == ativoId && a.Status != StatusAlerta.Normalizado))
        {
            return BadRequest(new { mensagem = "A falha só termina quando a ordem de serviço for encerrada." });
        }

        var estado = _controles.Atualizar(ativoId, Math.Round(cadencia, 1), falhaSimulada);
        var resposta = new { ativoId, cadencia = estado.Cadencia, falhaSimulada = estado.FalhaSimulada };

        await _hub.Clients.All.SendAsync("EstadoMaquina3DAlterado", resposta);
        return Ok(resposta);
    }

    private async Task<object> MontarDadosAsync(int? ativoId, bool comLeituras = true)
    {
        var simulacaoAtiva = _simulador.Ativo;
        var ativos = await _db.Ativos.AsNoTracking()
            .Include(a => a.Parametros)
            .OrderBy(a => a.Nome)
            .ToListAsync();

        // Sem escolha, abre na unidade de bombeio (a máquina original) ou no primeiro ativo em operação.
        var selecionado = ativos.FirstOrDefault(a => a.Id == ativoId)
            ?? ativos
                .OrderByDescending(a => a.Status == StatusAtivo.Operando && a.Parametros.Count > 0)
                .ThenByDescending(a => string.Equals(a.Tag, TagsUnidadeBombeio[0], StringComparison.OrdinalIgnoreCase))
                .ThenBy(a => a.Id)
                .FirstOrDefault();

        var alertas = await _db.Alertas.AsNoTracking()
            .Where(a => a.Status != StatusAlerta.Normalizado && (simulacaoAtiva || !a.Simulada))
            .Select(a => new AlertaInfo(a.Parametro!.AtivoId,
                a.Severidade, a.Status, a.Simulada))
            .ToListAsync();

        // Reconhecido ou com OS aberta, o defeito continua até a OS ser encerrada.
        (string Status, string StatusReal) Condicao(Ativo? ativo)
        {
            var doAtivo = alertas.Where(a => a.AtivoId == ativo?.Id).ToList();
            var operando = ativo is null || ativo.Status == StatusAtivo.Operando;
            return (
                CalcularStatus(doAtivo.Select(a => a.Severidade), operando),
                CalcularStatus(doAtivo.Where(a => !a.Simulada).Select(a => a.Severidade), operando));
        }

        var equipamentos = TagsUnidadeBombeio.Select(tag =>
        {
            var proprio = tag == TagsUnidadeBombeio[0]
                ? null
                : ativos.FirstOrDefault(a => string.Equals(a.Tag, tag, StringComparison.OrdinalIgnoreCase));
            var condicao = Condicao(proprio ?? selecionado);
            return new
            {
                id = tag,
                status = condicao.Status,
                statusReal = condicao.StatusReal,
                representaSelecionado = proprio is null
            };
        }).ToArray();

        var condicaoSelecionado = Condicao(selecionado);
        var leituras = new List<object>();
        if (selecionado is not null && comLeituras)
        {
            foreach (var parametro in selecionado.Parametros)
            {
                // A leitura mais recente de cada origem (real e simulada), por parâmetro.
                foreach (var simulada in new[] { false, true })
                {
                    var ultima = await _db.Leituras.AsNoTracking()
                        .Where(l => l.ParametroId == parametro.Id && l.Simulada == simulada)
                        .OrderByDescending(l => l.DataHora)
                        .FirstOrDefaultAsync();
                    if (ultima is null) continue;

                    leituras.Add(new
                    {
                        parametroId = parametro.Id,
                        valor = ultima.Valor,
                        dataHora = DateTime.SpecifyKind(ultima.DataHora, DateTimeKind.Utc),
                        simulada,
                        nome = parametro.Nome,
                        unidade = parametro.Unidade,
                        limiteAtencao = parametro.LimiteAtencao,
                        limiteCritico = parametro.LimiteCritico,
                        ativo = selecionado.Nome,
                        tagAtivo = selecionado.Tag
                    });
                }
            }
        }

        // Alerta mais grave do equipamento que ainda não virou OS: atalho para a OS pronta.
        var pendente = selecionado is null
            ? null
            : (await _planejamento.SugestoesDeAlertasAsync(selecionado.Id)).FirstOrDefault();
        object? sugestao = pendente is null
            ? null
            : new { alertaId = pendente.AlertaId, parametro = pendente.Parametro };

        var controles = selecionado is null
            ? new Maquina3DControleSnapshot(Maquina3DControleEstado.CadenciaNominal, false)
            : _controles.Ler(selecionado.Id);

        // Situação do conserto: alertas em aberto e a OS que está cuidando da máquina.
        var emAberto = alertas.Count(a => a.AtivoId == selecionado?.Id);
        var ordensDaMaquina = _db.OrdensServico.AsNoTracking().Where(o => selecionado != null
            && o.AtivoId == selecionado.Id
            && o.Status != StatusOrdem.Encerrada && o.Status != StatusOrdem.Rejeitada);
        if (User.IsInRole("Operador") && !User.IsInRole("Engenheiro") && !User.IsInRole("Gestor"))
        {
            // O operador continua vendo só as próprias ordens.
            var operadorId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            ordensDaMaquina = ordensDaMaquina.Where(o => o.OperadorId == operadorId);
        }
        var ordem = await ordensDaMaquina.OrderByDescending(o => o.DataAbertura)
            .Select(o => new { o.Id, o.Status })
            .FirstOrDefaultAsync();

        return new
        {
            alertasAbertos = emAberto,
            ordemAberta = ordem is null ? null : new { id = ordem.Id, status = ordem.Status.Nome() },
            podeAtivarSimulacao = User.IsInRole("Engenheiro") || User.IsInRole("Gestor"),
            ativo = selecionado is null ? null : new
            {
                id = selecionado.Id,
                nome = selecionado.Nome,
                tag = selecionado.Tag,
                tipo = selecionado.Tipo,
                status = selecionado.Status.ToString(),
                statusTexto = selecionado.Status switch
                {
                    StatusAtivo.Operando => "Operando",
                    StatusAtivo.EmManutencao => "Em manutenção",
                    _ => "Parado"
                }
            },
            ativos = ativos.Select(a =>
            {
                var condicao = Condicao(a);
                return new
                {
                    id = a.Id, nome = a.Nome, tag = a.Tag, condicao = condicao.Status,
                    tipo = a.Tipo, operando = a.Status == StatusAtivo.Operando
                };
            }),
            parametros = selecionado?.Parametros.Select(p => p.Id).ToArray() ?? [],
            equipamentos,
            status = condicaoSelecionado.Status,
            statusReal = condicaoSelecionado.StatusReal,
            simulacaoAtiva,
            controles = new { cadencia = controles.Cadencia, falhaSimulada = controles.FalhaSimulada },
            leituras,
            falhaSimulada = simulacaoAtiva && alertas.Any(a => a.AtivoId == selecionado?.Id
                && a.Simulada && a.Severidade == Severidade.Critico),
            sugestao
        };
    }

    private static string CalcularStatus(IEnumerable<Severidade> severidades, bool estaOperando)
    {
        var lista = severidades.ToArray();
        if (lista.Contains(Severidade.Critico)) return "Crítico";
        if (lista.Contains(Severidade.Atencao) || !estaOperando) return "Alerta";
        return "Normal";
    }

    private sealed record AlertaInfo(int AtivoId, Severidade Severidade, StatusAlerta Status, bool Simulada);
}
