namespace ProjetoIntegrador_Petroleo.ViewModels;

public class RiscoAtivoVM
{
    public int AtivoId { get; set; }
    public string Nome { get; set; } = String.Empty;
    public string Tag { get; set; } = String.Empty;
    public string Status { get; set; } = String.Empty;
    public int Pontos { get; set; }
    public string Nivel { get; set; } = "Baixo";
    public int AlertasCriticos { get; set; }
    public int AlertasAtencao { get; set; }
    public int Anomalias { get; set; }
    public int ProximidadePercentual { get; set; }
}