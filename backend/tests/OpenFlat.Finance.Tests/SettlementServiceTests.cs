using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using OpenFlat.Finance.Api.Data;
using OpenFlat.Finance.Api.Services;
using Xunit;

namespace OpenFlat.Finance.Tests;

public class SettlementServiceTests : IDisposable
{
    private readonly FinanceDbContext _db;
    private readonly SettlementService _settlementService;
    private readonly ExpenseService _expenseService;

    public SettlementServiceTests()
    {
        var options = new DbContextOptionsBuilder<FinanceDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;
        _db = new FinanceDbContext(options);
        _settlementService = new SettlementService(_db);
        _expenseService = new ExpenseService(_db);
    }

    public void Dispose()
    {
        _db.Dispose();
    }

    // ── No Expenses ──────────────────────

    [Fact]
    public async Task CalculateAsync_NoExpenses_IsSettled()
    {
        var result = await _settlementService.CalculateAsync();

        result.IsSettled.Should().BeTrue();
        result.Transactions.Should().BeEmpty();
        result.TotalExpenses.Should().Be(0);
        result.FairShare.Should().Be(0);
        result.Balances.Should().HaveCount(5);
        result.Balances.All(b => b.NetBalanceEur == 0).Should().BeTrue();
    }

    // ── Even Split ──────────────────────

    [Fact]
    public async Task CalculateAsync_EvenSplit_AllPaidFairShare()
    {
        // Each user pays exactly €10 → no transfers needed
        for (var userId = 1; userId <= 5; userId++)
            await _expenseService.CreateAsync(10.00, $"Expense by user {userId}", userId);

        var result = await _settlementService.CalculateAsync();

        result.IsSettled.Should().BeTrue();
        result.Transactions.Should().BeEmpty();
        result.TotalExpenses.Should().Be(50.00);
        result.FairShare.Should().Be(10.00);
    }

    // ── Single Payer ──────────────────────

    [Fact]
    public async Task CalculateAsync_SinglePayer_4TransactionsToThatUser()
    {
        // Only user 1 pays €50
        await _expenseService.CreateAsync(50.00, "All expenses", 1);

        var result = await _settlementService.CalculateAsync();

        result.IsSettled.Should().BeFalse();
        result.TotalExpenses.Should().Be(50.00);
        result.FairShare.Should().Be(10.00);

        // 4 transactions: each of users 2-5 owes user 1 €10
        result.Transactions.Should().HaveCount(4);
        result.Transactions.All(t => t.ToUserId == 1).Should().BeTrue();
        result.Transactions.All(t => t.AmountEur == 10.00).Should().BeTrue();

        var fromUsers = result.Transactions.Select(t => t.FromUserId).OrderBy(id => id).ToList();
        fromUsers.Should().BeEquivalentTo(new[] { 2, 3, 4, 5 });
    }

    // ── Max N-1 Transactions ──────────────────────

    [Fact]
    public async Task CalculateAsync_AtMostNMinus1Transactions()
    {
        // Various expenses by different users — should never exceed 4 transactions
        await _expenseService.CreateAsync(100.00, "Rent", 1);
        await _expenseService.CreateAsync(30.00, "Groceries", 2);
        await _expenseService.CreateAsync(5.00, "Snacks", 3);

        var result = await _settlementService.CalculateAsync();

        result.Transactions.Should().HaveCountLessThanOrEqualTo(4);
    }

    // ── Uneven Split with Remainder ──────────────────────

    [Fact]
    public async Task CalculateAsync_UnevenSplit_HandlesRemainderCorrectly()
    {
        // €10.01 total — 1001 cents / 5 = 200 cents + 1 cent remainder
        // First 1 user gets 201 cent share, rest get 200 cent share
        await _expenseService.CreateAsync(10.01, "Odd amount", 1);

        var result = await _settlementService.CalculateAsync();

        result.TotalExpenses.Should().Be(10.01);
        // All transaction amounts should sum to correct total redistribution
        var totalRedistribution = result.Transactions.Sum(t => t.AmountEur);
        // Total paid by user 1 minus their share should match total flow to user 1
        totalRedistribution.Should().BeApproximately(
            result.Balances.First(b => b.UserId == 1).TotalPaidEur - result.FairShare * 1,
            0.02); // small tolerance for cent rounding
    }

    // ── Two Payers ──────────────────────

    [Fact]
    public async Task CalculateAsync_TwoPayers_CorrectSettlement()
    {
        // User 1 pays €30, User 2 pays €20 — total €50, fair share €10
        // User 1 is owed €20, User 2 is owed €10, Users 3-5 each owe €10
        await _expenseService.CreateAsync(30.00, "Rent", 1);
        await _expenseService.CreateAsync(20.00, "Utils", 2);

        var result = await _settlementService.CalculateAsync();

        result.TotalExpenses.Should().Be(50.00);
        result.FairShare.Should().Be(10.00);
        result.IsSettled.Should().BeFalse();

        // Total amount transferred should equal what debtors owe: 3 * €10 = €30
        var totalTransferred = result.Transactions.Sum(t => t.AmountEur);
        totalTransferred.Should().BeApproximately(30.00, 0.01);
    }

    // ── Balances Correct ──────────────────────

    [Fact]
    public async Task CalculateAsync_BalancesReflectCorrectNetPositions()
    {
        await _expenseService.CreateAsync(25.00, "Dinner", 3);

        var result = await _settlementService.CalculateAsync();

        var user3 = result.Balances.First(b => b.UserId == 3);
        user3.TotalPaidEur.Should().Be(25.00);
        user3.NetBalanceEur.Should().Be(20.00);

        // Non-payers should have negative balance
        var user1 = result.Balances.First(b => b.UserId == 1);
        user1.TotalPaidEur.Should().Be(0);
        user1.NetBalanceEur.Should().Be(-5.00);
    }

    // ── All Balances Sum to Zero ──────────────────────

    [Fact]
    public async Task CalculateAsync_AllNetBalancesSumToZero()
    {
        await _expenseService.CreateAsync(47.50, "Random", 1);
        await _expenseService.CreateAsync(12.30, "Also random", 4);

        var result = await _settlementService.CalculateAsync();

        var sumBalances = result.Balances.Sum(b => b.NetBalanceEur);
        sumBalances.Should().BeApproximately(0, 0.05); // tolerance for cent rounding
    }
}
