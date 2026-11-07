using System.Diagnostics;
using System.Globalization;
using System.Text;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Rendering;
using Microsoft.EntityFrameworkCore;
using ProjetoIntegrador_Petroleo.Data;
using ProjetoIntegrador_Petroleo.ViewModels;

namespace ProjetoIntegrador_Petroleo.Controllers;

[Authorize]
public class HistoricoController : Controller
{
    private const int TamanhoPagina = 50;
    private const int PontosGrafico = 300;

    private readonly AppDbContext _db;
    public HistoricoController(AppDbContext db) => _db = db;

    public async Task<IActionResult> Index(int? ativoId, int? parametroId,
                                           DateTime? de, DateTime? ate, int pagina = 1)
    {
        var fim = ate ?? DateTime.Now;
        var inicio = de ?? fim.AddHours(-24);

        var vm = new HistoricoVM
        {
            AtivoId = ativoId,
            ParametroId = parametroId,
            De = inicio,
            Ate = fim,
            Pagina = Math.Max(1, pagina)
        };

        // Lista de equipamentos
        var ativos = await _db.Ativos.AsNoTracking().OrderBy(a => a.Nome).ToListAsync();
        vm.Ativos = ativos
            .Select(a => new SelectListItem($"{a.Nome} ({a.Tag})", a.Id.ToString(), a.Id == ativoId))
            .ToList();

        // Parâmetros do equipamento escolhido
        if (ativoId != null)
        {
            var parametros = await _db.Parametros.AsNoTracking()
                .Where(p => p.AtivoId == ativoId).OrderBy(p => p.Nome).ToListAsync();

            vm.Parametros = parametros
                .Select(p => new SelectListItem($"{p.Nome} ({p.Unidade})", p.Id.ToString(), p.Id == parametroId))
                .ToList();

            // Se trocou de equipamento, o parâmetro antigo não vale mais
            if (parametroId != null && !parametros.Any(p => p.Id == parametroId))
            {
                parametroId = null;
                vm.ParametroId = null;
            }
        }
        else
        {
            parametroId = null;
            vm.ParametroId = null;
        }

        if (fim < inicio)
        {
            vm.Erro = "A data final deve ser posterior à data inicial.";
            return View(vm);
        }

        if (parametroId == null) return View(vm);   // ainda sem seleção

        vm.Parametro = await _db.Parametros.AsNoTracking()
            .Include(p => p.Ativo)
            .FirstAsync(p => p.Id == parametroId);

        var sw = Stopwatch.StartNew();

        var baseQuery = _db.Leituras.AsNoTracking()
            .Where(l => l.ParametroId == parametroId && l.DataHora >= inicio && l.DataHora <= fim);

        // 1) Estatísticas do período
        var resumo = await baseQuery
            .GroupBy(l => 1)
            .Select(g => new
            {
                Total = g.Count(),
                Min = g.Min(x => x.Valor),
                Max = g.Max(x => x.Valor),
                Media = g.Average(x => x.Valor)
            })
            .FirstOrDefaultAsync();

        if (resumo != null)
        {
            vm.TotalLeituras = resumo.Total;
            vm.Minimo = resumo.Min;
            vm.Maximo = resumo.Max;
            vm.Media = resumo.Media;
        }

        // 2) Gráfico: agrupa em ~300 intervalos direto no SQL
        var totalSegundos = (fim - inicio).TotalSeconds;
        var tam = Math.Max(1, (int)Math.Ceiling(totalSegundos / PontosGrafico));
        var formato = totalSegundos > 86400 ? "dd/MM HH:mm" : "HH:mm:ss";

        var pontos = await baseQuery
            .GroupBy(l => EF.Functions.DateDiffSecond(inicio, l.DataHora) / tam)
            .Select(g => new
            {
                Bucket = g.Key,
                Media = g.Average(x => x.Valor),
                Min = g.Min(x => x.Valor),
                Max = g.Max(x => x.Valor)
            })
            .OrderBy(x => x.Bucket)
            .ToListAsync();

        foreach (var p in pontos)
        {
            vm.Labels.Add(inicio.AddSeconds((double)p.Bucket * tam).ToString(formato));
            vm.Medias.Add(Math.Round(p.Media, 2));
            vm.Minimos.Add(Math.Round(p.Min, 2));
            vm.Maximos.Add(Math.Round(p.Max, 2));
        }

        // 3) Tabela paginada
        vm.TotalPaginas = Math.Max(1, (int)Math.Ceiling(vm.TotalLeituras / (double)TamanhoPagina));
        if (vm.Pagina > vm.TotalPaginas) vm.Pagina = vm.TotalPaginas;

        vm.Linhas = await baseQuery
            .OrderByDescending(l => l.DataHora)
            .Skip((vm.Pagina - 1) * TamanhoPagina)
            .Take(TamanhoPagina)
            .ToListAsync();

        sw.Stop();
        vm.TempoConsultaMs = sw.ElapsedMilliseconds;

        return View(vm);
    }

    // Exporta o período em CSV (abre direto no Excel)
    [HttpGet]
    public async Task<IActionResult> Exportar(int parametroId, DateTime de, DateTime ate)
    {
        var p = await _db.Parametros.AsNoTracking()
            .Include(x => x.Ativo)
            .FirstOrDefaultAsync(x => x.Id == parametroId);
        if (p == null) return NotFound();

        var dados = await _db.Leituras.AsNoTracking()
            .Where(l => l.ParametroId == parametroId && l.DataHora >= de && l.DataHora <= ate)
            .OrderBy(l => l.DataHora)
            .Take(100000)
            .Select(l => new { l.DataHora, l.Valor })
            .ToListAsync();

        var pt = new CultureInfo("pt-BR");
        var sb = new StringBuilder();
        sb.AppendLine("DataHora;Equipamento;Parametro;Valor;Unidade");
        foreach (var d in dados)
            sb.AppendLine($"{d.DataHora:dd/MM/yyyy HH:mm:ss};{p.Ativo?.Nome};{p.Nome};{d.Valor.ToString("F2", pt)};{p.Unidade}");

        var bytes = Encoding.UTF8.GetPreamble().Concat(Encoding.UTF8.GetBytes(sb.ToString())).ToArray();
        return File(bytes, "text/csv", $"historico_{parametroId}_{de:yyyyMMdd}-{ate:yyyyMMdd}.csv");
    }
}