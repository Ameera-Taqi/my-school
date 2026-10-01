using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SchoolPerformance.Api.Migrations
{
    /// <inheritdoc />
    public partial class StaffRecords : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "RecordCategories",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Name = table.Column<string>(type: "nvarchar(80)", maxLength: 80, nullable: false),
                    Active = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RecordCategories", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "StaffRecords",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    OwnerUserId = table.Column<long>(type: "bigint", nullable: false),
                    CategoryId = table.Column<long>(type: "bigint", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    Description = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    Status = table.Column<string>(type: "nvarchar(32)", maxLength: 32, nullable: false),
                    ApprovalLevel = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    DepartmentId = table.Column<long>(type: "bigint", nullable: true),
                    AuthorityLabel = table.Column<string>(type: "nvarchar(80)", maxLength: 80, nullable: true),
                    RowVersion = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_StaffRecords", x => x.Id);
                    table.ForeignKey(
                        name: "FK_StaffRecords_Departments_DepartmentId",
                        column: x => x.DepartmentId,
                        principalTable: "Departments",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_StaffRecords_RecordCategories_CategoryId",
                        column: x => x.CategoryId,
                        principalTable: "RecordCategories",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_StaffRecords_Users_OwnerUserId",
                        column: x => x.OwnerUserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "RecordEvents",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    RecordId = table.Column<long>(type: "bigint", nullable: false),
                    UserId = table.Column<long>(type: "bigint", nullable: true),
                    Action = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: false),
                    ActionLabel = table.Column<string>(type: "nvarchar(80)", maxLength: 80, nullable: false),
                    RoleLabel = table.Column<string>(type: "nvarchar(80)", maxLength: 80, nullable: false),
                    Comment = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    PreviousStatus = table.Column<string>(type: "nvarchar(32)", maxLength: 32, nullable: true),
                    NewStatus = table.Column<string>(type: "nvarchar(32)", maxLength: 32, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RecordEvents", x => x.Id);
                    table.ForeignKey(
                        name: "FK_RecordEvents_StaffRecords_RecordId",
                        column: x => x.RecordId,
                        principalTable: "StaffRecords",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_RecordEvents_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "RecordFiles",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    RecordId = table.Column<long>(type: "bigint", nullable: false),
                    FileName = table.Column<string>(type: "nvarchar(260)", maxLength: 260, nullable: false),
                    ContentType = table.Column<string>(type: "nvarchar(120)", maxLength: 120, nullable: false),
                    Size = table.Column<long>(type: "bigint", nullable: false),
                    Content = table.Column<byte[]>(type: "varbinary(max)", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RecordFiles", x => x.Id);
                    table.ForeignKey(
                        name: "FK_RecordFiles_StaffRecords_RecordId",
                        column: x => x.RecordId,
                        principalTable: "StaffRecords",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "RecordNotices",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    UserId = table.Column<long>(type: "bigint", nullable: false),
                    RecordId = table.Column<long>(type: "bigint", nullable: false),
                    Message = table.Column<string>(type: "nvarchar(400)", maxLength: 400, nullable: false),
                    ReadAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RecordNotices", x => x.Id);
                    table.ForeignKey(
                        name: "FK_RecordNotices_StaffRecords_RecordId",
                        column: x => x.RecordId,
                        principalTable: "StaffRecords",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_RecordNotices_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_RecordCategories_Name",
                table: "RecordCategories",
                column: "Name",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_RecordEvents_RecordId",
                table: "RecordEvents",
                column: "RecordId");

            migrationBuilder.CreateIndex(
                name: "IX_RecordEvents_UserId",
                table: "RecordEvents",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_RecordFiles_RecordId",
                table: "RecordFiles",
                column: "RecordId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_RecordNotices_RecordId",
                table: "RecordNotices",
                column: "RecordId");

            migrationBuilder.CreateIndex(
                name: "IX_RecordNotices_UserId_ReadAt",
                table: "RecordNotices",
                columns: new[] { "UserId", "ReadAt" });

            migrationBuilder.CreateIndex(
                name: "IX_StaffRecords_CategoryId",
                table: "StaffRecords",
                column: "CategoryId");

            migrationBuilder.CreateIndex(
                name: "IX_StaffRecords_DepartmentId",
                table: "StaffRecords",
                column: "DepartmentId");

            migrationBuilder.CreateIndex(
                name: "IX_StaffRecords_OwnerUserId",
                table: "StaffRecords",
                column: "OwnerUserId");

            migrationBuilder.CreateIndex(
                name: "IX_StaffRecords_Status",
                table: "StaffRecords",
                column: "Status");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "RecordEvents");

            migrationBuilder.DropTable(
                name: "RecordFiles");

            migrationBuilder.DropTable(
                name: "RecordNotices");

            migrationBuilder.DropTable(
                name: "StaffRecords");

            migrationBuilder.DropTable(
                name: "RecordCategories");
        }
    }
}
