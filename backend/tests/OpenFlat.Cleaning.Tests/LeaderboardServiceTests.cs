using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using OpenFlat.Cleaning.Api.Data;
using OpenFlat.Cleaning.Api.Services;
using Xunit;

namespace OpenFlat.Cleaning.Tests;

public class LeaderboardServiceTests : IDisposable
{
    private readonly CleaningDbContext _db;
    private readonly CleaningTaskService _taskService;
    private readonly LeaderboardService _leaderboardService;

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

    [Fact]
    public async Task GetLeaderboardAsync_NoTasks_ReturnsAllUsersWithZeroPoints()
    {
        var leaderboard = await _leaderboardService.GetLeaderboardAsync();

        leaderboard.Should().HaveCount(5);
        leaderboard.Should().AllSatisfy(e => e.TotalPoints.Should().Be(0));
    }

    [Fact]
    public async Task GetLeaderboardAsync_DoneTask_CountsPoints()
    {
        // Create task, assign to user 1, move to Done
        var task = await _taskService.CreateAsync("Clean kitchen", 15, 1);
        await _taskService.AssignAsync(task.Id, 1);
        await _taskService.MoveAsync(task.Id, CleaningTaskStatus.Done, 0);

        var leaderboard = await _leaderboardService.GetLeaderboardAsync();

        var user1 = leaderboard.First(e => e.UserId == 1);
        user1.TotalPoints.Should().Be(15);
    }

    [Fact]
    public async Task GetLeaderboardAsync_TodoTask_DoesNotCountPoints()
    {
        // Create task but don't move to Done
        var task = await _taskService.CreateAsync("Clean bathroom", 20, 1);
        await _taskService.AssignAsync(task.Id, 2);

        var leaderboard = await _leaderboardService.GetLeaderboardAsync();

        var user2 = leaderboard.First(e => e.UserId == 2);
        user2.TotalPoints.Should().Be(0);
    }

    [Fact]
    public async Task GetLeaderboardAsync_SortedByPointsDescending()
    {
        // User 3 gets 20 points
        var t1 = await _taskService.CreateAsync("Task A", 20, 1);
        await _taskService.AssignAsync(t1.Id, 3);
        await _taskService.MoveAsync(t1.Id, CleaningTaskStatus.Done, 0);

        // User 1 gets 10 points
        var t2 = await _taskService.CreateAsync("Task B", 10, 1);
        await _taskService.AssignAsync(t2.Id, 1);
        await _taskService.MoveAsync(t2.Id, CleaningTaskStatus.Done, 1);

        var leaderboard = await _leaderboardService.GetLeaderboardAsync();

        leaderboard[0].UserId.Should().Be(3);
        leaderboard[0].TotalPoints.Should().Be(20);
        leaderboard[1].UserId.Should().Be(1);
        leaderboard[1].TotalPoints.Should().Be(10);
    }

    [Fact]
    public async Task GetLeaderboardAsync_MultipleTasks_SumsPoints()
    {
        var t1 = await _taskService.CreateAsync("Task 1", 10, 1);
        await _taskService.AssignAsync(t1.Id, 2);
        await _taskService.MoveAsync(t1.Id, CleaningTaskStatus.Done, 0);

        var t2 = await _taskService.CreateAsync("Task 2", 25, 1);
        await _taskService.AssignAsync(t2.Id, 2);
        await _taskService.MoveAsync(t2.Id, CleaningTaskStatus.Done, 1);

        var leaderboard = await _leaderboardService.GetLeaderboardAsync();

        var user2 = leaderboard.First(e => e.UserId == 2);
        user2.TotalPoints.Should().Be(35);
    }

    [Fact]
    public async Task GetLeaderboardAsync_UnassignedDoneTask_NotCounted()
    {
        // Create task, move to Done without assigning
        var task = await _taskService.CreateAsync("Unassigned", 10, 1);
        await _taskService.MoveAsync(task.Id, CleaningTaskStatus.Done, 0);

        var leaderboard = await _leaderboardService.GetLeaderboardAsync();

        leaderboard.Should().AllSatisfy(e => e.TotalPoints.Should().Be(0));
    }
}
