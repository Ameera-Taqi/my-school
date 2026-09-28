using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using SchoolPerformance.Api.Data;

#nullable disable

namespace SchoolPerformance.Api.Migrations
{
    /// <summary>Keeps daily attendance (period 0) separate from each teaching period (1–7).</summary>
    [DbContext(typeof(AppDbContext))]
    [Migration("20260928210000_AttendancePeriod")]
    public class AttendancePeriod : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "Period",
                table: "Attendance",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.DropIndex(
                name: "IX_Attendance_StudentId_AttendanceDate",
                table: "Attendance");

            migrationBuilder.CreateIndex(
                name: "IX_Attendance_StudentId_AttendanceDate_Period",
                table: "Attendance",
                columns: new[] { "StudentId", "AttendanceDate", "Period" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Attendance_StudentId_AttendanceDate_Period",
                table: "Attendance");

            migrationBuilder.CreateIndex(
                name: "IX_Attendance_StudentId_AttendanceDate",
                table: "Attendance",
                columns: new[] { "StudentId", "AttendanceDate" },
                unique: true);

            migrationBuilder.DropColumn(
                name: "Period",
                table: "Attendance");
        }
    }
}
