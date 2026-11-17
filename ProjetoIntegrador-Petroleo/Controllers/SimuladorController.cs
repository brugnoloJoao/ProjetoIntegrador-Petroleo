using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ProjetoIntegrador_Petroleo.Services;

namespace ProjetoIntegrador_Petroleo.Controllers;

[Authorize(Roles = "Engenheiro,Gestor")]
public class SimuladorController(SimuladorEstado estado) : Controller
{
    [HttpPost, ValidateAntiForgeryToken]
    public IActionResult Alternar(string? returnUrl)
    {
        estado.Ativo = !estado.Ativo;
        TempData["Sucesso"] = estado.Ativo
            ? "Leituras simuladas ativadas."
            : "Leituras simuladas pausadas.";

        return Url.IsLocalUrl(returnUrl)
            ? LocalRedirect(returnUrl!)
            : RedirectToAction("Index", "Home");
    }
}
