using Microsoft.AspNetCore.SignalR;

namespace OpenFlat.Api.Features.Cleaning.Hubs;

/// <summary>
/// SignalR hub for real-time cleaning checklist updates.
/// Hub URL: /hubs/cleaning
///
/// Client methods (v3 — recurring tasks with rotation):
///   TaskCreated(TaskDto task)
///   TaskUpdated(TaskDto task)
///   TaskDeleted(Guid taskId)
///   TaskCompleted(CompleteTaskResponseDto response)  — one-way, no undo
///   TaskAssigned(TaskDto task)
///   CommentAdded(Guid taskId, CommentDto comment)
///   CommentUpdated(Guid taskId, CommentDto comment)
///   CommentDeleted(Guid taskId, Guid commentId)
///   LeaderboardUpdated(LeaderboardEntryDto[] leaderboard)
/// </summary>
public class CleaningHub : Hub
{
    // All communication is server-to-client via IHubContext<CleaningHub>.
    // No client-to-server methods needed for the current requirements.
}
