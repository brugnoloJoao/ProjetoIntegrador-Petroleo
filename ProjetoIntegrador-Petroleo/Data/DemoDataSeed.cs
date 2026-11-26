using Microsoft.EntityFrameworkCore;
using ProjetoIntegrador_Petroleo.Models;

namespace ProjetoIntegrador_Petroleo.Data;

public static class DemoDataSeed
{
    public static async Task ExecutarAsync(IServiceProvider services)
    {
        var config = services.GetRequiredService<IConfiguration>();
        if (!config.GetValue<bool>("Demo:SeedData")) return;

        var db = services.GetRequiredService<AppDbContext>();
        var tagsExistentes = (await db.Ativos.Select(a => a.Tag).ToListAsync())
            .ToHashSet(StringComparer.OrdinalIgnoreCase);

        // Salva um por vez para manter a ordem dos Ids.
        foreach (var ativo in CriarAtivos().Where(a => !tagsExistentes.Contains(a.Tag)))
        {
            db.Ativos.Add(ativo);
            await db.SaveChangesAsync();
        }

        if (!await db.RotinasManutencao.AnyAsync())
        {
            db.RotinasManutencao.AddRange(CriarRotinas());
            await db.SaveChangesAsync();
        }
    }

    private static Parametro P(string nome, string unidade, double atencao, double critico) =>
        new() { Nome = nome, Unidade = unidade, LimiteAtencao = atencao, LimiteCritico = critico };

    private static Ativo A(string nome, string tag, string tipo, params Parametro[] parametros) =>
        new() { Nome = nome, Tag = tag, Tipo = tipo, Status = StatusAtivo.Operando, Parametros = [.. parametros] };

    // Valores de demonstração; os limites reais devem vir do manual de cada equipamento.
    // O simulador reconhece "temper", "press", "vibra" e "vaz" no nome do parâmetro.
    private static Ativo[] CriarAtivos() =>
    [
        A("Bomba de transferência 01", "DEMO-BOMBA-01", TiposEquipamento.BombaCentrifuga,
            P("Temperatura", "°C", 90, 110),
            P("Pressão", "bar", 8, 10),
            P("Vibração", "mm/s", 4.5, 7.5),
            P("Vazão", "m³/h", 100, 130)),
        A("Unidade de bombeio mecânico 04", "UB-04", TiposEquipamento.UnidadeBombeio,
            P("Temperatura do motor", "°C", 85, 100),
            P("Pressão na cabeça do poço", "bar", 40, 55),
            P("Vibração", "mm/s", 4.5, 7.1),
            P("Vazão", "m³/h", 20, 28)),
        A("Compressor de gás 01", "K-201", TiposEquipamento.Compressor,
            P("Temperatura de descarga", "°C", 135, 155),
            P("Pressão de descarga", "bar", 28, 34),
            P("Vibração", "mm/s", 5, 8),
            P("Vazão de gás", "kNm³/h", 12, 15)),
        A("Forno de carga atmosférico", "F-101", TiposEquipamento.Forno,
            P("Temperatura de saída", "°C", 370, 390),
            P("Temperatura da parede dos tubos", "°C", 520, 560),
            P("Pressão do combustível", "bar", 3.5, 4.5),
            P("Vazão de carga", "m³/h", 450, 520)),
        A("Trocador de pré-aquecimento 05", "E-105", TiposEquipamento.TrocadorCalor,
            P("Temperatura de saída", "°C", 180, 210),
            P("Pressão no casco", "bar", 16, 20),
            P("Vazão nos tubos", "m³/h", 200, 240),
            P("Vibração", "mm/s", 3.5, 6)),
        A("Coluna de destilação atmosférica", "T-101", TiposEquipamento.ColunaDestilacao,
            P("Temperatura de topo", "°C", 140, 165),
            P("Temperatura de fundo", "°C", 360, 380),
            P("Pressão de topo", "bar", 2.5, 3.2),
            P("Vazão de refluxo", "m³/h", 160, 190),
            P("Nível de fundo", "%", 75, 90)),
        A("Tanque de armazenamento 301", "TQ-301", TiposEquipamento.Tanque,
            P("Nível", "%", 85, 95),
            P("Temperatura do produto", "°C", 55, 70),
            P("Pressão interna", "mbar", 20, 30))
    ];

    private static IEnumerable<RotinaManutencao> CriarRotinas()
    {
        static RotinaManutencao R(
            string tipo, string titulo, string? parametro, TipoManutencao manutencao,
            string instrucoes, string? pecas = null, int? intervalo = null, int criadaHaDias = 0) =>
            new()
            {
                TipoAtivo = tipo,
                Titulo = titulo,
                ParametroNome = parametro,
                TipoManutencao = manutencao,
                Instrucoes = instrucoes,
                PecasMateriais = pecas,
                IntervaloDias = intervalo,
                CriadaEm = DateTime.UtcNow.AddDays(-criadaHaDias)
            };

        const string bomba = TiposEquipamento.BombaCentrifuga;
        const string bombeio = TiposEquipamento.UnidadeBombeio;
        const string compressor = TiposEquipamento.Compressor;
        const string forno = TiposEquipamento.Forno;
        const string trocador = TiposEquipamento.TrocadorCalor;
        const string coluna = TiposEquipamento.ColunaDestilacao;
        const string tanque = TiposEquipamento.Tanque;

        return
        [
            // A primeira rotina por tempo nasce vencida para demonstrar a OS preventiva.
            R(bomba, "Trocar o óleo lubrificante", null, TipoManutencao.Preventiva,
                "Parar e bloquear a bomba\nDrenar o óleo usado do mancal\nAbastecer até o nível indicado\nVerificar vazamentos",
                "Óleo lubrificante ISO VG 68; junta do bujão", 90, 100),
            R(bomba, "Inspecionar o selo mecânico", "temper", TipoManutencao.Corretiva,
                "Verificar gotejamento no selo\nConferir o plano de refrigeração do selo\nSubstituir o selo se houver desgaste",
                "Kit de selo mecânico"),
            R(bomba, "Conferir alinhamento e rolamentos", "vibra", TipoManutencao.Preditiva,
                "Medir a vibração nos mancais\nConferir o alinhamento do acoplamento\nVerificar a folga dos rolamentos",
                "Rolamentos reserva; calços de alinhamento"),
            R(bomba, "Verificar sucção e impelidor", "press", TipoManutencao.Corretiva,
                "Inspecionar o filtro de sucção\nPesquisar sinais de cavitação\nInspecionar o impelidor"),

            R(bombeio, "Lubrificar mancais e redutor", null, TipoManutencao.Preventiva,
                "Parar a unidade e aplicar o freio\nCompletar o óleo do redutor\nEngraxar o mancal central e as bielas",
                "Óleo para engrenagens; graxa industrial", 30),
            R(bombeio, "Balancear contrapesos e fixações", "vibra", TipoManutencao.Preditiva,
                "Conferir o torque das fixações da base\nVerificar o balanceamento dos contrapesos\nInspecionar correias"),
            R(bombeio, "Inspecionar o motor elétrico", "temper", TipoManutencao.Corretiva,
                "Medir a corrente do motor\nLimpar as aletas de refrigeração\nVerificar as conexões elétricas"),

            R(compressor, "Trocar óleo e filtro", null, TipoManutencao.Preventiva,
                "Despressurizar e bloquear o compressor\nTrocar o óleo do cárter\nTrocar o filtro de óleo",
                "Óleo para compressor; elemento filtrante", 60),
            R(compressor, "Inspecionar válvulas dos cilindros", "temper", TipoManutencao.Corretiva,
                "Isolar e purgar o cilindro\nInspecionar válvulas de sucção e descarga\nTestar o resfriador intermediário",
                "Jogo de válvulas e juntas"),
            R(compressor, "Testar alívio e controle de pressão", "press", TipoManutencao.Preventiva,
                "Testar a válvula de segurança\nCalibrar o transmissor de pressão\nVerificar o controle de capacidade"),
            R(compressor, "Analisar vibração do cárter", "vibra", TipoManutencao.Preditiva,
                "Coletar espectro de vibração\nVerificar folgas das bielas\nConferir chumbadores"),

            R(forno, "Ajustar a queima e conferir termopares", "temperatura de saída", TipoManutencao.Corretiva,
                "Conferir os termopares de saída\nAjustar a relação ar e combustível\nVerificar o controle de temperatura",
                "Termopar reserva"),
            R(forno, "Inspecionar queimadores", "combust", TipoManutencao.Corretiva,
                "Verificar o padrão das chamas\nLimpar os bicos queimadores\nConferir a pressão do gás combustível",
                "Bicos queimadores"),
            R(forno, "Inspecionar a serpentina por termografia", "parede", TipoManutencao.Preditiva,
                "Fazer termografia dos tubos\nPesquisar pontos quentes\nAvaliar necessidade de decoqueamento"),
            R(forno, "Revisar refratário e tiragem", null, TipoManutencao.Preventiva,
                "Inspecionar o refratário\nConferir abafadores e tiragem", "Manta refratária", 180),

            R(trocador, "Limpar o feixe tubular", "temper", TipoManutencao.Corretiva,
                "Isolar e drenar casco e tubos\nSacar o feixe e remover a incrustação\nTestar a estanqueidade",
                "Juntas dos cabeçotes"),
            R(trocador, "Verificar chicanas e suportes", "vibra", TipoManutencao.Preditiva,
                "Inspecionar selas e chumbadores\nPesquisar vibração induzida pelo escoamento"),

            R(coluna, "Verificar inundação dos pratos", "press", TipoManutencao.Preditiva,
                "Acompanhar a perda de carga\nAjustar carga e refluxo\nProgramar inspeção interna se persistir"),
            R(coluna, "Inspecionar refluxo e refervedor", "temper", TipoManutencao.Corretiva,
                "Conferir a bomba de refluxo\nVerificar o vapor do refervedor\nCalibrar os transmissores de temperatura"),

            R(tanque, "Calibrar o medidor de nível", "nível", TipoManutencao.Corretiva,
                "Conferir o nível manualmente\nCalibrar o transmissor\nTestar o alarme de nível alto"),
            R(tanque, "Inspecionar respiros e selo do teto", null, TipoManutencao.Preventiva,
                "Limpar a válvula de respiro\nInspecionar o selo do teto flutuante\nVerificar o dique de contenção",
                "Selo do teto flutuante", 120)
        ];
    }
}
