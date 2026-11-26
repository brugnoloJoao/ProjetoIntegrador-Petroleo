using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ProjetoIntegrador_Petroleo.Data;
using ProjetoIntegrador_Petroleo.Models;
using ProjetoIntegrador_Petroleo.Services;
using ProjetoIntegrador_Petroleo.ViewModels;

namespace ProjetoIntegrador_Petroleo.Controllers;

// Placar do turno: só consulta, não grava nada.
[Authorize(Roles = "Operador,Engenheiro,Gestor")]
public sealed class TurnoController(
    AppDbContext db,
    UserManager<IdentityUser> users,
    SimuladorEstado simulador) : Controller
{
    private static readonly TimeZoneInfo Brasilia = TimeZoneInfo.FindSystemTimeZoneById("America/Sao_Paulo");

    public async Task<IActionResult> Index() => View(await MontarAsync());

    [HttpGet]
    [ResponseCache(Duration = 0, Location = ResponseCacheLocation.None, NoStore = true)]
    public async Task<IActionResult> Placar() => PartialView("_Placar", await MontarAsync());

    // Turnos de 8 horas no horário de Brasília: 06h, 14h e 22h.
    private static (string Nome, DateTime InicioUtc) TurnoAtual(DateTime agoraUtc)
    {
        var local = TimeZoneInfo.ConvertTimeFromUtc(agoraUtc, Brasilia);
        var (nome, inicio) = local.Hour switch
        {
            >= 6 and < 14 => ("Manhã · 06h às 14h", local.Date.AddHours(6)),
            >= 14 and < 22 => ("Tarde · 14h às 22h", local.Date.AddHours(14)),
            >= 22 => ("Noite · 22h às 06h", local.Date.AddHours(22)),
            _ => ("Noite · 22h às 06h", local.Date.AddDays(-1).AddHours(22))
        };
        return (nome, TimeZoneInfo.ConvertTimeToUtc(inicio, Brasilia));
    }

    private async Task<TurnoVM> MontarAsync()
    {
        var (nome, inicio) = TurnoAtual(DateTime.UtcNow);
        var alertas = db.Alertas.AsNoTracking().Where(a => simulador.Ativo || !a.Simulada);

        var doTurno = alertas.Where(a => a.DataHora >= inicio);
        var detectados = await doTurno.CountAsync();
        var criticos = await doTurno.CountAsync(a => a.Severidade == Severidade.Critico);
        var atendidos = await doTurno.CountAsync(a => a.ReconhecidoEm != null);

        var respostas = await alertas
            .Where(a => a.ReconhecidoEm >= inicio)
            .Select(a => new { a.DataHora, ReconhecidoEm = a.ReconhecidoEm!.Value })
            .ToListAsync();
        TimeSpan? media = respostas.Count == 0
            ? null
            : TimeSpan.FromSeconds(respostas.Average(r => (r.ReconhecidoEm - r.DataHora).TotalSeconds));

        var emEspera = alertas.Where(a => a.Status == StatusAlerta.Ativo && a.ReconhecidoEm == null);
        var aguardando = await emEspera.CountAsync();
        var maisAntigos = await emEspera
            .OrderByDescending(a => a.Severidade)
            .ThenBy(a => a.DataHora)
            .Take(5)
            .Select(a => new AlertaEmEsperaVM(
                a.Id, a.Parametro!.Ativo!.Nome, a.Parametro.Ativo.Tag, a.Parametro.Nome,
                a.Severidade == Severidade.Critico, a.DataHora))
            .ToListAsync();

        var criticoEmAberto = await alertas.AnyAsync(a =>
            a.Severidade == Severidade.Critico && a.Status != StatusAlerta.Normalizado);
        var ultimoCritico = await alertas
            .Where(a => a.Severidade == Severidade.Critico)
            .MaxAsync(a => (DateTime?)a.DataHora);

        // O operador continua contando só as próprias ordens.
        var soMinhas = !User.IsInRole("Engenheiro") && !User.IsInRole("Gestor");
        var ordens = db.OrdensServico.AsNoTracking();
        if (soMinhas)
        {
            var operadorId = users.GetUserId(User);
            ordens = ordens.Where(o => o.OperadorId == operadorId);
        }

        return new TurnoVM(nome, inicio, detectados, criticos, atendidos, media, aguardando,
            criticoEmAberto, ultimoCritico,
            await ordens.CountAsync(o => o.DataAbertura >= inicio),
            await ordens.CountAsync(o => o.DataEncerramento >= inicio),
            soMinhas, maisAntigos);
    }
}
