using System.ComponentModel.DataAnnotations;

namespace ProjetoIntegrador_Petroleo.Models;

public enum StatusAtivo
{
        Operando,
        Parado,
        [Display(Name = "Em manutenção")] EmManutencao
}
public enum Severidade { Atencao, Critico }
public enum StatusAlerta { Ativo, Reconhecido, Normalizado }
public enum StatusOrdem { Aberta, Aprovada, Rejeitada, EmAndamento, Encerrada }
public enum Prioridade { Baixa, Media, Alta }
