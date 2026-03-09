using System.Diagnostics;
using Microsoft.EntityFrameworkCore;
using OpenFlat.Api.Features.Cleaning.Data;
using OpenFlat.Api.Features.Finance.Data;
using OpenFlat.Shared.Users;
using OpenFlat.Api.Features.Shopping.Data;

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
            // Vacuum living room — Big effort, 2 pts, every 7 days, overdue by 2 days
            new CleaningTask
            {
                Title = "Vacuum living room",
                Effort = CleaningEffort.Big,
                Points = 2,
                FrequencyValue = 7,
                FrequencyUnit = FrequencyUnit.Days,
                DueDate = today.AddDays(-2),
                RotationOrder = [alex.Id, sam.Id, jordan.Id, 4, 5],
                RotationIndex = 0,
                AssignedUserId = alex.Id,
                CreatedByUserId = alex.Id,
                CreatedAt = now.AddDays(-5),
                UpdatedAt = now.AddDays(-5),
            },
            // Clean kitchen counters — Normal effort, 1 pt, every 3 days, 2 days left
            new CleaningTask
            {
                Title = "Clean kitchen counters",
                Effort = CleaningEffort.Normal,
                Points = 1,
                FrequencyValue = 3,
                FrequencyUnit = FrequencyUnit.Days,
                DueDate = today.AddDays(2),
                RotationOrder = [sam.Id, 4, 5],
                RotationIndex = 0,
                AssignedUserId = sam.Id,
                CreatedByUserId = jordan.Id,
                CreatedAt = now.AddDays(-3),
                UpdatedAt = now.AddDays(-3),
            },
            // Take out trash — None effort, 0 pts, every 1 day, 1 day left
            new CleaningTask
            {
                Title = "Take out trash",
                Effort = CleaningEffort.None,
                Points = 0,
                FrequencyValue = 1,
                FrequencyUnit = FrequencyUnit.Days,
                DueDate = today.AddDays(1),
                RotationOrder = [alex.Id, jordan.Id, sam.Id, 4, 5],
                RotationIndex = 0,
                AssignedUserId = alex.Id,
                CreatedByUserId = sam.Id,
                CreatedAt = now.AddDays(-2),
                UpdatedAt = now.AddDays(-2),
            },
            // Mop bathroom floor — Huge effort, 4 pts, every 14 days, 6 days left
            new CleaningTask
            {
                Title = "Mop bathroom floor",
                Effort = CleaningEffort.Huge,
                Points = 4,
                FrequencyValue = 14,
                FrequencyUnit = FrequencyUnit.Days,
                DueDate = today.AddDays(6),
                RotationOrder = [jordan.Id, alex.Id],
                RotationIndex = 0,
                AssignedUserId = jordan.Id,
                CreatedByUserId = alex.Id,
                CreatedAt = now.AddDays(-1),
                UpdatedAt = now.AddDays(-1),
            },
            // Wash dishes — Normal effort, 1 pt, every 1 day, due today, no rotation
            new CleaningTask
            {
                Title = "Wash dishes",
                Effort = CleaningEffort.Normal,
                Points = 1,
                FrequencyValue = 1,
                FrequencyUnit = FrequencyUnit.Days,
                DueDate = today,
                RotationOrder = [],
                RotationIndex = 0,
                CreatedByUserId = jordan.Id,
                CreatedAt = now.AddDays(-4),
                UpdatedAt = now.AddDays(-4),
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
