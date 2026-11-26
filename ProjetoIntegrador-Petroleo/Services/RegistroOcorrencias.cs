using Microsoft.EntityFrameworkCore;
using ProjetoIntegrador_Petroleo.Data;
using ProjetoIntegrador_Petroleo.Models;

namespace ProjetoIntegrador_Petroleo.Services;

// Como o alerta evoluiu, segundo as leituras gravadas. Fim nulo: ainda sem retorno ao normal.
public sealed record EvolucaoAlerta(double Pico, DateTime? Fim)
{
    public string Resumo(Alerta alerta, string unidade)
    {
        var pico = $"Maior valor registrado: {Pico:F1} {unidade}.";
        if (Fim is { } fim)
            return $"{pico} Voltou ao normal em {fim.HorarioDeBrasilia("dd/MM/yyyy HH:mm:ss")}, depois de {Duracao(fim - alerta.DataHora)}.";

        return alerta.Status == StatusAlerta.Normalizado
            ? $"{pico} O alerta já foi normalizado."
            : $"{pico} O alerta continua em aberto.";
    }

    private static string Duracao(TimeSpan tempo) =>
        tempo.TotalMinutes < 1 ? $"{Math.Max(1, (int)Math.Round(tempo.TotalSeconds))} s"
        : tempo.TotalHours < 1 ? $"{tempo.Minutes} min {tempo.Seconds} s"
        : tempo.TotalDays < 1 ? $"{tempo.Hours} h {tempo.Minutes} min"
        : $"{tempo.Days} d {tempo.Hours} h";
}

// Reconstrói o que aconteceu a partir do que já fica gravado; não altera nada.
public sealed class RegistroOcorrencias(AppDbContext db)
{
    public async Task<EvolucaoAlerta> EvolucaoAsync(Alerta alerta, Parametro parametro)
    {
        // As leituras posteriores ao próximo alerta já pertencem a outra ocorrência.
        var proximo = await db.Alertas
            .Where(a => a.ParametroId == alerta.ParametroId && a.Simulada == alerta.Simulada
                && a.DataHora > alerta.DataHora)
            .MinAsync(a => (DateTime?)a.DataHora);

        var leituras = db.Leituras.Where(l => l.ParametroId == alerta.ParametroId
            && l.Simulada == alerta.Simulada && l.DataHora >= alerta.DataHora);
        if (proximo != null)
            leituras = leituras.Where(l => l.DataHora < proximo);

        DateTime? fim = null;
        if (alerta.Status == StatusAlerta.Normalizado)
        {
            fim = await leituras
                .Where(l => l.DataHora > alerta.DataHora && l.Valor < parametro.LimiteAtencao)
                .MinAsync(l => (DateTime?)l.DataHora);
            if (fim != null)
                leituras = leituras.Where(l => l.DataHora < fim);
        }

        var pico = await leituras.MaxAsync(l => (double?)l.Valor);
        return new EvolucaoAlerta(Math.Max(pico ?? alerta.ValorMedido, alerta.ValorMedido), fim);
    }
}
