using OpenFlat.Cleaning.Api.Services;

namespace OpenFlat.Cleaning.Api.Endpoints;

public static class LeaderboardEndpoints
{
    public static void MapLeaderboardEndpoints(this WebApplication app)
    {
        app.MapGet("/api/leaderboard", GetLeaderboard);
    }

    private static async Task<IResult> GetLeaderboard(LeaderboardService svc)
    {
        var leaderboard = await svc.GetLeaderboardAsync();
        var dtos = leaderboard.Select(e => new LeaderboardEntryDto(
            e.UserId, e.UserName, e.Role, e.TotalPoints));
        return Results.Ok(dtos);
    }
}

public record LeaderboardEntryDto(int UserId, string UserName, string Role, int TotalPoints);
