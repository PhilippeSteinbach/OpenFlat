using Microsoft.AspNetCore.SignalR;
using OpenFlat.Cleaning.Api.Data;
using OpenFlat.Cleaning.Api.Hubs;
using OpenFlat.Cleaning.Api.Services;
using OpenFlat.Shared.Users;

namespace OpenFlat.Cleaning.Api.Endpoints;

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
        group.MapPost("/{taskId:guid}/move", MoveTask);
        group.MapPost("/{taskId:guid}/assign", AssignTask);

        // ── Comment endpoints ──────────────────────
        group.MapGet("/{taskId:guid}/comments", ListComments);
        group.MapPost("/{taskId:guid}/comments", AddComment);
        group.MapPut("/{taskId:guid}/comments/{commentId:guid}", UpdateComment);
        group.MapDelete("/{taskId:guid}/comments/{commentId:guid}", DeleteComment);
    }

    private static int GetUserId(HttpContext ctx)
    {
        var header = ctx.Request.Headers["X-User-Id"].FirstOrDefault();
        if (int.TryParse(header, out var userId) && PredefinedUsers.IsValid(userId))
            return userId;
        throw new ValidationException("Missing or invalid X-User-Id header.");
    }

    private static TaskDto ToDto(CleaningTask task)
    {
        var assignedUser = task.AssignedUserId.HasValue
            ? PredefinedUsers.GetById(task.AssignedUserId.Value)
            : null;

        return new TaskDto(
            task.Id,
            task.Title,
            task.Points,
            StatusToString(task.Status),
            task.AssignedUserId,
            assignedUser?.Name,
            task.SortOrder,
            task.CreatedByUserId,
            task.CreatedAt,
            task.UpdatedAt,
            task.Comments?.Count ?? 0);
    }

    private static string StatusToString(CleaningTaskStatus status) => status switch
    {
        CleaningTaskStatus.Todo => "todo",
        CleaningTaskStatus.InProgress => "in_progress",
        CleaningTaskStatus.AwaitingReview => "awaiting_review",
        CleaningTaskStatus.Done => "done",
        _ => "todo",
    };

    internal static CleaningTaskStatus StatusFromString(string status) => status switch
    {
        "todo" => CleaningTaskStatus.Todo,
        "in_progress" => CleaningTaskStatus.InProgress,
        "awaiting_review" => CleaningTaskStatus.AwaitingReview,
        "done" => CleaningTaskStatus.Done,
        _ => throw new ValidationException($"Invalid status: {status}"),
    };

    // GET /api/tasks
    private static async Task<IResult> ListTasks(
        HttpContext ctx,
        CleaningTaskService svc)
    {
        GetUserId(ctx); // Validate header
        var tasks = await svc.ListAsync();
        return Results.Ok(tasks.Select(ToDto));
    }

    // POST /api/tasks
    private static async Task<IResult> CreateTask(
        HttpContext ctx,
        CreateTaskRequest req,
        CleaningTaskService svc,
        IHubContext<CleaningHub> hub,
        LeaderboardService leaderboardSvc)
    {
        var userId = GetUserId(ctx);
        var task = await svc.CreateAsync(req.Title, req.Points, userId);
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
        GetUserId(ctx);
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
        IHubContext<CleaningHub> hub,
        LeaderboardService leaderboardSvc)
    {
        GetUserId(ctx);
        var task = await svc.UpdateAsync(taskId, req.Title, req.Points);
        var dto = ToDto(task);
        await hub.Clients.All.SendAsync("TaskUpdated", dto);

        // If task in Done, points may have changed — update leaderboard
        if (task.Status == CleaningTaskStatus.Done)
        {
            var leaderboard = await leaderboardSvc.GetLeaderboardAsync();
            await hub.Clients.All.SendAsync("LeaderboardUpdated", leaderboard);
        }

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
        GetUserId(ctx);
        var (task, pointsDelta) = await svc.DeleteAsync(taskId);
        await hub.Clients.All.SendAsync("TaskDeleted", taskId);

        if (pointsDelta != 0)
        {
            var leaderboard = await leaderboardSvc.GetLeaderboardAsync();
            await hub.Clients.All.SendAsync("LeaderboardUpdated", leaderboard);
        }

        return Results.NoContent();
    }

    // POST /api/tasks/{taskId}/move
    private static async Task<IResult> MoveTask(
        HttpContext ctx,
        Guid taskId,
        MoveTaskRequest req,
        CleaningTaskService svc,
        IHubContext<CleaningHub> hub,
        LeaderboardService leaderboardSvc)
    {
        GetUserId(ctx);
        var targetStatus = StatusFromString(req.TargetStatus);
        var result = await svc.MoveAsync(taskId, targetStatus, req.TargetSortOrder);
        var dto = ToDto(result.Task);
        var response = new MoveTaskResponseDto(dto, result.PointsDelta, result.WarningNoAssignee);

        await hub.Clients.All.SendAsync("TaskMoved", response);

        if (result.PointsDelta != 0)
        {
            var leaderboard = await leaderboardSvc.GetLeaderboardAsync();
            await hub.Clients.All.SendAsync("LeaderboardUpdated", leaderboard);
        }

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
        GetUserId(ctx);
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
        GetUserId(ctx);
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
        var userId = GetUserId(ctx);
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
        var userId = GetUserId(ctx);
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
        var userId = GetUserId(ctx);
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

// Request/Response DTOs
public record CreateTaskRequest(string Title, int Points);
public record UpdateTaskRequest(string Title, int Points);
public record MoveTaskRequest(string TargetStatus, int TargetSortOrder);
public record AssignTaskRequest(int? AssignedUserId);

public record TaskDto(
    Guid Id,
    string Title,
    int Points,
    string Status,
    int? AssignedUserId,
    string? AssignedUserName,
    int SortOrder,
    int CreatedByUserId,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt,
    int CommentCount);

public record TaskDetailDto(TaskDto Task, List<CommentDto> Comments)
{
    // Flatten for convenience (allOf in OpenAPI)
    public Guid Id => Task.Id;
    public string Title => Task.Title;
    public int Points => Task.Points;
    public string Status => Task.Status;
    public int? AssignedUserId => Task.AssignedUserId;
    public string? AssignedUserName => Task.AssignedUserName;
    public int SortOrder => Task.SortOrder;
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

public record MoveTaskResponseDto(TaskDto Task, int PointsDelta, bool WarningNoAssignee);

public record CreateCommentRequest(string Text);
public record UpdateCommentRequest(string Text);
