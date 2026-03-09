using Microsoft.EntityFrameworkCore;
using OpenFlat.Cleaning.Api.Data;
using OpenFlat.Shared.Users;

namespace OpenFlat.Cleaning.Api.Services;

public class LeaderboardService(CleaningDbContext db)
{
    /// <summary>
    /// Calculates total points for each of the 5 predefined users.
    /// Points come from tasks in the "Done" column with an assigned user (FR-006a, FR-006b).
    /// </summary>
    public async Task<List<LeaderboardEntry>> GetLeaderboardAsync(CancellationToken ct = default)
    {
        // Get points per user from Done tasks
        var pointsByUser = await db.Tasks
            .Where(t => t.IsDone && t.AssignedUserId != null)
            .GroupBy(t => t.AssignedUserId!.Value)
            .Select(g => new { UserId = g.Key, TotalPoints = g.Sum(t => t.Points) })
            .ToDictionaryAsync(x => x.UserId, x => x.TotalPoints, ct);

        // Build leaderboard for all 5 users
        var leaderboard = PredefinedUsers.All
            .Select(user => new LeaderboardEntry(
                user.Id,
                user.Name,
                user.Role,
                pointsByUser.GetValueOrDefault(user.Id, 0)))
            .OrderByDescending(e => e.TotalPoints)
            .ThenBy(e => e.UserId)
            .ToList();

        return leaderboard;
    }
}

public record LeaderboardEntry(int UserId, string UserName, string Role, int TotalPoints);
