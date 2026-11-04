using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Rendering;
using Microsoft.EntityFrameworkCore;
using ProjetoIntegrador_Petroleo.Data;
using ProjetoIntegrador_Petroleo.Models;
using ProjetoIntegrador_Petroleo.ViewModels;

namespace ProjetoIntegrador_Petroleo.Controllers;

[Authorize(Roles = "Gestor")]
public class UsuariosController : Controller
{
    private readonly UserManager<IdentityUser> _users;
    public UsuariosController(UserManager<IdentityUser> users) => _users = users;

    private static bool Desativado(IdentityUser u) =>
        u.LockoutEnd.HasValue && u.LockoutEnd > DateTimeOffset.UtcNow;

    private void CarregarPerfis() =>
        ViewBag.Perfis = IdentitySeed.Perfis.Select(p => new SelectListItem(p, p)).ToList();

    public async Task<IActionResult> Index()
    {
        var lista = new List<UsuarioListarVM>();
        foreach (var u in await _users.Users.OrderBy(u => u.Email).ToListAsync())
        {
            var perfis = await _users.GetRolesAsync(u);
            lista.Add(new UsuarioListarVM
            {
                Id = u.Id,
                Email = u.Email ?? "",
                Perfil = perfis.FirstOrDefault() ?? "—",
                Ativo = !Desativado(u)
            });
        }
        return View(lista);
    }

    [HttpGet]
    public IActionResult Create()
    {
        CarregarPerfis();
        return View(new UsuarioCriarVM());
    }

    [HttpPost, ValidateAntiForgeryToken]
    public async Task<IActionResult> Create(UsuarioCriarVM vm)
    {
        CarregarPerfis();
        if (!ModelState.IsValid) return View(vm);

        var u = new IdentityUser { UserName = vm.Email, Email = vm.Email, EmailConfirmed = true };
        var r = await _users.CreateAsync(u, vm.Senha);
        if (!r.Succeeded)
        {
            foreach (var e in r.Errors) ModelState.AddModelError("", e.Description);
            return View(vm);
        }

        await _users.AddToRoleAsync(u, vm.Perfil);
        TempData["Sucesso"] = "Usuário cadastrado.";
        return RedirectToAction(nameof(Index));
    }

    [HttpGet]
    public async Task<IActionResult> Edit(string id)
    {
        var u = await _users.FindByIdAsync(id);
        if (u == null) return NotFound();

        CarregarPerfis();
        return View(new UsuarioEditarVM
        {
            Id = u.Id,
            Email = u.Email ?? "",
            Perfil = (await _users.GetRolesAsync(u)).FirstOrDefault() ?? "",
            Ativo = !Desativado(u)
        });
    }

    [HttpPost, ValidateAntiForgeryToken]
    public async Task<IActionResult> Edit(UsuarioEditarVM vm)
    {
        CarregarPerfis();
        var u = await _users.FindByIdAsync(vm.Id);
        if (u == null) return NotFound();
        if (!ModelState.IsValid) return View(vm);

        // Impede o gestor de se trancar para fora do sistema
        if (u.Id == _users.GetUserId(User) && (!vm.Ativo || vm.Perfil != "Gestor"))
        {
            ModelState.AddModelError("", "Você não pode desativar a si mesmo nem remover o seu perfil de Gestor.");
            return View(vm);
        }

        // Perfil
        var atuais = await _users.GetRolesAsync(u);
        if (!atuais.Contains(vm.Perfil) || atuais.Count > 1)
        {
            await _users.RemoveFromRolesAsync(u, atuais);
            await _users.AddToRoleAsync(u, vm.Perfil);
        }

        // Ativar / desativar (usa o bloqueio de conta do Identity)
        await _users.SetLockoutEnabledAsync(u, true);
        await _users.SetLockoutEndDateAsync(u, vm.Ativo ? null : DateTimeOffset.MaxValue);

        // Nova senha (opcional)
        if (!string.IsNullOrWhiteSpace(vm.NovaSenha))
        {
            var token = await _users.GeneratePasswordResetTokenAsync(u);
            var r = await _users.ResetPasswordAsync(u, token, vm.NovaSenha);
            if (!r.Succeeded)
            {
                foreach (var e in r.Errors) ModelState.AddModelError("", e.Description);
                return View(vm);
            }
        }

        TempData["Sucesso"] = "Usuário atualizado.";
        return RedirectToAction(nameof(Index));
    }
}