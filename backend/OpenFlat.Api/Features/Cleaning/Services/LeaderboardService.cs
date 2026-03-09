using OpenFlat.Api.Shared;
using Microsoft.EntityFrameworkCore;
using OpenFlat.Api.Features.Cleaning.Data;
using OpenFlat.Shared.Users;

namespace OpenFlat.Api.Features.Cleaning.Services;

public class LeaderboardService(CleaningDbContext db)
{
    /// <summary>
    /// Calculates total points for each of the 5 predefined users.
    /// Points come from completion_log SUM(points_earned) grouped by completed_by_user_id.
    /// </summary>
    public async Task<List<LeaderboardEntry>> GetLeaderboardAsync(CancellationToken ct = default)
    {
        // v3: Query completion_log for accurate totals across rotations
        var pointsByUser = await db.CompletionLogs
            .GroupBy(cl => cl.CompletedByUserId)
            .Select(g => new { UserId = g.Key, TotalPoints = g.Sum(cl => cl.PointsEarned) })
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
