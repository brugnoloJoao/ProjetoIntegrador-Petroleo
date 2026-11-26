using System.Globalization;
using System.Text;

namespace ProjetoIntegrador_Petroleo.Models;

// Tipos que possuem modelo 3D próprio. O campo Ativo.Tipo continua sendo texto livre.
public static class TiposEquipamento
{
    public const string BombaCentrifuga = "Bomba centrífuga";
    public const string Compressor = "Compressor";
    public const string Forno = "Forno";
    public const string TrocadorCalor = "Trocador de calor";
    public const string ColunaDestilacao = "Coluna de destilação";
    public const string Tanque = "Tanque";
    public const string UnidadeBombeio = "Unidade de bombeio";

    public static readonly string[] Todos =
    [
        BombaCentrifuga, Compressor, Forno, TrocadorCalor, ColunaDestilacao, Tanque, UnidadeBombeio
    ];

    // Compara tipos sem diferenciar maiúsculas, acentos e espaços nas pontas.
    public static string Normalizar(string? tipo)
    {
        if (string.IsNullOrWhiteSpace(tipo)) return "";
        var decomposto = tipo.Trim().ToLowerInvariant().Normalize(NormalizationForm.FormD);
        return new string(decomposto
            .Where(c => CharUnicodeInfo.GetUnicodeCategory(c) != UnicodeCategory.NonSpacingMark)
            .ToArray());
    }
}
