using Microsoft.AspNetCore.Mvc.Rendering;
using ProjetoIntegrador_Petroleo.Models;

namespace ProjetoIntegrador_Petroleo.ViewModels;

public class HistoricoVM
{
    // Filtros
    public int? AtivoId { get; set; }
    public int? ParametroId { get; set; }
    public DateTime De { get; set; }
    public DateTime Ate { get; set; }
    public int Pagina { get; set; } = 1;
    public int TotalPaginas { get; set; }

    public List<SelectListItem> Ativos { get; set; } = new();
    public List<SelectListItem> Parametros { get; set; } = new();

    // Resultado
    public Parametro? Parametro { get; set; }
    public int TotalLeituras { get; set; }
    public double? Minimo { get; set; }
    public double? Maximo { get; set; }
    public double? Media { get; set; }
    public long TempoConsultaMs { get; set; }
    public string? Erro { get; set; }

    // Gráfico
    public List<string> Labels { get; set; } = new();
    public List<double> Medias { get; set; } = new();
    public List<double> Minimos { get; set; } = new();
    public List<double> Maximos { get; set; } = new();

    // Tabela
    public List<Leitura> Linhas { get; set; } = new();
}