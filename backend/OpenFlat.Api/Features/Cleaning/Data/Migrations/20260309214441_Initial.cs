using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace OpenFlat.Api.Features.Cleaning.Data.Migrations
{
    /// <inheritdoc />
    public partial class Initial : Migration
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
                    Effort = table.Column<int>(type: "integer", nullable: false, defaultValue: 1),
                    Points = table.Column<int>(type: "integer", nullable: false),
                    FrequencyValue = table.Column<int>(type: "integer", nullable: false),
                    FrequencyUnit = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    DueDate = table.Column<DateOnly>(type: "date", nullable: false),
                    RotationOrder = table.Column<int[]>(type: "integer[]", nullable: false, defaultValueSql: "'{}'"),
                    RotationIndex = table.Column<int>(type: "integer", nullable: false, defaultValue: 0),
                    AssignedUserId = table.Column<int>(type: "integer", nullable: true),
                    LastCompletedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    LastCompletedByUserId = table.Column<int>(type: "integer", nullable: true),
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

            migrationBuilder.CreateTable(
                name: "completion_log",
                schema: "cleaning",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()"),
                    TaskId = table.Column<Guid>(type: "uuid", nullable: false),
                    CompletedByUserId = table.Column<int>(type: "integer", nullable: false),
                    AssignedUserId = table.Column<int>(type: "integer", nullable: true),
                    PointsEarned = table.Column<int>(type: "integer", nullable: false),
                    CompletedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false, defaultValueSql: "now()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_completion_log", x => x.Id);
                    table.ForeignKey(
                        name: "FK_completion_log_tasks_TaskId",
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
                name: "ix_completion_log_completed_by",
                schema: "cleaning",
                table: "completion_log",
                column: "CompletedByUserId");

            migrationBuilder.CreateIndex(
                name: "ix_completion_log_task_id",
                schema: "cleaning",
                table: "completion_log",
                column: "TaskId");

            migrationBuilder.CreateIndex(
                name: "ix_tasks_assigned_user_id",
                schema: "cleaning",
                table: "tasks",
                column: "AssignedUserId",
                filter: "\"AssignedUserId\" IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "ix_tasks_due_date",
                schema: "cleaning",
                table: "tasks",
                column: "DueDate");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "comments",
                schema: "cleaning");

            migrationBuilder.DropTable(
                name: "completion_log",
                schema: "cleaning");

            migrationBuilder.DropTable(
                name: "tasks",
                schema: "cleaning");
        }
    }
}
