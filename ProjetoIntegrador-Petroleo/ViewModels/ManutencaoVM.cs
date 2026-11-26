using ProjetoIntegrador_Petroleo.Models;

namespace ProjetoIntegrador_Petroleo.ViewModels;

// OS pronta para conferência, montada a partir de um alerta ou de uma rotina vencida.
public sealed record SugestaoOrdemVM(
    int? AlertaId,
    int? RotinaId,
    int AtivoId,
    string AtivoNome,
    string AtivoTag,
    string Titulo,
    string Detalhe,
    IReadOnlyList<string> Rotinas,
    Prioridade Prioridade,
    DateTime DataHora,
    string? Parametro = null,
    string? Situacao = null);

// Rotinas oferecidas no formulário da OS e as que já vêm marcadas.
public sealed record RotinasChecklistVM(
    IReadOnlyList<RotinaManutencao> Rotinas,
    IReadOnlySet<int> Selecionadas,
    bool AtivoEscolhido);
