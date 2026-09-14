using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SchoolPerformance.Api.Migrations
{
    /// <inheritdoc />
    public partial class TeacherAttendancePresenceTime : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<TimeOnly>(
                name: "PresenceTime",
                table: "TeacherAttendance",
                type: "time",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "PresenceTime",
                table: "TeacherAttendance");
        }
    }
}
