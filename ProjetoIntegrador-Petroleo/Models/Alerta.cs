using System.ComponentModel.DataAnnotations;

namespace ProjetoIntegrador_Petroleo.Models
{
    public class Alerta
    {
        public int Id { get; set; }

        public int ParametroId { get; set; }
        public Parametro? Parametro { get; set; }

        public Severidade Severidade { get; set; }
        public StatusAlerta Status { get; set; } = StatusAlerta.Ativo;

        public double ValorMedido { get; set; }
        public double LimiteViolado { get; set; }
        public DateTime DataHora { get; set; }

        // Preenchidos no "Reconhecer" (UC02)
        [StringLength(500)]
        public string? Observacao { get; set; }
        public string? ReconhecidoPorId { get; set; }   // Id do usuário do Identity
        public DateTime? ReconhecidoEm { get; set; }
    }
}
