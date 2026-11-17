using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ProjetoIntegrador_Petroleo.Migrations
{
    /// <inheritdoc />
    public partial class MarcarLeiturasSimuladas : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "Simulada",
                table: "Leituras",
                type: "bit",
                nullable: true);

            // O histórico existente foi gerado pelo simulador.
            migrationBuilder.Sql("UPDATE Leituras SET Simulada = 1");

            migrationBuilder.AlterColumn<bool>(
                name: "Simulada",
                table: "Leituras",
                type: "bit",
                nullable: false,
                defaultValue: false,
                oldClrType: typeof(bool),
                oldType: "bit",
                oldNullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(name: "Simulada", table: "Leituras");
        }
    }
}
