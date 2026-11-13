using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ProjetoIntegrador_Petroleo.Data;
using ProjetoIntegrador_Petroleo.Models;
using ProjetoIntegrador_Petroleo.ViewModels;

namespace ProjetoIntegrador_Petroleo.Controllers;

[Authorize(Roles = "Engenheiro,Gestor")]
public class RiscoController : Controller
{
    private readonly AppDbContext _db;
    public RiscoController(AppDbContext db) => _db = db;

    public async Task<IActionResult> Index()
    {
        var agora = DateTime.Now;
        var desde = agora.AddDays(-7);
        var ultimaHora = agora.AddHours(-1);

        var ativos = await _db.Ativos.AsNoTracking().ToListAsync();
        var parametros = await _db.Parametros.AsNoTracking().ToListAsync();

        var alertas = await _db.Alertas.AsNoTracking()
            .Where(a => a.DataHora >= desde)
            .Select(a => new { a.Parametro!.AtivoId, a.Severidade })
            .ToListAsync();

        var anomalias = await _db.Anomalias.AsNoTracking()
            .Where(a => a.DataHora >= desde)
            .Select(a => new { a.Parametro!.AtivoId })
            .ToListAsync();

        var medias = await _db.Leituras.AsNoTracking()
            .Where(l => l.DataHora >= ultimaHora)
            .GroupBy(l => l.ParametroId)
            .Select(g => new { ParametroId = g.Key, Media = g.Average(x => x.Valor) })
            .ToListAsync();

        var lista = ativos.Select(a =>
        {
            var crit = alertas.Count(x => x.AtivoId == a.Id && x.Severidade == Severidade.Critico);
            var aten = alertas.Count(x => x.AtivoId == a.Id && x.Severidade == Severidade.Atencao);
            var anom = anomalias.Count(x => x.AtivoId == a.Id);

            // Proximidade do limite: maior razão (média da última hora / limite de atenção)
            double razao = 0;
            foreach (var p in parametros.Where(p => p.AtivoId == a.Id && p.LimiteAtencao > 0))
            {
                var m = medias.FirstOrDefault(x => x.ParametroId == p.Id);
                if (m != null) razao = Math.Max(razao, m.Media / p.LimiteAtencao);
            }

            var pontos = Math.Min(crit * 15, 45)
                       + Math.Min(aten * 5, 20)
                       + Math.Min(anom * 5, 20)
                       + Math.Clamp((razao - 0.85) / 0.15, 0, 1) * 15;

            var total = (int)Math.Round(Math.Min(pontos, 100));

            return new RiscoAtivoVM
            {
                AtivoId = a.Id,
                Nome = a.Nome,
                Tag = a.Tag,
                Status = a.Status.ToString(),
                Pontos = total,
                Nivel = total >= 60 ? "Alto" : total >= 30 ? "Médio" : "Baixo",
                AlertasCriticos = crit,
                AlertasAtencao = aten,
                Anomalias = anom,
                ProximidadePercentual = (int)Math.Round(razao * 100)
            };
        })
        .OrderByDescending(x => x.Pontos)
        .ToList();

        return View(lista);
    }
}