using OpenFlat.Api.Shared;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using OpenFlat.Api.Features.Cleaning.Data;
using OpenFlat.Api.Features.Cleaning.Services;
using Xunit;

namespace OpenFlat.Api.Tests.Cleaning;

public class CleaningTaskServiceTests : IDisposable
{
    private readonly CleaningDbContext _db;
    private readonly CleaningTaskService _service;
    private static readonly DateOnly Today = DateOnly.FromDateTime(DateTime.UtcNow);

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

    /// <summary>Helper: create a simple recurring task with defaults.</summary>
    private Task<CleaningTask> CreateTask(
        string title = "Test Task",
        CleaningEffort effort = CleaningEffort.Normal,
        int? customPoints = null,
        int frequencyValue = 7,
        FrequencyUnit frequencyUnit = FrequencyUnit.Days,
        DateOnly? dueDate = null,
        int[]? rotationOrder = null,
        int createdByUserId = 1)
    {
        return _service.CreateAsync(
            title, effort, customPoints, frequencyValue, frequencyUnit,
            dueDate ?? Today, rotationOrder, createdByUserId);
    }

    // ── GetPresetPoints ──────────────────────

    [Theory]
    [InlineData(CleaningEffort.None, 0)]
    [InlineData(CleaningEffort.Normal, 1)]
    [InlineData(CleaningEffort.Big, 2)]
    [InlineData(CleaningEffort.Huge, 4)]
    public void GetPresetPoints_ReturnsCorrectPoints(CleaningEffort effort, int expected)
    {
        CleaningTaskService.GetPresetPoints(effort).Should().Be(expected);
    }

    [Fact]
    public void GetPresetPoints_Custom_ReturnsNull()
    {
        CleaningTaskService.GetPresetPoints(CleaningEffort.Custom).Should().BeNull();
    }

    // ── CreateAsync ──────────────────────

    [Fact]
    public async Task CreateAsync_NormalEffort_AutoSetsPoints()
    {
        var task = await CreateTask("Vacuum", effort: CleaningEffort.Normal);

        task.Should().NotBeNull();
        task.Title.Should().Be("Vacuum");
        task.Effort.Should().Be(CleaningEffort.Normal);
        task.Points.Should().Be(1);
        task.FrequencyValue.Should().Be(7);
        task.FrequencyUnit.Should().Be(FrequencyUnit.Days);
        task.CreatedByUserId.Should().Be(1);
    }

    [Fact]
    public async Task CreateAsync_BigEffort_AutoSets2Points()
    {
        var task = await CreateTask(effort: CleaningEffort.Big);
        task.Points.Should().Be(2);
    }

    [Fact]
    public async Task CreateAsync_HugeEffort_AutoSets4Points()
    {
        var task = await CreateTask(effort: CleaningEffort.Huge);
        task.Points.Should().Be(4);
    }

    [Fact]
    public async Task CreateAsync_NoneEffort_AutoSets0Points()
    {
        var task = await CreateTask(effort: CleaningEffort.None);
        task.Points.Should().Be(0);
    }

    [Fact]
    public async Task CreateAsync_CustomEffort_UsesProvidedPoints()
    {
        var task = await CreateTask(effort: CleaningEffort.Custom, customPoints: 42);
        task.Effort.Should().Be(CleaningEffort.Custom);
        task.Points.Should().Be(42);
    }

    [Fact]
    public async Task CreateAsync_CustomEffort_NullPoints_ThrowsValidation()
    {
        var act = () => CreateTask(effort: CleaningEffort.Custom, customPoints: null);
        await act.Should().ThrowAsync<ValidationException>();
    }

    [Fact]
    public async Task CreateAsync_WithRotation_SetsFirstUserAssigned()
    {
        var task = await CreateTask(rotationOrder: [1, 3, 2]);

        task.RotationOrder.Should().BeEquivalentTo([1, 3, 2]);
        task.RotationIndex.Should().Be(0);
        task.AssignedUserId.Should().Be(1); // rotationOrder[0]
    }

    [Fact]
    public async Task CreateAsync_EmptyRotation_NoAssignment()
    {
        var task = await CreateTask(rotationOrder: null);

        task.RotationOrder.Should().BeEmpty();
        task.RotationIndex.Should().Be(0);
        task.AssignedUserId.Should().BeNull();
    }

    [Fact]
    public async Task CreateAsync_WithFrequencyWeeks_SetsCorrectly()
    {
        var task = await CreateTask(frequencyValue: 2, frequencyUnit: FrequencyUnit.Weeks);

        task.FrequencyValue.Should().Be(2);
        task.FrequencyUnit.Should().Be(FrequencyUnit.Weeks);
    }

    [Fact]
    public async Task CreateAsync_DueDateIsSet()
    {
        var dueDate = Today.AddDays(3);
        var task = await CreateTask(dueDate: dueDate);

        task.DueDate.Should().Be(dueDate);
    }

    [Fact]
    public async Task CreateAsync_EmptyTitle_ThrowsValidation()
    {
        var act = () => CreateTask(title: "");
        await act.Should().ThrowAsync<ValidationException>();
    }

    [Fact]
    public async Task CreateAsync_NegativePoints_ThrowsValidation()
    {
        var act = () => CreateTask(effort: CleaningEffort.Custom, customPoints: -5);
        await act.Should().ThrowAsync<ValidationException>();
    }

    [Fact]
    public async Task CreateAsync_InvalidUser_ThrowsValidation()
    {
        var act = () => CreateTask(createdByUserId: 99);
        await act.Should().ThrowAsync<ValidationException>();
    }

    [Fact]
    public async Task CreateAsync_InvalidRotationUserId_ThrowsValidation()
    {
        var act = () => CreateTask(rotationOrder: [1, 99]);
        await act.Should().ThrowAsync<ValidationException>();
    }

    [Fact]
    public async Task CreateAsync_FrequencyLessThan1_ThrowsValidation()
    {
        var act = () => CreateTask(frequencyValue: 0);
        await act.Should().ThrowAsync<ValidationException>();
    }

    // ── List & GetById ──────────────────────

    [Fact]
    public async Task ListAsync_ReturnsAllTasks()
    {
        await CreateTask("Task A");
        await CreateTask("Task B");

        var tasks = await _service.ListAsync();

        tasks.Should().HaveCount(2);
    }

    [Fact]
    public async Task GetByIdAsync_ExistingTask_ReturnsTask()
    {
        var created = await CreateTask("Task A");
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
    public async Task GetByIdAsync_IncludesCompletionLogs()
    {
        var task = await CreateTask(rotationOrder: [1, 2]);
        await _service.CompleteAsync(task.Id, 1);

        var found = await _service.GetByIdAsync(task.Id);

        found!.CompletionLogs.Should().HaveCount(1);
    }

    // ── UpdateAsync ──────────────────────

    [Fact]
    public async Task UpdateAsync_ValidInput_UpdatesTask()
    {
        var task = await CreateTask("Old Title");
        var updated = await _service.UpdateAsync(
            task.Id, "New Title", CleaningEffort.Big, null, 3, FrequencyUnit.Days, null, null);

        updated.Title.Should().Be("New Title");
        updated.Effort.Should().Be(CleaningEffort.Big);
        updated.Points.Should().Be(2); // Big auto-maps to 2
        updated.FrequencyValue.Should().Be(3);
    }

    [Fact]
    public async Task UpdateAsync_ChangeRotation_ResetsIndex()
    {
        var task = await CreateTask(rotationOrder: [1, 2, 3]);
        await _service.CompleteAsync(task.Id, 1); // advance index to 1

        var updated = await _service.UpdateAsync(
            task.Id, task.Title, task.Effort, null, task.FrequencyValue, task.FrequencyUnit, null, [3, 2, 1]);

        updated.RotationIndex.Should().Be(0);
        updated.RotationOrder.Should().BeEquivalentTo([3, 2, 1]);
        updated.AssignedUserId.Should().Be(3); // rotationOrder[0]
    }

    [Fact]
    public async Task UpdateAsync_NullRotation_DoesNotResetIndex()
    {
        var task = await CreateTask(rotationOrder: [1, 2, 3]);
        await _service.CompleteAsync(task.Id, 1); // advance index to 1

        var updated = await _service.UpdateAsync(
            task.Id, "Updated", task.Effort, null, task.FrequencyValue, task.FrequencyUnit, null, null);

        updated.RotationIndex.Should().Be(1); // unchanged
    }

    [Fact]
    public async Task UpdateAsync_NonExisting_ThrowsNotFound()
    {
        var act = () => _service.UpdateAsync(
            Guid.NewGuid(), "X", CleaningEffort.Normal, null, 7, FrequencyUnit.Days, null, null);
        await act.Should().ThrowAsync<NotFoundException>();
    }

    [Fact]
    public async Task UpdateAsync_CustomEffortNullPoints_ThrowsValidation()
    {
        var task = await CreateTask();
        var act = () => _service.UpdateAsync(
            task.Id, "X", CleaningEffort.Custom, null, 7, FrequencyUnit.Days, null, null);
        await act.Should().ThrowAsync<ValidationException>();
    }

    // ── DeleteAsync ──────────────────────

    [Fact]
    public async Task DeleteAsync_ExistingTask_RemovesIt()
    {
        var task = await CreateTask("Delete me");
        var deleted = await _service.DeleteAsync(task.Id);

        deleted.Title.Should().Be("Delete me");
        (await _service.GetByIdAsync(task.Id)).Should().BeNull();
    }

    [Fact]
    public async Task DeleteAsync_NonExisting_ThrowsNotFound()
    {
        var act = () => _service.DeleteAsync(Guid.NewGuid());
        await act.Should().ThrowAsync<NotFoundException>();
    }

    // ── CompleteAsync — one-way completion ──────────────────────

    [Fact]
    public async Task CompleteAsync_OneWay_CreditsCompleterPoints()
    {
        var task = await CreateTask(effort: CleaningEffort.Big, rotationOrder: [1, 2]);

        var result = await _service.CompleteAsync(task.Id, 1);

        result.PointsEarned.Should().Be(2); // Big = 2 points
        result.CompletedByUserName.Should().Be("Alex"); // userId 1
    }

    [Fact]
    public async Task CompleteAsync_CreatesCompletionLog()
    {
        var task = await CreateTask(effort: CleaningEffort.Normal, rotationOrder: [1, 2]);

        await _service.CompleteAsync(task.Id, 1);

        var logs = await _db.CompletionLogs.Where(cl => cl.TaskId == task.Id).ToListAsync();
        logs.Should().HaveCount(1);
        logs[0].CompletedByUserId.Should().Be(1);
        logs[0].AssignedUserId.Should().Be(1);
        logs[0].PointsEarned.Should().Be(1);
        logs[0].CompletedAt.Should().BeCloseTo(DateTimeOffset.UtcNow, TimeSpan.FromSeconds(5));
    }

    [Fact]
    public async Task CompleteAsync_RecordsLastCompletedInfo()
    {
        var task = await CreateTask(rotationOrder: [1, 2]);

        var result = await _service.CompleteAsync(task.Id, 1);

        result.Task.LastCompletedAt.Should().NotBeNull();
        result.Task.LastCompletedByUserId.Should().Be(1);
    }

    [Fact]
    public async Task CompleteAsync_AdvancesRotation()
    {
        var task = await CreateTask(rotationOrder: [1, 3, 2]);

        var result = await _service.CompleteAsync(task.Id, 1);

        result.Task.RotationIndex.Should().Be(1);
        result.Task.AssignedUserId.Should().Be(3); // rotationOrder[1]
        result.NextAssignedUserName.Should().Be("Sam"); // userId 3
    }

    [Fact]
    public async Task CompleteAsync_RotationWrapsAround()
    {
        var task = await CreateTask(rotationOrder: [1, 2]);

        // Complete twice — should wrap around
        await _service.CompleteAsync(task.Id, 1); // index → 1, assigned=2
        var result = await _service.CompleteAsync(task.Id, 2); // index → 0, assigned=1

        result.Task.RotationIndex.Should().Be(0);
        result.Task.AssignedUserId.Should().Be(1); // wrapped back to start
    }

    [Fact]
    public async Task CompleteAsync_SinglePersonRotation_ReassignsSameUser()
    {
        var task = await CreateTask(rotationOrder: [3]);

        var result = await _service.CompleteAsync(task.Id, 3);

        result.Task.RotationIndex.Should().Be(0); // (0+1)%1 = 0
        result.Task.AssignedUserId.Should().Be(3); // same user
    }

    [Fact]
    public async Task CompleteAsync_EmptyRotation_NoAdvance()
    {
        var task = await CreateTask(rotationOrder: null);

        var result = await _service.CompleteAsync(task.Id, 1);

        result.Task.AssignedUserId.Should().BeNull(); // stays null
    }

    [Fact]
    public async Task CompleteAsync_WithNextUserId_OverridesRotation()
    {
        var task = await CreateTask(rotationOrder: [1, 2, 3]);

        // Normal rotation would go to index 1 (userId 2), but we override to userId 3
        var result = await _service.CompleteAsync(task.Id, 1, nextUserId: 3);

        result.Task.RotationIndex.Should().Be(2); // index of userId 3
        result.Task.AssignedUserId.Should().Be(3);
    }

    [Fact]
    public async Task CompleteAsync_WithNextUserId_NotInRotation_AdvancesNaturally()
    {
        var task = await CreateTask(rotationOrder: [1, 2]);

        // userId 4 is not in rotation — should advance naturally
        var result = await _service.CompleteAsync(task.Id, 1, nextUserId: 4);

        result.Task.RotationIndex.Should().Be(1); // natural advance
        result.Task.AssignedUserId.Should().Be(2);
    }

    [Fact]
    public async Task CompleteAsync_AdvancesDueDateByFrequencyDays()
    {
        var dueDate = Today.AddDays(-1); // overdue
        var task = await CreateTask(dueDate: dueDate, frequencyValue: 7, frequencyUnit: FrequencyUnit.Days);

        var result = await _service.CompleteAsync(task.Id, 1);

        // Advances from old due date, not today
        result.Task.DueDate.Should().Be(dueDate.AddDays(7));
    }

    [Fact]
    public async Task CompleteAsync_AdvancesDueDateByFrequencyWeeks()
    {
        var dueDate = Today;
        var task = await CreateTask(dueDate: dueDate, frequencyValue: 2, frequencyUnit: FrequencyUnit.Weeks);

        var result = await _service.CompleteAsync(task.Id, 1);

        result.Task.DueDate.Should().Be(dueDate.AddDays(14)); // 2 weeks = 14 days
    }

    [Fact]
    public async Task CompleteAsync_CompleterIsNotAssigned_StillCreditsCompleter()
    {
        // Rotation assigns userId 1, but userId 2 completes it
        var task = await CreateTask(effort: CleaningEffort.Big, rotationOrder: [1, 3]);

        var result = await _service.CompleteAsync(task.Id, 2); // not assigned user

        result.PointsEarned.Should().Be(2); // completer gets points (D5)
        result.CompletedByUserName.Should().Be("Jordan"); // userId 2

        var log = await _db.CompletionLogs.FirstAsync(cl => cl.TaskId == task.Id);
        log.CompletedByUserId.Should().Be(2);
        log.AssignedUserId.Should().Be(1); // was assigned to userId 1
    }

    [Fact]
    public async Task CompleteAsync_MultipleCompletions_CreateMultipleLogs()
    {
        var task = await CreateTask(effort: CleaningEffort.Normal, rotationOrder: [1, 2]);

        await _service.CompleteAsync(task.Id, 1);
        await _service.CompleteAsync(task.Id, 2);

        var logs = await _db.CompletionLogs.Where(cl => cl.TaskId == task.Id).ToListAsync();
        logs.Should().HaveCount(2);
    }

    [Fact]
    public async Task CompleteAsync_NonExisting_ThrowsNotFound()
    {
        var act = () => _service.CompleteAsync(Guid.NewGuid(), 1);
        await act.Should().ThrowAsync<NotFoundException>();
    }

    [Fact]
    public async Task CompleteAsync_InvalidCompleterId_ThrowsValidation()
    {
        var task = await CreateTask();
        var act = () => _service.CompleteAsync(task.Id, 99);
        await act.Should().ThrowAsync<ValidationException>();
    }

    [Fact]
    public async Task CompleteAsync_InvalidNextUserId_ThrowsValidation()
    {
        var task = await CreateTask(rotationOrder: [1, 2]);
        var act = () => _service.CompleteAsync(task.Id, 1, nextUserId: 99);
        await act.Should().ThrowAsync<ValidationException>();
    }

    // ── AssignAsync ──────────────────────

    [Fact]
    public async Task AssignAsync_ValidUser_AssignsTask()
    {
        var task = await CreateTask();
        var assigned = await _service.AssignAsync(task.Id, 3);

        assigned.AssignedUserId.Should().Be(3);
    }

    [Fact]
    public async Task AssignAsync_Null_UnassignsTask()
    {
        var task = await CreateTask(rotationOrder: [1, 2]);
        var unassigned = await _service.AssignAsync(task.Id, null);

        unassigned.AssignedUserId.Should().BeNull();
    }

    [Fact]
    public async Task AssignAsync_InvalidUser_ThrowsValidation()
    {
        var task = await CreateTask();
        var act = () => _service.AssignAsync(task.Id, 99);
        await act.Should().ThrowAsync<ValidationException>();
    }

    [Fact]
    public async Task AssignAsync_NonExisting_ThrowsNotFound()
    {
        var act = () => _service.AssignAsync(Guid.NewGuid(), 1);
        await act.Should().ThrowAsync<NotFoundException>();
    }
}
