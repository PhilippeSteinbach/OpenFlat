using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace OpenFlat.Cleaning.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class InitialCleaning : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.EnsureSchema(
                name: "cleaning");

            migrationBuilder.CreateTable(
                name: "tasks",
                schema: "cleaning",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()"),
                    Title = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Points = table.Column<int>(type: "integer", nullable: false),
                    Status = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false, defaultValue: "Todo"),
                    AssignedUserId = table.Column<int>(type: "integer", nullable: true),
                    SortOrder = table.Column<int>(type: "integer", nullable: false, defaultValue: 0),
                    CreatedByUserId = table.Column<int>(type: "integer", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false, defaultValueSql: "now()"),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false, defaultValueSql: "now()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_tasks", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "comments",
                schema: "cleaning",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()"),
                    TaskId = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<int>(type: "integer", nullable: false),
                    Text = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: false),
                    IsEdited = table.Column<bool>(type: "boolean", nullable: false, defaultValue: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false, defaultValueSql: "now()"),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false, defaultValueSql: "now()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_comments", x => x.Id);
                    table.ForeignKey(
                        name: "FK_comments_tasks_TaskId",
                        column: x => x.TaskId,
                        principalSchema: "cleaning",
                        principalTable: "tasks",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "ix_cleaning_comments_task_created",
                schema: "cleaning",
                table: "comments",
                columns: new[] { "TaskId", "CreatedAt" });

            migrationBuilder.CreateIndex(
                name: "ix_cleaning_comments_task_id",
                schema: "cleaning",
                table: "comments",
                column: "TaskId");

            migrationBuilder.CreateIndex(
                name: "ix_tasks_assigned_user_id",
                schema: "cleaning",
                table: "tasks",
                column: "AssignedUserId",
                filter: "\"AssignedUserId\" IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "ix_tasks_status",
                schema: "cleaning",
                table: "tasks",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "ix_tasks_status_sort",
                schema: "cleaning",
                table: "tasks",
                columns: new[] { "Status", "SortOrder" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "comments",
                schema: "cleaning");

            migrationBuilder.DropTable(
                name: "tasks",
                schema: "cleaning");
        }
    }
}
