using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ProjetoIntegrador_Petroleo.Migrations;

public partial class HideSimulatedEvents : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AddColumn<bool>(
            name: "Simulada", table: "Alertas", type: "bit", nullable: false, defaultValue: true);
        migrationBuilder.AddColumn<bool>(
            name: "Simulada", table: "Anomalias", type: "bit", nullable: false, defaultValue: true);

        migrationBuilder.AlterColumn<bool>(
            name: "Simulada", table: "Alertas", type: "bit", nullable: false, defaultValue: false,
            oldClrType: typeof(bool), oldType: "bit", oldDefaultValue: true);
        migrationBuilder.AlterColumn<bool>(
            name: "Simulada", table: "Anomalias", type: "bit", nullable: false, defaultValue: false,
            oldClrType: typeof(bool), oldType: "bit", oldDefaultValue: true);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropColumn(name: "Simulada", table: "Alertas");
        migrationBuilder.DropColumn(name: "Simulada", table: "Anomalias");
    }
}
