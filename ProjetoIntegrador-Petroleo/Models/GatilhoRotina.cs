namespace ProjetoIntegrador_Petroleo.Models;

public sealed record OpcaoGatilho(string Grupo, string Valor, string Texto);

// Opções de "parâmetro que aciona a rotina", montadas só com o que está cadastrado.
// A rotina é chamada quando o nome do parâmetro em alerta contém o valor escolhido.
public static class GatilhoRotina
{
    private static readonly (string Valor, string Grandeza)[] Familias =
    [
        ("temper", "Temperatura"),
        ("press", "Pressão"),
        ("vibra", "Vibração"),
        ("vaz", "Vazão"),
        ("nível", "Nível")
    ];

    public static List<OpcaoGatilho> Opcoes(IEnumerable<string> cadastrados)
    {
        var nomes = cadastrados.Select(n => n.Trim()).Where(n => n.Length > 0)
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .Order(StringComparer.CurrentCultureIgnoreCase)
            .ToList();

        var familias = Familias
            .Where(f => nomes.Any(n => Contem(n, f.Valor)))
            .Select(f => new OpcaoGatilho("Qualquer parâmetro de", f.Valor, $"{f.Grandeza} (qualquer ponto)"));

        // O nome que é igual à grandeza já está coberto pela opção "qualquer ponto".
        var especificos = nomes
            .Where(n => !Familias.Any(f => Igual(f.Grandeza, n)))
            .Select(n => new OpcaoGatilho("Um parâmetro específico", n, n));

        return [.. familias, .. especificos];
    }

    // Encontra a opção que corresponde ao valor gravado. Um trecho antigo que só
    // serve a um parâmetro (ex.: "combust") passa a ser esse parâmetro.
    public static OpcaoGatilho? Localizar(IReadOnlyList<OpcaoGatilho> opcoes, string? valor)
    {
        if (string.IsNullOrWhiteSpace(valor)) return null;

        var exata = opcoes.FirstOrDefault(o => Igual(o.Valor, valor));
        if (exata != null) return exata;

        // Nome de grandeza escrito por extenso (ex.: "Vibração").
        var familia = Familias.FirstOrDefault(f => Igual(f.Grandeza, valor));
        if (familia.Valor != null)
            return opcoes.FirstOrDefault(o => o.Valor == familia.Valor);

        var parecidas = opcoes
            .Where(o => !Familias.Any(f => f.Valor == o.Valor) && Contem(o.Valor, valor))
            .Take(2)
            .ToList();
        return parecidas.Count == 1 ? parecidas[0] : null;
    }

    // Texto para exibir na lista de rotinas.
    public static string Descrever(string valor)
    {
        var familia = Familias.FirstOrDefault(f => Igual(f.Valor, valor) || Igual(f.Grandeza, valor));
        return familia.Grandeza != null
            ? $"Alerta de {familia.Grandeza.ToLowerInvariant()}"
            : $"Alerta em “{valor}”";
    }

    private static bool Igual(string a, string b) =>
        TiposEquipamento.Normalizar(a) == TiposEquipamento.Normalizar(b);

    private static bool Contem(string nome, string trecho) =>
        TiposEquipamento.Normalizar(nome).Contains(TiposEquipamento.Normalizar(trecho));
}
