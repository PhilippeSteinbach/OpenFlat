using Microsoft.EntityFrameworkCore;
using OpenFlat.Shopping.Api.Data;
using OpenFlat.Shared.Users;

namespace OpenFlat.Shopping.Api.Services;

public class ShoppingItemService(ShoppingDbContext db)
{
    /// <summary>
    /// Returns all items split into active and recently bought (within 7 days).
    /// Items bought more than 7 days ago are auto-excluded (FR-019b).
    /// </summary>
    public async Task<ShoppingListResult> ListAsync(CancellationToken ct = default)
    {
        var cutoff = DateTimeOffset.UtcNow.AddDays(-7);

        var items = await db.Items
            .Include(i => i.Comments)
            .Where(i => !i.IsBought || (i.BoughtAt != null && i.BoughtAt > cutoff))
            .OrderByDescending(i => i.CreatedAt)
            .AsNoTracking()
            .ToListAsync(ct);

        var active = items.Where(i => !i.IsBought).ToList();
        var recentlyBought = items.Where(i => i.IsBought).OrderByDescending(i => i.BoughtAt).ToList();

        return new ShoppingListResult(active, recentlyBought);
    }

    public async Task<ShoppingItem?> GetByIdAsync(Guid id, CancellationToken ct = default)
    {
        return await db.Items
            .Include(i => i.Comments)
            .FirstOrDefaultAsync(i => i.Id == id, ct);
    }

    /// <summary>
    /// Create a new shopping item (FR-017).
    /// </summary>
    public async Task<ShoppingItem> CreateAsync(string name, int quantity, int addedByUserId, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(name))
            throw new ValidationException("Name is required.");
        if (quantity < 1)
            throw new ValidationException("Quantity must be at least 1.");
        if (!PredefinedUsers.IsValid(addedByUserId))
            throw new ValidationException("Invalid user ID.");

        var item = new ShoppingItem
        {
            Name = name.Trim(),
            Quantity = quantity,
            AddedByUserId = addedByUserId,
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow,
        };

        db.Items.Add(item);
        await db.SaveChangesAsync(ct);
        return item;
    }

    /// <summary>
    /// Update an active item's name and quantity (FR-017a).
    /// Returns 409 ConflictException if already bought.
    /// </summary>
    public async Task<ShoppingItem> UpdateAsync(Guid id, string name, int quantity, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(name))
            throw new ValidationException("Name is required.");
        if (quantity < 1)
            throw new ValidationException("Quantity must be at least 1.");

        var item = await db.Items.FindAsync([id], ct)
            ?? throw new NotFoundException("Item not found.");

        if (item.IsBought)
            throw new ConflictException("Cannot edit a bought item.");

        item.Name = name.Trim();
        item.Quantity = quantity;
        item.UpdatedAt = DateTimeOffset.UtcNow;

        await db.SaveChangesAsync(ct);
        return item;
    }

    /// <summary>
    /// Delete a shopping item.
    /// </summary>
    public async Task<ShoppingItem> DeleteAsync(Guid id, CancellationToken ct = default)
    {
        var item = await db.Items.FindAsync([id], ct)
            ?? throw new NotFoundException("Item not found.");

        db.Items.Remove(item);
        await db.SaveChangesAsync(ct);
        return item;
    }

    /// <summary>
    /// Check off an item — move to Recently Bought (FR-018).
    /// </summary>
    public async Task<ShoppingItem> BuyAsync(Guid id, int boughtByUserId, CancellationToken ct = default)
    {
        if (!PredefinedUsers.IsValid(boughtByUserId))
            throw new ValidationException("Invalid user ID.");

        var item = await db.Items.FindAsync([id], ct)
            ?? throw new NotFoundException("Item not found.");

        if (item.IsBought)
            throw new ConflictException("Item is already bought.");

        item.IsBought = true;
        item.BoughtAt = DateTimeOffset.UtcNow;
        item.BoughtByUserId = boughtByUserId;
        item.UpdatedAt = DateTimeOffset.UtcNow;

        await db.SaveChangesAsync(ct);
        return item;
    }

    /// <summary>
    /// Undo a buy — move item back to active list (FR-019a).
    /// </summary>
    public async Task<ShoppingItem> UndoBuyAsync(Guid id, CancellationToken ct = default)
    {
        var item = await db.Items.FindAsync([id], ct)
            ?? throw new NotFoundException("Item not found.");

        if (!item.IsBought)
            throw new ConflictException("Item is not bought — cannot undo.");

        item.IsBought = false;
        item.BoughtAt = null;
        item.BoughtByUserId = null;
        item.UpdatedAt = DateTimeOffset.UtcNow;

        await db.SaveChangesAsync(ct);
        return item;
    }

    /// <summary>
    /// Auto-clear items bought more than 7 days ago (FR-019b).
    /// Returns the count of cleared items.
    /// </summary>
    public async Task<int> AutoClearExpiredAsync(CancellationToken ct = default)
    {
        var cutoff = DateTimeOffset.UtcNow.AddDays(-7);
        var expired = await db.Items
            .Where(i => i.IsBought && i.BoughtAt != null && i.BoughtAt <= cutoff)
            .ToListAsync(ct);

        if (expired.Count == 0) return 0;

        db.Items.RemoveRange(expired);
        await db.SaveChangesAsync(ct);
        return expired.Count;
    }

    // ── Comment operations ──────────────────────

    public async Task<ShoppingComment> AddCommentAsync(Guid itemId, int userId, string text, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(text))
            throw new ValidationException("Comment text is required.");
        if (!PredefinedUsers.IsValid(userId))
            throw new ValidationException("Invalid user ID.");

        var item = await db.Items.FindAsync([itemId], ct)
            ?? throw new NotFoundException("Item not found.");

        var comment = new ShoppingComment
        {
            ItemId = itemId,
            UserId = userId,
            Text = text.Trim(),
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow,
        };

        db.Comments.Add(comment);
        await db.SaveChangesAsync(ct);
        return comment;
    }

    public async Task<ShoppingComment> UpdateCommentAsync(Guid itemId, Guid commentId, int userId, string text, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(text))
            throw new ValidationException("Comment text is required.");

        var comment = await db.Comments.FirstOrDefaultAsync(c => c.Id == commentId && c.ItemId == itemId, ct)
            ?? throw new NotFoundException("Comment not found.");

        if (comment.UserId != userId)
            throw new ForbiddenException("Only the author can edit this comment.");

        comment.Text = text.Trim();
        comment.IsEdited = true;
        comment.UpdatedAt = DateTimeOffset.UtcNow;

        await db.SaveChangesAsync(ct);
        return comment;
    }

    public async Task DeleteCommentAsync(Guid itemId, Guid commentId, int userId, CancellationToken ct = default)
    {
        var comment = await db.Comments.FirstOrDefaultAsync(c => c.Id == commentId && c.ItemId == itemId, ct)
            ?? throw new NotFoundException("Comment not found.");

        if (comment.UserId != userId)
            throw new ForbiddenException("Only the author can delete this comment.");

        db.Comments.Remove(comment);
        await db.SaveChangesAsync(ct);
    }
}

public record ShoppingListResult(List<ShoppingItem> Active, List<ShoppingItem> RecentlyBought);

public class ValidationException(string message) : Exception(message);
public class NotFoundException(string message) : Exception(message);
public class ConflictException(string message) : Exception(message);
public class ForbiddenException(string message) : Exception(message);
