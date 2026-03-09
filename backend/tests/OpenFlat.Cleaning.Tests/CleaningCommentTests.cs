using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using OpenFlat.Cleaning.Api.Data;
using OpenFlat.Cleaning.Api.Services;
using Xunit;

namespace OpenFlat.Cleaning.Tests;

public class CleaningCommentTests : IDisposable
{
    private readonly CleaningDbContext _db;
    private readonly CleaningTaskService _service;

    public CleaningCommentTests()
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

    private async Task<CleaningTask> CreateTestTask()
    {
        return await _service.CreateAsync("Test task", 10, 1);
    }

    // ── Add Comment ──────────────────────

    [Fact]
    public async Task AddCommentAsync_ValidInput_CreatesComment()
    {
        var task = await CreateTestTask();

        var comment = await _service.AddCommentAsync(task.Id, 1, "Great job!");

        comment.Should().NotBeNull();
        comment.Text.Should().Be("Great job!");
        comment.UserId.Should().Be(1);
        comment.TaskId.Should().Be(task.Id);
        comment.IsEdited.Should().BeFalse();
    }

    [Fact]
    public async Task AddCommentAsync_TrimsText()
    {
        var task = await CreateTestTask();
        var comment = await _service.AddCommentAsync(task.Id, 2, "  Hello  ");
        comment.Text.Should().Be("Hello");
    }

    [Fact]
    public async Task AddCommentAsync_EmptyText_ThrowsValidation()
    {
        var task = await CreateTestTask();
        var act = () => _service.AddCommentAsync(task.Id, 1, "  ");
        await act.Should().ThrowAsync<ValidationException>();
    }

    [Fact]
    public async Task AddCommentAsync_TextTooLong_ThrowsValidation()
    {
        var task = await CreateTestTask();
        var longText = new string('x', 2001);
        var act = () => _service.AddCommentAsync(task.Id, 1, longText);
        await act.Should().ThrowAsync<ValidationException>();
    }

    [Fact]
    public async Task AddCommentAsync_InvalidUser_ThrowsValidation()
    {
        var task = await CreateTestTask();
        var act = () => _service.AddCommentAsync(task.Id, 999, "Hello");
        await act.Should().ThrowAsync<ValidationException>();
    }

    [Fact]
    public async Task AddCommentAsync_NonExistentTask_ThrowsNotFound()
    {
        var act = () => _service.AddCommentAsync(Guid.NewGuid(), 1, "Hello");
        await act.Should().ThrowAsync<NotFoundException>();
    }

    // ── Update Comment ──────────────────────

    [Fact]
    public async Task UpdateCommentAsync_OwnComment_UpdatesSuccessfully()
    {
        var task = await CreateTestTask();
        var comment = await _service.AddCommentAsync(task.Id, 1, "Original");

        var updated = await _service.UpdateCommentAsync(task.Id, comment.Id, 1, "Edited");

        updated.Text.Should().Be("Edited");
        updated.IsEdited.Should().BeTrue();
    }

    [Fact]
    public async Task UpdateCommentAsync_OtherUsersComment_ThrowsForbidden()
    {
        var task = await CreateTestTask();
        var comment = await _service.AddCommentAsync(task.Id, 1, "Original");

        var act = () => _service.UpdateCommentAsync(task.Id, comment.Id, 2, "Hacked!");
        await act.Should().ThrowAsync<ForbiddenException>();
    }

    [Fact]
    public async Task UpdateCommentAsync_NonExistentComment_ThrowsNotFound()
    {
        var task = await CreateTestTask();
        var act = () => _service.UpdateCommentAsync(task.Id, Guid.NewGuid(), 1, "Test");
        await act.Should().ThrowAsync<NotFoundException>();
    }

    [Fact]
    public async Task UpdateCommentAsync_EmptyText_ThrowsValidation()
    {
        var task = await CreateTestTask();
        var comment = await _service.AddCommentAsync(task.Id, 1, "Original");
        var act = () => _service.UpdateCommentAsync(task.Id, comment.Id, 1, "");
        await act.Should().ThrowAsync<ValidationException>();
    }

    // ── Delete Comment ──────────────────────

    [Fact]
    public async Task DeleteCommentAsync_OwnComment_DeletesSuccessfully()
    {
        var task = await CreateTestTask();
        var comment = await _service.AddCommentAsync(task.Id, 1, "To delete");

        await _service.DeleteCommentAsync(task.Id, comment.Id, 1);

        var comments = await _db.Comments.Where(c => c.TaskId == task.Id).ToListAsync();
        comments.Should().BeEmpty();
    }

    [Fact]
    public async Task DeleteCommentAsync_OtherUsersComment_ThrowsForbidden()
    {
        var task = await CreateTestTask();
        var comment = await _service.AddCommentAsync(task.Id, 1, "Mine");

        var act = () => _service.DeleteCommentAsync(task.Id, comment.Id, 2);
        await act.Should().ThrowAsync<ForbiddenException>();
    }

    [Fact]
    public async Task DeleteCommentAsync_NonExistentComment_ThrowsNotFound()
    {
        var task = await CreateTestTask();
        var act = () => _service.DeleteCommentAsync(task.Id, Guid.NewGuid(), 1);
        await act.Should().ThrowAsync<NotFoundException>();
    }

    // ── Comment appears in task detail ──────────────────────

    [Fact]
    public async Task GetByIdAsync_IncludesComments()
    {
        var task = await CreateTestTask();
        await _service.AddCommentAsync(task.Id, 1, "Comment 1");
        await _service.AddCommentAsync(task.Id, 2, "Comment 2");

        var loaded = await _service.GetByIdAsync(task.Id);

        loaded.Should().NotBeNull();
        loaded!.Comments.Should().HaveCount(2);
    }
}
