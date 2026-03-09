using Microsoft.EntityFrameworkCore;
using OpenFlat.Finance.Api.Data;
using OpenFlat.Shared.Users;

namespace OpenFlat.Finance.Api.Services;

public class ExpenseService(FinanceDbContext db)
{
    /// <summary>
    /// List all expenses in reverse chronological order (FR-021).
    /// </summary>
    public async Task<List<Expense>> ListAsync(CancellationToken ct = default)
    {
        return await db.Expenses
            .OrderByDescending(e => e.CreatedAt)
            .AsNoTracking()
            .ToListAsync(ct);
    }

    public async Task<Expense?> GetByIdAsync(Guid id, CancellationToken ct = default)
    {
        return await db.Expenses.FindAsync([id], ct);
    }

    /// <summary>
    /// Log a new expense (FR-020). Amount in EUR, stored as cents.
    /// </summary>
    public async Task<Expense> CreateAsync(double amountEur, string description, int loggedByUserId, CancellationToken ct = default)
    {
        Validate(amountEur, description);
        if (!PredefinedUsers.IsValid(loggedByUserId))
            throw new ValidationException("Invalid user ID.");

        var amountCents = (int)Math.Round(amountEur * 100);

        var expense = new Expense
        {
            AmountCents = amountCents,
            Description = description.Trim(),
            LoggedByUserId = loggedByUserId,
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow,
        };

        db.Expenses.Add(expense);
        await db.SaveChangesAsync(ct);
        return expense;
    }

    /// <summary>
    /// Edit own expense only (FR-020a, FR-020c).
    /// </summary>
    public async Task<Expense> UpdateAsync(Guid id, double amountEur, string description, int requestingUserId, CancellationToken ct = default)
    {
        Validate(amountEur, description);

        var expense = await db.Expenses.FindAsync([id], ct)
            ?? throw new NotFoundException("Expense not found.");

        if (expense.LoggedByUserId != requestingUserId)
            throw new ForbiddenException("Only the author can edit this expense.");

        expense.AmountCents = (int)Math.Round(amountEur * 100);
        expense.Description = description.Trim();
        expense.UpdatedAt = DateTimeOffset.UtcNow;

        await db.SaveChangesAsync(ct);
        return expense;
    }

    /// <summary>
    /// Delete own expense only (FR-020b, FR-020c).
    /// </summary>
    public async Task DeleteAsync(Guid id, int requestingUserId, CancellationToken ct = default)
    {
        var expense = await db.Expenses.FindAsync([id], ct)
            ?? throw new NotFoundException("Expense not found.");

        if (expense.LoggedByUserId != requestingUserId)
            throw new ForbiddenException("Only the author can delete this expense.");

        db.Expenses.Remove(expense);
        await db.SaveChangesAsync(ct);
    }

    private static void Validate(double amountEur, string description)
    {
        if (amountEur < 0.01)
            throw new ValidationException("Amount must be at least €0.01.");
        if (string.IsNullOrWhiteSpace(description))
            throw new ValidationException("Description is required.");
        if (description.Length > 500)
            throw new ValidationException("Description must be at most 500 characters.");
    }
}

public class ValidationException(string message) : Exception(message);
public class NotFoundException(string message) : Exception(message);
public class ForbiddenException(string message) : Exception(message);
