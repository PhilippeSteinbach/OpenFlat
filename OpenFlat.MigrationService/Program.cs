using OpenFlat.Cleaning.Api.Data;
using OpenFlat.Finance.Api.Data;
using OpenFlat.MigrationService;
using OpenFlat.Shopping.Api.Data;

var builder = Host.CreateApplicationBuilder(args);

builder.AddServiceDefaults();
builder.Services.AddHostedService<MigrationWorker>();
builder.Services.AddOpenTelemetry()
    .WithTracing(tracing => tracing.AddSource(MigrationWorker.ActivitySourceName));

builder.AddNpgsqlDbContext<CleaningDbContext>("openflat");
builder.AddNpgsqlDbContext<ShoppingDbContext>("openflat");
builder.AddNpgsqlDbContext<FinanceDbContext>("openflat");

var host = builder.Build();
host.Run();
