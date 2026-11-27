using System.ComponentModel.DataAnnotations;

namespace ProjetoIntegrador_Petroleo.Models
{
    public class Parametro
    {   
        public int Id { get; set; }
        public int AtivoId { get; set; }
        public Ativo? Ativo { get; set; }

        [Required(ErrorMessage = "Escolha o parâmetro."), StringLength(50)]
        public string Nome { get; set; } = "";      // Temperatura, Pressão...

        [Required(ErrorMessage = "Escolha a unidade."), StringLength(10)]
        public string Unidade { get; set; } = "";   // °C, bar, mm/s

        [Required(ErrorMessage = "Informe o limite de atenção.")]
        public double LimiteAtencao { get; set; }

        [Required(ErrorMessage = "Informe o limite crítico.")]
        public double LimiteCritico { get; set; }

        public List<Leitura> Leituras { get; set; } = new();
    }
}
