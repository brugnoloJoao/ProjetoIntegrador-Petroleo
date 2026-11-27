using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.AspNetCore.Mvc.Rendering;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using ProjetoIntegrador_Petroleo.Data;
using ProjetoIntegrador_Petroleo.Hubs;
using ProjetoIntegrador_Petroleo.Models;
using ProjetoIntegrador_Petroleo.Services;
using ProjetoIntegrador_Petroleo.ViewModels;

namespace ProjetoIntegrador_Petroleo.Controllers;

[Authorize]
public class OrdemServicoController : Controller
{
    private readonly AppDbContext _db;
    private readonly UserManager<IdentityUser> _users;

    private readonly PlanejamentoManutencao _planejamento;
    private readonly RegistroOcorrencias _registro;

    public OrdemServicoController(
        AppDbContext db,
        UserManager<IdentityUser> users,
        PlanejamentoManutencao planejamento,
        RegistroOcorrencias registro)
    {
        _db = db;
        _users = users;
        _planejamento = planejamento;
        _registro = registro;
    }

    private bool ApenasOperador =>
        User.IsInRole("Operador") && !User.IsInRole("Engenheiro") && !User.IsInRole("Gestor");

    public async Task<IActionResult> Index(StatusOrdem? status)
    {
        var query = _db.OrdensServico
            .Include(o => o.Ativo)
            .Include(o => o.Operador)
            .AsNoTracking()
            .AsQueryable();

        if (User.IsInRole("Operador") && !User.IsInRole("Engenheiro") && !User.IsInRole("Gestor"))
        {
            var operadorId = _users.GetUserId(User);
            query = query.Where(o => o.OperadorId == operadorId);
        }

        if (status != null)
            query = query.Where(o => o.Status == status);

        var lista = await query
            .OrderBy(o => o.Status)
            .ThenByDescending(o => o.Prioridade)
            .ThenByDescending(o => o.DataAbertura)
            .Take(200)
            .ToListAsync();

        ViewData["Filtro"] = status?.ToString() ?? "";
        if (PodeAbrirOrdem())
            ViewData["Sugestoes"] = await _planejamento.SugestoesAsync();
        return View(lista);
    }

    // Trecho da tela atualizado periodicamente com as ordens prontas para conferência.
    [HttpGet]
    [Authorize(Roles = "Operador,Engenheiro,Gestor")]
    [ResponseCache(Duration = 0, Location = ResponseCacheLocation.None, NoStore = true)]
    public async Task<IActionResult> Sugestoes() =>
        PartialView("_Sugestoes", await _planejamento.SugestoesAsync());

    // Rotinas cadastradas para o equipamento escolhido no formulário.
    [HttpGet]
    [Authorize(Roles = "Operador,Engenheiro,Gestor")]
    public async Task<IActionResult> Rotinas(int ativoId)
    {
        var ativo = await _db.Ativos.AsNoTracking().FirstOrDefaultAsync(a => a.Id == ativoId);
        var rotinas = ativo is null ? [] : await _planejamento.RotinasDoAtivoAsync(ativo);
        return PartialView("_RotinasChecklist",
            new RotinasChecklistVM(rotinas, new HashSet<int>(), ativo is not null));
    }

    private bool PodeAbrirOrdem() =>
        User.IsInRole("Operador") || User.IsInRole("Engenheiro") || User.IsInRole("Gestor");

    public async Task<IActionResult> Details(int id)
    {
        var query = _db.OrdensServico
            .Include(o => o.Ativo)
            .Include(o => o.Operador)
            .Include(o => o.Alerta).ThenInclude(a => a!.Parametro)
            .Include(o => o.Itens.OrderBy(i => i.Id))
            .AsNoTracking()
            .AsQueryable();

        if (User.IsInRole("Operador") && !User.IsInRole("Engenheiro") && !User.IsInRole("Gestor"))
        {
            var operadorId = _users.GetUserId(User);
            query = query.Where(o => o.OperadorId == operadorId);
        }

        var os = await query.FirstOrDefaultAsync(o => o.Id == id);

        if (os != null && (User.IsInRole("Engenheiro") || User.IsInRole("Gestor")))
        {
            await CarregarOperadoresAsync(os.OperadorId);
        }

        return os == null ? NotFound() : View(os);
    }

    // ---------- Abrir OS (HU9) ----------
    [HttpGet]
    [Authorize(Roles = "Operador,Engenheiro,Gestor")]
    public async Task<IActionResult> Create(int? alertaId, int? ativoId, int? rotinaId)
    {
        var os = new OrdemServico();
        var podeAtribuirOperador = User.IsInRole("Engenheiro") || User.IsInRole("Gestor");
        if (!podeAtribuirOperador)
            os.OperadorId = _users.GetUserId(User);

        var marcadas = new HashSet<int>();

        if (alertaId != null)
        {
            var alerta = await _db.Alertas
                .Include(a => a.Parametro).ThenInclude(p => p!.Ativo)
                .FirstOrDefaultAsync(a => a.Id == alertaId);
            if (alerta == null) return NotFound();

            // Evita duas OS abertas para o mesmo alerta
            var existente = await OrdemAbertaDoAlertaAsync(alerta.Id);
            if (existente != null)
                return RedirecionarParaExistente(existente, "Já existe uma OS em andamento para este alerta.");

            var parametro = alerta.Parametro!;
            var ativo = parametro.Ativo!;
            var indicadas = (await _planejamento.RotinasDoAtivoAsync(ativo))
                .Where(r => r.AcionadaPor(parametro.Nome))
                .ToList();
            marcadas = indicadas.Select(r => r.Id).ToHashSet();

            os.AlertaId = alerta.Id;
            os.Origem = OrigemOrdem.Alerta;
            os.AtivoId = ativo.Id;
            os.Titulo = Limitar($"{parametro.Nome} acima do limite · {ativo.Nome}", 120);
            var descricao = $"Alerta de severidade {alerta.Severidade.Nome()} em {alerta.DataHora.HorarioDeBrasilia()} " +
                            $"(horário de Brasília): {parametro.Nome} em {alerta.ValorMedido:F1} {parametro.Unidade} " +
                            $"(limite {alerta.LimiteViolado:F1} {parametro.Unidade}).";
            var evolucao = await _registro.EvolucaoAsync(alerta, parametro);
            descricao += $"\n{evolucao.Resumo(alerta, parametro.Unidade)}";
            var semOrdem = await _planejamento.AlertasSemOrdem()
                .CountAsync(a => a.ParametroId == parametro.Id);
            if (semOrdem > 1)
                descricao += $"\nOcorrências deste parâmetro ainda sem OS: {semOrdem}.";
            if (indicadas.Count > 0)
                descricao += $"\nRotinas indicadas pelo cadastro: {string.Join("; ", indicadas.Select(r => r.Titulo))}.";
            os.Descricao = Limitar(descricao, 1000);
            os.Prioridade = alerta.Severidade == Severidade.Critico ? Prioridade.Alta : Prioridade.Media;
            os.PecasMateriais = JuntarPecas(indicadas);
            ViewData["TipoSugerido"] = indicadas.FirstOrDefault()?.TipoManutencao;
        }
        else if (ativoId != null)
        {
            var ativo = await _db.Ativos.FindAsync(ativoId);
            if (ativo == null) return NotFound();

            os.AtivoId = ativo.Id;
            os.Prioridade = Prioridade.Media;

            if (rotinaId != null)
            {
                var rotina = (await _planejamento.RotinasDoAtivoAsync(ativo)).FirstOrDefault(r => r.Id == rotinaId);
                if (rotina == null) return NotFound();

                if (await _planejamento.OrdemAbertaDaRotinaAsync(rotina.Id, ativo.Id) is { } ordemId)
                    return RedirecionarParaExistente(
                        await _db.OrdensServico.AsNoTracking().FirstAsync(o => o.Id == ordemId),
                        "Já existe uma OS em andamento para esta rotina.");

                marcadas.Add(rotina.Id);
                os.Origem = OrigemOrdem.Rotina;
                ViewData["RotinaOrigemId"] = rotina.Id;
                ViewData["TipoSugerido"] = rotina.TipoManutencao;
                os.Titulo = Limitar($"{rotina.Titulo} · {ativo.Nome}", 120);
                os.Descricao = rotina.IntervaloDias is null
                    ? "Rotina de manutenção cadastrada para o equipamento."
                    : $"Rotina periódica cadastrada para o equipamento (a cada {rotina.IntervaloDias} dias).";
                os.PecasMateriais = JuntarPecas([rotina]);
            }
            else
            {
                os.Titulo = Limitar($"Manutenção preventiva em {ativo.Nome}", 120);
                os.Descricao = "Intervenção planejada com base no ranking de risco de falha.";
            }
        }

        await PrepararFormularioAsync(os, marcadas, podeAtribuirOperador);
        return View(os);
    }

    [HttpPost, ValidateAntiForgeryToken]
    [Authorize(Roles = "Operador,Engenheiro,Gestor")]
    public async Task<IActionResult> Create(
        [Bind("AtivoId,AlertaId,Titulo,Descricao,Prioridade,OperadorId,TipoManutencao,PecasMateriais")] OrdemServico os,
        int[]? rotinas,
        int? rotinaOrigemId)
    {
        ModelState.Remove(nameof(OrdemServico.SolicitanteId));

        var podeAtribuirOperador = User.IsInRole("Engenheiro") || User.IsInRole("Gestor");
        if (!podeAtribuirOperador)
        {
            os.OperadorId = _users.GetUserId(User);
            ModelState.Remove(nameof(OrdemServico.OperadorId));
        }
        else if (!string.IsNullOrWhiteSpace(os.OperadorId) && !await OperadorValidoAsync(os.OperadorId))
        {
            ModelState.AddModelError(nameof(os.OperadorId), "Selecione uma conta ativa com perfil de Operador.");
        }

        // A escolha do tipo é a conferência de quem abre a ordem.
        if (os.TipoManutencao is null || !Enum.IsDefined(os.TipoManutencao.Value))
        {
            ModelState.Remove(nameof(os.TipoManutencao));
            ModelState.AddModelError(nameof(os.TipoManutencao), "Escolha o tipo de manutenção.");
        }

        var ativo = await _db.Ativos.AsNoTracking().FirstOrDefaultAsync(a => a.Id == os.AtivoId);
        if (ativo is null && ModelState[nameof(os.AtivoId)]?.Errors.Count is null or 0)
            ModelState.AddModelError(nameof(os.AtivoId), "Selecione o equipamento.");

        if (os.AlertaId != null)
        {
            var ativoDoAlerta = await _db.Alertas
                .Where(a => a.Id == os.AlertaId)
                .Select(a => (int?)a.Parametro!.AtivoId)
                .FirstOrDefaultAsync();
            if (ativoDoAlerta is null || ativoDoAlerta != os.AtivoId)
                ModelState.AddModelError(nameof(os.AlertaId), "O alerta informado não pertence a este equipamento.");
            else if (await OrdemAbertaDoAlertaAsync(os.AlertaId.Value) is { } existente)
                return RedirecionarParaExistente(existente, "Já existe uma OS em andamento para este alerta.");
        }

        // Só entram no checklist rotinas que realmente valem para o equipamento.
        var escolhidas = ativo is null
            ? []
            : (await _planejamento.RotinasDoAtivoAsync(ativo))
                .Where(r => rotinas?.Contains(r.Id) == true)
                .ToList();

        var origemRotina = os.AlertaId == null && escolhidas.Any(r => r.Id == rotinaOrigemId);
        if (origemRotina && await _planejamento.OrdemAbertaDaRotinaAsync(rotinaOrigemId!.Value, os.AtivoId) is { } ordemId)
            return RedirecionarParaExistente(
                await _db.OrdensServico.AsNoTracking().FirstAsync(o => o.Id == ordemId),
                "Já existe uma OS em andamento para esta rotina.");

        os.Origem = os.AlertaId != null ? OrigemOrdem.Alerta
            : origemRotina ? OrigemOrdem.Rotina
            : OrigemOrdem.Manual;

        if (!ModelState.IsValid)
        {
            ViewData["RotinaOrigemId"] = origemRotina ? rotinaOrigemId : null;
            await PrepararFormularioAsync(os, escolhidas.Select(r => r.Id).ToHashSet(), podeAtribuirOperador);
            return View(os);
        }

        os.SolicitanteId = User.Identity?.Name ?? "Usuário";
        os.Status = StatusOrdem.Aberta;
        os.DataAbertura = DateTime.UtcNow;
        os.Itens = escolhidas
            .SelectMany(r => (r.Etapas().Any() ? r.Etapas() : [r.Titulo])
                .Select(etapa => new OrdemServicoItem { RotinaManutencaoId = r.Id, Descricao = Limitar(etapa, 300) }))
            .ToList();

        _db.OrdensServico.Add(os);
        await _db.SaveChangesAsync();
        if (os.AlertaId != null)
            await ReconhecerAlertasAtendidosAsync(os);

        TempData["Sucesso"] = "Ordem de serviço aberta. Aguardando aprovação do gestor.";
        return RedirectToAction(nameof(Details), new { id = os.Id });
    }

    // Quem abre a OS está atendendo o alerta: ele passa a "Reconhecido" e sai das
    // notificações. Só é encerrado quando a OS for concluída.
    private async Task ReconhecerAlertasAtendidosAsync(OrdemServico os)
    {
        var parametroId = await _db.Alertas.Where(a => a.Id == os.AlertaId)
            .Select(a => a.ParametroId)
            .FirstAsync();
        var alertas = await _db.Alertas
            .Where(a => a.ParametroId == parametroId && a.ReconhecidoEm == null
                && (a.Status == StatusAlerta.Ativo || a.Id == os.AlertaId))
            .ToListAsync();

        foreach (var alerta in alertas)
        {
            alerta.Observacao = $"Ordem de serviço #{os.Id} aberta.";
            alerta.ReconhecidoPorId = os.SolicitanteId;
            alerta.ReconhecidoEm = DateTime.UtcNow;
            if (alerta.Status == StatusAlerta.Ativo)
                alerta.Status = StatusAlerta.Reconhecido;
        }
        await _db.SaveChangesAsync();
    }

    // ---------- Checklist ----------
    // Quem executa marca as etapas; iniciar e encerrar continuam restritos ao engenheiro.
    [HttpPost, ValidateAntiForgeryToken]
    [Authorize(Roles = "Operador,Engenheiro")]
    public async Task<IActionResult> MarcarItem(int id, int itemId, bool concluido)
    {
        var item = await _db.OrdensServicoItens
            .Include(i => i.OrdemServico)
            .FirstOrDefaultAsync(i => i.Id == itemId && i.OrdemServicoId == id);
        if (item?.OrdemServico == null) return NotFound();
        if (ApenasOperador && item.OrdemServico.OperadorId != _users.GetUserId(User)) return NotFound();

        if (item.OrdemServico.Status != StatusOrdem.EmAndamento)
        {
            TempData["Aviso"] = "O checklist só pode ser preenchido com a OS em andamento.";
            return RedirectToAction(nameof(Details), new { id });
        }

        item.Concluido = concluido;
        item.ConcluidoPor = concluido ? User.Identity?.Name : null;
        item.ConcluidoEm = concluido ? DateTime.UtcNow : null;
        await _db.SaveChangesAsync();

        return RedirectToAction(nameof(Details), "OrdemServico", new { id }, "checklist");
    }

    [HttpPost, ValidateAntiForgeryToken]
    [Authorize(Roles = "Engenheiro,Gestor")]
    public async Task<IActionResult> Atribuir(int id, string? operadorId)
    {
        var os = await _db.OrdensServico.FindAsync(id);
        if (os == null) return NotFound();

        if (!string.IsNullOrWhiteSpace(operadorId) && !await OperadorValidoAsync(operadorId))
        {
            TempData["Aviso"] = "Selecione uma conta ativa com perfil de Operador.";
            return RedirectToAction(nameof(Details), new { id });
        }

        os.OperadorId = string.IsNullOrWhiteSpace(operadorId) ? null : operadorId;
        await _db.SaveChangesAsync();
        TempData["Sucesso"] = os.OperadorId == null
            ? "Operador removido da ordem de serviço."
            : "Operador atribuído à ordem de serviço.";

        return RedirectToAction(nameof(Details), new { id });
    }
    // ---------- Aprovar / Rejeitar (RF9) ----------
    [HttpPost, ValidateAntiForgeryToken]
    [Authorize(Roles = "Gestor")]
    public async Task<IActionResult> Decidir(int id, bool aprovar)
    {
        var os = await _db.OrdensServico.FindAsync(id);
        if (os == null) return NotFound();

        if (os.Status != StatusOrdem.Aberta)
        {
            TempData["Aviso"] = "Esta OS já foi analisada.";
            return RedirectToAction(nameof(Details), new { id });
        }

        os.Status = aprovar ? StatusOrdem.Aprovada : StatusOrdem.Rejeitada;
        os.AprovadorId = User.Identity?.Name;
        os.DataAprovacao = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        TempData["Sucesso"] = aprovar ? "OS aprovada." : "OS rejeitada.";
        return RedirectToAction(nameof(Details), new { id });
    }

    // ---------- Iniciar ----------
    [HttpPost, ValidateAntiForgeryToken]
    [Authorize(Roles = "Engenheiro")]
    public async Task<IActionResult> Iniciar(int id)
    {
        var os = await _db.OrdensServico.Include(o => o.Ativo).FirstOrDefaultAsync(o => o.Id == id);
        if (os == null) return NotFound();

        if (os.Status != StatusOrdem.Aprovada)
        {
            TempData["Aviso"] = "Só é possível iniciar uma OS aprovada.";
            return RedirectToAction(nameof(Details), new { id });
        }

        os.Status = StatusOrdem.EmAndamento;
        if (os.Ativo != null) os.Ativo.Status = StatusAtivo.EmManutencao;
        await _db.SaveChangesAsync();

        TempData["Sucesso"] = "OS iniciada. O equipamento foi marcado como Em manutenção.";
        return RedirectToAction(nameof(Details), new { id });
    }

    // ---------- Encerrar ----------
    [HttpPost, ValidateAntiForgeryToken]
    [Authorize(Roles = "Engenheiro")]
    public async Task<IActionResult> Encerrar(
        int id,
        [FromServices] Maquina3DControleEstado controles,
        [FromServices] IHubContext<DashboardHub> hub)
    {
        var os = await _db.OrdensServico.Include(o => o.Ativo).FirstOrDefaultAsync(o => o.Id == id);
        if (os == null) return NotFound();

        if (os.Status != StatusOrdem.EmAndamento)
        {
            TempData["Aviso"] = "Só é possível encerrar uma OS em andamento.";
            return RedirectToAction(nameof(Details), new { id });
        }

        os.Status = StatusOrdem.Encerrada;
        os.DataEncerramento = DateTime.UtcNow;
        if (os.Ativo != null) os.Ativo.Status = StatusAtivo.Operando;
        var corrigidos = await CorrigirDefeitosAsync(os);
        await _db.SaveChangesAsync();

        // O conserto também encerra a falha forçada e devolve a velocidade normal.
        var estado = controles.Atualizar(os.AtivoId, Maquina3DControleEstado.CadenciaNominal, false);
        await hub.Clients.All.SendAsync("EstadoMaquina3DAlterado",
            new { ativoId = os.AtivoId, cadencia = estado.Cadencia, falhaSimulada = estado.FalhaSimulada });

        TempData["Sucesso"] = "OS encerrada. O equipamento voltou a operar."
            + (corrigidos == 0 ? "" : corrigidos == 1 ? " 1 alerta corrigido." : $" {corrigidos} alertas corrigidos.");
        return RedirectToAction(nameof(Details), new { id });
    }

    // A OS aberta por um alerta conserta o parâmetro dele; sem alerta, conserta a máquina toda.
    private async Task<int> CorrigirDefeitosAsync(OrdemServico os)
    {
        var abertos = _db.Alertas.Where(a => a.Status != StatusAlerta.Normalizado);
        if (os.AlertaId is { } alertaId)
        {
            var parametroId = await _db.Alertas.Where(a => a.Id == alertaId)
                .Select(a => a.ParametroId)
                .FirstAsync();
            abertos = abertos.Where(a => a.ParametroId == parametroId);
        }
        else
        {
            abertos = abertos.Where(a => a.Parametro!.AtivoId == os.AtivoId);
        }

        var lista = await abertos.ToListAsync();
        foreach (var alerta in lista)
        {
            alerta.Status = StatusAlerta.Normalizado;
            if (string.IsNullOrWhiteSpace(alerta.Observacao))
                alerta.Observacao = $"Corrigido pela ordem de serviço #{os.Id}.";
        }

        return lista.Count;
    }

    private async Task CarregarOperadoresAsync(string? selecionado)
    {
        var operadores = await _users.GetUsersInRoleAsync("Operador");
        var ativos = operadores
            .Where(u => !u.LockoutEnd.HasValue || u.LockoutEnd <= DateTimeOffset.UtcNow)
            .OrderBy(u => u.Email)
            .Select(u => new { u.Id, Nome = u.Email ?? u.UserName ?? "Operador" })
            .ToList();

        ViewBag.Operadores = new SelectList(ativos, "Id", "Nome", selecionado);
    }

    private async Task<bool> OperadorValidoAsync(string operadorId)
    {
        var operador = await _users.FindByIdAsync(operadorId);
        return operador != null
            && (!operador.LockoutEnd.HasValue || operador.LockoutEnd <= DateTimeOffset.UtcNow)
            && await _users.IsInRoleAsync(operador, "Operador");
    }
    private Task<OrdemServico?> OrdemAbertaDoAlertaAsync(int alertaId) =>
        _db.OrdensServico.AsNoTracking().FirstOrDefaultAsync(o =>
            o.AlertaId == alertaId &&
            o.Status != StatusOrdem.Encerrada && o.Status != StatusOrdem.Rejeitada);

    // O operador só abre a própria OS; nos outros casos volta para a lista.
    private IActionResult RedirecionarParaExistente(OrdemServico existente, string aviso)
    {
        TempData["Aviso"] = aviso;
        return ApenasOperador && existente.OperadorId != _users.GetUserId(User)
            ? RedirectToAction(nameof(Index))
            : RedirectToAction(nameof(Details), new { id = existente.Id });
    }

    private async Task PrepararFormularioAsync(OrdemServico os, HashSet<int> marcadas, bool podeAtribuirOperador)
    {
        await CarregarAtivosAsync(os.AtivoId);
        if (podeAtribuirOperador)
            await CarregarOperadoresAsync(os.OperadorId);

        var ativo = await _db.Ativos.AsNoTracking().FirstOrDefaultAsync(a => a.Id == os.AtivoId);
        var rotinas = ativo is null ? [] : await _planejamento.RotinasDoAtivoAsync(ativo);
        ViewData["Ativo"] = ativo;
        ViewData["Checklist"] = new RotinasChecklistVM(
            rotinas.OrderByDescending(r => marcadas.Contains(r.Id)).ThenBy(r => r.Titulo).ToList(),
            marcadas, ativo is not null);
    }

    private static string? JuntarPecas(IEnumerable<RotinaManutencao> rotinas)
    {
        var pecas = string.Join("; ", rotinas
            .Select(r => r.PecasMateriais?.Trim())
            .Where(p => !string.IsNullOrEmpty(p))
            .Distinct());
        return pecas.Length == 0 ? null : Limitar(pecas, 1000);
    }

    private static string Limitar(string texto, int maximo) =>
        texto.Length <= maximo ? texto : texto[..(maximo - 1)] + "…";

    private async Task CarregarAtivosAsync(int? selecionado)
    {
        var ativos = await _db.Ativos.AsNoTracking().OrderBy(a => a.Nome).ToListAsync();
        ViewBag.Ativos = new SelectList(ativos, "Id", "Nome", selecionado);
    }
}
