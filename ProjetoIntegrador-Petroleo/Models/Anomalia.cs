using System.ComponentModel.DataAnnotations;

namespace ProjetoIntegrador_Petroleo.Models
{
    public class Anomalia
    {
        public int Id { get; set; }

        public int ParametroId { get; set; }
        public Parametro? Parametro { get; set; }

        public double ValorMedido { get; set; }
        public double Score { get; set; }           // quantos desvios-padrão da média
        public DateTime DataHora { get; set; }

        [StringLength(300)]
        public string Descricao { get; set; } = "";
    }
}
