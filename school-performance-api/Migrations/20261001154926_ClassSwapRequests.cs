using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SchoolPerformance.Api.Migrations
{
    /// <inheritdoc />
    public partial class ClassSwapRequests : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "ClassSwapRequests",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    SwapDate = table.Column<DateOnly>(type: "date", nullable: false),
                    Day = table.Column<int>(type: "int", nullable: false),
                    RequesterTeacherId = table.Column<long>(type: "bigint", nullable: false),
                    CounterpartyTeacherId = table.Column<long>(type: "bigint", nullable: false),
                    RequesterEntryId = table.Column<long>(type: "bigint", nullable: false),
                    CounterpartyEntryId = table.Column<long>(type: "bigint", nullable: false),
                    RequesterPeriod = table.Column<int>(type: "int", nullable: false),
                    CounterpartyPeriod = table.Column<int>(type: "int", nullable: false),
                    RequesterSubject = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    RequesterClassName = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    CounterpartySubject = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    CounterpartyClassName = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Reason = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    Status = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: false),
                    CreatedByUserId = table.Column<long>(type: "bigint", nullable: false),
                    RowVersion = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ClassSwapRequests", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ClassSwapRequests_Teachers_CounterpartyTeacherId",
                        column: x => x.CounterpartyTeacherId,
                        principalTable: "Teachers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_ClassSwapRequests_Teachers_RequesterTeacherId",
                        column: x => x.RequesterTeacherId,
                        principalTable: "Teachers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_ClassSwapRequests_Users_CreatedByUserId",
                        column: x => x.CreatedByUserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "ClassSwapApprovals",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    RequestId = table.Column<long>(type: "bigint", nullable: false),
                    Stage = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    DepartmentId = table.Column<long>(type: "bigint", nullable: true),
                    ApproverTeacherId = table.Column<long>(type: "bigint", nullable: true),
                    Decision = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    ActedByUserId = table.Column<long>(type: "bigint", nullable: true),
                    ActedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    Comment = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ClassSwapApprovals", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ClassSwapApprovals_ClassSwapRequests_RequestId",
                        column: x => x.RequestId,
                        principalTable: "ClassSwapRequests",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_ClassSwapApprovals_Departments_DepartmentId",
                        column: x => x.DepartmentId,
                        principalTable: "Departments",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_ClassSwapApprovals_Users_ActedByUserId",
                        column: x => x.ActedByUserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "ClassSwapHistory",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    RequestId = table.Column<long>(type: "bigint", nullable: false),
                    Action = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: false),
                    UserId = table.Column<long>(type: "bigint", nullable: false),
                    RoleLabel = table.Column<string>(type: "nvarchar(80)", maxLength: 80, nullable: false),
                    Comment = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ClassSwapHistory", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ClassSwapHistory_ClassSwapRequests_RequestId",
                        column: x => x.RequestId,
                        principalTable: "ClassSwapRequests",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_ClassSwapHistory_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "ClassSwapNotices",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    UserId = table.Column<long>(type: "bigint", nullable: false),
                    RequestId = table.Column<long>(type: "bigint", nullable: false),
                    Message = table.Column<string>(type: "nvarchar(400)", maxLength: 400, nullable: false),
                    ReadAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ClassSwapNotices", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ClassSwapNotices_ClassSwapRequests_RequestId",
                        column: x => x.RequestId,
                        principalTable: "ClassSwapRequests",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_ClassSwapNotices_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ScheduleOverrides",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    OverrideDate = table.Column<DateOnly>(type: "date", nullable: false),
                    ScheduleEntryId = table.Column<long>(type: "bigint", nullable: false),
                    EffectivePeriod = table.Column<int>(type: "int", nullable: false),
                    SwapRequestId = table.Column<long>(type: "bigint", nullable: false),
                    CreatedByUserId = table.Column<long>(type: "bigint", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ScheduleOverrides", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ScheduleOverrides_ClassSwapRequests_SwapRequestId",
                        column: x => x.SwapRequestId,
                        principalTable: "ClassSwapRequests",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_ScheduleOverrides_ScheduleEntries_ScheduleEntryId",
                        column: x => x.ScheduleEntryId,
                        principalTable: "ScheduleEntries",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ClassSwapApprovals_ActedByUserId",
                table: "ClassSwapApprovals",
                column: "ActedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_ClassSwapApprovals_DepartmentId",
                table: "ClassSwapApprovals",
                column: "DepartmentId");

            migrationBuilder.CreateIndex(
                name: "IX_ClassSwapApprovals_RequestId_Stage_DepartmentId",
                table: "ClassSwapApprovals",
                columns: new[] { "RequestId", "Stage", "DepartmentId" });

            migrationBuilder.CreateIndex(
                name: "IX_ClassSwapHistory_RequestId",
                table: "ClassSwapHistory",
                column: "RequestId");

            migrationBuilder.CreateIndex(
                name: "IX_ClassSwapHistory_UserId",
                table: "ClassSwapHistory",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_ClassSwapNotices_RequestId",
                table: "ClassSwapNotices",
                column: "RequestId");

            migrationBuilder.CreateIndex(
                name: "IX_ClassSwapNotices_UserId_ReadAt",
                table: "ClassSwapNotices",
                columns: new[] { "UserId", "ReadAt" });

            migrationBuilder.CreateIndex(
                name: "IX_ClassSwapRequests_CounterpartyEntryId_SwapDate",
                table: "ClassSwapRequests",
                columns: new[] { "CounterpartyEntryId", "SwapDate" });

            migrationBuilder.CreateIndex(
                name: "IX_ClassSwapRequests_CounterpartyTeacherId",
                table: "ClassSwapRequests",
                column: "CounterpartyTeacherId");

            migrationBuilder.CreateIndex(
                name: "IX_ClassSwapRequests_CreatedByUserId",
                table: "ClassSwapRequests",
                column: "CreatedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_ClassSwapRequests_RequesterEntryId_SwapDate",
                table: "ClassSwapRequests",
                columns: new[] { "RequesterEntryId", "SwapDate" });

            migrationBuilder.CreateIndex(
                name: "IX_ClassSwapRequests_RequesterTeacherId",
                table: "ClassSwapRequests",
                column: "RequesterTeacherId");

            migrationBuilder.CreateIndex(
                name: "IX_ClassSwapRequests_Status",
                table: "ClassSwapRequests",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_ClassSwapRequests_SwapDate",
                table: "ClassSwapRequests",
                column: "SwapDate");

            migrationBuilder.CreateIndex(
                name: "IX_ScheduleOverrides_OverrideDate_ScheduleEntryId",
                table: "ScheduleOverrides",
                columns: new[] { "OverrideDate", "ScheduleEntryId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ScheduleOverrides_ScheduleEntryId",
                table: "ScheduleOverrides",
                column: "ScheduleEntryId");

            migrationBuilder.CreateIndex(
                name: "IX_ScheduleOverrides_SwapRequestId",
                table: "ScheduleOverrides",
                column: "SwapRequestId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ClassSwapApprovals");

            migrationBuilder.DropTable(
                name: "ClassSwapHistory");

            migrationBuilder.DropTable(
                name: "ClassSwapNotices");

            migrationBuilder.DropTable(
                name: "ScheduleOverrides");

            migrationBuilder.DropTable(
                name: "ClassSwapRequests");
        }
    }
}
