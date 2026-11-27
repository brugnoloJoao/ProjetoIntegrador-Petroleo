using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Rendering;
using Microsoft.EntityFrameworkCore;
using ProjetoIntegrador_Petroleo.Data;
using ProjetoIntegrador_Petroleo.Services;
using ProjetoIntegrador_Petroleo.Models;
using System.Diagnostics;


namespace ProjetoIntegrador_Petroleo.Controllers
{
    [Authorize]
    public class HomeController : Controller
    {
        private readonly AppDbContext _db;
        private readonly SimuladorEstado _simulador;
        public HomeController(AppDbContext db, SimuladorEstado simulador)
        {
            _db = db;
            _simulador = simulador;
        }

        [AllowAnonymous]
        public async Task<IActionResult> Index()
        {
            // Quem não entrou vê só a apresentação: nada do que está cadastrado.
            if (User.Identity?.IsAuthenticated != true)
            {
                ViewBag.Parametros = new List<SelectListItem>();
                return View();
            }

            var lista = await _db.Parametros
                .AsNoTracking()
                .OrderBy(p => p.Ativo!.Nome).ThenBy(p => p.Nome)
                .Select(p => new { p.Id, Texto = p.Ativo!.Nome + " – " + p.Nome })
                .ToListAsync();

            ViewBag.Parametros = lista
                .Select(x => new SelectListItem(x.Texto, x.Id.ToString()))
                .ToList();
            return View();
        }

        [HttpGet]
        public async Task<IActionResult> Indicadores()
        {
            var total = await _db.Ativos.CountAsync();
            var operando = await _db.Ativos.CountAsync(a => a.Status == StatusAtivo.Operando);
            var alertas = await _db.Alertas.CountAsync(a => a.Status == StatusAlerta.Ativo
                && (_simulador.Ativo || !a.Simulada));
            var os = await _db.OrdensServico.CountAsync(o =>
                        o.Status != StatusOrdem.Encerrada && o.Status != StatusOrdem.Rejeitada);
            var disp = total == 0 ? 0 : Math.Round(operando * 100.0 / total, 1);

            return Json(new { total, operando, alertas, os, disp });
        }

        [HttpGet]
        public async Task<IActionResult> Historico(int parametroId)
        {
            var p = await _db.Parametros.AsNoTracking().FirstOrDefaultAsync(x => x.Id == parametroId);
            if (p == null) return NotFound();

            var leituras = await _db.Leituras.AsNoTracking()
                .Where(l => l.ParametroId == parametroId && (_simulador.Ativo || !l.Simulada))
                .OrderByDescending(l => l.DataHora)
                .Take(60)
                .ToListAsync();
            leituras.Reverse();

            return Json(new
            {
                nome = p.Nome,
                unidade = p.Unidade,
                atencao = p.LimiteAtencao,
                critico = p.LimiteCritico,
                pontos = leituras.Select(l => new { t = l.DataHora.HorarioDeBrasilia("HH:mm:ss"), v = l.Valor })
            });
        }

        [HttpGet]
        public async Task<IActionResult> ExportarRelatorio()
        {
            var incluirSimulados = _simulador.Ativo;
            var ativos = await _db.Ativos.AsNoTracking()
                .OrderBy(a => a.Nome)
                .ToListAsync();
            var parametros = await _db.Parametros.AsNoTracking()
                .Include(p => p.Ativo)
                .OrderBy(p => p.Ativo!.Nome).ThenBy(p => p.Nome)
                .ToListAsync();
            var alertas = await _db.Alertas.AsNoTracking()
                .Include(a => a.Parametro).ThenInclude(p => p!.Ativo)
                .Where(a => incluirSimulados || !a.Simulada)
                .OrderByDescending(a => a.DataHora)
                .Take(5000)
                .ToListAsync();
            var anomalias = await _db.Anomalias.AsNoTracking()
                .Include(a => a.Parametro).ThenInclude(p => p!.Ativo)
                .Where(a => incluirSimulados || !a.Simulada)
                .OrderByDescending(a => a.DataHora)
                .Take(5000)
                .ToListAsync();
            var ordensQuery = _db.OrdensServico.AsNoTracking()
                .Include(o => o.Ativo)
                .Include(o => o.Operador)
                .AsQueryable();
            var operadorApenas = User.IsInRole("Operador")
                && !User.IsInRole("Engenheiro")
                && !User.IsInRole("Gestor");
            if (operadorApenas)
            {
                var operadorId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
                ordensQuery = ordensQuery.Where(o => o.OperadorId == operadorId);
            }

            var ordens = await ordensQuery
                .OrderByDescending(o => o.DataAbertura)
                .Take(5000)
                .ToListAsync();

            var agoraUtc = DateTime.UtcNow;
            var planilha = RelatorioExcel.Gerar(new DadosRelatorio(
                agoraUtc, incluirSimulados, ativos, parametros, alertas, anomalias, ordens));

            return File(planilha, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                $"relatorio_petrosync_{agoraUtc.HorarioDeBrasilia("yyyyMMdd_HHmm")}.xlsx");
        }

        [ResponseCache(Duration = 0, Location = ResponseCacheLocation.None, NoStore = true)]
        public IActionResult Error() =>
            View(new ErrorViewModel { RequestId = Activity.Current?.Id ?? HttpContext.TraceIdentifier });
    }
}
