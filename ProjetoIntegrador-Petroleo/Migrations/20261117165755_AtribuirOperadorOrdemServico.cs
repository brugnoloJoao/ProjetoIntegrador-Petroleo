using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ProjetoIntegrador_Petroleo.Migrations
{
    /// <inheritdoc />
    public partial class AtribuirOperadorOrdemServico : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "OperadorId",
                table: "OrdensServico",
                type: "nvarchar(450)",
                maxLength: 450,
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_OrdensServico_OperadorId",
                table: "OrdensServico",
                column: "OperadorId");

            migrationBuilder.AddForeignKey(
                name: "FK_OrdensServico_AspNetUsers_OperadorId",
                table: "OrdensServico",
                column: "OperadorId",
                principalTable: "AspNetUsers",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_OrdensServico_AspNetUsers_OperadorId",
                table: "OrdensServico");

            migrationBuilder.DropIndex(
                name: "IX_OrdensServico_OperadorId",
                table: "OrdensServico");

            migrationBuilder.DropColumn(
                name: "OperadorId",
                table: "OrdensServico");
        }
    }
}
