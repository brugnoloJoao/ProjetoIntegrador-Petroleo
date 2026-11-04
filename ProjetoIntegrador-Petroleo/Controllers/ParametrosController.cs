
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ProjetoIntegrador_Petroleo.Models;
using ProjetoIntegrador_Petroleo.Data;

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
        return View(await _context.Parametros.ToListAsync());
    }

    // GET: PARAMETROS/Details/5
    public async Task<IActionResult> Details(int? id)
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

    // GET: PARAMETROS/Create
    public IActionResult Create()
    {
        return View();
    }

    // POST: PARAMETROS/Create
    // To protect from overposting attacks, enable the specific properties you want to bind to.
    // For more details, see http://go.microsoft.com/fwlink/?LinkId=317598.
    [HttpPost]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> Create([Bind("Id,AtivoId,Ativo,Nome,Unidade,LimiteAtencao,LimiteCritico,Leituras")] Parametro parametro)
    {
        if (ModelState.IsValid)
        {
            _context.Add(parametro);
            await _context.SaveChangesAsync();
            return RedirectToAction(nameof(Index));
        }
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
        return View(parametro);
    }

    // POST: PARAMETROS/Edit/5
    // To protect from overposting attacks, enable the specific properties you want to bind to.
    // For more details, see http://go.microsoft.com/fwlink/?LinkId=317598.
    [HttpPost]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> Edit(int? id, [Bind("Id,AtivoId,Ativo,Nome,Unidade,LimiteAtencao,LimiteCritico,Leituras")] Parametro parametro)
    {
        if (id != parametro.Id)
        {
            return NotFound();
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
}
