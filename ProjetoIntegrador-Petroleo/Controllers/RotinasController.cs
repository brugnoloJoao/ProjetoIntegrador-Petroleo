using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Rendering;
using Microsoft.EntityFrameworkCore;
using ProjetoIntegrador_Petroleo.Data;
using ProjetoIntegrador_Petroleo.Models;

namespace ProjetoIntegrador_Petroleo.Controllers;

// Cadastro de manutenção: o que o manual de cada máquina manda fazer.
[Authorize(Roles = "Engenheiro,Gestor")]
public sealed class RotinasController(AppDbContext db) : Controller
{
    private const string CamposDoFormulario =
        "AtivoId,TipoAtivo,Titulo,Instrucoes,ParametroNome,TipoManutencao,PecasMateriais,IntervaloDias,Ativa";

    public async Task<IActionResult> Index(int? ativoId)
    {
        var rotinas = await db.RotinasManutencao.AsNoTracking()
            .Include(r => r.Ativo)
            .OrderBy(r => r.AtivoId == null ? r.TipoAtivo : r.Ativo!.Nome)
            .ThenBy(r => r.Titulo)
            .ToListAsync();

        if (ativoId != null)
        {
            var ativo = await db.Ativos.AsNoTracking().FirstOrDefaultAsync(a => a.Id == ativoId);
            if (ativo == null) return NotFound();
            rotinas = rotinas.Where(r => r.AplicaA(ativo)).ToList();
            ViewData["Ativo"] = ativo;
        }

        return View(rotinas);
    }

    [HttpGet]
    public async Task<IActionResult> Create(int? ativoId)
    {
        var rotina = new RotinaManutencao { AtivoId = ativoId };
        await CarregarListasAsync(rotina);
        return View(rotina);
    }

    [HttpPost, ValidateAntiForgeryToken]
    public async Task<IActionResult> Create([Bind(CamposDoFormulario)] RotinaManutencao rotina, string? escopo)
    {
        await ValidarAlvoAsync(rotina, escopo);
        await ValidarGatilhoAsync(rotina);
        if (!ModelState.IsValid)
        {
            await CarregarListasAsync(rotina);
            return View(rotina);
        }

        Normalizar(rotina);
        rotina.CriadaEm = DateTime.UtcNow;
        db.RotinasManutencao.Add(rotina);
        await db.SaveChangesAsync();

        TempData["Sucesso"] = "Rotina cadastrada.";
        return RedirectToAction(nameof(Index));
    }

    [HttpGet]
    public async Task<IActionResult> Edit(int id)
    {
        var rotina = await db.RotinasManutencao.AsNoTracking().FirstOrDefaultAsync(r => r.Id == id);
        if (rotina == null) return NotFound();

        await CarregarListasAsync(rotina);
        return View(rotina);
    }

    [HttpPost, ValidateAntiForgeryToken]
    public async Task<IActionResult> Edit(int id, [Bind(CamposDoFormulario)] RotinaManutencao dados, string? escopo)
    {
        var rotina = await db.RotinasManutencao.FirstOrDefaultAsync(r => r.Id == id);
        if (rotina == null) return NotFound();

        // Rotina que já entrou em alguma OS mantém o equipamento ou tipo original.
        if (await JaUsadaAsync(id))
        {
            dados.AtivoId = rotina.AtivoId;
            dados.TipoAtivo = rotina.TipoAtivo;
            ModelState.Remove(nameof(dados.AtivoId));
            ModelState.Remove(nameof(dados.TipoAtivo));
        }
        else
        {
            await ValidarAlvoAsync(dados, escopo);
        }

        await ValidarGatilhoAsync(dados);
        dados.Id = id;
        if (!ModelState.IsValid)
        {
            await CarregarListasAsync(dados);
            return View(dados);
        }

        Normalizar(dados);
        dados.CriadaEm = rotina.CriadaEm;
        db.Entry(rotina).CurrentValues.SetValues(dados);
        await db.SaveChangesAsync();

        TempData["Sucesso"] = "Rotina atualizada.";
        return RedirectToAction(nameof(Index));
    }

    [HttpGet]
    public async Task<IActionResult> Delete(int id)
    {
        var rotina = await db.RotinasManutencao.AsNoTracking()
            .Include(r => r.Ativo)
            .FirstOrDefaultAsync(r => r.Id == id);
        return rotina == null ? NotFound() : View(rotina);
    }

    [HttpPost, ActionName("Delete"), ValidateAntiForgeryToken]
    public async Task<IActionResult> DeleteConfirmed(int id)
    {
        var rotina = await db.RotinasManutencao.FirstOrDefaultAsync(r => r.Id == id);
        if (rotina != null)
        {
            // Os checklists já abertos permanecem; só perdem o vínculo com a rotina.
            var itens = await db.OrdensServicoItens.Where(i => i.RotinaManutencaoId == id).ToListAsync();
            itens.ForEach(i => i.RotinaManutencaoId = null);
            db.RotinasManutencao.Remove(rotina);
            await db.SaveChangesAsync();
            TempData["Sucesso"] = "Rotina excluída.";
        }

        return RedirectToAction(nameof(Index));
    }

    private Task<bool> JaUsadaAsync(int id) =>
        db.OrdensServicoItens.AnyAsync(i => i.RotinaManutencaoId == id);

    // A rotina vale para um tipo de máquina ou para um equipamento, nunca os dois.
    private async Task ValidarAlvoAsync(RotinaManutencao rotina, string? escopo)
    {
        if (escopo == "ativo")
        {
            rotina.TipoAtivo = null;
            if (rotina.AtivoId == null || !await db.Ativos.AnyAsync(a => a.Id == rotina.AtivoId))
                ModelState.AddModelError(nameof(rotina.AtivoId), "Selecione o equipamento.");
        }
        else
        {
            rotina.AtivoId = null;
            ModelState.Remove(nameof(rotina.AtivoId));
            var tipo = TiposEquipamento.Todos
                .FirstOrDefault(t => TiposEquipamento.Normalizar(t) == TiposEquipamento.Normalizar(rotina.TipoAtivo));
            if (tipo is null)
                ModelState.AddModelError(nameof(rotina.TipoAtivo), "Escolha o tipo de equipamento.");
            else
                rotina.TipoAtivo = tipo;
        }

        if (!Enum.IsDefined(rotina.TipoManutencao))
            ModelState.AddModelError(nameof(rotina.TipoManutencao), "Escolha o tipo de manutenção.");
    }

    // O parâmetro que aciona a rotina precisa ser um dos que existem no sistema.
    private async Task ValidarGatilhoAsync(RotinaManutencao rotina)
    {
        if (string.IsNullOrWhiteSpace(rotina.ParametroNome))
            return;

        var opcao = GatilhoRotina.Localizar(await GatilhosAsync(), rotina.ParametroNome);
        if (opcao is null)
            ModelState.AddModelError(nameof(rotina.ParametroNome), "Escolha um parâmetro da lista.");
        else
            rotina.ParametroNome = opcao.Valor;
    }

    private async Task<List<OpcaoGatilho>> GatilhosAsync() =>
        GatilhoRotina.Opcoes(await db.Parametros.AsNoTracking().Select(p => p.Nome).ToListAsync());

    private static void Normalizar(RotinaManutencao rotina)
    {
        rotina.Titulo = rotina.Titulo.Trim();
        rotina.TipoAtivo = Limpar(rotina.TipoAtivo);
        rotina.ParametroNome = Limpar(rotina.ParametroNome);
        rotina.Instrucoes = Limpar(rotina.Instrucoes);
        rotina.PecasMateriais = Limpar(rotina.PecasMateriais);

        static string? Limpar(string? texto) => string.IsNullOrWhiteSpace(texto) ? null : texto.Trim();
    }

    private async Task CarregarListasAsync(RotinaManutencao rotina)
    {
        var ativos = await db.Ativos.AsNoTracking().OrderBy(a => a.Nome).ToListAsync();
        ViewBag.Ativos = new SelectList(
            ativos.Select(a => new { a.Id, Nome = $"{a.Nome} · {a.Tag}" }), "Id", "Nome", rotina.AtivoId);
        ViewBag.Gatilhos = await GatilhosAsync();
        ViewData["Bloqueada"] = rotina.Id != 0 && await JaUsadaAsync(rotina.Id);
    }
}
