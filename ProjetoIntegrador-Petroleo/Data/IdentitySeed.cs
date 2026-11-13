
using Microsoft.AspNetCore.Identity;

namespace ProjetoIntegrador_Petroleo.Data
{
    public class IdentitySeed
    {
        public static readonly string[] Perfis =
        {
            "Operador",
            "Engenheiro",
            "Gestor"
        };

        public static async Task ExecutarAsync(IServiceProvider sp)
        {
            var roles = sp.GetRequiredService<RoleManager<IdentityRole>>();
            var users = sp.GetRequiredService<UserManager<IdentityUser>>();
            var config = sp.GetRequiredService<IConfiguration>();
            var env = sp.GetRequiredService<IHostEnvironment>();

            // Cria os perfis caso ainda não existam.
            foreach (var perfil in Perfis)
            {
                if (!await roles.RoleExistsAsync(perfil))
                {
                    var resultado = await roles.CreateAsync(
                        new IdentityRole(perfil));

                    if (!resultado.Succeeded)
                        throw new Exception(
                            $"Erro ao criar perfil {perfil}: " +
                            string.Join(", ", resultado.Errors.Select(e => e.Description)));
                }
            }

            // Usuários de teste somente em desenvolvimento.
            if (env.IsDevelopment())
            {
                await CriarAsync(users, "gestor@petrosync.com",
                    "Gestor@123", "Gestor");

                await CriarAsync(users, "engenheiro@petrosync.com",
                    "Engenheiro@123", "Engenheiro");

                await CriarAsync(users, "operador@petrosync.com",
                    "Operador@123", "Operador");
            }

            if (!env.IsDevelopment())
            {
                var gestores = await users.GetUsersInRoleAsync("Gestor");

                if (gestores.Count == 0)
                {
                    var email = config["Seed:GestorEmail"];
                    var senha = config["Seed:GestorSenha"];

                    if (string.IsNullOrWhiteSpace(email) ||
                        string.IsNullOrWhiteSpace(senha))
                    {
                        throw new InvalidOperationException(
                            "Não existe um Gestor cadastrado e as credenciais "
                            + "para criação não foram configuradas.");
                    }

                    await CriarAsync(users, email, senha, "Gestor");
                }
            }
        }

        private static async Task CriarAsync(
            UserManager<IdentityUser> users,
            string email,
            string senha,
            string perfil)
        {
            var usuario = await users.FindByEmailAsync(email);

            if (usuario == null)
            {
                usuario = new IdentityUser
                {
                    UserName = email,
                    Email = email,
                    EmailConfirmed = true
                };

                var resultado = await users.CreateAsync(usuario, senha);

                if (!resultado.Succeeded)
                {
                    throw new Exception(
                        "Erro ao criar usuário: " +
                        string.Join(", ", resultado.Errors.Select(e => e.Description)));
                }
            }

            if (!await users.IsInRoleAsync(usuario, perfil))
            {
                var resultado = await users.AddToRoleAsync(usuario, perfil);

                if (!resultado.Succeeded)
                {
                    throw new Exception(
                        "Erro ao atribuir perfil: " +
                        string.Join(", ", resultado.Errors.Select(e => e.Description)));
                }
            }
        }
    }
}
