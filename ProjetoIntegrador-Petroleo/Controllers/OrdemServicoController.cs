
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ProjetoIntegrador_Petroleo.Models;
using ProjetoIntegrador_Petroleo.Data;

public class OrdemServicoController : Controller
{
    private readonly AppDbContext _context;

    public OrdemServicoController(AppDbContext context)
    {
        _context = context;
    }

    // GET: ORDEMSERVICOS
    public async Task<IActionResult> Index()    
    {
        return View(await _context.OrdensServico.ToListAsync());
    }

    // GET: ORDEMSERVICOS/Details/5
    public async Task<IActionResult> Details(int? id)
    {
        if (id == null)
        {
            return NotFound();
        }

        var ordemservico = await _context.OrdensServico
            .FirstOrDefaultAsync(m => m.Id == id);
        if (ordemservico == null)
        {
            return NotFound();
        }

        return View(ordemservico);
    }

    // GET: ORDEMSERVICOS/Create
    public IActionResult Create()
    {
        return View();
    }

    // POST: ORDEMSERVICOS/Create
    // To protect from overposting attacks, enable the specific properties you want to bind to.
    // For more details, see http://go.microsoft.com/fwlink/?LinkId=317598.
    [HttpPost]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> Create([Bind("Id,AtivoId,Ativo,AlertaId,Alerta,Titulo,Descricao,Prioridade,Status,SolicitanteId,AprovadorId,DataAbertura,DataAprovacao,DataEncerramento")] OrdemServico ordemservico)
    {
        if (ModelState.IsValid)
        {
            _context.Add(ordemservico);
            await _context.SaveChangesAsync();
            return RedirectToAction(nameof(Index));
        }
        return View(ordemservico);
    }

    // GET: ORDEMSERVICOS/Edit/5
    public async Task<IActionResult> Edit(int? id)
    {
        if (id == null)
        {
            return NotFound();
        }

        var ordemservico = await _context.OrdensServico.FindAsync(id);
        if (ordemservico == null)
        {
            return NotFound();
        }
        return View(ordemservico);
    }

    // POST: ORDEMSERVICOS/Edit/5
    // To protect from overposting attacks, enable the specific properties you want to bind to.
    // For more details, see http://go.microsoft.com/fwlink/?LinkId=317598.
    [HttpPost]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> Edit(int? id, [Bind("Id,AtivoId,Ativo,AlertaId,Alerta,Titulo,Descricao,Prioridade,Status,SolicitanteId,AprovadorId,DataAbertura,DataAprovacao,DataEncerramento")] OrdemServico ordemservico)
    {
        if (id != ordemservico.Id)
        {
            return NotFound();
        }

        if (ModelState.IsValid)
        {
            try
            {
                _context.Update(ordemservico);
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                if (!OrdemServicoExists(ordemservico.Id))
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
        return View(ordemservico);
    }

    // GET: ORDEMSERVICOS/Delete/5
    public async Task<IActionResult> Delete(int? id)
    {
        if (id == null)
        {
            return NotFound();
        }

        var ordemservico = await _context.OrdensServico
            .FirstOrDefaultAsync(m => m.Id == id);
        if (ordemservico == null)
        {
            return NotFound();
        }

        return View(ordemservico);
    }

    // POST: ORDEMSERVICOS/Delete/5
    [HttpPost, ActionName("Delete")]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> DeleteConfirmed(int? id)
    {
        var ordemservico = await _context.OrdensServico.FindAsync(id);
        if (ordemservico != null)
        {
            _context.OrdensServico.Remove(ordemservico);
        }

        await _context.SaveChangesAsync();
        return RedirectToAction(nameof(Index));
    }

    private bool OrdemServicoExists(int? id)
    {
        return _context.OrdensServico.Any(e => e.Id == id);
    }
}
