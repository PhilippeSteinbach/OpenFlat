using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using Xunit;

namespace OpenFlat.Api.Tests.Integration;

public class ShoppingEndpointTests : IClassFixture<ApiFactory>
{
    private readonly HttpClient _client;
    private readonly ApiFactory _factory;

    public ShoppingEndpointTests(ApiFactory factory)
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

    private async Task<Guid> CreateItemAsync(string name = "Test Item", int quantity = 1)
    {
        var response = await _client.PostAsJsonAsync("/api/items", new { Name = name, Quantity = quantity });
        response.EnsureSuccessStatusCode();
        var json = await ReadJsonAsync(response);
        return json.GetProperty("id").GetGuid();
    }

    private async Task<Guid> AddCommentAsync(Guid itemId, string text = "Test comment")
    {
        var response = await _client.PostAsJsonAsync($"/api/items/{itemId}/comments", new { Text = text });
        response.EnsureSuccessStatusCode();
        var json = await ReadJsonAsync(response);
        return json.GetProperty("id").GetGuid();
    }

    // ── Item Endpoints ──────────────────────

    [Fact]
    public async Task ListItems_ReturnsOkWithActiveAndBought()
    {
        var response = await _client.GetAsync("/api/items");
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var json = await ReadJsonAsync(response);
        json.TryGetProperty("active", out _).Should().BeTrue();
        json.TryGetProperty("recentlyBought", out _).Should().BeTrue();
    }

    [Fact]
    public async Task CreateItem_ReturnsCreated()
    {
        var response = await _client.PostAsJsonAsync("/api/items", new { Name = "Milk", Quantity = 2 });
        response.StatusCode.Should().Be(HttpStatusCode.Created);
        var json = await ReadJsonAsync(response);
        json.GetProperty("id").GetGuid().Should().NotBeEmpty();
        json.GetProperty("name").GetString().Should().Be("Milk");
        json.GetProperty("quantity").GetInt32().Should().Be(2);
        json.GetProperty("isBought").GetBoolean().Should().BeFalse();
    }

    [Fact]
    public async Task GetItem_ReturnsItemWithComments()
    {
        var itemId = await CreateItemAsync("Bread");
        await AddCommentAsync(itemId, "Get whole wheat");

        var response = await _client.GetAsync($"/api/items/{itemId}");
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var json = await ReadJsonAsync(response);
        json.GetProperty("item").GetProperty("name").GetString().Should().Be("Bread");
        json.GetProperty("comments").GetArrayLength().Should().Be(1);
    }

    [Fact]
    public async Task UpdateItem_ReturnsUpdated()
    {
        var itemId = await CreateItemAsync("Eggs");
        var response = await _client.PutAsJsonAsync($"/api/items/{itemId}", new { Name = "Free Range Eggs", Quantity = 12 });
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var json = await ReadJsonAsync(response);
        json.GetProperty("name").GetString().Should().Be("Free Range Eggs");
        json.GetProperty("quantity").GetInt32().Should().Be(12);
    }

    [Fact]
    public async Task DeleteItem_Returns204()
    {
        var itemId = await CreateItemAsync("Delete Me");
        var response = await _client.DeleteAsync($"/api/items/{itemId}");
        response.StatusCode.Should().Be(HttpStatusCode.NoContent);
    }

    [Fact]
    public async Task BuyItem_SetsBought()
    {
        var itemId = await CreateItemAsync("Bananas");
        var response = await _client.PostAsJsonAsync($"/api/items/{itemId}/buy", new { });
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var json = await ReadJsonAsync(response);
        json.GetProperty("isBought").GetBoolean().Should().BeTrue();
        json.GetProperty("boughtByUserId").GetInt32().Should().Be(1);
    }

    [Fact]
    public async Task UndoBuyItem_MovesBackToActive()
    {
        var itemId = await CreateItemAsync("Apples");
        await _client.PostAsJsonAsync($"/api/items/{itemId}/buy", new { });

        var response = await _client.PostAsJsonAsync($"/api/items/{itemId}/undo", new { });
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var json = await ReadJsonAsync(response);
        json.GetProperty("isBought").GetBoolean().Should().BeFalse();
    }

    // ── Comment Endpoints ──────────────────────

    [Fact]
    public async Task ListItemComments_ReturnsArray()
    {
        var itemId = await CreateItemAsync();
        await AddCommentAsync(itemId);

        var response = await _client.GetAsync($"/api/items/{itemId}/comments");
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var json = await ReadJsonAsync(response);
        json.ValueKind.Should().Be(JsonValueKind.Array);
        json.GetArrayLength().Should().BeGreaterThanOrEqualTo(1);
    }

    [Fact]
    public async Task AddItemComment_ReturnsCreated()
    {
        var itemId = await CreateItemAsync();
        var response = await _client.PostAsJsonAsync($"/api/items/{itemId}/comments", new { Text = "Get organic" });
        response.StatusCode.Should().Be(HttpStatusCode.Created);
        var json = await ReadJsonAsync(response);
        json.GetProperty("text").GetString().Should().Be("Get organic");
        json.GetProperty("isEdited").GetBoolean().Should().BeFalse();
    }

    [Fact]
    public async Task UpdateItemComment_ByAuthor_ReturnsUpdated()
    {
        var itemId = await CreateItemAsync();
        var commentId = await AddCommentAsync(itemId, "Original");

        var response = await _client.PutAsJsonAsync($"/api/items/{itemId}/comments/{commentId}",
            new { Text = "Edited" });
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var json = await ReadJsonAsync(response);
        json.GetProperty("text").GetString().Should().Be("Edited");
        json.GetProperty("isEdited").GetBoolean().Should().BeTrue();
    }

    [Fact]
    public async Task UpdateItemComment_ByOtherUser_Returns403()
    {
        var itemId = await CreateItemAsync();
        var commentId = await AddCommentAsync(itemId);

        var otherClient = _factory.CreateClient();
        otherClient.DefaultRequestHeaders.Add("X-User-Id", "2");
        var response = await otherClient.PutAsJsonAsync($"/api/items/{itemId}/comments/{commentId}",
            new { Text = "Hacked" });
        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task DeleteItemComment_Returns204()
    {
        var itemId = await CreateItemAsync();
        var commentId = await AddCommentAsync(itemId);

        var response = await _client.DeleteAsync($"/api/items/{itemId}/comments/{commentId}");
        response.StatusCode.Should().Be(HttpStatusCode.NoContent);
    }
}
