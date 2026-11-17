using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Rendering;
using Microsoft.EntityFrameworkCore;
using ProjetoIntegrador_Petroleo.Data;
using ProjetoIntegrador_Petroleo.Services;
using ProjetoIntegrador_Petroleo.Models;
using System.Diagnostics;
using System.ComponentModel.DataAnnotations;
using System.Globalization;
using System.Reflection;
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

            var agoraUtc = DateTime.UtcNow;
            var relatorio = new StringBuilder();
            var colunas = new[]
            {
                "Tipo de registro", "ID", "Data/hora", "Equipamento", "Tag", "Item", "Status",
                "Prioridade/severidade", "Valor", "Unidade", "Limite de atenção", "Limite crítico/violado",
                "Desvios-padrão", "Solicitante", "Operador responsável", "Origem", "Descrição"
            };
            relatorio.AppendLine(string.Join(";", colunas.Select(EscalarCsv)));

            void Adicionar(
                string tipo,
                string? id = null,
                string? dataHora = null,
                string? equipamento = null,
                string? tag = null,
                string? item = null,
                string? status = null,
                string? prioridade = null,
                string? valor = null,
                string? unidade = null,
                string? limiteAtencao = null,
                string? limiteCritico = null,
                string? desviosPadrao = null,
                string? solicitante = null,
                string? operador = null,
                string? origem = null,
                string? descricao = null)
            {
                var campos = new string?[]
                {
                    tipo, id, dataHora, equipamento, tag, item, status, prioridade, valor, unidade,
                    limiteAtencao, limiteCritico, desviosPadrao, solicitante, operador, origem, descricao
                };
                relatorio.AppendLine(string.Join(";", campos.Select(EscalarCsv)));
            }

            Adicionar("Relatório", item: "PetroSync · relatório operacional",
                descricao: $"Gerado em {FormatarDataLocal(agoraUtc)} · Simulação {(incluirSimulados ? "ativa" : "pausada")}");
            Adicionar("Resumo", item: "Ativos cadastrados", valor: ativos.Count.ToString(cultura), unidade: "registros");
            Adicionar("Resumo", item: "Ativos operando", valor: ativos.Count(a => a.Status == StatusAtivo.Operando).ToString(cultura), unidade: "registros");
            Adicionar("Resumo", item: "Parâmetros cadastrados", valor: parametros.Count.ToString(cultura), unidade: "registros");
            Adicionar("Resumo", item: "Alertas ativos", valor: alertas.Count(a => a.Status == StatusAlerta.Ativo).ToString(cultura), unidade: "registros");
            Adicionar("Resumo", item: "Anomalias exportadas", valor: anomalias.Count.ToString(cultura), unidade: "registros");
            Adicionar("Resumo", item: "OS em aberto", valor: ordens.Count(o => o.Status != StatusOrdem.Encerrada && o.Status != StatusOrdem.Rejeitada).ToString(cultura), unidade: "registros");
            Adicionar("Informação", item: "Limite do relatório", descricao: "Até 5.000 alertas, anomalias e OS mais recentes por categoria.");

            foreach (var ativo in ativos)
                Adicionar("Ativo", id: ativo.Id.ToString(cultura), equipamento: ativo.Nome, tag: ativo.Tag,
                    item: ativo.Tipo, status: NomeExibicao(ativo.Status));

            foreach (var parametro in parametros)
                Adicionar("Parâmetro", id: parametro.Id.ToString(cultura), equipamento: parametro.Ativo?.Nome,
                    tag: parametro.Ativo?.Tag, item: parametro.Nome, unidade: parametro.Unidade,
                    limiteAtencao: parametro.LimiteAtencao.ToString("0.##", cultura),
                    limiteCritico: parametro.LimiteCritico.ToString("0.##", cultura));

            foreach (var alerta in alertas)
                Adicionar("Alerta", id: alerta.Id.ToString(cultura), dataHora: FormatarDataLocal(alerta.DataHora),
                    equipamento: alerta.Parametro?.Ativo?.Nome, tag: alerta.Parametro?.Ativo?.Tag,
                    item: alerta.Parametro?.Nome, status: NomeExibicao(alerta.Status),
                    prioridade: NomeExibicao(alerta.Severidade), valor: alerta.ValorMedido.ToString("0.##", cultura),
                    unidade: alerta.Parametro?.Unidade, limiteCritico: alerta.LimiteViolado.ToString("0.##", cultura),
                    origem: alerta.Simulada ? "Simulada" : "Real", descricao: alerta.Observacao);

            foreach (var anomalia in anomalias)
                Adicionar("Anomalia", id: anomalia.Id.ToString(cultura), dataHora: FormatarDataLocal(anomalia.DataHora),
                    equipamento: anomalia.Parametro?.Ativo?.Nome, tag: anomalia.Parametro?.Ativo?.Tag,
                    item: anomalia.Parametro?.Nome, status: "Detectada",
                    valor: anomalia.ValorMedido.ToString("0.##", cultura), unidade: anomalia.Parametro?.Unidade,
                    desviosPadrao: anomalia.Score.ToString("0.##", cultura), origem: anomalia.Simulada ? "Simulada" : "Real",
                    descricao: anomalia.Descricao);

            foreach (var ordem in ordens)
                Adicionar("Ordem de serviço", id: ordem.Id.ToString(cultura), dataHora: FormatarDataLocal(ordem.DataAbertura),
                    equipamento: ordem.Ativo?.Nome, tag: ordem.Ativo?.Tag, item: ordem.Titulo,
                    status: NomeExibicao(ordem.Status), prioridade: NomeExibicao(ordem.Prioridade),
                    solicitante: ordem.SolicitanteId, operador: ordem.Operador?.Email, descricao: ordem.Descricao);

            var bytes = Encoding.UTF8.GetPreamble().Concat(Encoding.UTF8.GetBytes(relatorio.ToString())).ToArray();
            return File(bytes, "text/csv; charset=utf-8", $"relatorio_petrosync_{agoraUtc:yyyyMMdd_HHmm}.csv");
        }

        private static string EscalarCsv(string? valor)
        {
            if (string.IsNullOrEmpty(valor)) return "";
            return valor.Contains(';') || valor.Contains('"') || valor.Contains('\r') || valor.Contains('\n')
                ? $"\"{valor.Replace("\"", "\"\"")}\""
                : valor;
        }

        private static string FormatarDataLocal(DateTime dataUtc)
        {
            var fuso = TimeZoneInfo.FindSystemTimeZoneById("America/Sao_Paulo");
            return TimeZoneInfo.ConvertTimeFromUtc(DateTime.SpecifyKind(dataUtc, DateTimeKind.Utc), fuso)
                .ToString("dd/MM/yyyy HH:mm:ss", CultureInfo.GetCultureInfo("pt-BR"));
        }

        private static string NomeExibicao<TEnum>(TEnum valor) where TEnum : struct, Enum
        {
            var membro = typeof(TEnum).GetMember(valor.ToString()).FirstOrDefault();
            return membro?.GetCustomAttribute<DisplayAttribute>()?.GetName() ?? valor.ToString();
        }

        [ResponseCache(Duration = 0, Location = ResponseCacheLocation.None, NoStore = true)]
        public IActionResult Error() =>
            View(new ErrorViewModel { RequestId = Activity.Current?.Id ?? HttpContext.TraceIdentifier });
    }
}
