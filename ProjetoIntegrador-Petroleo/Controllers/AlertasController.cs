
using System.Globalization;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ProjetoIntegrador_Petroleo.Data;
using ProjetoIntegrador_Petroleo.Models;
using ProjetoIntegrador_Petroleo.Services;
using ProjetoIntegrador_Petroleo.ViewModels;

[Authorize]
public class AlertasController : Controller
{
    private readonly AppDbContext _db;
    private readonly SimuladorEstado _simulador;
    public AlertasController(AppDbContext db, SimuladorEstado simulador)
    {
        _db = db;
        _simulador = simulador;
    }

    public async Task<IActionResult> Index(StatusAlerta? status)
    {
        var query = _db.Alertas
            .Include(a => a.Parametro).ThenInclude(p => p!.Ativo)
            .AsNoTracking()
            .AsQueryable();

        if (!_simulador.Ativo)
            query = query.Where(a => !a.Simulada);

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

    public async Task<IActionResult> Detalhes(
        int id,
        [FromServices] RegistroOcorrencias registro,
        [FromServices] PlanejamentoManutencao planejamento,
        [FromServices] UserManager<IdentityUser> usuarios)
    {
        var alerta = await CarregarAsync(id);
        if (alerta == null) return NotFound();
        var parametro = alerta.Parametro!;

        var evolucao = await registro.EvolucaoAsync(alerta, parametro);
        var rotinas = (await planejamento.RotinasDoAtivoAsync(parametro.Ativo!))
            .Where(r => r.AcionadaPor(parametro.Nome))
            .ToList();
        var ordem = await planejamento.OrdemQueCobreAsync(alerta);
        // O operador continua vendo só as próprias ordens.
        var podeVerOrdem = User.IsInRole("Engenheiro") || User.IsInRole("Gestor")
            || ordem?.OperadorId == usuarios.GetUserId(User);

        // Do pouco antes do alerta até um pouco depois de normalizar (no máximo 10 minutos).
        var de = alerta.DataHora.AddMinutes(-2);
        var ate = alerta.DataHora.AddMinutes(10);
        if (evolucao.Fim is { } fim && fim.AddMinutes(2) < ate) ate = fim.AddMinutes(2);
        var leituras = await _db.Leituras.AsNoTracking()
            .Where(l => l.ParametroId == parametro.Id && l.Simulada == alerta.Simulada
                && l.DataHora >= de && l.DataHora <= ate)
            .OrderBy(l => l.DataHora)
            .Take(300)
            .ToListAsync();

        return View(new AlertaDetalhesVM(alerta, evolucao, rotinas, ordem, podeVerOrdem,
            leituras.Select(l => l.DataHora.HorarioDeBrasilia("HH:mm:ss")).ToList(),
            leituras.Select(l => l.Valor).ToList()));
    }

    // Consultado pelas telas para o contador do menu e o alarme crítico. Não altera nada.
    [HttpGet]
    [ResponseCache(Duration = 0, Location = ResponseCacheLocation.None, NoStore = true)]
    public async Task<IActionResult> Resumo()
    {
        var consulta = _db.Alertas.AsNoTracking().Where(a => _simulador.Ativo || !a.Simulada);
        // O simulador mantém no máximo um alerta aberto por parâmetro, então a lista é curta.
        var idsAtivos = await consulta.Where(a => a.Status == StatusAlerta.Ativo)
            .Select(a => a.Id)
            .ToListAsync();

        // Críticos sem reconhecimento: em aberto, ou que normalizaram há pouco sem ninguém ver.
        var recentes = DateTime.UtcNow.AddMinutes(-10);
        var criticos = await consulta
            .Where(a => a.Severidade == Severidade.Critico && a.ReconhecidoEm == null
                && (a.Status == StatusAlerta.Ativo || a.DataHora >= recentes))
            .OrderBy(a => a.Status)
            .ThenByDescending(a => a.DataHora)
            .Take(20)
            .Select(a => new
            {
                a.Id,
                a.Parametro!.AtivoId,
                Ativo = a.Parametro.Ativo!.Nome,
                a.Parametro.Ativo.Tag,
                Parametro = a.Parametro.Nome,
                a.Parametro.Unidade,
                a.ValorMedido,
                a.DataHora,
                a.Status
            })
            .ToListAsync();

        var cultura = CultureInfo.GetCultureInfo("pt-BR");
        return Json(new
        {
            ativos = idsAtivos.Count,
            idsAtivos,
            criticos = criticos.Select(a => new
            {
                id = a.Id,
                ativoId = a.AtivoId,
                ativo = a.Ativo,
                tag = a.Tag,
                parametro = a.Parametro,
                valor = $"{a.ValorMedido.ToString("0.##", cultura)} {a.Unidade}",
                hora = a.DataHora.HorarioDeBrasilia("HH:mm:ss"),
                desde = DateTime.SpecifyKind(a.DataHora, DateTimeKind.Utc),
                normalizado = a.Status == StatusAlerta.Normalizado
            })
        });
    }

    [HttpGet]
    [Authorize(Roles = "Operador,Engenheiro")]
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
    [Authorize(Roles = "Operador,Engenheiro")]
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
        alerta.ReconhecidoEm = DateTime.UtcNow;

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
