using OpenFlat.Api.Shared;
using Microsoft.AspNetCore.SignalR;
using OpenFlat.Api.Features.Cleaning.Data;
using OpenFlat.Api.Features.Cleaning.Hubs;
using OpenFlat.Api.Features.Cleaning.Services;
using OpenFlat.Shared.Users;

namespace OpenFlat.Api.Features.Cleaning.Endpoints;

public static class TaskEndpoints
{
    public static void MapTaskEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/tasks");

        group.MapGet("/", ListTasks);
        group.MapPost("/", CreateTask);
        group.MapGet("/{taskId:guid}", GetTask);
        group.MapPut("/{taskId:guid}", UpdateTask);
        group.MapDelete("/{taskId:guid}", DeleteTask);
        group.MapPost("/{taskId:guid}/complete", CompleteTask);
        group.MapPost("/{taskId:guid}/assign", AssignTask);

        // ── Comment endpoints ──────────────────────
        group.MapGet("/{taskId:guid}/comments", ListComments);
        group.MapPost("/{taskId:guid}/comments", AddComment);
        group.MapPut("/{taskId:guid}/comments/{commentId:guid}", UpdateComment);
        group.MapDelete("/{taskId:guid}/comments/{commentId:guid}", DeleteComment);
    }


    private static TaskDto ToDto(CleaningTask task)
    {
        var assignedUser = task.AssignedUserId.HasValue
            ? PredefinedUsers.GetById(task.AssignedUserId.Value)
            : null;
        var lastCompletedByUser = task.LastCompletedByUserId.HasValue
            ? PredefinedUsers.GetById(task.LastCompletedByUserId.Value)
            : null;

        return new TaskDto(
            task.Id,
            task.Title,
            task.Effort.ToString(),
            task.Points,
            task.FrequencyValue,
            task.FrequencyUnit.ToString(),
            task.DueDate.ToString("yyyy-MM-dd"),
            task.RotationOrder,
            task.RotationIndex,
            task.AssignedUserId,
            assignedUser?.Name,
            task.LastCompletedAt,
            lastCompletedByUser?.Name,
            task.CreatedByUserId,
            task.CreatedAt,
            task.UpdatedAt,
            task.Comments?.Count ?? 0);
    }

    // GET /api/tasks
    private static async Task<IResult> ListTasks(
        HttpContext ctx,
        CleaningTaskService svc)
    {
        UserHelper.GetUserId(ctx); // Validate header
        var tasks = await svc.ListAsync();
        return Results.Ok(tasks.Select(ToDto));
    }

    // POST /api/tasks
    private static async Task<IResult> CreateTask(
        HttpContext ctx,
        CreateTaskRequest req,
        CleaningTaskService svc,
        IHubContext<CleaningHub> hub)
    {
        var userId = UserHelper.GetUserId(ctx);
        var effort = Enum.Parse<CleaningEffort>(req.Effort, ignoreCase: true);
        var frequencyUnit = Enum.Parse<FrequencyUnit>(req.FrequencyUnit, ignoreCase: true);
        var firstDueDate = DateOnly.Parse(req.FirstDueDate);

        var task = await svc.CreateAsync(
            req.Title, effort, req.Points, req.FrequencyValue, frequencyUnit,
            firstDueDate, req.RotationOrder, userId);

        var dto = ToDto(task);
        await hub.Clients.All.SendAsync("TaskCreated", dto);
        return Results.Created($"/api/tasks/{task.Id}", dto);
    }

    // GET /api/tasks/{taskId}
    private static async Task<IResult> GetTask(
        HttpContext ctx,
        Guid taskId,
        CleaningTaskService svc)
    {
        UserHelper.GetUserId(ctx);
        var task = await svc.GetByIdAsync(taskId);
        if (task is null) return Results.NotFound();

        var dto = ToDto(task);
        var comments = task.Comments
            .OrderBy(c => c.CreatedAt)
            .Select(c =>
            {
                var user = PredefinedUsers.GetById(c.UserId);
                return new CommentDto(c.Id, c.UserId, user?.Name ?? "Unknown", c.Text, c.IsEdited, c.CreatedAt, c.UpdatedAt);
            })
            .ToList();

        return Results.Ok(new TaskDetailDto(dto, comments));
    }

    // PUT /api/tasks/{taskId}
    private static async Task<IResult> UpdateTask(
        HttpContext ctx,
        Guid taskId,
        UpdateTaskRequest req,
        CleaningTaskService svc,
        IHubContext<CleaningHub> hub)
    {
        UserHelper.GetUserId(ctx);
        var effort = Enum.Parse<CleaningEffort>(req.Effort, ignoreCase: true);
        var frequencyUnit = Enum.Parse<FrequencyUnit>(req.FrequencyUnit, ignoreCase: true);
        DateOnly? dueDate = req.DueDate is not null ? DateOnly.Parse(req.DueDate) : null;

        var task = await svc.UpdateAsync(
            taskId, req.Title, effort, req.Points, req.FrequencyValue, frequencyUnit,
            dueDate, req.RotationOrder);

        var dto = ToDto(task);
        await hub.Clients.All.SendAsync("TaskUpdated", dto);
        return Results.Ok(dto);
    }

    // DELETE /api/tasks/{taskId}
    private static async Task<IResult> DeleteTask(
        HttpContext ctx,
        Guid taskId,
        CleaningTaskService svc,
        IHubContext<CleaningHub> hub,
        LeaderboardService leaderboardSvc)
    {
        UserHelper.GetUserId(ctx);
        var task = await svc.DeleteAsync(taskId);
        await hub.Clients.All.SendAsync("TaskDeleted", taskId);

        // Cascade deletes completion logs, so leaderboard may change
        var leaderboard = await leaderboardSvc.GetLeaderboardAsync();
        await hub.Clients.All.SendAsync("LeaderboardUpdated", leaderboard);

        return Results.NoContent();
    }

    // POST /api/tasks/{taskId}/complete
    private static async Task<IResult> CompleteTask(
        HttpContext ctx,
        Guid taskId,
        CleaningTaskService svc,
        IHubContext<CleaningHub> hub,
        LeaderboardService leaderboardSvc)
    {
        var userId = UserHelper.GetUserId(ctx);

        // Read optional body for nextUserId
        int? nextUserId = null;
        try
        {
            var body = await ctx.Request.ReadFromJsonAsync<CompleteTaskRequest?>();
            nextUserId = body?.NextUserId;
        }
        catch
        {
            // No body or invalid — use default rotation
        }

        var result = await svc.CompleteAsync(taskId, userId, nextUserId);
        var dto = ToDto(result.Task);
        var response = new CompleteTaskResponseDto(dto, result.PointsEarned, result.CompletedByUserName, result.NextAssignedUserName);

        await hub.Clients.All.SendAsync("TaskCompleted", response);

        var leaderboard = await leaderboardSvc.GetLeaderboardAsync();
        await hub.Clients.All.SendAsync("LeaderboardUpdated", leaderboard);

        return Results.Ok(response);
    }

    // POST /api/tasks/{taskId}/assign
    private static async Task<IResult> AssignTask(
        HttpContext ctx,
        Guid taskId,
        AssignTaskRequest req,
        CleaningTaskService svc,
        IHubContext<CleaningHub> hub)
    {
        UserHelper.GetUserId(ctx);
        var task = await svc.AssignAsync(taskId, req.AssignedUserId);
        var dto = ToDto(task);
        await hub.Clients.All.SendAsync("TaskAssigned", dto);
        return Results.Ok(dto);
    }

    // ── Comment handlers ──────────────────────

    // GET /api/tasks/{taskId}/comments
    private static async Task<IResult> ListComments(
        HttpContext ctx,
        Guid taskId,
        CleaningTaskService svc)
    {
        UserHelper.GetUserId(ctx);
        var task = await svc.GetByIdAsync(taskId);
        if (task is null) return Results.NotFound();
        return Results.Ok(task.Comments
            .OrderBy(c => c.CreatedAt)
            .Select(ToCommentDto)
            .ToList());
    }

    // POST /api/tasks/{taskId}/comments
    private static async Task<IResult> AddComment(
        HttpContext ctx,
        Guid taskId,
        CreateCommentRequest req,
        CleaningTaskService svc,
        IHubContext<CleaningHub> hub)
    {
        var userId = UserHelper.GetUserId(ctx);
        var comment = await svc.AddCommentAsync(taskId, userId, req.Text);
        var dto = ToCommentDto(comment);
        await hub.Clients.All.SendAsync("CommentAdded", taskId, dto);
        return Results.Created($"/api/tasks/{taskId}/comments/{comment.Id}", dto);
    }

    // PUT /api/tasks/{taskId}/comments/{commentId}
    private static async Task<IResult> UpdateComment(
        HttpContext ctx,
        Guid taskId,
        Guid commentId,
        UpdateCommentRequest req,
        CleaningTaskService svc,
        IHubContext<CleaningHub> hub)
    {
        var userId = UserHelper.GetUserId(ctx);
        var comment = await svc.UpdateCommentAsync(taskId, commentId, userId, req.Text);
        var dto = ToCommentDto(comment);
        await hub.Clients.All.SendAsync("CommentUpdated", taskId, dto);
        return Results.Ok(dto);
    }

    // DELETE /api/tasks/{taskId}/comments/{commentId}
    private static async Task<IResult> DeleteComment(
        HttpContext ctx,
        Guid taskId,
        Guid commentId,
        CleaningTaskService svc,
        IHubContext<CleaningHub> hub)
    {
        var userId = UserHelper.GetUserId(ctx);
        await svc.DeleteCommentAsync(taskId, commentId, userId);
        await hub.Clients.All.SendAsync("CommentDeleted", taskId, commentId);
        return Results.NoContent();
    }

    private static CommentDto ToCommentDto(CleaningComment c) => new(
        c.Id,
        c.UserId,
        PredefinedUsers.GetById(c.UserId)?.Name ?? "Unknown",
        c.Text,
        c.IsEdited,
        c.CreatedAt,
        c.UpdatedAt
    );
}

// ── v3 Request/Response DTOs ──────────────────────

public record CreateTaskRequest(
    string Title,
    string Effort,
    int? Points,
    int FrequencyValue,
    string FrequencyUnit,
    string FirstDueDate,
    int[]? RotationOrder = null);

public record UpdateTaskRequest(
    string Title,
    string Effort,
    int? Points,
    int FrequencyValue,
    string FrequencyUnit,
    string? DueDate = null,
    int[]? RotationOrder = null);

public record CompleteTaskRequest(int? NextUserId = null);

public record AssignTaskRequest(int? AssignedUserId);

public record TaskDto(
    Guid Id,
    string Title,
    string Effort,
    int Points,
    int FrequencyValue,
    string FrequencyUnit,
    string DueDate,
    int[] RotationOrder,
    int RotationIndex,
    int? AssignedUserId,
    string? AssignedUserName,
    DateTimeOffset? LastCompletedAt,
    string? LastCompletedByUserName,
    int CreatedByUserId,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt,
    int CommentCount);

public record TaskDetailDto(TaskDto Task, List<CommentDto> Comments)
{
    // Flatten for convenience (allOf in OpenAPI)
    public Guid Id => Task.Id;
    public string Title => Task.Title;
    public string Effort => Task.Effort;
    public int Points => Task.Points;
    public int FrequencyValue => Task.FrequencyValue;
    public string FrequencyUnit => Task.FrequencyUnit;
    public string DueDate => Task.DueDate;
    public int[] RotationOrder => Task.RotationOrder;
    public int RotationIndex => Task.RotationIndex;
    public int? AssignedUserId => Task.AssignedUserId;
    public string? AssignedUserName => Task.AssignedUserName;
    public DateTimeOffset? LastCompletedAt => Task.LastCompletedAt;
    public string? LastCompletedByUserName => Task.LastCompletedByUserName;
    public int CreatedByUserId => Task.CreatedByUserId;
    public DateTimeOffset CreatedAt => Task.CreatedAt;
    public DateTimeOffset UpdatedAt => Task.UpdatedAt;
    public int CommentCount => Task.CommentCount;
}

public record CommentDto(
    Guid Id,
    int UserId,
    string UserName,
    string Text,
    bool IsEdited,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt);

public record CompleteTaskResponseDto(TaskDto Task, int PointsEarned, string CompletedByUserName, string? NextAssignedUserName);

public record CreateCommentRequest(string Text);
public record UpdateCommentRequest(string Text);
