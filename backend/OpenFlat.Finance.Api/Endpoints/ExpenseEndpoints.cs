using OpenFlat.Finance.Api.Data;
using OpenFlat.Finance.Api.Services;
using OpenFlat.Shared.Users;

namespace OpenFlat.Finance.Api.Endpoints;

public static class ExpenseEndpoints
{
    public static void MapExpenseEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/expenses");

        // GET /api/expenses — List all expenses
        group.MapGet("/", async (HttpContext ctx, ExpenseService service) =>
        {
            var userId = GetUserId(ctx);
            var expenses = await service.ListAsync();
            return Results.Ok(expenses.Select(e => ToDto(e, userId)).ToList());
        });

        // POST /api/expenses — Log a new expense
        group.MapPost("/", async (
            CreateExpenseRequest req,
            HttpContext ctx,
            ExpenseService service) =>
        {
            var userId = GetUserId(ctx);
            var expense = await service.CreateAsync(req.AmountEur, req.Description, userId);
            var dto = ToDto(expense, userId);
            return Results.Created($"/api/expenses/{expense.Id}", dto);
        });

        // GET /api/expenses/{expenseId} — Get a single expense
        group.MapGet("/{expenseId:guid}", async (Guid expenseId, HttpContext ctx, ExpenseService service) =>
        {
            var userId = GetUserId(ctx);
            var expense = await service.GetByIdAsync(expenseId);
            if (expense is null) return Results.NotFound();
            return Results.Ok(ToDto(expense, userId));
        });

        // PUT /api/expenses/{expenseId} — Update own expense
        group.MapPut("/{expenseId:guid}", async (
            Guid expenseId,
            UpdateExpenseRequest req,
            HttpContext ctx,
            ExpenseService service) =>
        {
            var userId = GetUserId(ctx);
            var expense = await service.UpdateAsync(expenseId, req.AmountEur, req.Description, userId);
            return Results.Ok(ToDto(expense, userId));
        });

        // DELETE /api/expenses/{expenseId} — Delete own expense
        group.MapDelete("/{expenseId:guid}", async (
            Guid expenseId,
            HttpContext ctx,
            ExpenseService service) =>
        {
            var userId = GetUserId(ctx);
            await service.DeleteAsync(expenseId, userId);
            return Results.NoContent();
        });
    }

    public static void MapSettlementEndpoints(this WebApplication app)
    {
        // GET /api/settlement — Calculate current settlement
        app.MapGet("/api/settlement", async (HttpContext ctx, SettlementService service) =>
        {
            _ = GetUserId(ctx); // validate header
            var result = await service.CalculateAsync();
            return Results.Ok(result);
        });
    }

    // ── Helpers ──────────────────────

    private static int GetUserId(HttpContext ctx)
    {
        var header = ctx.Request.Headers["X-User-Id"].FirstOrDefault();
        if (string.IsNullOrEmpty(header) || !int.TryParse(header, out var userId) || !PredefinedUsers.IsValid(userId))
            throw new ValidationException("Valid X-User-Id header is required.");
        return userId;
    }

    private static ExpenseDto ToDto(Expense e, int requestingUserId) => new(
        e.Id,
        e.AmountCents / 100.0,
        e.Description,
        e.LoggedByUserId,
        PredefinedUsers.GetById(e.LoggedByUserId)?.Name ?? "Unknown",
        e.CreatedAt,
        e.UpdatedAt,
        e.LoggedByUserId == requestingUserId
    );
}

// ── DTOs ──────────────────────

public record CreateExpenseRequest(double AmountEur, string Description);
public record UpdateExpenseRequest(double AmountEur, string Description);

public record ExpenseDto(
    Guid Id, double AmountEur, string Description,
    int LoggedByUserId, string LoggedByUserName,
    DateTimeOffset CreatedAt, DateTimeOffset UpdatedAt,
    bool IsOwn);
