using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Rendering;
using Microsoft.EntityFrameworkCore;
using ProjetoIntegrador_Petroleo.Data;
using ProjetoIntegrador_Petroleo.Services;
using ProjetoIntegrador_Petroleo.Models;
using System.Diagnostics;
using System.Globalization;
using System.Text;


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
                pontos = leituras.Select(l => new { t = l.DataHora.ToString("HH:mm:ss"), v = l.Valor })
            });
        }

        [HttpGet]
        public async Task<IActionResult> ExportarRelatorio()
        {
            var cultura = CultureInfo.GetCultureInfo("pt-BR");
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

            var relatorio = new StringBuilder();
            void Linha(params string?[] campos) => relatorio.AppendLine(string.Join(";", campos.Select(EscalarCsv)));
            void Secao(string titulo, params string[] colunas)
            {
                Linha(titulo);
                Linha(colunas);
            }

            Linha("RELATÓRIO OPERACIONAL PETROSYNC");
            Linha("Gerado em", DateTime.Now.ToString("dd/MM/yyyy HH:mm:ss", cultura));
            Linha("Leituras simuladas", incluirSimulados ? "Incluídas (simulação ativa)" : "Excluídas (simulação pausada)");
            Linha("Observação", "Alertas e anomalias limitados aos 5.000 registros mais recentes de cada seção.");
            Linha();

            Secao("RESUMO", "Indicador", "Quantidade");
            Linha("Ativos cadastrados", ativos.Count.ToString(cultura));
            Linha("Ativos operando", ativos.Count(a => a.Status == StatusAtivo.Operando).ToString(cultura));
            Linha("Alertas ativos", alertas.Count(a => a.Status == StatusAlerta.Ativo).ToString(cultura));
            Linha("Anomalias", anomalias.Count.ToString(cultura));
            Linha("Ordens de serviço em aberto", ordens.Count(o => o.Status != StatusOrdem.Encerrada && o.Status != StatusOrdem.Rejeitada).ToString(cultura));
            Linha();

            Secao("ATIVOS", "ID", "Nome", "Tag", "Tipo", "Status");
            foreach (var ativo in ativos)
                Linha(ativo.Id.ToString(cultura), ativo.Nome, ativo.Tag, ativo.Tipo, ativo.Status.ToString());
            Linha();

            Secao("PARÂMETROS", "Ativo", "Tag", "Parâmetro", "Unidade", "Limite de atenção", "Limite crítico");
            foreach (var parametro in parametros)
                Linha(parametro.Ativo?.Nome, parametro.Ativo?.Tag, parametro.Nome, parametro.Unidade,
                    parametro.LimiteAtencao.ToString("0.##", cultura), parametro.LimiteCritico.ToString("0.##", cultura));
            Linha();

            Secao("ALERTAS", "Data/hora", "Ativo", "Parâmetro", "Severidade", "Status", "Valor", "Limite", "Origem");
            foreach (var alerta in alertas)
                Linha(alerta.DataHora.ToString("dd/MM/yyyy HH:mm:ss", cultura), alerta.Parametro?.Ativo?.Nome,
                    alerta.Parametro?.Nome, alerta.Severidade.ToString(), alerta.Status.ToString(),
                    alerta.ValorMedido.ToString("0.##", cultura), alerta.LimiteViolado.ToString("0.##", cultura),
                    alerta.Simulada ? "Simulada" : "Real");
            Linha();

            Secao("ANOMALIAS", "Data/hora", "Ativo", "Parâmetro", "Valor", "Desvios-padrão", "Descrição", "Origem");
            foreach (var anomalia in anomalias)
                Linha(anomalia.DataHora.ToString("dd/MM/yyyy HH:mm:ss", cultura), anomalia.Parametro?.Ativo?.Nome,
                    anomalia.Parametro?.Nome, anomalia.ValorMedido.ToString("0.##", cultura),
                    anomalia.Score.ToString("0.##", cultura), anomalia.Descricao,
                    anomalia.Simulada ? "Simulada" : "Real");
            Linha();

            Secao("ORDENS DE SERVIÇO", "ID", "Título", "Ativo", "Status", "Prioridade", "Solicitante", "Operador responsável", "Abertura");
            foreach (var ordem in ordens)
                Linha(ordem.Id.ToString(cultura), ordem.Titulo, ordem.Ativo?.Nome, ordem.Status.ToString(),
                    ordem.Prioridade.ToString(), ordem.SolicitanteId, ordem.Operador?.Email,
                    ordem.DataAbertura.ToString("dd/MM/yyyy HH:mm:ss", cultura));

            var bytes = Encoding.UTF8.GetPreamble().Concat(Encoding.UTF8.GetBytes(relatorio.ToString())).ToArray();
            return File(bytes, "text/csv; charset=utf-8", $"relatorio_petrosync_{DateTime.Now:yyyyMMdd_HHmm}.csv");
        }

        private static string EscalarCsv(string? valor)
        {
            if (string.IsNullOrEmpty(valor)) return "";
            return valor.Contains(';') || valor.Contains('"') || valor.Contains('\r') || valor.Contains('\n')
                ? $"\"{valor.Replace("\"", "\"\"")}\""
                : valor;
        }

        [ResponseCache(Duration = 0, Location = ResponseCacheLocation.None, NoStore = true)]
        public IActionResult Error() =>
            View(new ErrorViewModel { RequestId = Activity.Current?.Id ?? HttpContext.TraceIdentifier });
    }
}
