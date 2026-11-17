
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ProjetoIntegrador_Petroleo.Models;
using ProjetoIntegrador_Petroleo.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc.Rendering;

[Authorize(Roles = "Engenheiro,Gestor")]
public class ParametrosController : Controller
{
    private readonly AppDbContext _context;

    public ParametrosController(AppDbContext context)
    {
        _context = context;
    }

    // GET: PARAMETROS
    public async Task<IActionResult> Index()
    {
        var parametros = await _context.Parametros
            .AsNoTracking()
            .Include(p => p.Ativo)
            .OrderBy(p => p.Ativo!.Nome)
            .ThenBy(p => p.Nome)
            .ToListAsync();

        return View(parametros);
    }

    // GET: PARAMETROS/Create
    public async Task<IActionResult> Create()
    {
        await CarregarAtivosAsync();
        return View();
    }

    // POST: PARAMETROS/Create
    // To protect from overposting attacks, enable the specific properties you want to bind to.
    // For more details, see http://go.microsoft.com/fwlink/?LinkId=317598.
    [HttpPost]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> Create([Bind("AtivoId,Nome,Unidade,LimiteAtencao,LimiteCritico")] Parametro parametro)
    {
        if (parametro.AtivoId <= 0 || !await _context.Ativos.AnyAsync(a => a.Id == parametro.AtivoId))
        {
            ModelState.AddModelError(nameof(parametro.AtivoId), "Selecione um ativo válido.");
        }

        if (ModelState.IsValid)
        {
            _context.Add(parametro);
            await _context.SaveChangesAsync();
            return RedirectToAction(nameof(Index));
        }
        await CarregarAtivosAsync(parametro.AtivoId);
        return View(parametro);
    }

    // GET: PARAMETROS/Edit/5
    public async Task<IActionResult> Edit(int? id)
    {
        if (id == null)
        {
            return NotFound();
        }

        var parametro = await _context.Parametros.FindAsync(id);
        if (parametro == null)
        {
            return NotFound();
        }
        await CarregarAtivosAsync(parametro.AtivoId);
        return View(parametro);
    }

    // POST: PARAMETROS/Edit/5
    // To protect from overposting attacks, enable the specific properties you want to bind to.
    // For more details, see http://go.microsoft.com/fwlink/?LinkId=317598.
    [HttpPost]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> Edit(int? id, [Bind("Id,AtivoId,Nome,Unidade,LimiteAtencao,LimiteCritico")] Parametro parametro)
    {
        if (id != parametro.Id)
        {
            return NotFound();
        }

        if (parametro.AtivoId <= 0 || !await _context.Ativos.AnyAsync(a => a.Id == parametro.AtivoId))
        {
            ModelState.AddModelError(nameof(parametro.AtivoId), "Selecione um ativo válido.");
        }

        if (ModelState.IsValid)
        {
            try
            {
                _context.Update(parametro);
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                if (!ParametroExists(parametro.Id))
                {
                    return NotFound();
                }
                else
                {
                    throw;
                }
            }
            return RedirectToAction(nameof(Index));
        }
        await CarregarAtivosAsync(parametro.AtivoId);
        return View(parametro);
    }

    // GET: PARAMETROS/Delete/5
    public async Task<IActionResult> Delete(int? id)
    {
        if (id == null)
        {
            return NotFound();
        }

        var parametro = await _context.Parametros
            .FirstOrDefaultAsync(m => m.Id == id);
        if (parametro == null)
        {
            return NotFound();
        }

        return View(parametro);
    }

    // POST: PARAMETROS/Delete/5
    [HttpPost, ActionName("Delete")]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> DeleteConfirmed(int? id)
    {
        var parametro = await _context.Parametros.FindAsync(id);
        if (parametro != null)
        {
            _context.Parametros.Remove(parametro);
        }

        await _context.SaveChangesAsync();
        return RedirectToAction(nameof(Index));
    }

    private bool ParametroExists(int? id)
    {
        return _context.Parametros.Any(e => e.Id == id);
    }

    private async Task CarregarAtivosAsync(int? selecionado = null)
    {
        var ativos = await _context.Ativos
            .AsNoTracking()
            .OrderBy(a => a.Nome)
            .Select(a => new { a.Id, a.Nome, a.Tag })
            .ToListAsync();

        ViewBag.Ativos = new SelectList(
            ativos.Select(a => new { a.Id, Nome = string.IsNullOrWhiteSpace(a.Tag) ? a.Nome : $"{a.Nome} · {a.Tag}" }),
            "Id",
            "Nome",
            selecionado);
    }
}
