using Microsoft.AspNetCore.Identity;

namespace ProjetoIntegrador_Petroleo.Areas.Identity.Pages.Account;

public sealed class LoginaModel : AccountLoginModel
{
    public LoginaModel(SignInManager<IdentityUser> signInManager) : base(signInManager) { }
}
