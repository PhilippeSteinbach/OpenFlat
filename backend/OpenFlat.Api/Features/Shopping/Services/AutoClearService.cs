using OpenFlat.Api.Shared;
namespace OpenFlat.Api.Features.Shopping.Services;

/// <summary>
/// Background service that periodically clears items bought more than 7 days ago (FR-019b).
/// Runs every hour to check for expired items.
/// </summary>
public class AutoClearService(IServiceProvider serviceProvider, ILogger<AutoClearService> logger) : BackgroundService
{
    private static readonly TimeSpan Interval = TimeSpan.FromHours(1);

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        logger.LogInformation("AutoClearService started. Will check for expired items every {Interval}.", Interval);

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await Task.Delay(Interval, stoppingToken);
            }
            catch (OperationCanceledException)
            {
                break;
            }

            try
            {
                using var scope = serviceProvider.CreateScope();
                var itemService = scope.ServiceProvider.GetRequiredService<ShoppingItemService>();
                var cleared = await itemService.AutoClearExpiredAsync(stoppingToken);

                if (cleared > 0)
                {
                    logger.LogInformation("AutoClearService removed {Count} expired item(s).", cleared);
                }
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                logger.LogError(ex, "AutoClearService encountered an error.");
            }
        }

        logger.LogInformation("AutoClearService stopped.");
    }
}
