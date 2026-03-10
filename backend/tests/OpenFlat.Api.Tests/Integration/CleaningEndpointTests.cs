using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using Xunit;

namespace OpenFlat.Api.Tests.Integration;

[Collection("Integration")]
public class CleaningEndpointTests
{
    private readonly HttpClient _client;
    private readonly ApiFactory _factory;

    public CleaningEndpointTests(ApiFactory factory)
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

    /// <summary>Helper: create a v3 task via API.</summary>
    private async Task<Guid> CreateTaskAsync(
        string title = "Test Task",
        string effort = "Normal",
        int frequencyValue = 7,
        string frequencyUnit = "Days",
        string? firstDueDate = null,
        int[]? rotationOrder = null)
    {
        var body = new
        {
            Title = title,
            Effort = effort,
            FrequencyValue = frequencyValue,
            FrequencyUnit = frequencyUnit,
            FirstDueDate = firstDueDate ?? DateOnly.FromDateTime(DateTime.UtcNow).ToString("yyyy-MM-dd"),
            RotationOrder = rotationOrder
        };
        var response = await _client.PostAsJsonAsync("/api/tasks", body);
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
    public async Task CreateTask_ReturnsCreatedWithV3Fields()
    {
        var dueDate = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(3)).ToString("yyyy-MM-dd");
        var response = await _client.PostAsJsonAsync("/api/tasks", new
        {
            Title = "New Task",
            Effort = "Big",
            FrequencyValue = 7,
            FrequencyUnit = "Days",
            FirstDueDate = dueDate,
            RotationOrder = new[] { 1, 3 }
        });

        response.StatusCode.Should().Be(HttpStatusCode.Created);
        var json = await ReadJsonAsync(response);
        json.GetProperty("id").GetGuid().Should().NotBeEmpty();
        json.GetProperty("title").GetString().Should().Be("New Task");
        json.GetProperty("effort").GetString().Should().Be("Big");
        json.GetProperty("points").GetInt32().Should().Be(2); // Big preset
        json.GetProperty("frequencyValue").GetInt32().Should().Be(7);
        json.GetProperty("frequencyUnit").GetString().Should().Be("Days");
        json.GetProperty("dueDate").GetString().Should().Be(dueDate);
        json.GetProperty("rotationOrder").GetArrayLength().Should().Be(2);
        json.GetProperty("rotationIndex").GetInt32().Should().Be(0);
        json.GetProperty("assignedUserId").GetInt32().Should().Be(1); // rotationOrder[0]
        json.GetProperty("commentCount").GetInt32().Should().Be(0);
    }

    [Fact]
    public async Task CreateTask_MissingUserId_Returns400()
    {
        var noAuthClient = _factory.CreateClient();
        var response = await noAuthClient.PostAsJsonAsync("/api/tasks", new
        {
            Title = "Test",
            Effort = "Normal",
            FrequencyValue = 7,
            FrequencyUnit = "Days",
            FirstDueDate = DateOnly.FromDateTime(DateTime.UtcNow).ToString("yyyy-MM-dd")
        });
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
    public async Task UpdateTask_ReturnsV3UpdatedDto()
    {
        var taskId = await CreateTaskAsync("Original", effort: "Normal");
        var response = await _client.PutAsJsonAsync($"/api/tasks/{taskId}", new
        {
            Title = "Updated",
            Effort = "Huge",
            FrequencyValue = 3,
            FrequencyUnit = "Weeks"
        });

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var json = await ReadJsonAsync(response);
        json.GetProperty("title").GetString().Should().Be("Updated");
        json.GetProperty("effort").GetString().Should().Be("Huge");
        json.GetProperty("points").GetInt32().Should().Be(4); // Huge preset
        json.GetProperty("frequencyValue").GetInt32().Should().Be(3);
        json.GetProperty("frequencyUnit").GetString().Should().Be("Weeks");
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
    public async Task CompleteTask_ReturnsCompleteResponse_WithRotationAdvance()
    {
        var taskId = await CreateTaskAsync("Completable", rotationOrder: [1, 3]);
        var response = await _client.PostAsJsonAsync($"/api/tasks/{taskId}/complete", new { });

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var json = await ReadJsonAsync(response);
        json.GetProperty("pointsEarned").GetInt32().Should().Be(1); // Normal = 1pt
        json.GetProperty("completedByUserName").GetString().Should().Be("Alex"); // userId 1
        json.GetProperty("nextAssignedUserName").GetString().Should().Be("Sam"); // userId 3 is next

        var task = json.GetProperty("task");
        task.GetProperty("rotationIndex").GetInt32().Should().Be(1);
        task.GetProperty("assignedUserId").GetInt32().Should().Be(3);
    }

    [Fact]
    public async Task CompleteTask_WithNextUserId_OverridesRotation()
    {
        var taskId = await CreateTaskAsync("Override", rotationOrder: [1, 2, 3]);
        var response = await _client.PostAsJsonAsync($"/api/tasks/{taskId}/complete",
            new { NextUserId = 3 });

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var json = await ReadJsonAsync(response);
        json.GetProperty("task").GetProperty("assignedUserId").GetInt32().Should().Be(3);
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
    public async Task GetLeaderboard_ReturnsCompletionLogBasedTotals()
    {
        // Complete a task so leaderboard has non-zero totals
        var taskId = await CreateTaskAsync("Score Task", effort: "Big", rotationOrder: [1, 2]);
        await _client.PostAsJsonAsync($"/api/tasks/{taskId}/complete", new { });

        var response = await _client.GetAsync("/api/leaderboard");
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var json = await ReadJsonAsync(response);
        json.ValueKind.Should().Be(JsonValueKind.Array);
        json.GetArrayLength().Should().Be(5); // 5 predefined users
    }
}
