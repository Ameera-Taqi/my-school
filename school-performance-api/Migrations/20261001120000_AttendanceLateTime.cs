using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using SchoolPerformance.Api.Data;

#nullable disable

namespace SchoolPerformance.Api.Migrations
{
    /// <summary>Stores the clock time a student was marked late.</summary>
    [DbContext(typeof(AppDbContext))]
    [Migration("20261001120000_AttendanceLateTime")]
    public class AttendanceLateTime : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<TimeOnly>(
                name: "LateTime",
                table: "Attendance",
                type: "time",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "LateTime",
                table: "Attendance");
        }
    }
}
