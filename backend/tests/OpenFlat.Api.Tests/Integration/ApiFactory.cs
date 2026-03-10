using Microsoft.AspNetCore.Hosting;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.Configuration;
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
        builder.ConfigureAppConfiguration((_, config) =>
        {
            config.AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["ConnectionStrings:openflat"] = _postgres.GetConnectionString()
            });
        });
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
