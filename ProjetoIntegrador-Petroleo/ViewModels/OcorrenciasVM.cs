namespace ProjetoIntegrador_Petroleo.ViewModels;

public enum TipoEvento { Alerta, Anomalia, OrdemServico }

// Um acontecimento na linha do tempo de uma máquina.
public sealed record EventoMaquinaVM(
    DateTime DataHora,
    TipoEvento Tipo,
    string Selo,
    string SeloClasse,
    string AtivoNome,
    string AtivoTag,
    string Titulo,
    IReadOnlyList<string> Linhas,
    bool Simulado = false,
    int? OrdemId = null,
    string? OrdemTexto = null,
    int? AlertaSemOrdemId = null);

public sealed record OcorrenciasVM(
    IReadOnlyList<EventoMaquinaVM> Eventos,
    int? AtivoId,
    int Dias,
    int Pagina,
    bool TemMaisAntigos);
