using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Rendering;
using Microsoft.EntityFrameworkCore;
using ProjetoIntegrador_Petroleo.Data;
using ProjetoIntegrador_Petroleo.Services;

namespace ProjetoIntegrador_Petroleo.Controllers;

[Authorize(Roles = "Engenheiro,Gestor")]
public class AnomaliasController : Controller
{
    private readonly AppDbContext _db;
    private readonly SimuladorEstado _simulador;
    public AnomaliasController(AppDbContext db, SimuladorEstado simulador)
    {
        _db = db;
        _simulador = simulador;
    }

    public async Task<IActionResult> Index(int? ativoId, int dias = 7)
    {
        dias = dias is 1 or 7 or 30 ? dias : 7;
        var desde = DateTime.UtcNow.AddDays(-dias);

        var query = _db.Anomalias
            .Include(a => a.Parametro).ThenInclude(p => p!.Ativo)
            .AsNoTracking()
            .Where(a => a.DataHora >= desde);

        if (!_simulador.Ativo)
            query = query.Where(a => !a.Simulada);

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
