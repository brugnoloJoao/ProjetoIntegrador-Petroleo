using System.ComponentModel.DataAnnotations;
using System.Reflection.Metadata;

namespace ProjetoIntegrador_Petroleo.Models
{

    public class Ativo
    {
        public int Id { get; set; }

        [Required, StringLength(100)]
        public string Nome { get; set; } = string.Empty;

        [Required, StringLength(30)]
        public string Tag { get; set; } = string.Empty;

        [StringLength(50)]
        public string Tipo { get; set; } = string.Empty;

        public StatusAtivo Status { get; set; }

        public List<Parametro> Parametros { get; set; } = new();
    }
}
