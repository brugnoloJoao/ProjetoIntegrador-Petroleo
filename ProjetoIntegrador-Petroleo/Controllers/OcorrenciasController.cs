using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Rendering;
using Microsoft.EntityFrameworkCore;
using ProjetoIntegrador_Petroleo.Data;
using ProjetoIntegrador_Petroleo.Models;
using ProjetoIntegrador_Petroleo.Services;
using ProjetoIntegrador_Petroleo.ViewModels;

namespace ProjetoIntegrador_Petroleo.Controllers;

// Linha do tempo permanente: o que aconteceu com cada máquina e o que o sistema registrou.
// Mostra também os dados simulados com a simulação pausada, identificados como tal.
[Authorize(Roles = "Operador,Engenheiro,Gestor")]
public sealed class OcorrenciasController(
    AppDbContext db,
    UserManager<IdentityUser> users,
    RegistroOcorrencias registro) : Controller
{
    private const int PorPagina = 40;

    private sealed record OrdemDoParametro(
        int Id, int? AlertaId, int? ParametroId, int AtivoId, StatusOrdem Status,
        DateTime DataAbertura, DateTime? DataEncerramento, string? OperadorId);

    public async Task<IActionResult> Index(int? ativoId, int dias = 7, int pagina = 1)
    {
        dias = dias is 0 or 1 or 7 or 30 ? dias : 7;
        pagina = Math.Clamp(pagina, 1, 1000);
        DateTime? desde = dias == 0 ? null : DateTime.UtcNow.AddDays(-dias);
        // Cada origem traz o suficiente para montar a página depois de juntar tudo.
        var limite = pagina * PorPagina + 1;

        var gestao = User.IsInRole("Engenheiro") || User.IsInRole("Gestor");
        // O operador continua vendo só as próprias ordens.
        var operadorId = gestao ? null : users.GetUserId(User);

        var entradas = new List<(DateTime DataHora, Func<Task<EventoMaquinaVM>> Montar)>();

        // ---------- Alertas ----------
        var consultaAlertas = db.Alertas.AsNoTracking()
            .Include(a => a.Parametro).ThenInclude(p => p!.Ativo)
            .Where(a => desde == null || a.DataHora >= desde);
        if (ativoId != null)
            consultaAlertas = consultaAlertas.Where(a => a.Parametro!.AtivoId == ativoId);
        var alertas = await consultaAlertas.OrderByDescending(a => a.DataHora).Take(limite).ToListAsync();

        var idsParametros = alertas.Select(a => a.ParametroId).Distinct().ToList();
        var idsAtivos = alertas.Select(a => a.Parametro!.AtivoId).Distinct().ToList();
        var ordensDosAlertas = await db.OrdensServico.AsNoTracking()
            .Where(o => (o.AlertaId != null && idsParametros.Contains(o.Alerta!.ParametroId))
                || (o.AlertaId == null && o.Status == StatusOrdem.Encerrada && idsAtivos.Contains(o.AtivoId)))
            .Select(o => new OrdemDoParametro(o.Id, o.AlertaId,
                o.AlertaId == null ? null : o.Alerta!.ParametroId, o.AtivoId, o.Status,
                o.DataAbertura, o.DataEncerramento, o.OperadorId))
            .ToListAsync();

        entradas.AddRange(alertas.Select(a =>
            (a.DataHora, (Func<Task<EventoMaquinaVM>>)(() => EventoDoAlertaAsync(a, ordensDosAlertas, operadorId)))));

        // ---------- Anomalias (mesmo acesso da tela de Anomalias) ----------
        if (gestao)
        {
            var consulta = db.Anomalias.AsNoTracking()
                .Include(a => a.Parametro).ThenInclude(p => p!.Ativo)
                .Where(a => desde == null || a.DataHora >= desde);
            if (ativoId != null)
                consulta = consulta.Where(a => a.Parametro!.AtivoId == ativoId);

            foreach (var a in await consulta.OrderByDescending(a => a.DataHora).Take(limite).ToListAsync())
            {
                var evento = new EventoMaquinaVM(
                    a.DataHora, TipoEvento.Anomalia, "Anomalia", "bg-primary",
                    a.Parametro!.Ativo!.Nome, a.Parametro.Ativo.Tag,
                    $"{a.Parametro.Nome} fora do padrão recente",
                    [a.Descricao], a.Simulada);
                entradas.Add((a.DataHora, () => Task.FromResult(evento)));
            }
        }

        // ---------- Ordens de serviço: abertura, decisão e encerramento ----------
        var ordens = db.OrdensServico.AsNoTracking().Include(o => o.Ativo).AsQueryable();
        if (ativoId != null)
            ordens = ordens.Where(o => o.AtivoId == ativoId);
        if (!gestao)
            ordens = ordens.Where(o => o.OperadorId == operadorId);

        var abertas = await ordens.Where(o => desde == null || o.DataAbertura >= desde)
            .OrderByDescending(o => o.DataAbertura).Take(limite).ToListAsync();
        var decididas = await ordens.Where(o => o.DataAprovacao != null && (desde == null || o.DataAprovacao >= desde))
            .OrderByDescending(o => o.DataAprovacao).Take(limite).ToListAsync();
        var encerradas = await ordens.Where(o => o.DataEncerramento != null && (desde == null || o.DataEncerramento >= desde))
            .OrderByDescending(o => o.DataEncerramento).Take(limite).ToListAsync();

        void Incluir(OrdemServico o, DateTime quando, string acao, string? linha)
        {
            var evento = new EventoMaquinaVM(
                quando, TipoEvento.OrdemServico, "OS", "bg-secondary",
                o.Ativo!.Nome, o.Ativo.Tag, $"OS #{o.Id} {acao}: {o.Titulo}",
                linha is null ? [] : [linha], OrdemId: o.Id, OrdemTexto: $"Abrir OS #{o.Id}");
            entradas.Add((quando, () => Task.FromResult(evento)));
        }

        foreach (var o in abertas)
            Incluir(o, o.DataAbertura, "aberta",
                $"Aberta por {o.SolicitanteId}{(o.TipoManutencao is { } tipo ? $" · {tipo.Nome()}" : "")}");
        foreach (var o in decididas)
        {
            // Depois da decisão, o status só deixa de ser "Rejeitada" se a ordem foi aprovada.
            var acao = o.Status == StatusOrdem.Rejeitada ? "rejeitada" : "aprovada";
            Incluir(o, o.DataAprovacao!.Value, acao, o.AprovadorId is null ? null : $"Decisão de {o.AprovadorId}");
        }
        foreach (var o in encerradas)
            Incluir(o, o.DataEncerramento!.Value, "encerrada", null);

        // Só os acontecimentos da página têm a evolução calculada.
        var ordenadas = entradas.OrderByDescending(e => e.DataHora).ToList();
        var eventos = new List<EventoMaquinaVM>();
        foreach (var entrada in ordenadas.Skip((pagina - 1) * PorPagina).Take(PorPagina))
            eventos.Add(await entrada.Montar());

        var ativos = await db.Ativos.AsNoTracking().OrderBy(a => a.Nome).ToListAsync();
        ViewBag.Ativos = new SelectList(ativos, "Id", "Nome", ativoId);

        return View(new OcorrenciasVM(eventos, ativoId, dias, pagina, ordenadas.Count > pagina * PorPagina));
    }

    private async Task<EventoMaquinaVM> EventoDoAlertaAsync(
        Alerta a, List<OrdemDoParametro> ordens, string? operadorId)
    {
        var parametro = a.Parametro!;
        var ativo = parametro.Ativo!;
        var evolucao = await registro.EvolucaoAsync(a, parametro);

        var linhas = new List<string>
        {
            $"O sistema detectou {a.ValorMedido:F1} {parametro.Unidade} (limite {a.LimiteViolado:F1} {parametro.Unidade}).",
            evolucao.Resumo(a, parametro.Unidade)
        };
        if (a.ReconhecidoEm is { } reconhecidoEm)
            linhas.Add($"Reconhecido por {a.ReconhecidoPorId} em {reconhecidoEm.HorarioDeBrasilia()}: {a.Observacao}");

        // Mesma regra das ordens sugeridas; a ordem ligada ao próprio alerta tem preferência.
        var cobertura = ordens
            .Where(o => (o.ParametroId == a.ParametroId
                    && ((o.Status != StatusOrdem.Encerrada && o.Status != StatusOrdem.Rejeitada)
                        || (a.Status == StatusAlerta.Normalizado
                            && (o.DataAbertura >= a.DataHora || o.DataEncerramento >= a.DataHora))))
                || (o.AlertaId == null && o.AtivoId == a.Parametro!.AtivoId
                    && a.Status == StatusAlerta.Normalizado && o.DataEncerramento >= a.DataHora))
            .OrderByDescending(o => o.AlertaId == a.Id)
            .ThenBy(o => o.DataAbertura)
            .FirstOrDefault();

        int? ordemId = null;
        string? ordemTexto = null;
        if (cobertura != null)
        {
            if (operadorId is null || cobertura.OperadorId == operadorId)
            {
                ordemId = cobertura.Id;
                ordemTexto = $"OS #{cobertura.Id} · {cobertura.Status.Nome()}";
            }
            else
            {
                ordemTexto = "Já há uma OS para este caso";
            }
        }

        return new EventoMaquinaVM(
            a.DataHora, TipoEvento.Alerta,
            a.Severidade.Nome(),
            a.Severidade == Severidade.Critico ? "bg-danger" : "telemetry-warning",
            ativo.Nome, ativo.Tag, $"{parametro.Nome} acima do limite", linhas, a.Simulada,
            ordemId, ordemTexto, cobertura is null ? a.Id : null);
    }
}
