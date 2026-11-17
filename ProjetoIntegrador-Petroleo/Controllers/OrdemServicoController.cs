using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Rendering;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using ProjetoIntegrador_Petroleo.Data;
using ProjetoIntegrador_Petroleo.Models;

namespace ProjetoIntegrador_Petroleo.Controllers;

[Authorize]
public class OrdemServicoController : Controller
{
    private readonly AppDbContext _db;
    private readonly UserManager<IdentityUser> _users;

    public OrdemServicoController(AppDbContext db, UserManager<IdentityUser> users)
    {
        _db = db;
        _users = users;
    }

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
        return View(lista);
    }

    public async Task<IActionResult> Details(int id)
    {
        var query = _db.OrdensServico
            .Include(o => o.Ativo)
            .Include(o => o.Operador)
            .Include(o => o.Alerta).ThenInclude(a => a!.Parametro)
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
    public async Task<IActionResult> Create(int? alertaId, int? ativoId)
    {
        var os = new OrdemServico();
        var podeAtribuirOperador = User.IsInRole("Engenheiro") || User.IsInRole("Gestor");
        if (!podeAtribuirOperador)
            os.OperadorId = _users.GetUserId(User);

        if (alertaId != null)
        {
            var alerta = await _db.Alertas
                .Include(a => a.Parametro).ThenInclude(p => p!.Ativo)
                .FirstOrDefaultAsync(a => a.Id == alertaId);
            if (alerta == null) return NotFound();

            // Evita duas OS abertas para o mesmo alerta
            var existente = await _db.OrdensServico.FirstOrDefaultAsync(o =>
                o.AlertaId == alertaId &&
                o.Status != StatusOrdem.Encerrada && o.Status != StatusOrdem.Rejeitada);
            if (existente != null)
            {
                TempData["Aviso"] = "Já existe uma OS em andamento para este alerta.";
                return RedirectToAction(nameof(Details), new { id = existente.Id });
            }

            os.AlertaId = alerta.Id;
            os.AtivoId = alerta.Parametro!.AtivoId;
            os.Titulo = $"{alerta.Parametro.Nome} fora do limite em {alerta.Parametro.Ativo!.Nome}";
            os.Descricao = $"Alerta {alerta.Severidade} em {alerta.DataHora:dd/MM/yyyy HH:mm}: " +
                           $"valor {alerta.ValorMedido:F1} {alerta.Parametro.Unidade} " +
                           $"(limite {alerta.LimiteViolado:F1}).";
            os.Prioridade = alerta.Severidade == Severidade.Critico ? Prioridade.Alta : Prioridade.Media;
        }
        else if (ativoId != null)
        {
            var ativo = await _db.Ativos.FindAsync(ativoId);
            if (ativo == null) return NotFound();

            os.AtivoId = ativo.Id;
            os.Titulo = $"Manutenção preventiva em {ativo.Nome}";
            os.Descricao = "Intervenção planejada com base no ranking de risco de falha.";
            os.Prioridade = Prioridade.Media;
        }

        await CarregarAtivosAsync(os.AtivoId);
        if (podeAtribuirOperador)
            await CarregarOperadoresAsync(os.OperadorId);
        return View(os);
    }

    [HttpPost, ValidateAntiForgeryToken]
    [Authorize(Roles = "Operador,Engenheiro,Gestor")]
    public async Task<IActionResult> Create(
        [Bind("AtivoId,AlertaId,Titulo,Descricao,Prioridade,OperadorId")] OrdemServico os)
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

        if (!ModelState.IsValid)
        {
            await CarregarAtivosAsync(os.AtivoId);
            if (podeAtribuirOperador)
                await CarregarOperadoresAsync(os.OperadorId);
            return View(os);
        }

        os.SolicitanteId = User.Identity?.Name ?? "Usuário";
        os.Status = StatusOrdem.Aberta;
        os.DataAbertura = DateTime.UtcNow;

        _db.OrdensServico.Add(os);
        await _db.SaveChangesAsync();

        TempData["Sucesso"] = "Ordem de serviço aberta. Aguardando aprovação do gestor.";
        return RedirectToAction(nameof(Details), new { id = os.Id });
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
    public async Task<IActionResult> Encerrar(int id)
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
        await _db.SaveChangesAsync();

        TempData["Sucesso"] = "OS encerrada. O equipamento voltou a operar.";
        return RedirectToAction(nameof(Details), new { id });
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
    private async Task CarregarAtivosAsync(int? selecionado)
    {
        var ativos = await _db.Ativos.AsNoTracking().OrderBy(a => a.Nome).ToListAsync();
        ViewBag.Ativos = new SelectList(ativos, "Id", "Nome", selecionado);
    }
}
