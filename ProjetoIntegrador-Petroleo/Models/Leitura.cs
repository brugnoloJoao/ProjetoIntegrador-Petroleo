namespace ProjetoIntegrador_Petroleo.Models
{
    public class Leitura
    {
        public long Id { get; set; }        // long: essa tabela cresce rápido

        public int ParametroId { get; set; }
        public Parametro? Parametro { get; set; }

        public double Valor { get; set; }
        public DateTime DataHora { get; set; }
    }
}
