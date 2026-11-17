using Microsoft.AspNetCore.Identity;

namespace ProjetoIntegrador_Petroleo.Areas.Identity.Pages.Account;

public sealed class LoginModel : AccountLoginModel
{
    public LoginModel(SignInManager<IdentityUser> signInManager) : base(signInManager) { }
}
