using OpenFlat.Api.Shared;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using OpenFlat.Api.Features.Finance.Data;
using OpenFlat.Api.Features.Finance.Services;
using Xunit;

namespace OpenFlat.Api.Tests.Finance;

public class ExpenseServiceTests : IDisposable
{
    private readonly FinanceDbContext _db;
    private readonly ExpenseService _service;

    public ExpenseServiceTests()
    {
        var options = new DbContextOptionsBuilder<FinanceDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;
        _db = new FinanceDbContext(options);
        _service = new ExpenseService(_db);
    }

    public void Dispose()
    {
        _db.Dispose();
    }

    // ── Create ──────────────────────

    [Fact]
    public async Task CreateAsync_ValidInput_CreatesExpense()
    {
        var expense = await _service.CreateAsync(12.50, "Groceries", 1);

        expense.Should().NotBeNull();
        expense.AmountCents.Should().Be(1250);
        expense.Description.Should().Be("Groceries");
        expense.LoggedByUserId.Should().Be(1);
        expense.CreatedAt.Should().BeCloseTo(DateTimeOffset.UtcNow, TimeSpan.FromSeconds(5));
    }

    [Fact]
    public async Task CreateAsync_TrimsDescription()
    {
        var expense = await _service.CreateAsync(5.00, "  Coffee  ", 2);
        expense.Description.Should().Be("Coffee");
    }

    [Fact]
    public async Task CreateAsync_StoresAmountAsCents()
    {
        var expense = await _service.CreateAsync(99.99, "Big purchase", 1);
        expense.AmountCents.Should().Be(9999);
    }

    [Fact]
    public async Task CreateAsync_ZeroAmount_ThrowsValidation()
    {
        var act = () => _service.CreateAsync(0, "Test", 1);
        await act.Should().ThrowAsync<ValidationException>();
    }

    [Fact]
    public async Task CreateAsync_NegativeAmount_ThrowsValidation()
    {
        var act = () => _service.CreateAsync(-5.00, "Test", 1);
        await act.Should().ThrowAsync<ValidationException>();
    }

    [Fact]
    public async Task CreateAsync_EmptyDescription_ThrowsValidation()
    {
        var act = () => _service.CreateAsync(10.00, "  ", 1);
        await act.Should().ThrowAsync<ValidationException>();
    }

    [Fact]
    public async Task CreateAsync_DescriptionTooLong_ThrowsValidation()
    {
        var longDesc = new string('x', 501);
        var act = () => _service.CreateAsync(10.00, longDesc, 1);
        await act.Should().ThrowAsync<ValidationException>();
    }

    [Fact]
    public async Task CreateAsync_InvalidUser_ThrowsValidation()
    {
        var act = () => _service.CreateAsync(10.00, "Test", 999);
        await act.Should().ThrowAsync<ValidationException>();
    }

    // ── List ──────────────────────

    [Fact]
    public async Task ListAsync_ReturnsReverseChronological()
    {
        await _service.CreateAsync(5.00, "First", 1);
        await _service.CreateAsync(10.00, "Second", 2);
        await _service.CreateAsync(15.00, "Third", 3);

        var list = await _service.ListAsync();

        list.Should().HaveCount(3);
        list[0].Description.Should().Be("Third");
        list[1].Description.Should().Be("Second");
        list[2].Description.Should().Be("First");
    }

    [Fact]
    public async Task ListAsync_EmptyDatabase_ReturnsEmptyList()
    {
        var list = await _service.ListAsync();
        list.Should().BeEmpty();
    }

    // ── GetById ──────────────────────

    [Fact]
    public async Task GetByIdAsync_ExistingExpense_ReturnsExpense()
    {
        var created = await _service.CreateAsync(10.00, "Test", 1);
        var found = await _service.GetByIdAsync(created.Id);
        found.Should().NotBeNull();
        found!.Id.Should().Be(created.Id);
    }

    [Fact]
    public async Task GetByIdAsync_NonExisting_ReturnsNull()
    {
        var found = await _service.GetByIdAsync(Guid.NewGuid());
        found.Should().BeNull();
    }

    // ── Update ──────────────────────

    [Fact]
    public async Task UpdateAsync_OwnExpense_UpdatesSuccessfully()
    {
        var created = await _service.CreateAsync(10.00, "Old desc", 1);

        var updated = await _service.UpdateAsync(created.Id, 25.00, "New desc", 1);

        updated.AmountCents.Should().Be(2500);
        updated.Description.Should().Be("New desc");
        updated.UpdatedAt.Should().BeOnOrAfter(updated.CreatedAt);
    }

    [Fact]
    public async Task UpdateAsync_OtherUsersExpense_ThrowsForbidden()
    {
        var created = await _service.CreateAsync(10.00, "Test", 1);

        var act = () => _service.UpdateAsync(created.Id, 20.00, "Changed", 2);
        await act.Should().ThrowAsync<ForbiddenException>();
    }

    [Fact]
    public async Task UpdateAsync_NonExistingExpense_ThrowsNotFound()
    {
        var act = () => _service.UpdateAsync(Guid.NewGuid(), 20.00, "Test", 1);
        await act.Should().ThrowAsync<NotFoundException>();
    }

    [Fact]
    public async Task UpdateAsync_InvalidAmount_ThrowsValidation()
    {
        var created = await _service.CreateAsync(10.00, "Test", 1);
        var act = () => _service.UpdateAsync(created.Id, 0, "Test", 1);
        await act.Should().ThrowAsync<ValidationException>();
    }

    // ── Delete ──────────────────────

    [Fact]
    public async Task DeleteAsync_OwnExpense_DeletesSuccessfully()
    {
        var created = await _service.CreateAsync(10.00, "Test", 1);

        await _service.DeleteAsync(created.Id, 1);

        var found = await _service.GetByIdAsync(created.Id);
        found.Should().BeNull();
    }

    [Fact]
    public async Task DeleteAsync_OtherUsersExpense_ThrowsForbidden()
    {
        var created = await _service.CreateAsync(10.00, "Test", 1);

        var act = () => _service.DeleteAsync(created.Id, 2);
        await act.Should().ThrowAsync<ForbiddenException>();
    }

    [Fact]
    public async Task DeleteAsync_NonExistingExpense_ThrowsNotFound()
    {
        var act = () => _service.DeleteAsync(Guid.NewGuid(), 1);
        await act.Should().ThrowAsync<NotFoundException>();
    }
}
