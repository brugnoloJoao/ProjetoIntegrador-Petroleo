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
        if (await db.Ativos.AnyAsync(a => a.Tag == "DEMO-BOMBA-01")) return;

        var ativo = new Ativo
        {
            Nome = "Bomba de transferência 01",
            Tag = "DEMO-BOMBA-01",
            Tipo = "Bomba centrífuga",
            Status = StatusAtivo.Operando,
            Parametros =
            {
                new Parametro { Nome = "Temperatura", Unidade = "°C", LimiteAtencao = 90, LimiteCritico = 110 },
                new Parametro { Nome = "Pressão", Unidade = "bar", LimiteAtencao = 8, LimiteCritico = 10 },
                new Parametro { Nome = "Vibração", Unidade = "mm/s", LimiteAtencao = 4.5, LimiteCritico = 7.5 },
                new Parametro { Nome = "Vazão", Unidade = "m³/h", LimiteAtencao = 100, LimiteCritico = 130 }
            }
        };

        db.Ativos.Add(ativo);
        await db.SaveChangesAsync();
    }
}
