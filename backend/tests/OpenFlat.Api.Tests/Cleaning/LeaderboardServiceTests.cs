using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using OpenFlat.Api.Features.Cleaning.Data;
using OpenFlat.Api.Features.Cleaning.Services;
using Xunit;

namespace OpenFlat.Api.Tests.Cleaning;

public class LeaderboardServiceTests : IDisposable
{
    private readonly CleaningDbContext _db;
    private readonly CleaningTaskService _taskService;
    private readonly LeaderboardService _leaderboardService;
    private static readonly DateOnly Today = DateOnly.FromDateTime(DateTime.UtcNow);

    public LeaderboardServiceTests()
    {
        var options = new DbContextOptionsBuilder<CleaningDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;
        _db = new CleaningDbContext(options);
        _taskService = new CleaningTaskService(_db);
        _leaderboardService = new LeaderboardService(_db);
    }

    public void Dispose()
    {
        _db.Dispose();
    }

    /// <summary>Helper: create a simple task with optional rotation.</summary>
    private Task<CleaningTask> CreateTask(
        CleaningEffort effort = CleaningEffort.Normal,
        int[]? rotationOrder = null)
    {
        return _taskService.CreateAsync(
            "Task", effort, null, 7, FrequencyUnit.Days, Today, rotationOrder, 1);
    }

    [Fact]
    public async Task GetLeaderboardAsync_NoCompletions_ReturnsAllUsersWithZeroPoints()
    {
        var leaderboard = await _leaderboardService.GetLeaderboardAsync();

        leaderboard.Should().HaveCount(5);
        leaderboard.Should().AllSatisfy(e => e.TotalPoints.Should().Be(0));
    }

    [Fact]
    public async Task GetLeaderboardAsync_CompletedTask_CreditsCompleter()
    {
        // v3: points go to completer (userId 1), not assignee
        var task = await CreateTask(CleaningEffort.Big, [1, 2]); // Big = 2 pts
        await _taskService.CompleteAsync(task.Id, 1);

        var leaderboard = await _leaderboardService.GetLeaderboardAsync();

        var user1 = leaderboard.First(e => e.UserId == 1);
        user1.TotalPoints.Should().Be(2);
    }

    [Fact]
    public async Task GetLeaderboardAsync_UncompletedTask_DoesNotCountPoints()
    {
        // Task exists with rotation but is never completed
        await CreateTask(CleaningEffort.Big, [2]);

        var leaderboard = await _leaderboardService.GetLeaderboardAsync();

        var user2 = leaderboard.First(e => e.UserId == 2);
        user2.TotalPoints.Should().Be(0);
    }

    [Fact]
    public async Task GetLeaderboardAsync_SortedByPointsDescending()
    {
        // User 3 completes Big task (2 pts)
        var t1 = await CreateTask(CleaningEffort.Big);
        await _taskService.CompleteAsync(t1.Id, 3);

        // User 1 completes Normal task (1 pt)
        var t2 = await CreateTask(CleaningEffort.Normal);
        await _taskService.CompleteAsync(t2.Id, 1);

        var leaderboard = await _leaderboardService.GetLeaderboardAsync();

        leaderboard[0].UserId.Should().Be(3);
        leaderboard[0].TotalPoints.Should().Be(2);
        leaderboard[1].UserId.Should().Be(1);
        leaderboard[1].TotalPoints.Should().Be(1);
    }

    [Fact]
    public async Task GetLeaderboardAsync_MultipleCompletions_SumsPoints()
    {
        // User 2 completes the same recurring task twice (each completion = 1 pt)
        var task = await CreateTask(CleaningEffort.Normal, [2]);
        await _taskService.CompleteAsync(task.Id, 2); // 1 pt
        await _taskService.CompleteAsync(task.Id, 2); // 1 pt

        var leaderboard = await _leaderboardService.GetLeaderboardAsync();

        var user2 = leaderboard.First(e => e.UserId == 2);
        user2.TotalPoints.Should().Be(2);
    }

    [Fact]
    public async Task GetLeaderboardAsync_DifferentCompleters_GetOwnPoints()
    {
        // Same task completed by different users through rotation
        var task = await CreateTask(CleaningEffort.Big, [1, 3]);
        await _taskService.CompleteAsync(task.Id, 1); // user 1 gets 2 pts
        await _taskService.CompleteAsync(task.Id, 3); // user 3 gets 2 pts

        var leaderboard = await _leaderboardService.GetLeaderboardAsync();

        leaderboard.First(e => e.UserId == 1).TotalPoints.Should().Be(2);
        leaderboard.First(e => e.UserId == 3).TotalPoints.Should().Be(2);
    }

    [Fact]
    public async Task GetLeaderboardAsync_CompleterIsNotAssigned_StillGetsPoints()
    {
        // v3 D5: completer-gets-points, not assignee
        var task = await CreateTask(CleaningEffort.Big, [1]); // assigned to user 1
        await _taskService.CompleteAsync(task.Id, 2); // user 2 completes it

        var leaderboard = await _leaderboardService.GetLeaderboardAsync();

        leaderboard.First(e => e.UserId == 2).TotalPoints.Should().Be(2); // completer
        leaderboard.First(e => e.UserId == 1).TotalPoints.Should().Be(0); // assignee gets nothing
    }

    [Fact]
    public async Task GetLeaderboardAsync_AllUsersReturned_EvenWithZeroPoints()
    {
        // Only user 1 has completions
        var task = await CreateTask(CleaningEffort.Huge); // 4 pts
        await _taskService.CompleteAsync(task.Id, 1);

        var leaderboard = await _leaderboardService.GetLeaderboardAsync();

        leaderboard.Should().HaveCount(5);
        leaderboard.First(e => e.UserId == 1).TotalPoints.Should().Be(4);
        leaderboard.Where(e => e.UserId != 1).Should().AllSatisfy(e => e.TotalPoints.Should().Be(0));
    }
}
