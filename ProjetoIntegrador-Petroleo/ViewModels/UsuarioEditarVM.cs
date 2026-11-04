using System.ComponentModel.DataAnnotations;

namespace ProjetoIntegrador_Petroleo.ViewModels
{
    public class UsuarioEditarVM
    {
        public string Id { get; set; } = String.Empty;
        public string Email { get; set; } = String.Empty;

        [Required]
        public string Perfil { get; set; } = String.Empty;
        public bool Ativo { get; set; }

        [DataType(DataType.Password), StringLength(100, MinimumLength = 8)]
        public string? NovaSenha { get; set; }
    }
}


