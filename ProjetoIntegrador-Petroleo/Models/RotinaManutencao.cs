using System.ComponentModel.DataAnnotations;

namespace ProjetoIntegrador_Petroleo.Models
{
    // O que o manual do equipamento manda fazer. Vale para um ativo ou para todos de um tipo.
    public class RotinaManutencao
    {
        public int Id { get; set; }

        // Preenchido quando a rotina é de um ativo específico.
        [Display(Name = "Equipamento")]
        public int? AtivoId { get; set; }
        public Ativo? Ativo { get; set; }

        // Preenchido quando a rotina vale para todos os ativos de um tipo.
        [StringLength(50), Display(Name = "Tipo de equipamento")]
        public string? TipoAtivo { get; set; }

        [Required(ErrorMessage = "Informe o título da rotina."), StringLength(120)]
        [Display(Name = "Título da rotina")]
        public string Titulo { get; set; } = "";

        // Uma etapa por linha; cada linha vira um item do checklist da OS.
        [StringLength(1500), Display(Name = "Etapas (uma por linha)")]
        public string? Instrucoes { get; set; }

        // Parte do nome do parâmetro cujo alerta chama esta rotina (ex.: "vibra").
        [StringLength(50), Display(Name = "Parâmetro que aciona a rotina")]
        public string? ParametroNome { get; set; }

        [Display(Name = "Tipo de manutenção")]
        public TipoManutencao TipoManutencao { get; set; } = TipoManutencao.Preventiva;

        [StringLength(300), Display(Name = "Peças e materiais")]
        public string? PecasMateriais { get; set; }

        // Quando preenchido, a rotina vence por tempo e vira sugestão de OS preventiva.
        [Range(1, 3650, ErrorMessage = "Informe um intervalo entre 1 e 3650 dias.")]
        [Display(Name = "Repetir a cada (dias)")]
        public int? IntervaloDias { get; set; }

        [Display(Name = "Rotina em uso")]
        public bool Ativa { get; set; } = true;

        public DateTime CriadaEm { get; set; } = DateTime.UtcNow;

        public bool AplicaA(Ativo ativo) => AtivoId != null
            ? AtivoId == ativo.Id
            : !string.IsNullOrWhiteSpace(TipoAtivo)
                && TiposEquipamento.Normalizar(TipoAtivo) == TiposEquipamento.Normalizar(ativo.Tipo);

        public bool AcionadaPor(string nomeParametro) =>
            !string.IsNullOrWhiteSpace(ParametroNome)
            && TiposEquipamento.Normalizar(nomeParametro).Contains(TiposEquipamento.Normalizar(ParametroNome));

        public IEnumerable<string> Etapas() => (Instrucoes ?? "")
            .Split('\n', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
    }
}
