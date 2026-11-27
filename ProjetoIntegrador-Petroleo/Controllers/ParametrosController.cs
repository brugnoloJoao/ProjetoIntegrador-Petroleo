
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.ModelBinding;
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
    // "voltarAtivo": quem veio da tela de um ativo volta para ela.
    public async Task<IActionResult> Create(int? voltarAtivo)
    {
        ViewData["VoltarAtivo"] = voltarAtivo;
        // Sem modelo, para os limites começarem vazios; a lista já vem com o ativo marcado.
        await CarregarAtivosAsync(voltarAtivo);
        return View();
    }

    // POST: PARAMETROS/Create
    // To protect from overposting attacks, enable the specific properties you want to bind to.
    // For more details, see http://go.microsoft.com/fwlink/?LinkId=317598.
    [HttpPost]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> Create(
        [Bind("AtivoId,Nome,Unidade,LimiteAtencao,LimiteCritico")] Parametro parametro, int? voltarAtivo)
    {
        await ValidarAsync(parametro);

        if (ModelState.IsValid)
        {
            _context.Add(parametro);
            await _context.SaveChangesAsync();
            TempData["Sucesso"] = "Parâmetro cadastrado.";
            return Voltar(voltarAtivo);
        }
        ViewData["VoltarAtivo"] = voltarAtivo;
        await CarregarAtivosAsync(parametro.AtivoId);
        return View(parametro);
    }

    // GET: PARAMETROS/Edit/5
    public async Task<IActionResult> Edit(int? id, int? voltarAtivo)
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
        ViewData["VoltarAtivo"] = voltarAtivo;
        await CarregarAtivosAsync(parametro.AtivoId);
        return View(parametro);
    }

    // POST: PARAMETROS/Edit/5
    // To protect from overposting attacks, enable the specific properties you want to bind to.
    // For more details, see http://go.microsoft.com/fwlink/?LinkId=317598.
    [HttpPost]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> Edit(
        int? id, [Bind("Id,AtivoId,Nome,Unidade,LimiteAtencao,LimiteCritico")] Parametro parametro, int? voltarAtivo)
    {
        if (id != parametro.Id)
        {
            return NotFound();
        }

        await ValidarAsync(parametro);

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
            TempData["Sucesso"] = "Parâmetro atualizado.";
            return Voltar(voltarAtivo);
        }
        ViewData["VoltarAtivo"] = voltarAtivo;
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

        var parametro = await _context.Parametros.AsNoTracking()
            .Include(p => p.Ativo)
            .FirstOrDefaultAsync(m => m.Id == id);
        if (parametro == null)
        {
            return NotFound();
        }

        ViewData["Leituras"] = await _context.Leituras.CountAsync(l => l.ParametroId == id);
        ViewData["Alertas"] = await _context.Alertas.CountAsync(a => a.ParametroId == id);
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
            // As ordens de serviço continuam; só perdem o vínculo com os alertas apagados.
            var ordens = await _context.OrdensServico
                .Where(o => o.Alerta != null && o.Alerta.ParametroId == id)
                .ToListAsync();
            ordens.ForEach(o => o.AlertaId = null);
            _context.Parametros.Remove(parametro);
            await _context.SaveChangesAsync();
            TempData["Sucesso"] = "Parâmetro excluído.";
        }

        return RedirectToAction(nameof(Index));
    }

    private IActionResult Voltar(int? voltarAtivo) => voltarAtivo is { } ativoId
        ? RedirectToAction("Details", "Ativos", new { id = ativoId })
        : RedirectToAction(nameof(Index));

    private async Task ValidarAsync(Parametro parametro)
    {
        if (parametro.AtivoId <= 0 || !await _context.Ativos.AnyAsync(a => a.Id == parametro.AtivoId))
        {
            ModelState.AddModelError(nameof(parametro.AtivoId), "Selecione um ativo válido.");
        }

        // Nome e unidade só os da lista.
        var opcao = CatalogoParametros.Buscar(parametro.Nome);
        if (opcao is null)
        {
            if (!string.IsNullOrWhiteSpace(parametro.Nome))
                ModelState.AddModelError(nameof(parametro.Nome), "Escolha um parâmetro da lista.");
        }
        else
        {
            parametro.Nome = opcao.Nome;
            if (!string.IsNullOrWhiteSpace(parametro.Unidade)
                && !CatalogoParametros.Unidades[opcao.Grandeza].Contains(parametro.Unidade))
                ModelState.AddModelError(nameof(parametro.Unidade), "Escolha uma unidade que combine com o parâmetro.");
        }

        var limitesInformados = ModelState.GetFieldValidationState(nameof(parametro.LimiteAtencao)) != ModelValidationState.Invalid
            && ModelState.GetFieldValidationState(nameof(parametro.LimiteCritico)) != ModelValidationState.Invalid;
        if (limitesInformados && parametro.LimiteCritico <= parametro.LimiteAtencao)
            ModelState.AddModelError(nameof(parametro.LimiteCritico), "O limite crítico precisa ser maior que o de atenção.");
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
