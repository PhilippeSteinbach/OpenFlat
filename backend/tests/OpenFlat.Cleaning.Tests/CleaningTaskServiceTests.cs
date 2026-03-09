using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using OpenFlat.Cleaning.Api.Data;
using OpenFlat.Cleaning.Api.Services;
using Xunit;

namespace OpenFlat.Cleaning.Tests;

public class CleaningTaskServiceTests : IDisposable
{
    private readonly CleaningDbContext _db;
    private readonly CleaningTaskService _service;

    public CleaningTaskServiceTests()
    {
        var options = new DbContextOptionsBuilder<CleaningDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;
        _db = new CleaningDbContext(options);
        _service = new CleaningTaskService(_db);
    }

    public void Dispose()
    {
        _db.Dispose();
    }

    [Fact]
    public async Task CreateAsync_ValidInput_CreatesTask()
    {
        var task = await _service.CreateAsync("Vacuum living room", 10, 1);

        task.Should().NotBeNull();
        task.Title.Should().Be("Vacuum living room");
        task.Points.Should().Be(10);
        task.Status.Should().Be(CleaningTaskStatus.Todo);
        task.CreatedByUserId.Should().Be(1);
    }

    [Fact]
    public async Task CreateAsync_EmptyTitle_ThrowsValidation()
    {
        var act = () => _service.CreateAsync("", 10, 1);
        await act.Should().ThrowAsync<ValidationException>();
    }

    [Fact]
    public async Task CreateAsync_NegativePoints_ThrowsValidation()
    {
        var act = () => _service.CreateAsync("Test", -5, 1);
        await act.Should().ThrowAsync<ValidationException>();
    }

    [Fact]
    public async Task CreateAsync_InvalidUser_ThrowsValidation()
    {
        var act = () => _service.CreateAsync("Test", 10, 99);
        await act.Should().ThrowAsync<ValidationException>();
    }

    [Fact]
    public async Task ListAsync_ReturnsAllTasks()
    {
        await _service.CreateAsync("Task A", 5, 1);
        await _service.CreateAsync("Task B", 10, 2);

        var tasks = await _service.ListAsync();

        tasks.Should().HaveCount(2);
    }

    [Fact]
    public async Task GetByIdAsync_ExistingTask_ReturnsTask()
    {
        var created = await _service.CreateAsync("Task A", 5, 1);
        var found = await _service.GetByIdAsync(created.Id);

        found.Should().NotBeNull();
        found!.Title.Should().Be("Task A");
    }

    [Fact]
    public async Task GetByIdAsync_NonExisting_ReturnsNull()
    {
        var found = await _service.GetByIdAsync(Guid.NewGuid());
        found.Should().BeNull();
    }

    [Fact]
    public async Task UpdateAsync_ValidInput_UpdatesTask()
    {
        var task = await _service.CreateAsync("Old Title", 5, 1);
        var updated = await _service.UpdateAsync(task.Id, "New Title", 20);

        updated.Title.Should().Be("New Title");
        updated.Points.Should().Be(20);
    }

    [Fact]
    public async Task UpdateAsync_NonExisting_ThrowsNotFound()
    {
        var act = () => _service.UpdateAsync(Guid.NewGuid(), "X", 10);
        await act.Should().ThrowAsync<NotFoundException>();
    }

    [Fact]
    public async Task DeleteAsync_ExistingTask_RemovesIt()
    {
        var task = await _service.CreateAsync("Delete me", 10, 1);
        var (deleted, delta) = await _service.DeleteAsync(task.Id);

        deleted.Title.Should().Be("Delete me");
        delta.Should().Be(0); // task was in Todo, no points deducted
        (await _service.GetByIdAsync(task.Id)).Should().BeNull();
    }

    [Fact]
    public async Task DeleteAsync_DoneTaskWithAssignee_DeductsPoints()
    {
        var task = await _service.CreateAsync("Done task", 15, 1);
        await _service.AssignAsync(task.Id, 2);
        await _service.MoveAsync(task.Id, CleaningTaskStatus.Done, 0);

        var (_, delta) = await _service.DeleteAsync(task.Id);

        delta.Should().Be(-15); // FR-014b
    }

    [Fact]
    public async Task DeleteAsync_NonExisting_ThrowsNotFound()
    {
        var act = () => _service.DeleteAsync(Guid.NewGuid());
        await act.Should().ThrowAsync<NotFoundException>();
    }

    [Fact]
    public async Task MoveAsync_TodoToDone_CreditsPoints()
    {
        var task = await _service.CreateAsync("Task", 10, 1);
        await _service.AssignAsync(task.Id, 1);

        var result = await _service.MoveAsync(task.Id, CleaningTaskStatus.Done, 0);

        result.PointsDelta.Should().Be(10); // FR-012
        result.Task.Status.Should().Be(CleaningTaskStatus.Done);
        result.WarningNoAssignee.Should().BeFalse();
    }

    [Fact]
    public async Task MoveAsync_TodoToDone_NoAssignee_Warns()
    {
        var task = await _service.CreateAsync("Task", 10, 1);

        var result = await _service.MoveAsync(task.Id, CleaningTaskStatus.Done, 0);

        result.PointsDelta.Should().Be(0);
        result.WarningNoAssignee.Should().BeTrue(); // FR-015
    }

    [Fact]
    public async Task MoveAsync_DoneToTodo_DeductsPoints()
    {
        var task = await _service.CreateAsync("Task", 10, 1);
        await _service.AssignAsync(task.Id, 1);
        await _service.MoveAsync(task.Id, CleaningTaskStatus.Done, 0);

        var result = await _service.MoveAsync(task.Id, CleaningTaskStatus.Todo, 0);

        result.PointsDelta.Should().Be(-10); // FR-013
        result.Task.Status.Should().Be(CleaningTaskStatus.Todo);
    }

    [Fact]
    public async Task MoveAsync_NonExisting_ThrowsNotFound()
    {
        var act = () => _service.MoveAsync(Guid.NewGuid(), CleaningTaskStatus.InProgress, 0);
        await act.Should().ThrowAsync<NotFoundException>();
    }

    [Fact]
    public async Task AssignAsync_ValidUser_AssignsTask()
    {
        var task = await _service.CreateAsync("Task", 10, 1);
        var assigned = await _service.AssignAsync(task.Id, 3);

        assigned.AssignedUserId.Should().Be(3);
    }

    [Fact]
    public async Task AssignAsync_Null_UnassignsTask()
    {
        var task = await _service.CreateAsync("Task", 10, 1);
        await _service.AssignAsync(task.Id, 2);
        var unassigned = await _service.AssignAsync(task.Id, null);

        unassigned.AssignedUserId.Should().BeNull();
    }

    [Fact]
    public async Task AssignAsync_InvalidUser_ThrowsValidation()
    {
        var task = await _service.CreateAsync("Task", 10, 1);
        var act = () => _service.AssignAsync(task.Id, 99);
        await act.Should().ThrowAsync<ValidationException>();
    }

    [Fact]
    public async Task AssignAsync_NonExisting_ThrowsNotFound()
    {
        var act = () => _service.AssignAsync(Guid.NewGuid(), 1);
        await act.Should().ThrowAsync<NotFoundException>();
    }

    [Fact]
    public async Task CreateAsync_IncrementsSortOrder()
    {
        var t1 = await _service.CreateAsync("First", 5, 1);
        var t2 = await _service.CreateAsync("Second", 5, 1);

        t2.SortOrder.Should().BeGreaterThan(t1.SortOrder);
    }
}
