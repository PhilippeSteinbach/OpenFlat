using System.Reflection;
using FluentAssertions;
using OpenFlat.Shopping.Api.Endpoints;
using Xunit;

namespace OpenFlat.Integration.Tests;

/// <summary>
/// Validates that Shopping API DTO record types match the OpenAPI contract schemas.
/// </summary>
public class ShoppingContractTests
{
    [Fact]
    public void ItemDto_HasAllContractProperties()
    {
        // OpenAPI: ItemDto — id, name, quantity, addedByUserId, addedByUserName,
        //          isBought, boughtAt, boughtByUserId, boughtByUserName, createdAt, updatedAt, commentCount
        var props = typeof(ItemDto).GetProperties(BindingFlags.Public | BindingFlags.Instance)
            .Select(p => p.Name)
            .ToHashSet(StringComparer.OrdinalIgnoreCase);

        props.Should().Contain("Id");
        props.Should().Contain("Name");
        props.Should().Contain("Quantity");
        props.Should().Contain("AddedByUserId");
        props.Should().Contain("AddedByUserName");
        props.Should().Contain("IsBought");
        props.Should().Contain("BoughtAt");
        props.Should().Contain("BoughtByUserId");
        props.Should().Contain("BoughtByUserName");
        props.Should().Contain("CreatedAt");
        props.Should().Contain("UpdatedAt");
        props.Should().Contain("CommentCount");
    }

    [Fact]
    public void ItemDto_PropertyTypes_MatchContract()
    {
        var type = typeof(ItemDto);

        type.GetProperty("Id")!.PropertyType.Should().Be(typeof(Guid));
        type.GetProperty("Name")!.PropertyType.Should().Be(typeof(string));
        type.GetProperty("Quantity")!.PropertyType.Should().Be(typeof(int));
        type.GetProperty("AddedByUserId")!.PropertyType.Should().Be(typeof(int));
        type.GetProperty("AddedByUserName")!.PropertyType.Should().Be(typeof(string));
        type.GetProperty("IsBought")!.PropertyType.Should().Be(typeof(bool));
        type.GetProperty("BoughtAt")!.PropertyType.Should().Be(typeof(DateTimeOffset?));
        type.GetProperty("BoughtByUserId")!.PropertyType.Should().Be(typeof(int?));
        type.GetProperty("CommentCount")!.PropertyType.Should().Be(typeof(int));
    }

    [Fact]
    public void ItemDetailDto_HasItemAndComments()
    {
        var props = typeof(ItemDetailDto).GetProperties(BindingFlags.Public | BindingFlags.Instance)
            .Select(p => p.Name)
            .ToHashSet(StringComparer.OrdinalIgnoreCase);

        props.Should().Contain("Item");
        props.Should().Contain("Comments");
    }

    [Fact]
    public void ShoppingCommentDto_HasAllContractProperties()
    {
        // OpenAPI: CommentDto — same shape as Cleaning's
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
    public void ShoppingCommentDto_PropertyTypes_MatchContract()
    {
        var type = typeof(CommentDto);

        type.GetProperty("Id")!.PropertyType.Should().Be(typeof(Guid));
        type.GetProperty("UserId")!.PropertyType.Should().Be(typeof(int));
        type.GetProperty("UserName")!.PropertyType.Should().Be(typeof(string));
        type.GetProperty("Text")!.PropertyType.Should().Be(typeof(string));
        type.GetProperty("IsEdited")!.PropertyType.Should().Be(typeof(bool));
    }

    [Fact]
    public void CreateItemRequest_HasRequiredFields()
    {
        var props = typeof(CreateItemRequest).GetProperties(BindingFlags.Public | BindingFlags.Instance)
            .Select(p => p.Name)
            .ToHashSet(StringComparer.OrdinalIgnoreCase);

        props.Should().Contain("Name");
        props.Should().Contain("Quantity");
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
