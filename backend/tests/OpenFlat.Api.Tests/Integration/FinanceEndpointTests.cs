using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using Xunit;

namespace OpenFlat.Api.Tests.Integration;

public class FinanceEndpointTests : IClassFixture<ApiFactory>
{
    private readonly HttpClient _client;
    private readonly ApiFactory _factory;

    public FinanceEndpointTests(ApiFactory factory)
    {
        _factory = factory;
        _client = factory.CreateClient();
        _client.DefaultRequestHeaders.Add("X-User-Id", "1");
    }

    private static async Task<JsonElement> ReadJsonAsync(HttpResponseMessage response)
    {
        using var stream = await response.Content.ReadAsStreamAsync();
        using var doc = await JsonDocument.ParseAsync(stream);
        return doc.RootElement.Clone();
    }

    private async Task<Guid> CreateExpenseAsync(double amount = 25.50, string description = "Test Expense")
    {
        var response = await _client.PostAsJsonAsync("/api/expenses", new { AmountEur = amount, Description = description });
        response.EnsureSuccessStatusCode();
        var json = await ReadJsonAsync(response);
        return json.GetProperty("id").GetGuid();
    }

    // ── Expense Endpoints ──────────────────────

    [Fact]
    public async Task ListExpenses_ReturnsOk()
    {
        var response = await _client.GetAsync("/api/expenses");
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var json = await ReadJsonAsync(response);
        json.ValueKind.Should().Be(JsonValueKind.Array);
    }

    [Fact]
    public async Task CreateExpense_ReturnsCreated()
    {
        var response = await _client.PostAsJsonAsync("/api/expenses", new { AmountEur = 12.50, Description = "Groceries" });
        response.StatusCode.Should().Be(HttpStatusCode.Created);
        var json = await ReadJsonAsync(response);
        json.GetProperty("id").GetGuid().Should().NotBeEmpty();
        json.GetProperty("amountEur").GetDouble().Should().BeApproximately(12.50, 0.01);
        json.GetProperty("description").GetString().Should().Be("Groceries");
        json.GetProperty("loggedByUserId").GetInt32().Should().Be(1);
        json.GetProperty("isOwn").GetBoolean().Should().BeTrue();
    }

    [Fact]
    public async Task GetExpense_ReturnsOk()
    {
        var expenseId = await CreateExpenseAsync(30.00, "Dinner");
        var response = await _client.GetAsync($"/api/expenses/{expenseId}");
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var json = await ReadJsonAsync(response);
        json.GetProperty("description").GetString().Should().Be("Dinner");
    }

    [Fact]
    public async Task UpdateExpense_ByOwner_ReturnsOk()
    {
        var expenseId = await CreateExpenseAsync(20.00, "Original");
        var response = await _client.PutAsJsonAsync($"/api/expenses/{expenseId}",
            new { AmountEur = 25.00, Description = "Updated" });
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var json = await ReadJsonAsync(response);
        json.GetProperty("amountEur").GetDouble().Should().BeApproximately(25.00, 0.01);
        json.GetProperty("description").GetString().Should().Be("Updated");
    }

    [Fact]
    public async Task UpdateExpense_ByOtherUser_Returns403()
    {
        var expenseId = await CreateExpenseAsync();
        var otherClient = _factory.CreateClient();
        otherClient.DefaultRequestHeaders.Add("X-User-Id", "2");
        var response = await otherClient.PutAsJsonAsync($"/api/expenses/{expenseId}",
            new { AmountEur = 999.00, Description = "Hacked" });
        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task DeleteExpense_ByOwner_Returns204()
    {
        var expenseId = await CreateExpenseAsync(5.00, "To Delete");
        var response = await _client.DeleteAsync($"/api/expenses/{expenseId}");
        response.StatusCode.Should().Be(HttpStatusCode.NoContent);
    }

    [Fact]
    public async Task DeleteExpense_ByOtherUser_Returns403()
    {
        var expenseId = await CreateExpenseAsync();
        var otherClient = _factory.CreateClient();
        otherClient.DefaultRequestHeaders.Add("X-User-Id", "2");
        var response = await otherClient.DeleteAsync($"/api/expenses/{expenseId}");
        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    // ── Settlement ──────────────────────

    [Fact]
    public async Task GetSettlement_ReturnsResult()
    {
        // Create expenses from different users for non-trivial settlement
        await CreateExpenseAsync(50.00, "User 1 expense");

        var user2Client = _factory.CreateClient();
        user2Client.DefaultRequestHeaders.Add("X-User-Id", "2");
        await user2Client.PostAsJsonAsync("/api/expenses", new { AmountEur = 30.00, Description = "User 2 expense" });

        var response = await _client.GetAsync("/api/settlement");
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var json = await ReadJsonAsync(response);
        json.TryGetProperty("isSettled", out _).Should().BeTrue();
        json.TryGetProperty("transactions", out _).Should().BeTrue();
        json.TryGetProperty("balances", out _).Should().BeTrue();
        json.TryGetProperty("totalExpenses", out _).Should().BeTrue();
        json.TryGetProperty("fairShare", out _).Should().BeTrue();
    }
}
