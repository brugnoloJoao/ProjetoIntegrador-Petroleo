using Microsoft.EntityFrameworkCore;
using ProjetoIntegrador_Petroleo.Models;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;

namespace ProjetoIntegrador_Petroleo.Data
{
    // Classe de contexto do Entity Framework Core.
    // Ela faz a ponte entre a aplicação e o banco de dados.
    // É por meio dela que consultamos, inserimos, atualizamos e removemos dados.
    public class AppDbContext : IdentityDbContext<IdentityUser>
    { 
        // Construtor que recebe as opções de configuração do contexto,
        // como a connection string e o provedor do banco de dados (SQL Server).
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) 
        {
        
        }

        // Representa a tabela "Ativos" no banco de dados.
        // O tipo DbSet<Ativo> permite executar operações de consulta e persistência sobre a entidade Ativo.
        public DbSet<Ativo> Ativos => Set<Ativo>();
        public DbSet<Parametro> Parametros => Set<Parametro>();
        public DbSet<Leitura> Leituras => Set<Leitura>();
        public DbSet<Alerta> Alertas => Set<Alerta>();
        public DbSet<Anomalia> Anomalias => Set<Anomalia>();
        public DbSet<OrdemServico> OrdensServico => Set<OrdemServico>();

        protected override void OnModelCreating(ModelBuilder builder)
        {
            base.OnModelCreating(builder);   // obrigatório se for IdentityDbContext

            builder.Entity<Leitura>()
                .HasIndex(l => new { l.ParametroId, l.DataHora });
        }
    }
}
