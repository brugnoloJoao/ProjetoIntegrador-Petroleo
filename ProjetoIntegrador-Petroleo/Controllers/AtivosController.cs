
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ProjetoIntegrador_Petroleo.Data;
using ProjetoIntegrador_Petroleo.Models;

public class AtivosController : Controller
{
    private readonly AppDbContext _context;

    public AtivosController(AppDbContext context)
    {
        _context = context;
    }


    // GET: ATIVOS
    [Authorize(Roles = "Engenheiro,Gestor")]
    public async Task<IActionResult> Index()    
    {
        return View(await _context.Ativos
            .AsNoTracking()
            .Include(a => a.Parametros)
            .OrderBy(a => a.Nome)
            .ToListAsync());
    }

    // GET: ATIVOS/Details/5
    [Authorize(Roles = "Engenheiro,Gestor")]
    public async Task<IActionResult> Details(int? id)
    {
        if (id == null)
        {
            return NotFound();
        }

        var ativo = await _context.Ativos
            .Include(a => a.Parametros)
            .FirstOrDefaultAsync(m => m.Id == id);
        if (ativo == null)
        {
            return NotFound();
        }

        return View(ativo);
    }

    // GET: ATIVOS/Create
    [Authorize(Roles = "Engenheiro,Gestor")]
    public IActionResult Create()
    {
        return View();
    }

    // POST: ATIVOS/Create
    // To protect from overposting attacks, enable the specific properties you want to bind to.
    // For more details, see http://go.microsoft.com/fwlink/?LinkId=317598.
    [HttpPost]
    [ValidateAntiForgeryToken]
    [Authorize(Roles = "Engenheiro,Gestor")]
    public async Task<IActionResult> Create([Bind("Id,Nome,Tag,Tipo,Status")] Ativo ativo)
    {
        ValidarTipo(ativo);
        if (ModelState.IsValid)
        {
            _context.Add(ativo);
            await _context.SaveChangesAsync();
            return RedirectToAction(nameof(Index));
        }
        return View(ativo);
    }

    // GET: ATIVOS/Edit/5
    [Authorize(Roles = "Engenheiro,Gestor")]
    public async Task<IActionResult> Edit(int? id, string? voltar)
    {
        if (id == null)
        {
            return NotFound();
        }

        var ativo = await _context.Ativos.FindAsync(id);
        if (ativo == null)
        {
            return NotFound();
        }
        ViewData["Voltar"] = voltar;
        return View(ativo);
    }

    // POST: ATIVOS/Edit/5
    // To protect from overposting attacks, enable the specific properties you want to bind to.
    // For more details, see http://go.microsoft.com/fwlink/?LinkId=317598.
    [HttpPost]
    [ValidateAntiForgeryToken]
    [Authorize(Roles = "Engenheiro,Gestor")]
    public async Task<IActionResult> Edit(int? id, [Bind("Id,Nome,Tag,Tipo,Status")] Ativo ativo, string? voltar)
    {
        if (id != ativo.Id)
        {
            return NotFound();
        }

        ValidarTipo(ativo);

        if (ModelState.IsValid)
        {
            try
            {
                _context.Update(ativo);
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                if (!AtivoExists(ativo.Id))
                {
                    return NotFound();
                }
                else
                {
                    throw;
                }
            }
            return voltar == "detalhes"
                ? RedirectToAction(nameof(Details), new { id = ativo.Id })
                : RedirectToAction(nameof(Index));
        }
        ViewData["Voltar"] = voltar;
        return View(ativo);
    }

    // GET: ATIVOS/Delete/5
    [Authorize(Roles = "Engenheiro,Gestor")]
    public async Task<IActionResult> Delete(int? id)
    {
        if (id == null)
        {
            return NotFound();
        }

        var ativo = await _context.Ativos.AsNoTracking()
            .Include(a => a.Parametros)
            .FirstOrDefaultAsync(m => m.Id == id);
        if (ativo == null)
        {
            return NotFound();
        }

        // O que vai junto na exclusão, para a pessoa decidir sabendo.
        ViewData["Alertas"] = await _context.Alertas.CountAsync(a => a.Parametro!.AtivoId == id);
        ViewData["Ordens"] = await _context.OrdensServico.CountAsync(o => o.AtivoId == id);
        ViewData["Rotinas"] = await _context.RotinasManutencao.CountAsync(r => r.AtivoId == id);
        return View(ativo);
    }

    // POST: ATIVOS/Delete/5
    [HttpPost, ActionName("Delete")]
    [ValidateAntiForgeryToken]
    [Authorize(Roles = "Engenheiro,Gestor")]
    public async Task<IActionResult> DeleteConfirmed(int? id)
    {
        var ativo = await _context.Ativos.FindAsync(id);
        if (ativo != null)
        {
            _context.Ativos.Remove(ativo);
        }

        await _context.SaveChangesAsync();
        return RedirectToAction(nameof(Index));
    }

    // Só os tipos da lista, para a máquina ter o modelo 3D certo.
    private void ValidarTipo(Ativo ativo)
    {
        if (string.IsNullOrWhiteSpace(ativo.Tipo)) return; // a mensagem de campo obrigatório já aparece
        var tipo = TiposEquipamento.Todos
            .FirstOrDefault(t => TiposEquipamento.Normalizar(t) == TiposEquipamento.Normalizar(ativo.Tipo));
        if (tipo is null) ModelState.AddModelError(nameof(ativo.Tipo), "Escolha um tipo da lista.");
        else ativo.Tipo = tipo;
    }

    private bool AtivoExists(int? id)
    {
        return _context.Ativos.Any(e => e.Id == id);
    }
}
