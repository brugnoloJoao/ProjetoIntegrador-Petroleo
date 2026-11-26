namespace ProjetoIntegrador_Petroleo.ViewModels;

// Alerta que ainda espera alguém atender.
public sealed record AlertaEmEsperaVM(
    int Id, string Ativo, string Tag, string Parametro, bool Critico, DateTime DataHora);

// Números do turno atual, calculados com o que já está gravado.
public sealed record TurnoVM(
    string Nome,
    DateTime InicioUtc,
    int Detectados,
    int Criticos,
    int Atendidos,
    TimeSpan? TempoMedioResposta,
    int Aguardando,
    bool CriticoEmAberto,
    DateTime? UltimoCritico,
    int OrdensAbertas,
    int OrdensEncerradas,
    bool SoMinhasOrdens,
    IReadOnlyList<AlertaEmEsperaVM> MaisAntigos);
