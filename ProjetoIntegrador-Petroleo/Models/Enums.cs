using System.ComponentModel.DataAnnotations;

namespace ProjetoIntegrador_Petroleo.Models;

public enum StatusAtivo
{
    [Display(Name = "Operando")] Operando,
    [Display(Name = "Parado")] Parado,
    [Display(Name = "Em manutenção")] EmManutencao
}

public enum StatusOrdem
{
    [Display(Name = "Aberta")] Aberta,
    [Display(Name = "Aprovada")] Aprovada,
    [Display(Name = "Rejeitada")] Rejeitada,
    [Display(Name = "Em andamento")] EmAndamento,
    [Display(Name = "Encerrada")] Encerrada
}

public enum Prioridade
{
    [Display(Name = "Baixa")] Baixa,
    [Display(Name = "Média")] Media,
    [Display(Name = "Alta")] Alta
}

public enum Severidade
{
    [Display(Name = "Atenção")] Atencao,
    [Display(Name = "Crítico")] Critico
}

public enum StatusAlerta
{
    [Display(Name = "Ativo")] Ativo,
    [Display(Name = "Reconhecido")] Reconhecido,
    [Display(Name = "Normalizado")] Normalizado
}