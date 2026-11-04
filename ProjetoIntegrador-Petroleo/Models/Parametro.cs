using System.ComponentModel.DataAnnotations;

namespace ProjetoIntegrador_Petroleo.Models
{
    public class Parametro
    {   
        public int Id { get; set; }
        public int AtivoId { get; set; }
        public Ativo? Ativo { get; set; }

        [Required, StringLength(50)]
        public string Nome { get; set; } = "";      // Temperatura, Pressão...

        [StringLength(10)]
        public string Unidade { get; set; } = "";   // °C, bar, mm/s

        public double LimiteAtencao { get; set; }
        public double LimiteCritico { get; set; }

        public List<Leitura> Leituras { get; set; } = new();
    }
}
