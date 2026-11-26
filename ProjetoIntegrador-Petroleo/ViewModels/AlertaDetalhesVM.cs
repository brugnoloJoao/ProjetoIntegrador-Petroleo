using ProjetoIntegrador_Petroleo.Models;
using ProjetoIntegrador_Petroleo.Services;

namespace ProjetoIntegrador_Petroleo.ViewModels;

// Tudo o que a pessoa precisa para decidir o que fazer com um alerta.
public sealed record AlertaDetalhesVM(
    Alerta Alerta,
    EvolucaoAlerta Evolucao,
    IReadOnlyList<RotinaManutencao> Rotinas,
    OrdemServico? Ordem,
    bool PodeVerOrdem,
    IReadOnlyList<string> Rotulos,
    IReadOnlyList<double> Valores);
