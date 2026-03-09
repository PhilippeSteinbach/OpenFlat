using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace OpenFlat.Cleaning.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class KanbanToChecklist : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "ix_tasks_status",
                schema: "cleaning",
                table: "tasks");

            migrationBuilder.DropIndex(
                name: "ix_tasks_status_sort",
                schema: "cleaning",
                table: "tasks");

            migrationBuilder.DropColumn(
                name: "SortOrder",
                schema: "cleaning",
                table: "tasks");

            migrationBuilder.DropColumn(
                name: "Status",
                schema: "cleaning",
                table: "tasks");

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "CompletedAt",
                schema: "cleaning",
                table: "tasks",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<DateOnly>(
                name: "DueDate",
                schema: "cleaning",
                table: "tasks",
                type: "date",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsDone",
                schema: "cleaning",
                table: "tasks",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.CreateIndex(
                name: "ix_tasks_is_done_due_date",
                schema: "cleaning",
                table: "tasks",
                columns: new[] { "IsDone", "DueDate" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "ix_tasks_is_done_due_date",
                schema: "cleaning",
                table: "tasks");

            migrationBuilder.DropColumn(
                name: "CompletedAt",
                schema: "cleaning",
                table: "tasks");

            migrationBuilder.DropColumn(
                name: "DueDate",
                schema: "cleaning",
                table: "tasks");

            migrationBuilder.DropColumn(
                name: "IsDone",
                schema: "cleaning",
                table: "tasks");

            migrationBuilder.AddColumn<int>(
                name: "SortOrder",
                schema: "cleaning",
                table: "tasks",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<string>(
                name: "Status",
                schema: "cleaning",
                table: "tasks",
                type: "character varying(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "Todo");

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
    }
}
