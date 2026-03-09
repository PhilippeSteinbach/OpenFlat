using OpenFlat.Finance.Api.Data;

var builder = WebApplication.CreateBuilder(args);

builder.AddServiceDefaults();
builder.AddNpgsqlDbContext<FinanceDbContext>("openflat");

var app = builder.Build();

app.MapDefaultEndpoints();
// Endpoints will be mapped in Phase 6 (US4)

app.Run();
