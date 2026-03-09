using Microsoft.EntityFrameworkCore;
using OpenFlat.Cleaning.Api.Data;
using OpenFlat.Shared.Users;

namespace OpenFlat.Cleaning.Api.Services;

public class CleaningTaskService(CleaningDbContext db)
{
    public async Task<List<CleaningTask>> ListAsync(CancellationToken ct = default)
    {
        return await db.Tasks
            .Include(t => t.Comments)
            .OrderBy(t => t.Status)
            .ThenBy(t => t.SortOrder)
            .AsNoTracking()
            .ToListAsync(ct);
    }

    public async Task<CleaningTask?> GetByIdAsync(Guid id, CancellationToken ct = default)
    {
        return await db.Tasks
            .Include(t => t.Comments)
            .FirstOrDefaultAsync(t => t.Id == id, ct);
    }

    public async Task<CleaningTask> CreateAsync(string title, int points, int createdByUserId, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(title))
            throw new ValidationException("Title is required.");
        if (points < 0)
            throw new ValidationException("Points must be non-negative.");
        if (!PredefinedUsers.IsValid(createdByUserId))
            throw new ValidationException("Invalid user ID.");

        var maxSort = await db.Tasks
            .Where(t => t.Status == CleaningTaskStatus.Todo)
            .MaxAsync(t => (int?)t.SortOrder, ct) ?? -1;

        var task = new CleaningTask
        {
            Title = title.Trim(),
            Points = points,
            Status = CleaningTaskStatus.Todo,
            SortOrder = maxSort + 1,
            CreatedByUserId = createdByUserId,
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow,
        };

        db.Tasks.Add(task);
        await db.SaveChangesAsync(ct);
        return task;
    }

    public async Task<CleaningTask> UpdateAsync(Guid id, string title, int points, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(title))
            throw new ValidationException("Title is required.");
        if (points < 0)
            throw new ValidationException("Points must be non-negative.");

        var task = await db.Tasks.FindAsync([id], ct)
            ?? throw new NotFoundException("Task not found.");

        task.Title = title.Trim();
        task.Points = points;
        task.UpdatedAt = DateTimeOffset.UtcNow;

        await db.SaveChangesAsync(ct);
        return task;
    }

    public async Task<(CleaningTask Task, int PointsDelta)> DeleteAsync(Guid id, CancellationToken ct = default)
    {
        var task = await db.Tasks.FindAsync([id], ct)
            ?? throw new NotFoundException("Task not found.");

        // FR-014b: If the deleted task was in Done column, deduct points
        var pointsDelta = 0;
        if (task.Status == CleaningTaskStatus.Done && task.AssignedUserId.HasValue)
        {
            pointsDelta = -task.Points;
        }

        db.Tasks.Remove(task);
        await db.SaveChangesAsync(ct);
        return (task, pointsDelta);
    }

    /// <summary>
    /// Move task to a target column and position.
    /// Handles point crediting (→Done) and deducting (Done→elsewhere).
    /// FR-009, FR-012, FR-013, FR-015
    /// </summary>
    public async Task<MoveResult> MoveAsync(Guid id, CleaningTaskStatus targetStatus, int targetSortOrder, CancellationToken ct = default)
    {
        var task = await db.Tasks.FindAsync([id], ct)
            ?? throw new NotFoundException("Task not found.");

        var previousStatus = task.Status;
        var pointsDelta = 0;
        var warningNoAssignee = false;

        // Calculate points delta
        if (targetStatus == CleaningTaskStatus.Done && previousStatus != CleaningTaskStatus.Done)
        {
            // Moving to Done — credit points if assigned (FR-012)
            if (task.AssignedUserId.HasValue)
            {
                pointsDelta = task.Points;
            }
            else
            {
                warningNoAssignee = true; // FR-015
            }
        }
        else if (previousStatus == CleaningTaskStatus.Done && targetStatus != CleaningTaskStatus.Done)
        {
            // Moving out of Done — deduct points if assigned (FR-013)
            if (task.AssignedUserId.HasValue)
            {
                pointsDelta = -task.Points;
            }
        }

        // Shift sort orders in target column to make room
        var tasksToShift = await db.Tasks
            .Where(t => t.Status == targetStatus && t.SortOrder >= targetSortOrder && t.Id != task.Id)
            .ToListAsync(ct);
        foreach (var t in tasksToShift)
        {
            t.SortOrder += 1;
        }

        task.Status = targetStatus;
        task.SortOrder = targetSortOrder;
        task.UpdatedAt = DateTimeOffset.UtcNow;

        await db.SaveChangesAsync(ct);

        return new MoveResult(task, pointsDelta, warningNoAssignee);
    }

    /// <summary>
    /// Assign or unassign a user to a task (FR-010).
    /// </summary>
    public async Task<CleaningTask> AssignAsync(Guid id, int? assignedUserId, CancellationToken ct = default)
    {
        if (assignedUserId.HasValue && !PredefinedUsers.IsValid(assignedUserId.Value))
            throw new ValidationException("Invalid user ID.");

        var task = await db.Tasks.FindAsync([id], ct)
            ?? throw new NotFoundException("Task not found.");

        task.AssignedUserId = assignedUserId;
        task.UpdatedAt = DateTimeOffset.UtcNow;

        await db.SaveChangesAsync(ct);
        return task;
    }

    // ── Comment operations ──────────────────────

    public async Task<CleaningComment> AddCommentAsync(Guid taskId, int userId, string text, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(text))
            throw new ValidationException("Comment text is required.");
        if (text.Length > 2000)
            throw new ValidationException("Comment must be at most 2000 characters.");
        if (!PredefinedUsers.IsValid(userId))
            throw new ValidationException("Invalid user ID.");

        var task = await db.Tasks.FindAsync([taskId], ct)
            ?? throw new NotFoundException("Task not found.");

        var comment = new CleaningComment
        {
            TaskId = taskId,
            UserId = userId,
            Text = text.Trim(),
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow,
        };

        db.Comments.Add(comment);
        await db.SaveChangesAsync(ct);
        return comment;
    }

    public async Task<CleaningComment> UpdateCommentAsync(Guid taskId, Guid commentId, int userId, string text, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(text))
            throw new ValidationException("Comment text is required.");
        if (text.Length > 2000)
            throw new ValidationException("Comment must be at most 2000 characters.");

        var comment = await db.Comments.FirstOrDefaultAsync(c => c.Id == commentId && c.TaskId == taskId, ct)
            ?? throw new NotFoundException("Comment not found.");

        if (comment.UserId != userId)
            throw new ForbiddenException("Only the author can edit this comment.");

        comment.Text = text.Trim();
        comment.IsEdited = true;
        comment.UpdatedAt = DateTimeOffset.UtcNow;

        await db.SaveChangesAsync(ct);
        return comment;
    }

    public async Task DeleteCommentAsync(Guid taskId, Guid commentId, int userId, CancellationToken ct = default)
    {
        var comment = await db.Comments.FirstOrDefaultAsync(c => c.Id == commentId && c.TaskId == taskId, ct)
            ?? throw new NotFoundException("Comment not found.");

        if (comment.UserId != userId)
            throw new ForbiddenException("Only the author can delete this comment.");

        db.Comments.Remove(comment);
        await db.SaveChangesAsync(ct);
    }
}

public record MoveResult(CleaningTask Task, int PointsDelta, bool WarningNoAssignee);

public class ValidationException(string message) : Exception(message);
public class NotFoundException(string message) : Exception(message);
public class ForbiddenException(string message) : Exception(message);
