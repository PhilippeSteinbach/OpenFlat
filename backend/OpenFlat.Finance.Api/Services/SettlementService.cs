using Microsoft.EntityFrameworkCore;
using OpenFlat.Finance.Api.Data;
using OpenFlat.Shared.Users;

namespace OpenFlat.Finance.Api.Services;

public class SettlementService(FinanceDbContext db)
{
    /// <summary>
    /// Compute the current debt settlement using greedy net-balance matching (FR-022, FR-023, FR-024).
    /// Algorithm:
    /// 1. Sum all expenses per user (total_paid)
    /// 2. Compute fair share = grand_total / 5
    /// 3. Net balance per user = total_paid - fair_share
    /// 4. Greedy match: max-debtor pays max-creditor min(|debt|, credit)
    /// 5. At most N-1 (4) transactions for 5 users
    /// All amounts in cents internally; returned as EUR with 2 decimal places.
    /// </summary>
    public async Task<SettlementResult> CalculateAsync(CancellationToken ct = default)
    {
        var expenses = await db.Expenses.AsNoTracking().ToListAsync(ct);

        var allUsers = PredefinedUsers.All;
        var totalCents = expenses.Sum(e => (long)e.AmountCents);
        var fairShareCents = totalCents / allUsers.Count;
        var remainder = totalCents % allUsers.Count;

        // Build per-user totals
        var paidByUser = new Dictionary<int, long>();
        foreach (var user in allUsers)
            paidByUser[user.Id] = 0;
        foreach (var exp in expenses)
            paidByUser[exp.LoggedByUserId] += exp.AmountCents;

        // Net balances (positive = owed money, negative = owes money)
        // Distribute remainder evenly: first 'remainder' users get +1 cent fair share
        var balances = new List<UserBalance>();
        var netBalanceCents = new Dictionary<int, long>();
        var sortedUsers = allUsers.OrderBy(u => u.Id).ToList();

        for (var i = 0; i < sortedUsers.Count; i++)
        {
            var user = sortedUsers[i];
            var share = fairShareCents + (i < remainder ? 1 : 0);
            var net = paidByUser[user.Id] - share;
            netBalanceCents[user.Id] = net;
            balances.Add(new UserBalance(
                user.Id, user.Name,
                paidByUser[user.Id] / 100.0,
                net / 100.0));
        }

        // Greedy net-balance matching
        var transactions = new List<SettlementTransaction>();

        // Create mutable lists of debtors and creditors
        var debtors = netBalanceCents
            .Where(kv => kv.Value < 0)
            .Select(kv => new { UserId = kv.Key, Balance = kv.Value })
            .OrderBy(d => d.Balance) // most negative first
            .Select(d => (UserId: d.UserId, Balance: d.Balance))
            .ToList();

        var creditors = netBalanceCents
            .Where(kv => kv.Value > 0)
            .Select(kv => new { UserId = kv.Key, Balance = kv.Value })
            .OrderByDescending(c => c.Balance) // most positive first
            .Select(c => (UserId: c.UserId, Balance: c.Balance))
            .ToList();

        // Convert to mutable arrays for in-place updates
        var debtorBalances = debtors.Select(d => d.Balance).ToArray();
        var creditorBalances = creditors.Select(c => c.Balance).ToArray();

        var di = 0;
        var ci = 0;
        while (di < debtors.Count && ci < creditors.Count)
        {
            var debtAbs = Math.Abs(debtorBalances[di]);
            var credit = creditorBalances[ci];
            var transferCents = Math.Min(debtAbs, credit);

            if (transferCents > 0)
            {
                var fromUser = PredefinedUsers.GetById(debtors[di].UserId)!;
                var toUser = PredefinedUsers.GetById(creditors[ci].UserId)!;
                transactions.Add(new SettlementTransaction(
                    fromUser.Id, fromUser.Name,
                    toUser.Id, toUser.Name,
                    transferCents / 100.0));
            }

            debtorBalances[di] += transferCents;
            creditorBalances[ci] -= transferCents;

            if (debtorBalances[di] == 0) di++;
            if (creditorBalances[ci] == 0) ci++;
        }

        var isSettled = transactions.Count == 0;

        return new SettlementResult(
            isSettled,
            transactions,
            balances,
            totalCents / 100.0,
            (totalCents / 100.0) / allUsers.Count);
    }
}

public record SettlementResult(
    bool IsSettled,
    List<SettlementTransaction> Transactions,
    List<UserBalance> Balances,
    double TotalExpenses,
    double FairShare);

public record SettlementTransaction(
    int FromUserId, string FromUserName,
    int ToUserId, string ToUserName,
    double AmountEur);

public record UserBalance(
    int UserId, string UserName,
    double TotalPaidEur, double NetBalanceEur);
