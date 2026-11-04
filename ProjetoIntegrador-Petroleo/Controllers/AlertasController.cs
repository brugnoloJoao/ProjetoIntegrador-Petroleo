
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ProjetoIntegrador_Petroleo.Data;
using ProjetoIntegrador_Petroleo.Models;

[Authorize]
public class AlertasController : Controller
{
    private readonly AppDbContext _db;
    public AlertasController(AppDbContext db) => _db = db;

    public async Task<IActionResult> Index(StatusAlerta? status)
    {
        var query = _db.Alertas
            .Include(a => a.Parametro).ThenInclude(p => p!.Ativo)
            .AsNoTracking()
            .AsQueryable();

        if (status != null)
            query = query.Where(a => a.Status == status);

        var lista = await query
            .OrderBy(a => a.Status)                    // Ativos primeiro
            .ThenByDescending(a => a.Severidade)       // Críticos primeiro
            .ThenByDescending(a => a.DataHora)
            .Take(200)
            .ToListAsync();

        ViewData["Filtro"] = status?.ToString() ?? "";
        return View(lista);
    }

    [HttpGet]
    public async Task<IActionResult> Reconhecer(int id)
    {
        var alerta = await CarregarAsync(id);
        if (alerta == null) return NotFound();

        if (alerta.ReconhecidoEm != null)
        {
            TempData["Aviso"] = $"Alerta já reconhecido por {alerta.ReconhecidoPorId} em {alerta.ReconhecidoEm:dd/MM/yyyy HH:mm}.";
            return RedirectToAction(nameof(Index));
        }
        return View(alerta);
    }

    [HttpPost, ValidateAntiForgeryToken]
    public async Task<IActionResult> Reconhecer(int id, string observacao)
    {
        var alerta = await CarregarAsync(id);
        if (alerta == null) return NotFound();

        if (alerta.ReconhecidoEm != null)
        {
            TempData["Aviso"] = $"Alerta já reconhecido por {alerta.ReconhecidoPorId} em {alerta.ReconhecidoEm:dd/MM/yyyy HH:mm}.";
            return RedirectToAction(nameof(Index));
        }

        if (string.IsNullOrWhiteSpace(observacao))
        {
            ModelState.AddModelError("", "Informe uma observação.");
            return View(alerta);
        }

        alerta.Observacao = observacao.Trim();
        alerta.ReconhecidoPorId = User.Identity?.Name ?? "Usuário";
        alerta.ReconhecidoEm = DateTime.Now;

        // Se o valor já normalizou, só registra a observação e mantém "Normalizado"
        if (alerta.Status == StatusAlerta.Ativo)
            alerta.Status = StatusAlerta.Reconhecido;

        try
        {
            await _db.SaveChangesAsync();
            TempData["Sucesso"] = "Alerta reconhecido.";
        }
        catch (DbUpdateException)
        {
            TempData["Aviso"] = "Falha ao salvar. O alerta continua ativo, tente novamente.";
        }
        return RedirectToAction(nameof(Index));
    }

    private Task<Alerta?> CarregarAsync(int id) =>
        _db.Alertas
            .Include(a => a.Parametro).ThenInclude(p => p!.Ativo)
            .FirstOrDefaultAsync(a => a.Id == id);
}