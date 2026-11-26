using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ProjetoIntegrador_Petroleo.Controllers;

[Authorize(Roles = "Operador")]
public sealed class OperadorController : Controller
{
    // Endereço antigo da tela 3D, mantido para links já salvos.
    [HttpGet]
    public IActionResult Maquina3D() => RedirectToAction("Index", "Maquina3D");
}
