using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using SchoolPerformance.Api.Data;

#nullable disable

namespace SchoolPerformance.Api.Migrations
{
    /// <summary>Stores attendance reminders sent to the subject teacher.</summary>
    [DbContext(typeof(AppDbContext))]
    [Migration("20261001180000_AttendanceReminder")]
    public class AttendanceReminder : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "AttendanceReminders",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    TeacherId = table.Column<long>(type: "bigint", nullable: false),
                    SchoolClassId = table.Column<long>(type: "bigint", nullable: false),
                    Period = table.Column<int>(type: "int", nullable: false),
                    AttendanceDate = table.Column<DateOnly>(type: "date", nullable: false),
                    Subject = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Message = table.Column<string>(type: "nvarchar(400)", maxLength: 400, nullable: false),
                    Source = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    ReadAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AttendanceReminders", x => x.Id);
                    table.ForeignKey(
                        name: "FK_AttendanceReminders_SchoolClasses_SchoolClassId",
                        column: x => x.SchoolClassId,
                        principalTable: "SchoolClasses",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_AttendanceReminders_Teachers_TeacherId",
                        column: x => x.TeacherId,
                        principalTable: "Teachers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_AttendanceReminders_AttendanceDate",
                table: "AttendanceReminders",
                column: "AttendanceDate");

            migrationBuilder.CreateIndex(
                name: "IX_AttendanceReminders_TeacherId_SchoolClassId_Period_AttendanceDate",
                table: "AttendanceReminders",
                columns: new[] { "TeacherId", "SchoolClassId", "Period", "AttendanceDate" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_AttendanceReminders_SchoolClassId",
                table: "AttendanceReminders",
                column: "SchoolClassId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(name: "AttendanceReminders");
        }
    }
}
