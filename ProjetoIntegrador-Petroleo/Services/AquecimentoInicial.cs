using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using ProjetoIntegrador_Petroleo.Data;
using ProjetoIntegrador_Petroleo.Models;

namespace ProjetoIntegrador_Petroleo.Services;

// Logo que o sistema liga, faz uma vez as consultas mais usadas. A primeira execução de
// cada consulta é a mais lenta; assim quem abre a primeira tela não paga essa espera.
// Só lê o banco e, se algo falhar, o sistema segue normalmente.
public sealed class AquecimentoInicial(
    IServiceScopeFactory escopos,
    ILogger<AquecimentoInicial> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken ct)
    {
        try
        {
            // Deixa o servidor começar a atender antes.
            await Task.Delay(TimeSpan.FromMilliseconds(300), ct);

            using var escopo = escopos.CreateScope();
            var db = escopo.ServiceProvider.GetRequiredService<AppDbContext>();
            var usuarios = escopo.ServiceProvider.GetRequiredService<UserManager<IdentityUser>>();
            var planejamento = escopo.ServiceProvider.GetRequiredService<PlanejamentoManutencao>();
            var registro = escopo.ServiceProvider.GetRequiredService<RegistroOcorrencias>();

            // Entrada no sistema.
            if (await usuarios.FindByNameAsync("aquecimento") is null)
                await usuarios.GetUsersInRoleAsync("Operador");

            // Visão geral, ativos e máquinas 3D.
            await db.Ativos.AsNoTracking().Include(a => a.Parametros).OrderBy(a => a.Nome).ToListAsync(ct);
            await db.Leituras.AsNoTracking()
                .Where(l => l.Simulada)
                .OrderByDescending(l => l.Id)
                .FirstOrDefaultAsync(ct);

            // Alertas, ocorrências, anomalias e ordens de serviço.
            var alerta = await db.Alertas.AsNoTracking()
                .Include(a => a.Parametro).ThenInclude(p => p!.Ativo)
                .OrderByDescending(a => a.Id)
                .FirstOrDefaultAsync(ct);
            if (alerta?.Parametro != null)
            {
                await registro.EvolucaoAsync(alerta, alerta.Parametro);
                await planejamento.OrdemQueCobreAsync(alerta);
            }
            await db.Anomalias.AsNoTracking()
                .Include(a => a.Parametro).ThenInclude(p => p!.Ativo)
                .OrderByDescending(a => a.Id)
                .FirstOrDefaultAsync(ct);
            await db.OrdensServico.AsNoTracking()
                .Include(o => o.Ativo).Include(o => o.Operador)
                .OrderByDescending(o => o.Id)
                .FirstOrDefaultAsync(ct);
            await planejamento.SugestoesAsync();
        }
        catch (OperationCanceledException) when (ct.IsCancellationRequested)
        {
            // O sistema está desligando.
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Aquecimento inicial não concluído.");
        }
    }
}
