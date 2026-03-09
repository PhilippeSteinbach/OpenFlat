using System.Reflection;
using FluentAssertions;
using OpenFlat.Api.Features.Cleaning.Endpoints;
using Xunit;

namespace OpenFlat.Api.Tests.Contract;

/// <summary>
/// Validates that API DTO record types match the v3 OpenAPI contract schemas.
/// Ensures property names, types, and nullability align with cleaning-api.yaml v3.0.0.
/// </summary>
public class CleaningContractTests
{
    [Fact]
    public void TaskDto_HasAllV3ContractProperties()
    {
        // v3 TaskDto: id, title, effort, points, frequencyValue, frequencyUnit, dueDate,
        //   rotationOrder, rotationIndex, assignedUserId, assignedUserName,
        //   lastCompletedAt, lastCompletedByUserName, createdByUserId, createdAt, updatedAt, commentCount
        var props = typeof(TaskDto).GetProperties(BindingFlags.Public | BindingFlags.Instance)
            .Select(p => p.Name)
            .ToHashSet(StringComparer.OrdinalIgnoreCase);

        props.Should().Contain("Id");
        props.Should().Contain("Title");
        props.Should().Contain("Effort");
        props.Should().Contain("Points");
        props.Should().Contain("FrequencyValue");
        props.Should().Contain("FrequencyUnit");
        props.Should().Contain("DueDate");
        props.Should().Contain("RotationOrder");
        props.Should().Contain("RotationIndex");
        props.Should().Contain("AssignedUserId");
        props.Should().Contain("AssignedUserName");
        props.Should().Contain("LastCompletedAt");
        props.Should().Contain("LastCompletedByUserName");
        props.Should().Contain("CreatedByUserId");
        props.Should().Contain("CreatedAt");
        props.Should().Contain("UpdatedAt");
        props.Should().Contain("CommentCount");
    }

    [Fact]
    public void TaskDto_DoesNotHaveRemovedV2Properties()
    {
        var props = typeof(TaskDto).GetProperties(BindingFlags.Public | BindingFlags.Instance)
            .Select(p => p.Name)
            .ToHashSet(StringComparer.OrdinalIgnoreCase);

        props.Should().NotContain("IsDone");
        props.Should().NotContain("CompletedAt");
    }

    [Fact]
    public void TaskDto_PropertyTypes_MatchV3Contract()
    {
        var type = typeof(TaskDto);

        type.GetProperty("Id")!.PropertyType.Should().Be(typeof(Guid));
        type.GetProperty("Title")!.PropertyType.Should().Be(typeof(string));
        type.GetProperty("Effort")!.PropertyType.Should().Be(typeof(string));
        type.GetProperty("Points")!.PropertyType.Should().Be(typeof(int));
        type.GetProperty("FrequencyValue")!.PropertyType.Should().Be(typeof(int));
        type.GetProperty("FrequencyUnit")!.PropertyType.Should().Be(typeof(string));
        type.GetProperty("DueDate")!.PropertyType.Should().Be(typeof(string));
        type.GetProperty("RotationOrder")!.PropertyType.Should().Be(typeof(int[]));
        type.GetProperty("RotationIndex")!.PropertyType.Should().Be(typeof(int));
        type.GetProperty("AssignedUserId")!.PropertyType.Should().Be(typeof(int?));
        type.GetProperty("AssignedUserName")!.PropertyType.Should().Be(typeof(string));
        type.GetProperty("LastCompletedAt")!.PropertyType.Should().Be(typeof(DateTimeOffset?));
        type.GetProperty("LastCompletedByUserName")!.PropertyType.Should().Be(typeof(string));
        type.GetProperty("CreatedByUserId")!.PropertyType.Should().Be(typeof(int));
        type.GetProperty("CommentCount")!.PropertyType.Should().Be(typeof(int));
    }

    [Fact]
    public void TaskDetailDto_HasTaskAndComments()
    {
        var props = typeof(TaskDetailDto).GetProperties(BindingFlags.Public | BindingFlags.Instance)
            .Select(p => p.Name)
            .ToHashSet(StringComparer.OrdinalIgnoreCase);

        props.Should().Contain("Task");
        props.Should().Contain("Comments");
        // Flattened v3 properties
        props.Should().Contain("Id");
        props.Should().Contain("Title");
        props.Should().Contain("Effort");
        props.Should().Contain("FrequencyValue");
        props.Should().Contain("RotationOrder");
    }

    [Fact]
    public void CommentDto_HasAllContractProperties()
    {
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
    public void CompleteTaskResponseDto_HasV3ContractFields()
    {
        // v3: pointsEarned, completedByUserName, nextAssignedUserName (replaces pointsDelta, warningNoAssignee)
        var props = typeof(CompleteTaskResponseDto).GetProperties(BindingFlags.Public | BindingFlags.Instance)
            .Select(p => p.Name)
            .ToHashSet(StringComparer.OrdinalIgnoreCase);

        props.Should().Contain("Task");
        props.Should().Contain("PointsEarned");
        props.Should().Contain("CompletedByUserName");
        props.Should().Contain("NextAssignedUserName");

        // v2 fields should NOT exist
        props.Should().NotContain("PointsDelta");
        props.Should().NotContain("WarningNoAssignee");
    }

    [Fact]
    public void CreateTaskRequest_HasV3RequiredFields()
    {
        var props = typeof(CreateTaskRequest).GetProperties(BindingFlags.Public | BindingFlags.Instance)
            .Select(p => p.Name)
            .ToHashSet(StringComparer.OrdinalIgnoreCase);

        props.Should().Contain("Title");
        props.Should().Contain("Effort");
        props.Should().Contain("Points");
        props.Should().Contain("FrequencyValue");
        props.Should().Contain("FrequencyUnit");
        props.Should().Contain("FirstDueDate");
        props.Should().Contain("RotationOrder");
    }

    [Fact]
    public void UpdateTaskRequest_HasV3Fields()
    {
        var props = typeof(UpdateTaskRequest).GetProperties(BindingFlags.Public | BindingFlags.Instance)
            .Select(p => p.Name)
            .ToHashSet(StringComparer.OrdinalIgnoreCase);

        props.Should().Contain("Title");
        props.Should().Contain("Effort");
        props.Should().Contain("Points");
        props.Should().Contain("FrequencyValue");
        props.Should().Contain("FrequencyUnit");
        props.Should().Contain("DueDate");
        props.Should().Contain("RotationOrder");
    }

    [Fact]
    public void CompleteTaskRequest_HasNextUserId()
    {
        var props = typeof(CompleteTaskRequest).GetProperties(BindingFlags.Public | BindingFlags.Instance)
            .Select(p => p.Name)
            .ToHashSet(StringComparer.OrdinalIgnoreCase);

        props.Should().Contain("NextUserId");
    }

    [Fact]
    public void AssignTaskRequest_HasAssignedUserId()
    {
        var props = typeof(AssignTaskRequest).GetProperties(BindingFlags.Public | BindingFlags.Instance)
            .Select(p => p.Name)
            .ToHashSet(StringComparer.OrdinalIgnoreCase);

        props.Should().Contain("AssignedUserId");
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
