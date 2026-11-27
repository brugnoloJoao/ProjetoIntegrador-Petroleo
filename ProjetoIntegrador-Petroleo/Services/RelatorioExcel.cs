using ClosedXML.Excel;
using ProjetoIntegrador_Petroleo.Models;

namespace ProjetoIntegrador_Petroleo.Services;

public sealed record DadosRelatorio(
    DateTime GeradoEmUtc,
    bool SimulacaoAtiva,
    List<Ativo> Ativos,
    List<Parametro> Parametros,
    List<Alerta> Alertas,
    List<Anomalia> Anomalias,
    List<OrdemServico> Ordens);

// Planilha do relatório operacional: uma aba por assunto, com cabeçalho, filtros e cores.
public static class RelatorioExcel
{
    private static readonly XLColor Escuro = XLColor.FromHtml("#171C25");
    private static readonly XLColor Ambar = XLColor.FromHtml("#F5AA32");
    private static readonly XLColor Cinza = XLColor.FromHtml("#6B7482");
    private static readonly XLColor Faixa = XLColor.FromHtml("#F5F6F8");
    private static readonly XLColor Linha = XLColor.FromHtml("#E1E5EB");

    private sealed record Coluna(string Titulo, double Largura, string? Formato = null, bool Quebrar = false);

    public static byte[] Gerar(DadosRelatorio dados)
    {
        using var livro = new XLWorkbook();
        livro.Style.Font.FontName = "Calibri";
        livro.Style.Font.FontSize = 11;

        var subtitulo = $"Gerado em {dados.GeradoEmUtc.HorarioDeBrasilia("dd/MM/yyyy 'às' HH:mm")} (horário de Brasília) · "
            + $"Simulação {(dados.SimulacaoAtiva ? "ativa" : "pausada: dados simulados não incluídos")}";

        Resumo(livro, dados, subtitulo);

        Aba(livro, "Ativos", "Equipamentos cadastrados", subtitulo,
            [new("Equipamento", 36), new("Tag", 18), new("Tipo", 24), new("Status", 18), new("Parâmetros", 13, "0")],
            dados.Ativos.Select(a => new XLCellValue[]
            {
                Texto(a.Nome), Texto(a.Tag), Texto(a.Tipo), Texto(Status(a.Status)),
                dados.Parametros.Count(p => p.AtivoId == a.Id)
            }));

        Aba(livro, "Parâmetros", "Limites monitorados", subtitulo,
            [new("Equipamento", 36), new("Tag", 18), new("Parâmetro", 34), new("Unidade", 12),
             new("Limite de atenção", 19, "#,##0.##"), new("Limite crítico", 17, "#,##0.##")],
            dados.Parametros.Select(p => new XLCellValue[]
            {
                Texto(p.Ativo?.Nome), Texto(p.Ativo?.Tag), Texto(p.Nome), Texto(p.Unidade), p.LimiteAtencao, p.LimiteCritico
            }));

        Aba(livro, "Alertas", "Alertas registrados", subtitulo,
            [new("Nº", 8, "0"), new("Data e hora", 18, "dd/mm/yyyy hh:mm"), new("Equipamento", 34), new("Tag", 16),
             new("Parâmetro", 30), new("Severidade", 14), new("Status", 15), new("Valor medido", 14, "#,##0.00"),
             new("Limite violado", 15, "#,##0.00"), new("Unidade", 10), new("Origem", 11),
             new("Observação", 46, Quebrar: true)],
            dados.Alertas.Select(a => new XLCellValue[]
            {
                a.Id, Data(a.DataHora), Texto(a.Parametro?.Ativo?.Nome), Texto(a.Parametro?.Ativo?.Tag),
                Texto(a.Parametro?.Nome), Severidade(a.Severidade), Texto(a.Status.Nome()), a.ValorMedido,
                a.LimiteViolado, Texto(a.Parametro?.Unidade), Origem(a.Simulada), Texto(a.Observacao)
            }));

        Aba(livro, "Anomalias", "Leituras fora do padrão recente", subtitulo,
            [new("Data e hora", 18, "dd/mm/yyyy hh:mm"), new("Equipamento", 34), new("Tag", 16), new("Parâmetro", 30),
             new("Valor", 12, "#,##0.00"), new("Unidade", 10), new("Desvios-padrão", 16, "#,##0.0"),
             new("Origem", 11), new("Descrição", 60, Quebrar: true)],
            dados.Anomalias.Select(a => new XLCellValue[]
            {
                Data(a.DataHora), Texto(a.Parametro?.Ativo?.Nome), Texto(a.Parametro?.Ativo?.Tag),
                Texto(a.Parametro?.Nome), a.ValorMedido, Texto(a.Parametro?.Unidade), a.Score,
                Origem(a.Simulada), Texto(a.Descricao)
            }));

        Aba(livro, "Ordens de serviço", "Ordens de serviço", subtitulo,
            [new("Nº", 8, "0"), new("Título", 42, Quebrar: true), new("Equipamento", 32), new("Tag", 16),
             new("Manutenção", 15), new("Prioridade", 13), new("Status", 16),
             new("Abertura", 18, "dd/mm/yyyy hh:mm"), new("Análise", 18, "dd/mm/yyyy hh:mm"),
             new("Encerramento", 18, "dd/mm/yyyy hh:mm"), new("Operador responsável", 28),
             new("Solicitante", 28), new("Peças e materiais", 34, Quebrar: true), new("Descrição", 60, Quebrar: true)],
            dados.Ordens.Select(o => new XLCellValue[]
            {
                o.Id, Texto(o.Titulo), Texto(o.Ativo?.Nome), Texto(o.Ativo?.Tag),
                Texto(o.TipoManutencao?.Nome()), Texto(o.Prioridade.Nome()), Texto(o.Status.Nome()),
                Data(o.DataAbertura), Data(o.DataAprovacao), Data(o.DataEncerramento),
                Texto(o.Operador?.Email), Texto(o.SolicitanteId), Texto(o.PecasMateriais), Texto(o.Descricao)
            }));

        using var memoria = new MemoryStream();
        livro.SaveAs(memoria);
        return memoria.ToArray();
    }

    private static void Resumo(XLWorkbook livro, DadosRelatorio dados, string subtitulo)
    {
        var aba = livro.Worksheets.Add("Resumo");
        aba.ShowGridLines = false;
        Titulo(aba, "PetroSync · Relatório operacional", subtitulo, 5);

        var ativos = dados.Alertas.Where(a => a.Status == StatusAlerta.Ativo).ToList();
        bool EmAberto(OrdemServico o) => o.Status is not (StatusOrdem.Encerrada or StatusOrdem.Rejeitada);

        Cabecalho(aba, 4, ["Indicador", "Quantidade"]);
        (string Nome, int Valor)[] indicadores =
        [
            ("Equipamentos cadastrados", dados.Ativos.Count),
            ("Equipamentos operando", dados.Ativos.Count(a => a.Status == StatusAtivo.Operando)),
            ("Parâmetros monitorados", dados.Parametros.Count),
            ("Alertas ativos", ativos.Count),
            ("Alertas críticos ativos", ativos.Count(a => a.Severidade == Models.Severidade.Critico)),
            ("Ordens de serviço em aberto", dados.Ordens.Count(EmAberto)),
            ("Anomalias no relatório", dados.Anomalias.Count)
        ];
        var linha = 5;
        foreach (var (nome, valor) in indicadores)
        {
            aba.Cell(linha, 1).Value = nome;
            aba.Cell(linha, 2).Value = valor;
            aba.Cell(linha, 2).Style.Font.Bold = true;
            Moldura(aba.Range(linha, 1, linha, 2), linha);
            linha++;
        }

        linha += 2;
        aba.Cell(linha, 1).Value = "Situação de cada equipamento";
        aba.Cell(linha, 1).Style.Font.SetBold().Font.SetFontSize(13);
        linha++;
        Cabecalho(aba, linha, ["Equipamento", "Tag", "Condição", "Alertas em aberto", "OS em aberto"]);
        linha++;
        foreach (var ativo in dados.Ativos)
        {
            var abertos = dados.Alertas
                .Where(a => a.Parametro?.AtivoId == ativo.Id && a.Status != StatusAlerta.Normalizado)
                .ToList();
            var condicao = abertos.Any(a => a.Severidade == Models.Severidade.Critico) ? "⛔ Crítico"
                : abertos.Count > 0 ? "⚠ Atenção" : "✓ Normal";
            aba.Cell(linha, 1).Value = Texto(ativo.Nome);
            aba.Cell(linha, 2).Value = Texto(ativo.Tag);
            aba.Cell(linha, 3).Value = condicao;
            aba.Cell(linha, 4).Value = abertos.Count;
            aba.Cell(linha, 5).Value = dados.Ordens.Count(o => o.AtivoId == ativo.Id && EmAberto(o));
            Moldura(aba.Range(linha, 1, linha, 5), linha);
            Colorir(aba.Cell(linha, 3));
            linha++;
        }

        aba.Cell(linha + 1, 1).Value = "Cada aba traz até 5.000 alertas, anomalias e ordens mais recentes.";
        aba.Cell(linha + 1, 1).Style.Font.SetFontColor(Cinza).Font.SetItalic();

        double[] larguras = [38, 18, 16, 20, 16];
        for (var i = 0; i < larguras.Length; i++) aba.Column(i + 1).Width = larguras[i];
        Impressao(aba);
    }

    private static void Aba(
        XLWorkbook livro, string nome, string titulo, string subtitulo,
        Coluna[] colunas, IEnumerable<XLCellValue[]> linhas)
    {
        var aba = livro.Worksheets.Add(nome);
        aba.ShowGridLines = false;
        Titulo(aba, titulo, subtitulo, colunas.Length);
        Cabecalho(aba, 4, colunas.Select(c => c.Titulo).ToArray());

        var linha = 5;
        foreach (var valores in linhas)
        {
            for (var i = 0; i < valores.Length; i++) aba.Cell(linha, i + 1).Value = valores[i];
            Moldura(aba.Range(linha, 1, linha, colunas.Length), linha);
            for (var i = 0; i < valores.Length; i++) Colorir(aba.Cell(linha, i + 1));
            linha++;
        }

        for (var i = 0; i < colunas.Length; i++)
        {
            var coluna = aba.Column(i + 1);
            coluna.Width = colunas[i].Largura;
            if (linha == 5) continue;
            var dadosDaColuna = aba.Range(5, i + 1, linha - 1, i + 1);
            if (colunas[i].Formato is { } formato) dadosDaColuna.Style.NumberFormat.Format = formato;
            if (colunas[i].Quebrar) dadosDaColuna.Style.Alignment.WrapText = true;
        }

        if (linha == 5)
        {
            aba.Cell(5, 1).Value = "Nenhum registro.";
            aba.Cell(5, 1).Style.Font.SetFontColor(Cinza).Font.SetItalic();
        }
        else
        {
            aba.Range(4, 1, linha - 1, colunas.Length).SetAutoFilter();
        }

        aba.SheetView.FreezeRows(4);
        Impressao(aba);
    }

    private static void Titulo(IXLWorksheet aba, string titulo, string subtitulo, int colunas)
    {
        var faixa = aba.Range(1, 1, 1, colunas);
        faixa.Style.Fill.BackgroundColor = Escuro;
        faixa.Style.Border.BottomBorder = XLBorderStyleValues.Thick;
        faixa.Style.Border.BottomBorderColor = Ambar;
        aba.Cell(1, 1).Value = titulo;
        aba.Cell(1, 1).Style.Font.SetBold().Font.SetFontSize(16).Font.SetFontColor(XLColor.White);
        aba.Cell(1, 1).Style.Alignment.Vertical = XLAlignmentVerticalValues.Center;
        aba.Row(1).Height = 32;
        aba.Cell(2, 1).Value = subtitulo;
        aba.Cell(2, 1).Style.Font.SetFontColor(Cinza);
    }

    private static void Cabecalho(IXLWorksheet aba, int linha, string[] titulos)
    {
        for (var i = 0; i < titulos.Length; i++) aba.Cell(linha, i + 1).Value = titulos[i];
        var faixa = aba.Range(linha, 1, linha, titulos.Length);
        faixa.Style.Fill.BackgroundColor = Ambar;
        faixa.Style.Font.SetBold().Font.SetFontColor(Escuro);
        faixa.Style.Alignment.Vertical = XLAlignmentVerticalValues.Center;
        aba.Row(linha).Height = 22;
    }

    private static void Moldura(IXLRange faixa, int linha)
    {
        if (linha % 2 == 0) faixa.Style.Fill.BackgroundColor = Faixa;
        faixa.Style.Border.BottomBorder = XLBorderStyleValues.Thin;
        faixa.Style.Border.BottomBorderColor = Linha;
        faixa.Style.Alignment.Vertical = XLAlignmentVerticalValues.Top;
    }

    // Situações importantes ganham cor, sempre junto do ícone e do texto.
    private static void Colorir(IXLCell celula)
    {
        if (!celula.Value.IsText) return;
        var cores = celula.GetText() switch
        {
            "⛔ Crítico" => ("#FDE2E2", "#9B1C1C"),
            "⚠ Atenção" => ("#FFF0D2", "#8A5A00"),
            "✓ Normal" => ("#DFF5E8", "#12643A"),
            _ => default
        };
        if (cores == default) return;
        celula.Style.Fill.BackgroundColor = XLColor.FromHtml(cores.Item1);
        celula.Style.Font.SetFontColor(XLColor.FromHtml(cores.Item2)).Font.SetBold();
    }

    private static void Impressao(IXLWorksheet aba)
    {
        aba.PageSetup.PageOrientation = XLPageOrientation.Landscape;
        aba.PageSetup.PaperSize = XLPaperSize.A4Paper;
        aba.PageSetup.FitToPages(1, 0);
        aba.PageSetup.Margins.SetLeft(0.4).SetRight(0.4);
    }

    private static string Severidade(Models.Severidade valor) =>
        valor == Models.Severidade.Critico ? "⛔ Crítico" : "⚠ Atenção";

    private static string Status(StatusAtivo valor) => valor switch
    {
        StatusAtivo.Operando => "Operando",
        StatusAtivo.EmManutencao => "Em manutenção",
        _ => valor.Nome()
    };

    private static string Origem(bool simulada) => simulada ? "Simulada" : "Real";

    private static XLCellValue Data(DateTime? utc) => utc is { } valor
        ? DateTime.Parse(valor.HorarioDeBrasilia("yyyy-MM-ddTHH:mm:ss"), System.Globalization.CultureInfo.InvariantCulture)
        : Blank.Value;

    // O texto entra como texto (nunca como fórmula) e sem caracteres que o Excel não aceita.
    private static string Texto(string? valor)
    {
        if (string.IsNullOrEmpty(valor)) return "";
        var limpo = new string(valor.Where(c => c >= ' ' || c is '\n' or '\t').ToArray());
        return limpo.Length > 32000 ? limpo[..32000] : limpo;
    }
}
