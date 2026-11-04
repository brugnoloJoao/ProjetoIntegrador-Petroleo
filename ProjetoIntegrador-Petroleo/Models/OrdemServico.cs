using System.ComponentModel.DataAnnotations;

namespace ProjetoIntegrador_Petroleo.Models
{
    public class OrdemServico
    {
        public int Id { get; set; }

        public int AtivoId { get; set; }
        public Ativo? Ativo { get; set; }

        public int? AlertaId { get; set; }          // opcional: OS pode vir de um alerta
        public Alerta? Alerta { get; set; }

        [Required, StringLength(120)]
        public string Titulo { get; set; } = "";

        [StringLength(1000)]
        public string Descricao { get; set; } = "";

        public Prioridade Prioridade { get; set; }
        public StatusOrdem Status { get; set; } = StatusOrdem.Aberta;

        public string SolicitanteId { get; set; } = "";   // Id do usuário (Identity)
        public string? AprovadorId { get; set; }

        public DateTime DataAbertura { get; set; } = DateTime.Now;
        public DateTime? DataAprovacao { get; set; }
        public DateTime? DataEncerramento { get; set; }
    }
}
