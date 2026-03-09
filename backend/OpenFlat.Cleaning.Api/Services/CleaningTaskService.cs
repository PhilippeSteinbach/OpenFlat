using Microsoft.EntityFrameworkCore;
using OpenFlat.Cleaning.Api.Data;
using OpenFlat.Shared.Users;

namespace OpenFlat.Cleaning.Api.Services;

public class CleaningTaskService(CleaningDbContext db)
{
    /// <summary>
    /// List all tasks sorted by urgency:
    /// active first (overdue → due soon → no deadline), then completed.
    /// </summary>
    public async Task<List<CleaningTask>> ListAsync(CancellationToken ct = default)
    {
        return await db.Tasks
            .Include(t => t.Comments)
            .OrderBy(t => t.IsDone)
            .ThenBy(t => t.DueDate == null)
            .ThenBy(t => t.DueDate)
            .ThenByDescending(t => t.CreatedAt)
            .AsNoTracking()
            .ToListAsync(ct);
    }

    public async Task<CleaningTask?> GetByIdAsync(Guid id, CancellationToken ct = default)
    {
        return await db.Tasks
            .Include(t => t.Comments)
            .FirstOrDefaultAsync(t => t.Id == id, ct);
    }

    public async Task<CleaningTask> CreateAsync(string title, int points, int createdByUserId, DateOnly? dueDate = null, int? assignedUserId = null, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(title))
            throw new ValidationException("Title is required.");
        if (points < 0)
            throw new ValidationException("Points must be non-negative.");
        if (!PredefinedUsers.IsValid(createdByUserId))
            throw new ValidationException("Invalid user ID.");
        if (assignedUserId.HasValue && !PredefinedUsers.IsValid(assignedUserId.Value))
            throw new ValidationException("Invalid assigned user ID.");

        var task = new CleaningTask
        {
            Title = title.Trim(),
            Points = points,
            IsDone = false,
            DueDate = dueDate,
            AssignedUserId = assignedUserId,
            CreatedByUserId = createdByUserId,
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow,
        };

        db.Tasks.Add(task);
        await db.SaveChangesAsync(ct);
        return task;
    }

    /// <summary>
    /// Update task title, points, and due date.
    /// FR-014a: If the task is done and points change, recalculate delta.
    /// </summary>
    public async Task<(CleaningTask Task, int PointsDelta)> UpdateAsync(Guid id, string title, int points, DateOnly? dueDate, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(title))
            throw new ValidationException("Title is required.");
        if (points < 0)
            throw new ValidationException("Points must be non-negative.");

        var task = await db.Tasks.FindAsync([id], ct)
            ?? throw new NotFoundException("Task not found.");

        // FR-014a: If task is done and points change, compute delta
        var pointsDelta = 0;
        if (task.IsDone && task.AssignedUserId.HasValue && task.Points != points)
        {
            pointsDelta = points - task.Points;
        }

        task.Title = title.Trim();
        task.Points = points;
        task.DueDate = dueDate;
        task.UpdatedAt = DateTimeOffset.UtcNow;

        await db.SaveChangesAsync(ct);
        return (task, pointsDelta);
    }

    public async Task<(CleaningTask Task, int PointsDelta)> DeleteAsync(Guid id, CancellationToken ct = default)
    {
        var task = await db.Tasks.FindAsync([id], ct)
            ?? throw new NotFoundException("Task not found.");

        // FR-014b: If the deleted task was done, deduct points
        var pointsDelta = 0;
        if (task.IsDone && task.AssignedUserId.HasValue)
        {
            pointsDelta = -task.Points;
        }

        db.Tasks.Remove(task);
        await db.SaveChangesAsync(ct);
        return (task, pointsDelta);
    }

    /// <summary>
    /// Toggle task done/undone state.
    /// Handles point crediting (undone→done) and deducting (done→undone).
    /// FR-009, FR-012, FR-013, FR-015
    /// </summary>
    public async Task<CompleteResult> CompleteAsync(Guid id, CancellationToken ct = default)
    {
        var task = await db.Tasks.FindAsync([id], ct)
            ?? throw new NotFoundException("Task not found.");

        var pointsDelta = 0;
        var warningNoAssignee = false;

        if (task.IsDone)
        {
            // Undoing completion — deduct points (FR-013)
            task.IsDone = false;
            task.CompletedAt = null;
            if (task.AssignedUserId.HasValue)
            {
                pointsDelta = -task.Points;
            }
        }
        else
        {
            // Marking done — credit points (FR-012)
            task.IsDone = true;
            task.CompletedAt = DateTimeOffset.UtcNow;
            if (task.AssignedUserId.HasValue)
            {
                pointsDelta = task.Points;
            }
            else
            {
                warningNoAssignee = true; // FR-015
            }
        }

        task.UpdatedAt = DateTimeOffset.UtcNow;
        await db.SaveChangesAsync(ct);

        return new CompleteResult(task, pointsDelta, warningNoAssignee);
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

public record CompleteResult(CleaningTask Task, int PointsDelta, bool WarningNoAssignee);

public class ValidationException(string message) : Exception(message);
public class NotFoundException(string message) : Exception(message);
public class ForbiddenException(string message) : Exception(message);
