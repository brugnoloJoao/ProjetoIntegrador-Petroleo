using System.ComponentModel.DataAnnotations;

namespace ProjetoIntegrador_Petroleo.Models
{
    // Item do checklist de uma ordem de serviço.
    public class OrdemServicoItem
    {
        public int Id { get; set; }

        public int OrdemServicoId { get; set; }
        public OrdemServico? OrdemServico { get; set; }

        // Rotina que originou o item; permite saber quando ela foi executada pela última vez.
        public int? RotinaManutencaoId { get; set; }
        public RotinaManutencao? RotinaManutencao { get; set; }

        [Required, StringLength(300)]
        public string Descricao { get; set; } = "";

        public bool Concluido { get; set; }

        [StringLength(256)]
        public string? ConcluidoPor { get; set; }
        public DateTime? ConcluidoEm { get; set; }
    }
}
