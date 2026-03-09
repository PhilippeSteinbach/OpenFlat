using OpenFlat.Api.Features.Cleaning.Data;
using OpenFlat.Api.Features.Finance.Data;
using OpenFlat.MigrationService;
using OpenFlat.Api.Features.Shopping.Data;

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
