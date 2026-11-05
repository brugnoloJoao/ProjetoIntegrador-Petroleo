using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Rendering;
using Microsoft.EntityFrameworkCore;
using ProjetoIntegrador_Petroleo.Data;
using ProjetoIntegrador_Petroleo.Models;
using System.Diagnostics;


namespace ProjetoIntegrador_Petroleo.Controllers
{
    [Authorize]
    public class HomeController : Controller
    {
        private readonly AppDbContext _db;
        public HomeController(AppDbContext db) => _db = db;

        [AllowAnonymous]
        public async Task<IActionResult> Index()
        {
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
            var alertas = await _db.Alertas.CountAsync(a => a.Status == StatusAlerta.Ativo);
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
                .Where(l => l.ParametroId == parametroId)
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
                pontos = leituras.Select(l => new { t = l.DataHora.ToString("HH:mm:ss"), v = l.Valor })
            });
        }

        [ResponseCache(Duration = 0, Location = ResponseCacheLocation.None, NoStore = true)]
        public IActionResult Error() =>
            View(new ErrorViewModel { RequestId = Activity.Current?.Id ?? HttpContext.TraceIdentifier });
    }
}
