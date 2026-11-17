using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using ProjetoIntegrador_Petroleo.Hubs;
using ProjetoIntegrador_Petroleo.Services;

namespace ProjetoIntegrador_Petroleo.Controllers;

[Authorize(Roles = "Engenheiro,Gestor")]
public class SimuladorController(SimuladorEstado estado, IHubContext<DashboardHub> hub) : Controller
{
    [HttpPost, ValidateAntiForgeryToken]
    public async Task<IActionResult> Alternar(string? returnUrl)
    {
        estado.Ativo = !estado.Ativo;
        await hub.Clients.All.SendAsync("EstadoSimuladorAlterado", new { ativo = estado.Ativo });
        TempData["Sucesso"] = estado.Ativo
            ? "Leituras simuladas ativadas."
            : "Leituras simuladas pausadas.";

        return Url.IsLocalUrl(returnUrl)
            ? LocalRedirect(returnUrl!)
            : RedirectToAction("Index", "Home");
    }
}
