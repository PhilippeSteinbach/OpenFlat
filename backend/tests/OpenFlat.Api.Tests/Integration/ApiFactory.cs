using Microsoft.AspNetCore.Hosting;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using OpenFlat.Api.Features.Cleaning.Data;
using OpenFlat.Api.Features.Shopping.Data;
using OpenFlat.Api.Features.Finance.Data;
using Testcontainers.PostgreSql;
using Xunit;

namespace OpenFlat.Api.Tests.Integration;

public class ApiFactory : WebApplicationFactory<Program>, IAsyncLifetime
{
    private readonly PostgreSqlContainer _postgres = new PostgreSqlBuilder()
        .WithImage("postgres:16-alpine")
        .Build();

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.ConfigureServices(services =>
        {
            // Aspire's AddNpgsqlDbContext uses DbContextPool (singleton IDbContextPool<T>).
            // We only replace DbContextOptions<T> — keeping it singleton so the pool
            // can still consume it — but pointing it at the Testcontainers instance.
            var cs = _postgres.GetConnectionString();
            OverrideDbContextOptions<CleaningDbContext>(services, cs);
            OverrideDbContextOptions<ShoppingDbContext>(services, cs);
            OverrideDbContextOptions<FinanceDbContext>(services, cs);
        });
    }

    private static void OverrideDbContextOptions<T>(IServiceCollection services, string cs) where T : DbContext
    {
        var toRemove = services
            .Where(d => d.ServiceType == typeof(DbContextOptions<T>)
                     || d.ServiceType == typeof(DbContextOptions))
            .ToList();
        foreach (var d in toRemove) services.Remove(d);

        var opts = new DbContextOptionsBuilder<T>()
            .UseNpgsql(cs)
            .Options;
        services.AddSingleton<DbContextOptions<T>>(opts);
        services.AddSingleton<DbContextOptions>(opts);
    }

    public async ValueTask InitializeAsync()
    {
        await _postgres.StartAsync();
        using var scope = Services.CreateScope();

        var cleaningDb = scope.ServiceProvider.GetRequiredService<CleaningDbContext>();
        await cleaningDb.Database.MigrateAsync();

        var shoppingDb = scope.ServiceProvider.GetRequiredService<ShoppingDbContext>();
        await shoppingDb.Database.MigrateAsync();

        var financeDb = scope.ServiceProvider.GetRequiredService<FinanceDbContext>();
        await financeDb.Database.MigrateAsync();
    }

    public override async ValueTask DisposeAsync()
    {
        await base.DisposeAsync();
        await _postgres.DisposeAsync();
        GC.SuppressFinalize(this);
    }
}
