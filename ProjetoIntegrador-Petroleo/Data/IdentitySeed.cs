using Microsoft.AspNetCore.Identity;

namespace ProjetoIntegrador_Petroleo.Data
{
    public class IdentitySeed
    {

        public static readonly string[] Perfis = { "Operador", "Engenheiro", "Gestor" };

        public static async Task ExecutarAsync(IServiceProvider sp)
        {
            var roles = sp.GetRequiredService<RoleManager<IdentityRole>>();
            var users = sp.GetRequiredService<UserManager<IdentityUser>>();

            foreach (var perfil in Perfis)
                if (!await roles.RoleExistsAsync(perfil))
                    await roles.CreateAsync(new IdentityRole(perfil));

            await CriarAsync(users, "gestor@petrosync.com", "Gestor@123", "Gestor");
            await CriarAsync(users, "engenheiro@petrosync.com", "Engenheiro@123", "Engenheiro");
            await CriarAsync(users, "operador@petrosync.com", "Operador@123", "Operador");
        }

        private static async Task CriarAsync(UserManager<IdentityUser> users, string email, string senha, string perfil)
        {
            if (await users.FindByEmailAsync(email) != null) return;

            var u = new IdentityUser { UserName = email, Email = email, EmailConfirmed = true };
            var r = await users.CreateAsync(u, senha);
            if (r.Succeeded) await users.AddToRoleAsync(u, perfil);
        }
    }
}
