using System.ComponentModel.DataAnnotations;
using System.Reflection;

namespace ProjetoIntegrador_Petroleo.Models
{
    public static class Exibicao
    {
        private static readonly TimeZoneInfo Brasilia = TimeZoneInfo.FindSystemTimeZoneById("America/Sao_Paulo");

        // Nome definido em [Display] no enum.
        public static string Nome(this Enum valor) =>
            valor.GetType().GetField(valor.ToString())?.GetCustomAttribute<DisplayAttribute>()?.GetName()
            ?? valor.ToString();

        public static string HorarioDeBrasilia(this DateTime utc, string formato = "dd/MM/yyyy HH:mm") =>
            TimeZoneInfo.ConvertTimeFromUtc(DateTime.SpecifyKind(utc, DateTimeKind.Utc), Brasilia).ToString(formato);
    }
}
