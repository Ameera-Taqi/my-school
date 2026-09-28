using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using SchoolPerformance.Api.Data;

#nullable disable

namespace SchoolPerformance.Api.Migrations
{
    /// <summary>Records which wing supervisor last changed a teaching-period attendance status.</summary>
    [DbContext(typeof(AppDbContext))]
    [Migration("20260928220000_AttendanceWingEditor")]
    public class AttendanceWingEditor : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<long>(
                name: "WingEditedById",
                table: "Attendance",
                type: "bigint",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Attendance_WingEditedById",
                table: "Attendance",
                column: "WingEditedById");

            migrationBuilder.AddForeignKey(
                name: "FK_Attendance_Users_WingEditedById",
                table: "Attendance",
                column: "WingEditedById",
                principalTable: "Users",
                principalColumn: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Attendance_Users_WingEditedById",
                table: "Attendance");

            migrationBuilder.DropIndex(
                name: "IX_Attendance_WingEditedById",
                table: "Attendance");

            migrationBuilder.DropColumn(
                name: "WingEditedById",
                table: "Attendance");
        }
    }
}
