using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ProjetoIntegrador_Petroleo.Migrations
{
    /// <inheritdoc />
    public partial class RotinasEChecklistOrdemServico : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "Origem",
                table: "OrdensServico",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PecasMateriais",
                table: "OrdensServico",
                type: "nvarchar(1000)",
                maxLength: 1000,
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "TipoManutencao",
                table: "OrdensServico",
                type: "int",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "RotinasManutencao",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    AtivoId = table.Column<int>(type: "int", nullable: true),
                    TipoAtivo = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    Titulo = table.Column<string>(type: "nvarchar(120)", maxLength: 120, nullable: false),
                    Instrucoes = table.Column<string>(type: "nvarchar(1500)", maxLength: 1500, nullable: true),
                    ParametroNome = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    TipoManutencao = table.Column<int>(type: "int", nullable: false),
                    PecasMateriais = table.Column<string>(type: "nvarchar(300)", maxLength: 300, nullable: true),
                    IntervaloDias = table.Column<int>(type: "int", nullable: true),
                    Ativa = table.Column<bool>(type: "bit", nullable: false),
                    CriadaEm = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RotinasManutencao", x => x.Id);
                    table.ForeignKey(
                        name: "FK_RotinasManutencao_Ativos_AtivoId",
                        column: x => x.AtivoId,
                        principalTable: "Ativos",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "OrdensServicoItens",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    OrdemServicoId = table.Column<int>(type: "int", nullable: false),
                    RotinaManutencaoId = table.Column<int>(type: "int", nullable: true),
                    Descricao = table.Column<string>(type: "nvarchar(300)", maxLength: 300, nullable: false),
                    Concluido = table.Column<bool>(type: "bit", nullable: false),
                    ConcluidoPor = table.Column<string>(type: "nvarchar(256)", maxLength: 256, nullable: true),
                    ConcluidoEm = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_OrdensServicoItens", x => x.Id);
                    table.ForeignKey(
                        name: "FK_OrdensServicoItens_OrdensServico_OrdemServicoId",
                        column: x => x.OrdemServicoId,
                        principalTable: "OrdensServico",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_OrdensServicoItens_RotinasManutencao_RotinaManutencaoId",
                        column: x => x.RotinaManutencaoId,
                        principalTable: "RotinasManutencao",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateIndex(
                name: "IX_OrdensServicoItens_OrdemServicoId",
                table: "OrdensServicoItens",
                column: "OrdemServicoId");

            migrationBuilder.CreateIndex(
                name: "IX_OrdensServicoItens_RotinaManutencaoId",
                table: "OrdensServicoItens",
                column: "RotinaManutencaoId");

            migrationBuilder.CreateIndex(
                name: "IX_RotinasManutencao_AtivoId",
                table: "RotinasManutencao",
                column: "AtivoId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "OrdensServicoItens");

            migrationBuilder.DropTable(
                name: "RotinasManutencao");

            migrationBuilder.DropColumn(
                name: "Origem",
                table: "OrdensServico");

            migrationBuilder.DropColumn(
                name: "PecasMateriais",
                table: "OrdensServico");

            migrationBuilder.DropColumn(
                name: "TipoManutencao",
                table: "OrdensServico");
        }
    }
}
