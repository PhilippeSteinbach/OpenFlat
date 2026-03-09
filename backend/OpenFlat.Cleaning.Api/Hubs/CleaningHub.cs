using Microsoft.AspNetCore.SignalR;

namespace OpenFlat.Cleaning.Api.Hubs;

/// <summary>
/// SignalR hub for real-time cleaning board updates.
/// Hub URL: /hubs/cleaning
///
/// Client methods:
///   TaskCreated(TaskDto task)
///   TaskUpdated(TaskDto task)
///   TaskDeleted(Guid taskId)
///   TaskMoved(MoveTaskResponseDto response)
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
