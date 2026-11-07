using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Rendering;
using Microsoft.EntityFrameworkCore;
using ProjetoIntegrador_Petroleo.Data;

namespace ProjetoIntegrador_Petroleo.Controllers;

[Authorize(Roles = "Engenheiro,Gestor")]
public class AnomaliasController : Controller
{
    private readonly AppDbContext _db;
    public AnomaliasController(AppDbContext db) => _db = db;

    public async Task<IActionResult> Index(int? ativoId, int dias = 7)
    {
        dias = dias is 1 or 7 or 30 ? dias : 7;
        var desde = DateTime.Now.AddDays(-dias);

        var query = _db.Anomalias
            .Include(a => a.Parametro).ThenInclude(p => p!.Ativo)
            .AsNoTracking()
            .Where(a => a.DataHora >= desde);

        if (ativoId != null)
            query = query.Where(a => a.Parametro!.AtivoId == ativoId);

        var lista = await query
            .OrderByDescending(a => a.DataHora)
            .Take(200)
            .ToListAsync();

        var ativos = await _db.Ativos.AsNoTracking().OrderBy(a => a.Nome).ToListAsync();
        ViewBag.Ativos = new SelectList(ativos, "Id", "Nome", ativoId);
        ViewBag.Dias = dias;

        return View(lista);
    }
}