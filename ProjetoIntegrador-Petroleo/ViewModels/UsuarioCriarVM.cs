using System.ComponentModel.DataAnnotations;

namespace ProjetoIntegrador_Petroleo.ViewModels
{
    public class UsuarioCriarVM
    {
        [Required, EmailAddress]
        public string Email { get; set; } = String.Empty;

        [Required, StringLength(100, MinimumLength = 8), DataType(DataType.Password)]
        public string Senha { get; set; } = String.Empty;

        [Required]
        public string Perfil { get; set; } = String.Empty;
    }
}
