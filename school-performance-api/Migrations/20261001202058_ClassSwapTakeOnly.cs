using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SchoolPerformance.Api.Migrations
{
    /// <inheritdoc />
    public partial class ClassSwapTakeOnly : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "Cancelled",
                table: "ScheduleOverrides",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "Kind",
                table: "ClassSwapRequests",
                type: "nvarchar(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "Exchange");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Cancelled",
                table: "ScheduleOverrides");

            migrationBuilder.DropColumn(
                name: "Kind",
                table: "ClassSwapRequests");
        }
    }
}
