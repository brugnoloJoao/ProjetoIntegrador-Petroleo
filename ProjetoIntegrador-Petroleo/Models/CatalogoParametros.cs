namespace ProjetoIntegrador_Petroleo.Models;

public sealed record OpcaoParametro(string Grandeza, string Nome, string Unidade);

// Parâmetros que podem ser cadastrados, cada um com a unidade padrão.
// O simulador reconhece "temper", "press", "vibra" e "vaz" no nome.
public static class CatalogoParametros
{
    // A primeira unidade de cada grandeza é a mais comum.
    public static readonly IReadOnlyDictionary<string, string[]> Unidades = new Dictionary<string, string[]>
    {
        ["Temperatura"] = ["°C", "°F", "K"],
        ["Pressão"] = ["bar", "mbar", "kPa", "psi"],
        ["Vibração"] = ["mm/s", "m/s²"],
        ["Vazão"] = ["m³/h", "kNm³/h", "L/min", "bbl/d"],
        ["Nível"] = ["%", "m"]
    };

    public static readonly IReadOnlyList<OpcaoParametro> Opcoes =
    [
        P("Temperatura", "Temperatura"),
        P("Temperatura", "Temperatura de entrada"),
        P("Temperatura", "Temperatura de saída"),
        P("Temperatura", "Temperatura de descarga"),
        P("Temperatura", "Temperatura de topo"),
        P("Temperatura", "Temperatura de fundo"),
        P("Temperatura", "Temperatura do motor"),
        P("Temperatura", "Temperatura do produto"),
        P("Temperatura", "Temperatura da parede dos tubos"),
        P("Pressão", "Pressão"),
        P("Pressão", "Pressão de entrada"),
        P("Pressão", "Pressão de descarga"),
        P("Pressão", "Pressão de topo"),
        P("Pressão", "Pressão no casco"),
        P("Pressão", "Pressão na cabeça do poço"),
        P("Pressão", "Pressão do combustível"),
        P("Pressão", "Pressão interna", "mbar"),
        P("Vibração", "Vibração"),
        P("Vazão", "Vazão"),
        P("Vazão", "Vazão de carga"),
        P("Vazão", "Vazão de refluxo"),
        P("Vazão", "Vazão nos tubos"),
        P("Vazão", "Vazão de gás", "kNm³/h"),
        P("Nível", "Nível"),
        P("Nível", "Nível de fundo")
    ];

    public static OpcaoParametro? Buscar(string? nome) =>
        Opcoes.FirstOrDefault(o => string.Equals(o.Nome, nome?.Trim(), StringComparison.OrdinalIgnoreCase));

    private static OpcaoParametro P(string grandeza, string nome, string? unidade = null) =>
        new(grandeza, nome, unidade ?? (grandeza switch
        {
            "Temperatura" => "°C",
            "Pressão" => "bar",
            "Vibração" => "mm/s",
            "Vazão" => "m³/h",
            _ => "%"
        }));
}
