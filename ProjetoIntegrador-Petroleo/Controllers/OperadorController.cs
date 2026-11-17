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

[Authorize(Roles = "Operador")]
public sealed class OperadorController : Controller
{
    private static readonly string[] TagsModelo = ["UB-04", "SEP-02", "ANM-07", "UB-04-GEAR", "MTR-75HP"];
    private readonly AppDbContext _db;
    private readonly SimuladorEstado _simulador;
    private readonly Maquina3DControleEstado _controles;
    private readonly IHubContext<DashboardHub> _hub;

    public OperadorController(
        AppDbContext db,
        SimuladorEstado simulador,
        Maquina3DControleEstado controles,
        IHubContext<DashboardHub> hub)
    {
        _db = db;
        _simulador = simulador;
        _controles = controles;
        _hub = hub;
    }

    [HttpGet]
    public async Task<IActionResult> Maquina3D()
    {
        var estadoControles = _controles.Ler();
        var ativos = await _db.Ativos.AsNoTracking().Include(a => a.Parametros).ToListAsync();
        var ativoControlado = ativos
            .Where(a => a.Status == StatusAtivo.Operando && a.Parametros.Count > 0)
            .OrderBy(a => a.Id)
            .FirstOrDefault();
        var tagAtivos = ativos
            .GroupBy(a => a.Tag, StringComparer.OrdinalIgnoreCase)
            .ToDictionary(grupo => grupo.Key, grupo => grupo.First(), StringComparer.OrdinalIgnoreCase);
        var leiturasSimuladas = await CarregarLeiturasMaisRecentesAsync(simuladas: true, ativoControlado?.Id);
        var leiturasReais = await CarregarLeiturasMaisRecentesAsync(simuladas: false, ativoControlado?.Id);
        var alertas = await _db.Alertas
            .AsNoTracking()
            .Where(a => a.Status == StatusAlerta.Ativo && (_simulador.Ativo || !a.Simulada))
            .Select(a => new AlertaAtivoInfo(a.Parametro!.Ativo!.Tag, a.Severidade, a.Simulada))
            .ToListAsync();
        var alertasDoModelo = ativoControlado is null
            ? Array.Empty<AlertaAtivoInfo>()
            : alertas.Where(a => string.Equals(a.TagAtivo, ativoControlado.Tag, StringComparison.OrdinalIgnoreCase)).ToArray();

        var equipamentos = TagsModelo.Select(tag =>
        {
            var lookupTag = tag == "UB-04-GEAR" ? "UB-04" : tag;
            tagAtivos.TryGetValue(lookupTag, out var ativo);
            var ativoRepresentado = ativo ?? ativoControlado;
            var alertasDoAtivo = ativoRepresentado is null
                ? Array.Empty<AlertaAtivoInfo>()
                : alertas.Where(a => string.Equals(a.TagAtivo, ativoRepresentado.Tag, StringComparison.OrdinalIgnoreCase)).ToArray();
            var estaOperando = ativoRepresentado is null || ativoRepresentado.Status == StatusAtivo.Operando;

            return new
            {
                id = tag == "UB-04-GEAR" ? "UB-04" : tag,
                status = CalcularStatus(alertasDoAtivo.Select(a => a.Severidade), estaOperando),
                statusReal = CalcularStatus(alertasDoAtivo.Where(a => !a.Simulada).Select(a => a.Severidade), estaOperando),
                presetCamera = tag switch
                {
                    "UB-04" or "ANM-07" => "poco",
                    "MTR-75HP" or "UB-04-GEAR" => "motor",
                    "SEP-02" => "separador",
                    _ => "geral"
                }
            };
        }).ToArray();

        ViewData["Maquina3D"] = JsonSerializer.Serialize(new
        {
            equipamentos,
            simulacaoAtiva = _simulador.Ativo,
            tagAtivo = ativoControlado?.Tag,
            ativoNome = ativoControlado?.Nome,
            controles = new
            {
                cadencia = estadoControles.Cadencia,
                falhaSimulada = estadoControles.FalhaSimulada
            },
            leituras = leiturasReais.Concat(leiturasSimuladas),
            falhaSimulada = _simulador.Ativo && alertasDoModelo.Any(a => a.Simulada && a.Severidade == Severidade.Critico)
        });

        return View();
    }

    [HttpPost]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> AtualizarControles([FromQuery] double cadencia, [FromQuery] bool falhaSimulada)
    {
        if (!double.IsFinite(cadencia) || cadencia is < 6 or > 18)
            return BadRequest(new { mensagem = "A velocidade deve ficar entre 6 e 18 ciclos por minuto." });

        var estado = _controles.Atualizar(Math.Round(cadencia, 1), falhaSimulada);
        var resposta = new { cadencia = estado.Cadencia, falhaSimulada = estado.FalhaSimulada };

        await _hub.Clients.All.SendAsync("EstadoMaquina3DAlterado", resposta);
        return Ok(resposta);
    }

    private static string CalcularStatus(IEnumerable<Severidade> severidades, bool estaOperando)
    {
        var lista = severidades.ToArray();
        if (lista.Contains(Severidade.Critico)) return "Crítico";
        if (lista.Contains(Severidade.Atencao) || !estaOperando) return "Alerta";
        return "Normal";
    }

    private sealed record AlertaAtivoInfo(string TagAtivo, Severidade Severidade, bool Simulada);

    private async Task<object[]> CarregarLeiturasMaisRecentesAsync(bool simuladas, int? ativoId)
    {
        if (ativoId is null)
            return [];

        var leituras = await _db.Leituras
            .AsNoTracking()
            .Where(l => l.Simulada == simuladas && l.Parametro!.AtivoId == ativoId.Value)
            .OrderByDescending(l => l.DataHora)
            .Take(500)
            .Select(l => new
            {
                parametroId = l.ParametroId,
                valor = l.Valor,
                dataHora = l.DataHora,
                simulada = l.Simulada,
                nome = l.Parametro!.Nome,
                unidade = l.Parametro.Unidade,
                limiteAtencao = l.Parametro.LimiteAtencao,
                limiteCritico = l.Parametro.LimiteCritico,
                ativo = l.Parametro.Ativo!.Nome,
                tagAtivo = l.Parametro.Ativo.Tag
            })
            .ToListAsync();

        return leituras
            .GroupBy(l => l.parametroId)
            .Select(grupo => (object)grupo.First())
            .ToArray();
    }
}
