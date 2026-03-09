using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using OpenFlat.Shopping.Api.Data;
using OpenFlat.Shopping.Api.Services;
using Xunit;

namespace OpenFlat.Shopping.Tests;

public class ShoppingItemServiceTests : IDisposable
{
    private readonly ShoppingDbContext _db;
    private readonly ShoppingItemService _service;

    public ShoppingItemServiceTests()
    {
        var options = new DbContextOptionsBuilder<ShoppingDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;
        _db = new ShoppingDbContext(options);
        _service = new ShoppingItemService(_db);
    }

    public void Dispose()
    {
        _db.Dispose();
    }

    // ── Create ──────────────────────

    [Fact]
    public async Task CreateAsync_ValidInput_CreatesItem()
    {
        var item = await _service.CreateAsync("Milk", 2, 1);

        item.Should().NotBeNull();
        item.Name.Should().Be("Milk");
        item.Quantity.Should().Be(2);
        item.AddedByUserId.Should().Be(1);
        item.IsBought.Should().BeFalse();
    }

    [Fact]
    public async Task CreateAsync_EmptyName_ThrowsValidation()
    {
        var act = () => _service.CreateAsync("  ", 1, 1);
        await act.Should().ThrowAsync<ValidationException>();
    }

    [Fact]
    public async Task CreateAsync_ZeroQuantity_ThrowsValidation()
    {
        var act = () => _service.CreateAsync("Milk", 0, 1);
        await act.Should().ThrowAsync<ValidationException>();
    }

    [Fact]
    public async Task CreateAsync_InvalidUser_ThrowsValidation()
    {
        var act = () => _service.CreateAsync("Milk", 1, 999);
        await act.Should().ThrowAsync<ValidationException>();
    }

    // ── List ──────────────────────

    [Fact]
    public async Task ListAsync_SplitsActiveAndBought()
    {
        var item1 = await _service.CreateAsync("Milk", 1, 1);
        var item2 = await _service.CreateAsync("Bread", 1, 1);
        await _service.BuyAsync(item2.Id, 2);

        var result = await _service.ListAsync();

        result.Active.Should().HaveCount(1);
        result.Active[0].Name.Should().Be("Milk");
        result.RecentlyBought.Should().HaveCount(1);
        result.RecentlyBought[0].Name.Should().Be("Bread");
    }

    // ── Update ──────────────────────

    [Fact]
    public async Task UpdateAsync_ValidInput_UpdatesItem()
    {
        var item = await _service.CreateAsync("Milk", 1, 1);
        var updated = await _service.UpdateAsync(item.Id, "Oat Milk", 3);

        updated.Name.Should().Be("Oat Milk");
        updated.Quantity.Should().Be(3);
    }

    [Fact]
    public async Task UpdateAsync_BoughtItem_ThrowsConflict()
    {
        var item = await _service.CreateAsync("Milk", 1, 1);
        await _service.BuyAsync(item.Id, 2);

        var act = () => _service.UpdateAsync(item.Id, "Oat Milk", 1);
        await act.Should().ThrowAsync<ConflictException>();
    }

    [Fact]
    public async Task UpdateAsync_NonExistent_ThrowsNotFound()
    {
        var act = () => _service.UpdateAsync(Guid.NewGuid(), "Milk", 1);
        await act.Should().ThrowAsync<NotFoundException>();
    }

    // ── Delete ──────────────────────

    [Fact]
    public async Task DeleteAsync_RemovesItem()
    {
        var item = await _service.CreateAsync("Milk", 1, 1);
        await _service.DeleteAsync(item.Id);

        var result = await _service.ListAsync();
        result.Active.Should().BeEmpty();
    }

    [Fact]
    public async Task DeleteAsync_NonExistent_ThrowsNotFound()
    {
        var act = () => _service.DeleteAsync(Guid.NewGuid());
        await act.Should().ThrowAsync<NotFoundException>();
    }

    // ── Buy ──────────────────────

    [Fact]
    public async Task BuyAsync_SetsIsBoughtAndTimestamp()
    {
        var item = await _service.CreateAsync("Milk", 1, 1);
        var bought = await _service.BuyAsync(item.Id, 2);

        bought.IsBought.Should().BeTrue();
        bought.BoughtAt.Should().NotBeNull();
        bought.BoughtByUserId.Should().Be(2);
    }

    [Fact]
    public async Task BuyAsync_AlreadyBought_ThrowsConflict()
    {
        var item = await _service.CreateAsync("Milk", 1, 1);
        await _service.BuyAsync(item.Id, 2);

        var act = () => _service.BuyAsync(item.Id, 1);
        await act.Should().ThrowAsync<ConflictException>();
    }

    // ── Undo Buy ──────────────────────

    [Fact]
    public async Task UndoBuyAsync_MovesBackToActive()
    {
        var item = await _service.CreateAsync("Milk", 1, 1);
        await _service.BuyAsync(item.Id, 2);
        var undone = await _service.UndoBuyAsync(item.Id);

        undone.IsBought.Should().BeFalse();
        undone.BoughtAt.Should().BeNull();
        undone.BoughtByUserId.Should().BeNull();
    }

    [Fact]
    public async Task UndoBuyAsync_NotBought_ThrowsConflict()
    {
        var item = await _service.CreateAsync("Milk", 1, 1);

        var act = () => _service.UndoBuyAsync(item.Id);
        await act.Should().ThrowAsync<ConflictException>();
    }

    // ── Auto-Clear ──────────────────────

    [Fact]
    public async Task AutoClearExpiredAsync_RemovesOldBoughtItems()
    {
        var item = await _service.CreateAsync("Milk", 1, 1);
        await _service.BuyAsync(item.Id, 2);

        // Manually set BoughtAt to 8 days ago
        var dbItem = await _db.Items.FindAsync(item.Id);
        dbItem!.BoughtAt = DateTimeOffset.UtcNow.AddDays(-8);
        await _db.SaveChangesAsync();

        var cleared = await _service.AutoClearExpiredAsync();
        cleared.Should().Be(1);

        var result = await _service.ListAsync();
        result.Active.Should().BeEmpty();
        result.RecentlyBought.Should().BeEmpty();
    }

    [Fact]
    public async Task AutoClearExpiredAsync_KeepsRecentBoughtItems()
    {
        var item = await _service.CreateAsync("Milk", 1, 1);
        await _service.BuyAsync(item.Id, 2);

        var cleared = await _service.AutoClearExpiredAsync();
        cleared.Should().Be(0);

        var result = await _service.ListAsync();
        result.RecentlyBought.Should().HaveCount(1);
    }

    // ── Comments ──────────────────────

    [Fact]
    public async Task AddCommentAsync_ValidInput_AddsComment()
    {
        var item = await _service.CreateAsync("Milk", 1, 1);
        var comment = await _service.AddCommentAsync(item.Id, 2, "Get whole milk");

        comment.Should().NotBeNull();
        comment.Text.Should().Be("Get whole milk");
        comment.UserId.Should().Be(2);
        comment.IsEdited.Should().BeFalse();
    }

    [Fact]
    public async Task AddCommentAsync_EmptyText_ThrowsValidation()
    {
        var item = await _service.CreateAsync("Milk", 1, 1);
        var act = () => _service.AddCommentAsync(item.Id, 1, "  ");
        await act.Should().ThrowAsync<ValidationException>();
    }

    [Fact]
    public async Task UpdateCommentAsync_ByAuthor_UpdatesAndSetsEdited()
    {
        var item = await _service.CreateAsync("Milk", 1, 1);
        var comment = await _service.AddCommentAsync(item.Id, 2, "Get whole milk");

        var updated = await _service.UpdateCommentAsync(item.Id, comment.Id, 2, "Get 2% milk");

        updated.Text.Should().Be("Get 2% milk");
        updated.IsEdited.Should().BeTrue();
    }

    [Fact]
    public async Task UpdateCommentAsync_ByOtherUser_ThrowsForbidden()
    {
        var item = await _service.CreateAsync("Milk", 1, 1);
        var comment = await _service.AddCommentAsync(item.Id, 2, "Get whole milk");

        var act = () => _service.UpdateCommentAsync(item.Id, comment.Id, 1, "Changed");
        await act.Should().ThrowAsync<ForbiddenException>();
    }

    [Fact]
    public async Task DeleteCommentAsync_ByAuthor_RemovesComment()
    {
        var item = await _service.CreateAsync("Milk", 1, 1);
        var comment = await _service.AddCommentAsync(item.Id, 2, "Note");

        await _service.DeleteCommentAsync(item.Id, comment.Id, 2);

        var loaded = await _service.GetByIdAsync(item.Id);
        loaded!.Comments.Should().BeEmpty();
    }

    [Fact]
    public async Task DeleteCommentAsync_ByOtherUser_ThrowsForbidden()
    {
        var item = await _service.CreateAsync("Milk", 1, 1);
        var comment = await _service.AddCommentAsync(item.Id, 2, "Note");

        var act = () => _service.DeleteCommentAsync(item.Id, comment.Id, 1);
        await act.Should().ThrowAsync<ForbiddenException>();
    }
}
