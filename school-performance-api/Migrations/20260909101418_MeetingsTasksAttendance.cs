using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SchoolPerformance.Api.Migrations
{
    /// <inheritdoc />
    public partial class MeetingsTasksAttendance : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Meetings_Users_OrganizerId",
                table: "Meetings");

            migrationBuilder.DropIndex(
                name: "IX_Attendance_StudentId",
                table: "Attendance");

            migrationBuilder.DropColumn(
                name: "Description",
                table: "Meetings");

            migrationBuilder.AddColumn<string>(
                name: "Assignee",
                table: "Tasks",
                type: "nvarchar(150)",
                maxLength: 150,
                nullable: true);

            migrationBuilder.AddColumn<long>(
                name: "MeetingId",
                table: "Tasks",
                type: "bigint",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Agenda",
                table: "Meetings",
                type: "nvarchar(2000)",
                maxLength: 2000,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Attendees",
                table: "Meetings",
                type: "nvarchar(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<long>(
                name: "CalendarEventId",
                table: "Meetings",
                type: "bigint",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "FollowUpTasks",
                table: "Meetings",
                type: "nvarchar(2000)",
                maxLength: 2000,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Minutes",
                table: "Meetings",
                type: "nvarchar(4000)",
                maxLength: 4000,
                nullable: true);

            migrationBuilder.AddColumn<long>(
                name: "RecordedById",
                table: "Attendance",
                type: "bigint",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "MeetingTargetRoles",
                columns: table => new
                {
                    MeetingId = table.Column<long>(type: "bigint", nullable: false),
                    RoleKey = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MeetingTargetRoles", x => new { x.MeetingId, x.RoleKey });
                    table.ForeignKey(
                        name: "FK_MeetingTargetRoles_Meetings_MeetingId",
                        column: x => x.MeetingId,
                        principalTable: "Meetings",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "TeacherAttendance",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    TeacherId = table.Column<long>(type: "bigint", nullable: false),
                    AttendanceDate = table.Column<DateOnly>(type: "date", nullable: false),
                    Status = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    Notes = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    RecordedById = table.Column<long>(type: "bigint", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TeacherAttendance", x => x.Id);
                    table.ForeignKey(
                        name: "FK_TeacherAttendance_Teachers_TeacherId",
                        column: x => x.TeacherId,
                        principalTable: "Teachers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_TeacherAttendance_Users_RecordedById",
                        column: x => x.RecordedById,
                        principalTable: "Users",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateIndex(
                name: "IX_Tasks_DueDate",
                table: "Tasks",
                column: "DueDate");

            migrationBuilder.CreateIndex(
                name: "IX_Tasks_MeetingId",
                table: "Tasks",
                column: "MeetingId");

            migrationBuilder.CreateIndex(
                name: "IX_Meetings_CalendarEventId",
                table: "Meetings",
                column: "CalendarEventId");

            migrationBuilder.CreateIndex(
                name: "IX_Meetings_MeetingDate",
                table: "Meetings",
                column: "MeetingDate");

            migrationBuilder.CreateIndex(
                name: "IX_Attendance_AttendanceDate",
                table: "Attendance",
                column: "AttendanceDate");

            migrationBuilder.CreateIndex(
                name: "IX_Attendance_RecordedById",
                table: "Attendance",
                column: "RecordedById");

            migrationBuilder.CreateIndex(
                name: "IX_Attendance_StudentId_AttendanceDate",
                table: "Attendance",
                columns: new[] { "StudentId", "AttendanceDate" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_TeacherAttendance_AttendanceDate",
                table: "TeacherAttendance",
                column: "AttendanceDate");

            migrationBuilder.CreateIndex(
                name: "IX_TeacherAttendance_RecordedById",
                table: "TeacherAttendance",
                column: "RecordedById");

            migrationBuilder.CreateIndex(
                name: "IX_TeacherAttendance_TeacherId_AttendanceDate",
                table: "TeacherAttendance",
                columns: new[] { "TeacherId", "AttendanceDate" },
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_Attendance_Users_RecordedById",
                table: "Attendance",
                column: "RecordedById",
                principalTable: "Users",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_Meetings_CalendarEvents_CalendarEventId",
                table: "Meetings",
                column: "CalendarEventId",
                principalTable: "CalendarEvents",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_Meetings_Users_OrganizerId",
                table: "Meetings",
                column: "OrganizerId",
                principalTable: "Users",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_Tasks_Meetings_MeetingId",
                table: "Tasks",
                column: "MeetingId",
                principalTable: "Meetings",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Attendance_Users_RecordedById",
                table: "Attendance");

            migrationBuilder.DropForeignKey(
                name: "FK_Meetings_CalendarEvents_CalendarEventId",
                table: "Meetings");

            migrationBuilder.DropForeignKey(
                name: "FK_Meetings_Users_OrganizerId",
                table: "Meetings");

            migrationBuilder.DropForeignKey(
                name: "FK_Tasks_Meetings_MeetingId",
                table: "Tasks");

            migrationBuilder.DropTable(
                name: "MeetingTargetRoles");

            migrationBuilder.DropTable(
                name: "TeacherAttendance");

            migrationBuilder.DropIndex(
                name: "IX_Tasks_DueDate",
                table: "Tasks");

            migrationBuilder.DropIndex(
                name: "IX_Tasks_MeetingId",
                table: "Tasks");

            migrationBuilder.DropIndex(
                name: "IX_Meetings_CalendarEventId",
                table: "Meetings");

            migrationBuilder.DropIndex(
                name: "IX_Meetings_MeetingDate",
                table: "Meetings");

            migrationBuilder.DropIndex(
                name: "IX_Attendance_AttendanceDate",
                table: "Attendance");

            migrationBuilder.DropIndex(
                name: "IX_Attendance_RecordedById",
                table: "Attendance");

            migrationBuilder.DropIndex(
                name: "IX_Attendance_StudentId_AttendanceDate",
                table: "Attendance");

            migrationBuilder.DropColumn(
                name: "Assignee",
                table: "Tasks");

            migrationBuilder.DropColumn(
                name: "MeetingId",
                table: "Tasks");

            migrationBuilder.DropColumn(
                name: "Agenda",
                table: "Meetings");

            migrationBuilder.DropColumn(
                name: "Attendees",
                table: "Meetings");

            migrationBuilder.DropColumn(
                name: "CalendarEventId",
                table: "Meetings");

            migrationBuilder.DropColumn(
                name: "FollowUpTasks",
                table: "Meetings");

            migrationBuilder.DropColumn(
                name: "Minutes",
                table: "Meetings");

            migrationBuilder.DropColumn(
                name: "RecordedById",
                table: "Attendance");

            migrationBuilder.AddColumn<string>(
                name: "Description",
                table: "Meetings",
                type: "nvarchar(1000)",
                maxLength: 1000,
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Attendance_StudentId",
                table: "Attendance",
                column: "StudentId");

            migrationBuilder.AddForeignKey(
                name: "FK_Meetings_Users_OrganizerId",
                table: "Meetings",
                column: "OrganizerId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }
    }
}
