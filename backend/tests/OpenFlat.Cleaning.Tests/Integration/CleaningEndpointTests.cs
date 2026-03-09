using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using Xunit;

namespace OpenFlat.Cleaning.Tests.Integration;

public class CleaningEndpointTests : IClassFixture<CleaningApiFactory>
{
    private readonly HttpClient _client;
    private readonly CleaningApiFactory _factory;

    public CleaningEndpointTests(CleaningApiFactory factory)
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

    private async Task<Guid> CreateTaskAsync(string title = "Test Task", int points = 10)
    {
        var response = await _client.PostAsJsonAsync("/api/tasks", new { Title = title, Points = points });
        response.EnsureSuccessStatusCode();
        var json = await ReadJsonAsync(response);
        return json.GetProperty("id").GetGuid();
    }

    private async Task<Guid> AddCommentAsync(Guid taskId, string text = "Test comment")
    {
        var response = await _client.PostAsJsonAsync($"/api/tasks/{taskId}/comments", new { Text = text });
        response.EnsureSuccessStatusCode();
        var json = await ReadJsonAsync(response);
        return json.GetProperty("id").GetGuid();
    }

    // ── Task Endpoints ──────────────────────

    [Fact]
    public async Task ListTasks_ReturnsOkWithArray()
    {
        var response = await _client.GetAsync("/api/tasks");
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var json = await ReadJsonAsync(response);
        json.ValueKind.Should().Be(JsonValueKind.Array);
    }

    [Fact]
    public async Task CreateTask_ReturnsCreated()
    {
        var response = await _client.PostAsJsonAsync("/api/tasks", new { Title = "New Task", Points = 5 });
        response.StatusCode.Should().Be(HttpStatusCode.Created);
        var json = await ReadJsonAsync(response);
        json.GetProperty("id").GetGuid().Should().NotBeEmpty();
        json.GetProperty("title").GetString().Should().Be("New Task");
        json.GetProperty("points").GetInt32().Should().Be(5);
        json.GetProperty("status").GetString().Should().Be("todo");
        json.GetProperty("commentCount").GetInt32().Should().Be(0);
    }

    [Fact]
    public async Task CreateTask_MissingUserId_Returns400()
    {
        var noAuthClient = _factory.CreateClient();
        var response = await noAuthClient.PostAsJsonAsync("/api/tasks", new { Title = "Test", Points = 10 });
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task GetTask_ReturnsTaskWithComments()
    {
        var taskId = await CreateTaskAsync("Detail Task");
        await AddCommentAsync(taskId, "Hello!");

        var response = await _client.GetAsync($"/api/tasks/{taskId}");
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var json = await ReadJsonAsync(response);
        json.GetProperty("title").GetString().Should().Be("Detail Task");
        json.GetProperty("comments").GetArrayLength().Should().Be(1);
    }

    [Fact]
    public async Task GetTask_NotFound_Returns404()
    {
        var response = await _client.GetAsync($"/api/tasks/{Guid.NewGuid()}");
        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task UpdateTask_ReturnsUpdatedDto()
    {
        var taskId = await CreateTaskAsync("Original");
        var response = await _client.PutAsJsonAsync($"/api/tasks/{taskId}", new { Title = "Updated", Points = 20 });
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var json = await ReadJsonAsync(response);
        json.GetProperty("title").GetString().Should().Be("Updated");
        json.GetProperty("points").GetInt32().Should().Be(20);
    }

    [Fact]
    public async Task DeleteTask_Returns204()
    {
        var taskId = await CreateTaskAsync("To Delete");
        var response = await _client.DeleteAsync($"/api/tasks/{taskId}");
        response.StatusCode.Should().Be(HttpStatusCode.NoContent);

        var getResponse = await _client.GetAsync($"/api/tasks/{taskId}");
        getResponse.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task MoveTask_ChangesStatus()
    {
        var taskId = await CreateTaskAsync("Movable");
        var response = await _client.PostAsJsonAsync($"/api/tasks/{taskId}/move",
            new { TargetStatus = "in_progress", TargetSortOrder = 0 });
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var json = await ReadJsonAsync(response);
        json.GetProperty("task").GetProperty("status").GetString().Should().Be("in_progress");
    }

    [Fact]
    public async Task AssignTask_SetsAssignee()
    {
        var taskId = await CreateTaskAsync("Assignable");
        var response = await _client.PostAsJsonAsync($"/api/tasks/{taskId}/assign",
            new { AssignedUserId = 2 });
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var json = await ReadJsonAsync(response);
        json.GetProperty("assignedUserId").GetInt32().Should().Be(2);
        json.GetProperty("assignedUserName").GetString().Should().NotBeNullOrEmpty();
    }

    // ── Comment Endpoints ──────────────────────

    [Fact]
    public async Task ListComments_ReturnsArray()
    {
        var taskId = await CreateTaskAsync();
        await AddCommentAsync(taskId);

        var response = await _client.GetAsync($"/api/tasks/{taskId}/comments");
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var json = await ReadJsonAsync(response);
        json.ValueKind.Should().Be(JsonValueKind.Array);
        json.GetArrayLength().Should().BeGreaterThanOrEqualTo(1);
    }

    [Fact]
    public async Task AddComment_ReturnsCreated()
    {
        var taskId = await CreateTaskAsync();
        var response = await _client.PostAsJsonAsync($"/api/tasks/{taskId}/comments", new { Text = "Great!" });
        response.StatusCode.Should().Be(HttpStatusCode.Created);
        var json = await ReadJsonAsync(response);
        json.GetProperty("text").GetString().Should().Be("Great!");
        json.GetProperty("isEdited").GetBoolean().Should().BeFalse();
    }

    [Fact]
    public async Task UpdateComment_ByAuthor_ReturnsUpdated()
    {
        var taskId = await CreateTaskAsync();
        var commentId = await AddCommentAsync(taskId, "Original");

        var response = await _client.PutAsJsonAsync($"/api/tasks/{taskId}/comments/{commentId}",
            new { Text = "Edited" });
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var json = await ReadJsonAsync(response);
        json.GetProperty("text").GetString().Should().Be("Edited");
        json.GetProperty("isEdited").GetBoolean().Should().BeTrue();
    }

    [Fact]
    public async Task UpdateComment_ByOtherUser_Returns403()
    {
        var taskId = await CreateTaskAsync();
        var commentId = await AddCommentAsync(taskId);

        var otherClient = _factory.CreateClient();
        otherClient.DefaultRequestHeaders.Add("X-User-Id", "2");
        var response = await otherClient.PutAsJsonAsync($"/api/tasks/{taskId}/comments/{commentId}",
            new { Text = "Hacked" });
        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task DeleteComment_Returns204()
    {
        var taskId = await CreateTaskAsync();
        var commentId = await AddCommentAsync(taskId);

        var response = await _client.DeleteAsync($"/api/tasks/{taskId}/comments/{commentId}");
        response.StatusCode.Should().Be(HttpStatusCode.NoContent);
    }

    // ── Leaderboard ──────────────────────

    [Fact]
    public async Task GetLeaderboard_ReturnsLeaderboard()
    {
        var response = await _client.GetAsync("/api/leaderboard");
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var json = await ReadJsonAsync(response);
        json.ValueKind.Should().Be(JsonValueKind.Array);
        json.GetArrayLength().Should().Be(5); // 5 predefined users
    }
}
