using OpenFlat.Api.Shared;
using Microsoft.EntityFrameworkCore;
using OpenFlat.Api.Features.Cleaning.Data;
using OpenFlat.Shared.Users;

namespace OpenFlat.Api.Features.Cleaning.Services;

public class CleaningTaskService(CleaningDbContext db)
{
    /// <summary>
    /// Map effort enum to points preset. Custom effort returns null (caller must provide points).
    /// </summary>
    public static int? GetPresetPoints(CleaningEffort effort) => effort switch
    {
        CleaningEffort.None => 0,
        CleaningEffort.Normal => 1,
        CleaningEffort.Big => 2,
        CleaningEffort.Huge => 4,
        _ => null, // Custom — caller-provided
    };

    /// <summary>
    /// List all tasks sorted by urgency (overdue → due soon → later).
    /// </summary>
    public async Task<List<CleaningTask>> ListAsync(CancellationToken ct = default)
    {
        return await db.Tasks
            .Include(t => t.Comments)
            .OrderBy(t => t.DueDate)
            .ThenByDescending(t => t.CreatedAt)
            .AsNoTracking()
            .ToListAsync(ct);
    }

    public async Task<CleaningTask?> GetByIdAsync(Guid id, CancellationToken ct = default)
    {
        return await db.Tasks
            .Include(t => t.Comments)
            .Include(t => t.CompletionLogs.OrderByDescending(cl => cl.CompletedAt))
            .FirstOrDefaultAsync(t => t.Id == id, ct);
    }

    /// <summary>
    /// Create a v3 recurring task with effort, frequency, and optional rotation.
    /// </summary>
    public async Task<CleaningTask> CreateAsync(
        string title,
        CleaningEffort effort,
        int? customPoints,
        int frequencyValue,
        FrequencyUnit frequencyUnit,
        DateOnly firstDueDate,
        int[]? rotationOrder,
        int createdByUserId,
        CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(title))
            throw new ValidationException("Title is required.");
        if (frequencyValue < 1)
            throw new ValidationException("Frequency value must be at least 1.");
        if (!PredefinedUsers.IsValid(createdByUserId))
            throw new ValidationException("Invalid user ID.");

        // Resolve points from effort preset or custom value
        var presetPoints = GetPresetPoints(effort);
        var points = presetPoints ?? customPoints ?? throw new ValidationException("Points required for Custom effort.");
        if (points < 0)
            throw new ValidationException("Points must be non-negative.");

        // Validate rotation user IDs
        var rotation = rotationOrder ?? [];
        foreach (var uid in rotation)
        {
            if (!PredefinedUsers.IsValid(uid))
                throw new ValidationException($"Invalid user ID {uid} in rotation order.");
        }

        var task = new CleaningTask
        {
            Title = title.Trim(),
            Effort = effort,
            Points = points,
            FrequencyValue = frequencyValue,
            FrequencyUnit = frequencyUnit,
            DueDate = firstDueDate,
            RotationOrder = rotation,
            RotationIndex = 0,
            AssignedUserId = rotation.Length > 0 ? rotation[0] : null,
            CreatedByUserId = createdByUserId,
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow,
        };

        db.Tasks.Add(task);
        await db.SaveChangesAsync(ct);
        return task;
    }

    /// <summary>
    /// Update task properties (effort, frequency, rotation, etc.).
    /// Changing rotation resets rotation index to 0.
    /// </summary>
    public async Task<CleaningTask> UpdateAsync(
        Guid id,
        string title,
        CleaningEffort effort,
        int? customPoints,
        int frequencyValue,
        FrequencyUnit frequencyUnit,
        DateOnly? dueDate,
        int[]? rotationOrder,
        CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(title))
            throw new ValidationException("Title is required.");
        if (frequencyValue < 1)
            throw new ValidationException("Frequency value must be at least 1.");

        var task = await db.Tasks.FindAsync([id], ct)
            ?? throw new NotFoundException("Task not found.");

        // Resolve points
        var presetPoints = GetPresetPoints(effort);
        var points = presetPoints ?? customPoints ?? throw new ValidationException("Points required for Custom effort.");
        if (points < 0)
            throw new ValidationException("Points must be non-negative.");

        task.Title = title.Trim();
        task.Effort = effort;
        task.Points = points;
        task.FrequencyValue = frequencyValue;
        task.FrequencyUnit = frequencyUnit;

        if (dueDate.HasValue)
            task.DueDate = dueDate.Value;

        // If rotation order changes, reset index
        if (rotationOrder is not null)
        {
            foreach (var uid in rotationOrder)
            {
                if (!PredefinedUsers.IsValid(uid))
                    throw new ValidationException($"Invalid user ID {uid} in rotation order.");
            }

            task.RotationOrder = rotationOrder;
            task.RotationIndex = 0;
            task.AssignedUserId = rotationOrder.Length > 0 ? rotationOrder[0] : null;
        }

        task.UpdatedAt = DateTimeOffset.UtcNow;
        await db.SaveChangesAsync(ct);
        return task;
    }

    public async Task<CleaningTask> DeleteAsync(Guid id, CancellationToken ct = default)
    {
        var task = await db.Tasks.FindAsync([id], ct)
            ?? throw new NotFoundException("Task not found.");

        db.Tasks.Remove(task);
        await db.SaveChangesAsync(ct);
        return task;
    }

    /// <summary>
    /// One-way completion: log completion, credit points to completer,
    /// advance rotation, and advance due date by frequency.
    /// </summary>
    public async Task<CompleteResult> CompleteAsync(Guid id, int completedByUserId, int? nextUserId = null, CancellationToken ct = default)
    {
        if (!PredefinedUsers.IsValid(completedByUserId))
            throw new ValidationException("Invalid completer user ID.");
        if (nextUserId.HasValue && !PredefinedUsers.IsValid(nextUserId.Value))
            throw new ValidationException("Invalid next user ID.");

        var task = await db.Tasks.FindAsync([id], ct)
            ?? throw new NotFoundException("Task not found.");

        var pointsEarned = task.Points;

        // 1. Write completion log
        var log = new CleaningCompletionLog
        {
            TaskId = task.Id,
            CompletedByUserId = completedByUserId,
            AssignedUserId = task.AssignedUserId,
            PointsEarned = pointsEarned,
            CompletedAt = DateTimeOffset.UtcNow,
        };
        db.CompletionLogs.Add(log);

        // 2. Record last completion info
        task.LastCompletedAt = log.CompletedAt;
        task.LastCompletedByUserId = completedByUserId;

        // 3. Advance rotation
        if (task.RotationOrder.Length > 0)
        {
            if (nextUserId.HasValue)
            {
                // Override: find index of nextUserId in rotation
                var idx = Array.IndexOf(task.RotationOrder, nextUserId.Value);
                if (idx >= 0)
                {
                    task.RotationIndex = idx;
                }
                else
                {
                    // If not in rotation, advance naturally
                    task.RotationIndex = (task.RotationIndex + 1) % task.RotationOrder.Length;
                }
            }
            else
            {
                task.RotationIndex = (task.RotationIndex + 1) % task.RotationOrder.Length;
            }
            task.AssignedUserId = task.RotationOrder[task.RotationIndex];
        }
        // Empty rotation: assigned stays null, no advance

        // 4. Advance due date by frequency (from old due_date, not today)
        var daysToAdd = task.FrequencyUnit == FrequencyUnit.Weeks
            ? task.FrequencyValue * 7
            : task.FrequencyValue;
        task.DueDate = task.DueDate.AddDays(daysToAdd);

        task.UpdatedAt = DateTimeOffset.UtcNow;
        await db.SaveChangesAsync(ct);

        var completerName = PredefinedUsers.GetById(completedByUserId)?.Name ?? "Unknown";
        var nextAssignedName = task.AssignedUserId.HasValue
            ? PredefinedUsers.GetById(task.AssignedUserId.Value)?.Name
            : null;

        return new CompleteResult(task, pointsEarned, completerName, nextAssignedName);
    }

    /// <summary>
    /// Assign or unassign a user to a task (manual override).
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

public record CompleteResult(CleaningTask Task, int PointsEarned, string CompletedByUserName, string? NextAssignedUserName);

