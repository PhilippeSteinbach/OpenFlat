using System.Reflection;
using FluentAssertions;
using OpenFlat.Api.Features.Finance.Endpoints;
using OpenFlat.Api.Features.Finance.Services;
using Xunit;

namespace OpenFlat.Api.Tests.Contract;

/// <summary>
/// Validates that Finance API DTO record types match the OpenAPI contract schemas.
/// </summary>
public class FinanceContractTests
{
    [Fact]
    public void ExpenseDto_HasAllContractProperties()
    {
        // OpenAPI: ExpenseDto — id, amountEur, description, loggedByUserId,
        //          loggedByUserName, createdAt, updatedAt, isOwn
        var props = typeof(ExpenseDto).GetProperties(BindingFlags.Public | BindingFlags.Instance)
            .Select(p => p.Name)
            .ToHashSet(StringComparer.OrdinalIgnoreCase);

        props.Should().Contain("Id");
        props.Should().Contain("AmountEur");
        props.Should().Contain("Description");
        props.Should().Contain("LoggedByUserId");
        props.Should().Contain("LoggedByUserName");
        props.Should().Contain("CreatedAt");
        props.Should().Contain("UpdatedAt");
        props.Should().Contain("IsOwn");
    }

    [Fact]
    public void ExpenseDto_PropertyTypes_MatchContract()
    {
        var type = typeof(ExpenseDto);

        type.GetProperty("Id")!.PropertyType.Should().Be(typeof(Guid));
        type.GetProperty("AmountEur")!.PropertyType.Should().Be(typeof(double));
        type.GetProperty("Description")!.PropertyType.Should().Be(typeof(string));
        type.GetProperty("LoggedByUserId")!.PropertyType.Should().Be(typeof(int));
        type.GetProperty("LoggedByUserName")!.PropertyType.Should().Be(typeof(string));
        type.GetProperty("IsOwn")!.PropertyType.Should().Be(typeof(bool));
    }

    [Fact]
    public void SettlementResult_HasAllContractProperties()
    {
        // OpenAPI: SettlementResult — isSettled, transactions, balances, totalExpenses, fairShare
        var props = typeof(SettlementResult).GetProperties(BindingFlags.Public | BindingFlags.Instance)
            .Select(p => p.Name)
            .ToHashSet(StringComparer.OrdinalIgnoreCase);

        props.Should().Contain("IsSettled");
        props.Should().Contain("Transactions");
        props.Should().Contain("Balances");
        props.Should().Contain("TotalExpenses");
        props.Should().Contain("FairShare");
    }

    [Fact]
    public void SettlementTransaction_HasContractFields()
    {
        // OpenAPI: SettlementTransaction — fromUserId, fromUserName, toUserId, toUserName, amountEur
        var props = typeof(SettlementTransaction).GetProperties(BindingFlags.Public | BindingFlags.Instance)
            .Select(p => p.Name)
            .ToHashSet(StringComparer.OrdinalIgnoreCase);

        props.Should().Contain("FromUserId");
        props.Should().Contain("FromUserName");
        props.Should().Contain("ToUserId");
        props.Should().Contain("ToUserName");
        props.Should().Contain("AmountEur");
    }

    [Fact]
    public void UserBalance_HasContractFields()
    {
        // OpenAPI: UserBalance — userId, userName, totalPaidEur, netBalanceEur
        var props = typeof(UserBalance).GetProperties(BindingFlags.Public | BindingFlags.Instance)
            .Select(p => p.Name)
            .ToHashSet(StringComparer.OrdinalIgnoreCase);

        props.Should().Contain("UserId");
        props.Should().Contain("UserName");
        props.Should().Contain("TotalPaidEur");
        props.Should().Contain("NetBalanceEur");
    }

    [Fact]
    public void UserBalance_PropertyTypes_MatchContract()
    {
        var type = typeof(UserBalance);

        type.GetProperty("UserId")!.PropertyType.Should().Be(typeof(int));
        type.GetProperty("UserName")!.PropertyType.Should().Be(typeof(string));
        type.GetProperty("TotalPaidEur")!.PropertyType.Should().Be(typeof(double));
        type.GetProperty("NetBalanceEur")!.PropertyType.Should().Be(typeof(double));
    }

    [Fact]
    public void CreateExpenseRequest_HasRequiredFields()
    {
        var props = typeof(CreateExpenseRequest).GetProperties(BindingFlags.Public | BindingFlags.Instance)
            .Select(p => p.Name)
            .ToHashSet(StringComparer.OrdinalIgnoreCase);

        props.Should().Contain("AmountEur");
        props.Should().Contain("Description");
    }
}
