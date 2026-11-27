using Microsoft.EntityFrameworkCore;
using ProjetoIntegrador_Petroleo.Data;
using ProjetoIntegrador_Petroleo.Models;
using ProjetoIntegrador_Petroleo.ViewModels;

namespace ProjetoIntegrador_Petroleo.Services;

// Monta as ordens de serviço sugeridas. Nada é gravado até alguém confirmar,
// por isso o simulador não gera ordens em excesso.
public sealed class PlanejamentoManutencao(AppDbContext db, SimuladorEstado simulador)
{
    public async Task<List<RotinaManutencao>> RotinasDoAtivoAsync(Ativo ativo)
    {
        var rotinas = await db.RotinasManutencao.AsNoTracking()
            .Where(r => r.Ativa && (r.AtivoId == null || r.AtivoId == ativo.Id))
            .OrderBy(r => r.Titulo)
            .ToListAsync();

        return rotinas.Where(r => r.AplicaA(ativo)).ToList();
    }

    // Ordem ainda não encerrada nem rejeitada que já inclui a rotina neste ativo.
    public Task<int?> OrdemAbertaDaRotinaAsync(int rotinaId, int ativoId) =>
        db.OrdensServicoItens.AsNoTracking()
            .Where(i => i.RotinaManutencaoId == rotinaId
                && i.OrdemServico!.AtivoId == ativoId
                && i.OrdemServico.Status != StatusOrdem.Encerrada
                && i.OrdemServico.Status != StatusOrdem.Rejeitada)
            .Select(i => (int?)i.OrdemServicoId)
            .FirstOrDefaultAsync();

    public async Task<List<SugestaoOrdemVM>> SugestoesAsync()
    {
        var porAlerta = await SugestoesDeAlertasAsync();
        var porTempo = await SugestoesPorTempoAsync();

        return porAlerta.Concat(porTempo)
            .OrderByDescending(s => s.Prioridade)
            .ThenByDescending(s => s.DataHora)
            .ToList();
    }

    // Alertas que nenhuma OS cobriu ainda. O valor voltar ao normal não retira o alerta:
    // ele só sai da lista quando alguém abre uma OS para o parâmetro. Uma OS cobre o
    // parâmetro enquanto está aberta e, depois, tudo o que normalizou até ela terminar.
    public IQueryable<Alerta> AlertasSemOrdem() =>
        db.Alertas.AsNoTracking().Where(a => !db.OrdensServico.Any(o =>
            (o.AlertaId != null && o.Alerta!.ParametroId == a.ParametroId
                && ((o.Status != StatusOrdem.Encerrada && o.Status != StatusOrdem.Rejeitada)
                    || (a.Status == StatusAlerta.Normalizado
                        && (o.DataAbertura >= a.DataHora || o.DataEncerramento >= a.DataHora))))
            || (o.AlertaId == null && o.Status == StatusOrdem.Encerrada
                && o.AtivoId == a.Parametro!.AtivoId
                && a.Status == StatusAlerta.Normalizado && o.DataEncerramento >= a.DataHora)));

    // Mesma regra, para um alerta: a OS ligada a ele tem preferência.
    public Task<OrdemServico?> OrdemQueCobreAsync(Alerta alerta)
    {
        var normalizado = alerta.Status == StatusAlerta.Normalizado;
        return db.OrdensServico.AsNoTracking()
            .Where(o => (o.AlertaId != null && o.Alerta!.ParametroId == alerta.ParametroId
                    && ((o.Status != StatusOrdem.Encerrada && o.Status != StatusOrdem.Rejeitada)
                        || (normalizado
                            && (o.DataAbertura >= alerta.DataHora || o.DataEncerramento >= alerta.DataHora))))
                || (normalizado && o.AlertaId == null && o.Status == StatusOrdem.Encerrada
                    && o.DataEncerramento >= alerta.DataHora
                    && db.Parametros.Any(p => p.Id == alerta.ParametroId && p.AtivoId == o.AtivoId)))
            .OrderByDescending(o => o.AlertaId == alerta.Id)
            .ThenBy(o => o.DataAbertura)
            .FirstOrDefaultAsync();
    }

    // Uma sugestão por parâmetro, representada pela ocorrência mais grave.
    public async Task<List<SugestaoOrdemVM>> SugestoesDeAlertasAsync(int? ativoId = null)
    {
        var simulacaoAtiva = simulador.Ativo;
        var pendentes = AlertasSemOrdem().Where(a => simulacaoAtiva || !a.Simulada);
        if (ativoId != null)
            pendentes = pendentes.Where(a => a.Parametro!.AtivoId == ativoId);

        var resumos = await pendentes
            .GroupBy(a => a.ParametroId)
            .Select(g => new
            {
                ParametroId = g.Key,
                Total = g.Count(),
                EmAberto = g.Count(a => a.Status != StatusAlerta.Normalizado),
                Primeira = g.Min(a => a.DataHora)
            })
            .ToListAsync();
        if (resumos.Count == 0) return [];

        var rotinas = await db.RotinasManutencao.AsNoTracking().Where(r => r.Ativa).ToListAsync();
        var sugestoes = new List<SugestaoOrdemVM>();

        foreach (var resumo in resumos)
        {
            var a = await pendentes
                .Include(x => x.Parametro).ThenInclude(p => p!.Ativo)
                .Where(x => x.ParametroId == resumo.ParametroId)
                .OrderByDescending(x => x.Severidade)
                .ThenBy(x => x.Status)
                .ThenByDescending(x => x.DataHora)
                .FirstOrDefaultAsync();
            if (a is null) continue;

            var parametro = a.Parametro!;
            var ativo = parametro.Ativo!;
            var situacao = resumo.EmAberto > 0 ? "Alerta ainda em aberto" : "O valor já voltou ao normal";
            if (resumo.Total > 1)
                situacao += $" · {resumo.Total} ocorrências sem OS desde {resumo.Primeira.HorarioDeBrasilia("dd/MM HH:mm")}";

            sugestoes.Add(new SugestaoOrdemVM(
                AlertaId: a.Id,
                RotinaId: null,
                AtivoId: ativo.Id,
                AtivoNome: ativo.Nome,
                AtivoTag: ativo.Tag,
                Titulo: $"{parametro.Nome} acima do limite",
                Detalhe: $"{a.Severidade.Nome()}: {a.ValorMedido:F1} {parametro.Unidade} (limite {a.LimiteViolado:F1}) em {a.DataHora.HorarioDeBrasilia("dd/MM HH:mm:ss")}",
                Rotinas: rotinas
                    .Where(r => r.AplicaA(ativo) && r.AcionadaPor(parametro.Nome))
                    .Select(r => r.Titulo)
                    .ToList(),
                Prioridade: a.Severidade == Severidade.Critico ? Prioridade.Alta : Prioridade.Media,
                DataHora: a.DataHora,
                Parametro: parametro.Nome,
                Situacao: situacao));
        }

        return sugestoes
            .OrderByDescending(s => s.Prioridade)
            .ThenByDescending(s => s.DataHora)
            .ToList();
    }

    private async Task<List<SugestaoOrdemVM>> SugestoesPorTempoAsync()
    {
        var rotinas = await db.RotinasManutencao.AsNoTracking()
            .Where(r => r.Ativa && r.IntervaloDias != null)
            .ToListAsync();
        if (rotinas.Count == 0) return [];

        var ativos = await db.Ativos.AsNoTracking().ToListAsync();
        var idsRotinas = rotinas.Select(r => r.Id).ToList();
        var historico = await db.OrdensServicoItens.AsNoTracking()
            .Where(i => i.RotinaManutencaoId != null && idsRotinas.Contains(i.RotinaManutencaoId.Value)
                && i.OrdemServico!.Status != StatusOrdem.Rejeitada)
            .Select(i => new
            {
                RotinaId = i.RotinaManutencaoId!.Value,
                i.OrdemServico!.AtivoId,
                i.OrdemServico.Status,
                i.OrdemServico.DataEncerramento
            })
            .ToListAsync();
        var porPar = historico.ToLookup(h => (h.RotinaId, h.AtivoId));
        var agora = DateTime.UtcNow;
        var sugestoes = new List<SugestaoOrdemVM>();

        foreach (var rotina in rotinas)
        {
            foreach (var ativo in ativos.Where(rotina.AplicaA))
            {
                var execucoes = porPar[(rotina.Id, ativo.Id)].ToList();
                if (execucoes.Any(e => e.Status != StatusOrdem.Encerrada)) continue;

                var ultima = execucoes.Max(e => e.DataEncerramento);
                var vencimento = (ultima ?? rotina.CriadaEm).AddDays(rotina.IntervaloDias!.Value);
                if (vencimento > agora) continue;

                sugestoes.Add(new SugestaoOrdemVM(
                    AlertaId: null,
                    RotinaId: rotina.Id,
                    AtivoId: ativo.Id,
                    AtivoNome: ativo.Nome,
                    AtivoTag: ativo.Tag,
                    Titulo: rotina.Titulo,
                    Detalhe: $"Rotina vencida desde {vencimento.HorarioDeBrasilia("dd/MM/yyyy")} (a cada {rotina.IntervaloDias} dias)",
                    Rotinas: [],
                    Prioridade: Prioridade.Media,
                    DataHora: vencimento));
            }
        }

        return sugestoes;
    }
}
