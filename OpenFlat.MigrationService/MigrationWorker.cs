using System.Diagnostics;
using Microsoft.EntityFrameworkCore;
using OpenFlat.Cleaning.Api.Data;
using OpenFlat.Finance.Api.Data;
using OpenFlat.Shared.Users;
using OpenFlat.Shopping.Api.Data;

namespace OpenFlat.MigrationService;

public class MigrationWorker(
    IServiceProvider serviceProvider,
    IHostApplicationLifetime hostApplicationLifetime,
    ILogger<MigrationWorker> logger) : BackgroundService
{
    public const string ActivitySourceName = "Migrations";
    private static readonly ActivitySource s_activitySource = new(ActivitySourceName);

    protected override async Task ExecuteAsync(CancellationToken ct)
    {
        using var activity = s_activitySource.StartActivity(
            "Migrating database", ActivityKind.Client);

        try
        {
            using var scope = serviceProvider.CreateScope();

            var cleaning = scope.ServiceProvider.GetRequiredService<CleaningDbContext>();
            var shopping = scope.ServiceProvider.GetRequiredService<ShoppingDbContext>();
            var finance = scope.ServiceProvider.GetRequiredService<FinanceDbContext>();

            logger.LogInformation("Migrating cleaning schema...");
            await MigrateAsync(cleaning, ct);

            logger.LogInformation("Migrating shopping schema...");
            await MigrateAsync(shopping, ct);

            logger.LogInformation("Migrating finance schema...");
            await MigrateAsync(finance, ct);

            logger.LogInformation("Seeding sample data...");
            await SeedCleaningDataAsync(cleaning, ct);
            await SeedShoppingDataAsync(shopping, ct);
            await SeedFinanceDataAsync(finance, ct);

            logger.LogInformation("Database migration and seeding completed successfully.");
        }
        catch (Exception ex)
        {
            activity?.AddException(ex);
            logger.LogError(ex, "An error occurred during database migration.");
            throw;
        }

        hostApplicationLifetime.StopApplication();
    }

    private static async Task MigrateAsync(DbContext context, CancellationToken ct)
    {
        var strategy = context.Database.CreateExecutionStrategy();
        await strategy.ExecuteAsync(async () =>
        {
            await context.Database.MigrateAsync(ct);
        });
    }

    private static async Task SeedCleaningDataAsync(CleaningDbContext db, CancellationToken ct)
    {
        if (await db.Tasks.AnyAsync(ct))
            return;

        var alex = PredefinedUsers.GetById(1)!;
        var jordan = PredefinedUsers.GetById(2)!;
        var sam = PredefinedUsers.GetById(3)!;

        var now = DateTimeOffset.UtcNow;
        var today = DateOnly.FromDateTime(DateTime.UtcNow);

        db.Tasks.AddRange(
            new CleaningTask
            {
                Title = "Vacuum living room",
                Points = 30,
                IsDone = false,
                DueDate = today.AddDays(-2), // overdue
                AssignedUserId = alex.Id,
                CreatedByUserId = alex.Id,
                CreatedAt = now.AddDays(-5),
                UpdatedAt = now.AddDays(-5),
            },
            new CleaningTask
            {
                Title = "Clean kitchen counters",
                Points = 20,
                IsDone = false,
                DueDate = today.AddDays(1), // due soon
                AssignedUserId = jordan.Id,
                CreatedByUserId = jordan.Id,
                CreatedAt = now.AddDays(-3),
                UpdatedAt = now.AddDays(-3),
            },
            new CleaningTask
            {
                Title = "Take out trash",
                Points = 10,
                IsDone = false,
                DueDate = today.AddDays(2), // due soon
                AssignedUserId = sam.Id,
                CreatedByUserId = sam.Id,
                CreatedAt = now.AddDays(-2),
                UpdatedAt = now.AddDays(-2),
            },
            new CleaningTask
            {
                Title = "Mop bathroom floor",
                Points = 25,
                IsDone = false,
                DueDate = null, // no deadline
                CreatedByUserId = alex.Id,
                CreatedAt = now.AddDays(-1),
                UpdatedAt = now.AddDays(-1),
            },
            new CleaningTask
            {
                Title = "Wash dishes",
                Points = 15,
                IsDone = true,
                CompletedAt = now.AddHours(-6),
                AssignedUserId = jordan.Id,
                CreatedByUserId = jordan.Id,
                CreatedAt = now.AddDays(-4),
                UpdatedAt = now.AddHours(-6),
            }
        );

        await db.SaveChangesAsync(ct);
    }

    private static async Task SeedShoppingDataAsync(ShoppingDbContext db, CancellationToken ct)
    {
        if (await db.Items.AnyAsync(ct))
            return;

        var alex = PredefinedUsers.GetById(1)!;
        var sam = PredefinedUsers.GetById(3)!;
        var taylor = PredefinedUsers.GetById(4)!;
        var casey = PredefinedUsers.GetById(5)!;

        db.Items.AddRange(
            new ShoppingItem
            {
                Name = "Milk",
                Quantity = 2,
                AddedByUserId = alex.Id
            },
            new ShoppingItem
            {
                Name = "Bread",
                Quantity = 1,
                AddedByUserId = sam.Id
            },
            new ShoppingItem
            {
                Name = "Dish soap",
                Quantity = 1,
                AddedByUserId = taylor.Id
            },
            new ShoppingItem
            {
                Name = "Eggs",
                Quantity = 12,
                AddedByUserId = casey.Id,
                IsBought = true,
                BoughtAt = DateTimeOffset.UtcNow,
                BoughtByUserId = casey.Id
            }
        );

        await db.SaveChangesAsync(ct);
    }

    private static async Task SeedFinanceDataAsync(FinanceDbContext db, CancellationToken ct)
    {
        if (await db.Expenses.AnyAsync(ct))
            return;

        var alex = PredefinedUsers.GetById(1)!;
        var sam = PredefinedUsers.GetById(3)!;
        var taylor = PredefinedUsers.GetById(4)!;

        db.Expenses.AddRange(
            new Expense
            {
                AmountCents = 4550,
                Description = "Weekly groceries",
                LoggedByUserId = alex.Id
            },
            new Expense
            {
                AmountCents = 1200,
                Description = "Cleaning supplies",
                LoggedByUserId = sam.Id
            },
            new Expense
            {
                AmountCents = 850,
                Description = "Toilet paper",
                LoggedByUserId = taylor.Id
            }
        );

        await db.SaveChangesAsync(ct);
    }
}
