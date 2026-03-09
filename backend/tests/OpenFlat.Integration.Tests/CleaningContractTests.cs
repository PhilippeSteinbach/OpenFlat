using System.Reflection;
using FluentAssertions;
using OpenFlat.Cleaning.Api.Endpoints;
using Xunit;

namespace OpenFlat.Integration.Tests;

/// <summary>
/// Validates that API DTO record types match the OpenAPI contract schemas.
/// Ensures property names, types, and nullability align with the spec.
/// </summary>
public class CleaningContractTests
{
    [Fact]
    public void TaskDto_HasAllContractProperties()
    {
        // OpenAPI: TaskDto — id, title, points, status, assignedUserId, assignedUserName,
        //          sortOrder, createdByUserId, createdAt, updatedAt, commentCount
        var props = typeof(TaskDto).GetProperties(BindingFlags.Public | BindingFlags.Instance)
            .Select(p => p.Name)
            .ToHashSet(StringComparer.OrdinalIgnoreCase);

        props.Should().Contain("Id");
        props.Should().Contain("Title");
        props.Should().Contain("Points");
        props.Should().Contain("Status");
        props.Should().Contain("AssignedUserId");
        props.Should().Contain("AssignedUserName");
        props.Should().Contain("SortOrder");
        props.Should().Contain("CreatedByUserId");
        props.Should().Contain("CreatedAt");
        props.Should().Contain("UpdatedAt");
        props.Should().Contain("CommentCount");
    }

    [Fact]
    public void TaskDto_PropertyTypes_MatchContract()
    {
        var type = typeof(TaskDto);

        type.GetProperty("Id")!.PropertyType.Should().Be(typeof(Guid));
        type.GetProperty("Title")!.PropertyType.Should().Be(typeof(string));
        type.GetProperty("Points")!.PropertyType.Should().Be(typeof(int));
        type.GetProperty("Status")!.PropertyType.Should().Be(typeof(string));
        type.GetProperty("AssignedUserId")!.PropertyType.Should().Be(typeof(int?));
        type.GetProperty("AssignedUserName")!.PropertyType.Should().Be(typeof(string));
        type.GetProperty("SortOrder")!.PropertyType.Should().Be(typeof(int));
        type.GetProperty("CreatedByUserId")!.PropertyType.Should().Be(typeof(int));
        type.GetProperty("CommentCount")!.PropertyType.Should().Be(typeof(int));
    }

    [Fact]
    public void TaskDetailDto_HasTaskAndComments()
    {
        // OpenAPI: allOf TaskDto + comments array
        var props = typeof(TaskDetailDto).GetProperties(BindingFlags.Public | BindingFlags.Instance)
            .Select(p => p.Name)
            .ToHashSet(StringComparer.OrdinalIgnoreCase);

        props.Should().Contain("Task");
        props.Should().Contain("Comments");
        // Also has flattened properties
        props.Should().Contain("Id");
        props.Should().Contain("Title");
    }

    [Fact]
    public void CommentDto_HasAllContractProperties()
    {
        // OpenAPI: CommentDto — id, userId, userName, text, isEdited, createdAt, updatedAt
        var props = typeof(CommentDto).GetProperties(BindingFlags.Public | BindingFlags.Instance)
            .Select(p => p.Name)
            .ToHashSet(StringComparer.OrdinalIgnoreCase);

        props.Should().Contain("Id");
        props.Should().Contain("UserId");
        props.Should().Contain("UserName");
        props.Should().Contain("Text");
        props.Should().Contain("IsEdited");
        props.Should().Contain("CreatedAt");
        props.Should().Contain("UpdatedAt");
    }

    [Fact]
    public void CommentDto_PropertyTypes_MatchContract()
    {
        var type = typeof(CommentDto);

        type.GetProperty("Id")!.PropertyType.Should().Be(typeof(Guid));
        type.GetProperty("UserId")!.PropertyType.Should().Be(typeof(int));
        type.GetProperty("UserName")!.PropertyType.Should().Be(typeof(string));
        type.GetProperty("Text")!.PropertyType.Should().Be(typeof(string));
        type.GetProperty("IsEdited")!.PropertyType.Should().Be(typeof(bool));
    }

    [Fact]
    public void LeaderboardEntryDto_HasAllContractProperties()
    {
        // OpenAPI: LeaderboardEntry — userId, userName, role, totalPoints
        var props = typeof(LeaderboardEntryDto).GetProperties(BindingFlags.Public | BindingFlags.Instance)
            .Select(p => p.Name)
            .ToHashSet(StringComparer.OrdinalIgnoreCase);

        props.Should().Contain("UserId");
        props.Should().Contain("UserName");
        props.Should().Contain("Role");
        props.Should().Contain("TotalPoints");
    }

    [Fact]
    public void LeaderboardEntryDto_PropertyTypes_MatchContract()
    {
        var type = typeof(LeaderboardEntryDto);

        type.GetProperty("UserId")!.PropertyType.Should().Be(typeof(int));
        type.GetProperty("UserName")!.PropertyType.Should().Be(typeof(string));
        type.GetProperty("Role")!.PropertyType.Should().Be(typeof(string));
        type.GetProperty("TotalPoints")!.PropertyType.Should().Be(typeof(int));
    }

    [Fact]
    public void MoveTaskResponseDto_HasContractFields()
    {
        // OpenAPI: MoveTaskResponse — task, pointsDelta, warningNoAssignee
        var props = typeof(MoveTaskResponseDto).GetProperties(BindingFlags.Public | BindingFlags.Instance)
            .Select(p => p.Name)
            .ToHashSet(StringComparer.OrdinalIgnoreCase);

        props.Should().Contain("Task");
        props.Should().Contain("PointsDelta");
        props.Should().Contain("WarningNoAssignee");
    }

    [Fact]
    public void CreateTaskRequest_HasRequiredFields()
    {
        var props = typeof(CreateTaskRequest).GetProperties(BindingFlags.Public | BindingFlags.Instance)
            .Select(p => p.Name)
            .ToHashSet(StringComparer.OrdinalIgnoreCase);

        props.Should().Contain("Title");
        props.Should().Contain("Points");
    }

    [Fact]
    public void CreateCommentRequest_HasTextField()
    {
        var props = typeof(CreateCommentRequest).GetProperties(BindingFlags.Public | BindingFlags.Instance)
            .Select(p => p.Name)
            .ToHashSet(StringComparer.OrdinalIgnoreCase);

        props.Should().Contain("Text");
    }
}
