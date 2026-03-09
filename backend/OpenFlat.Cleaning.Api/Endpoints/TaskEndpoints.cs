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
        group.MapPost("/{taskId:guid}/complete", CompleteTask);
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
            task.IsDone,
            task.DueDate?.ToString("yyyy-MM-dd"),
            task.CompletedAt,
            task.AssignedUserId,
            assignedUser?.Name,
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
        DateOnly? dueDate = req.DueDate is not null ? DateOnly.Parse(req.DueDate) : null;
        var task = await svc.CreateAsync(req.Title, req.Points, userId, dueDate, req.AssignedUserId);
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
        DateOnly? dueDate = req.DueDate is not null ? DateOnly.Parse(req.DueDate) : null;
        var (task, pointsDelta) = await svc.UpdateAsync(taskId, req.Title, req.Points, dueDate);
        var dto = ToDto(task);
        await hub.Clients.All.SendAsync("TaskUpdated", dto);

        // FR-014a: If points changed on a done task, update leaderboard
        if (pointsDelta != 0)
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

    // POST /api/tasks/{taskId}/complete
    private static async Task<IResult> CompleteTask(
        HttpContext ctx,
        Guid taskId,
        CleaningTaskService svc,
        IHubContext<CleaningHub> hub,
        LeaderboardService leaderboardSvc)
    {
        GetUserId(ctx);
        var result = await svc.CompleteAsync(taskId);
        var dto = ToDto(result.Task);
        var response = new CompleteTaskResponseDto(dto, result.PointsDelta, result.WarningNoAssignee);

        var eventName = result.Task.IsDone ? "TaskCompleted" : "TaskUncompleted";
        await hub.Clients.All.SendAsync(eventName, response);

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
public record CreateTaskRequest(string Title, int Points, string? DueDate = null, int? AssignedUserId = null);
public record UpdateTaskRequest(string Title, int Points, string? DueDate = null);
public record AssignTaskRequest(int? AssignedUserId);

public record TaskDto(
    Guid Id,
    string Title,
    int Points,
    bool IsDone,
    string? DueDate,
    DateTimeOffset? CompletedAt,
    int? AssignedUserId,
    string? AssignedUserName,
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
    public bool IsDone => Task.IsDone;
    public string? DueDate => Task.DueDate;
    public DateTimeOffset? CompletedAt => Task.CompletedAt;
    public int? AssignedUserId => Task.AssignedUserId;
    public string? AssignedUserName => Task.AssignedUserName;
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

public record CompleteTaskResponseDto(TaskDto Task, int PointsDelta, bool WarningNoAssignee);

public record CreateCommentRequest(string Text);
public record UpdateCommentRequest(string Text);
