using OpenFlat.Cleaning.Api.Data;

var builder = WebApplication.CreateBuilder(args);

builder.AddServiceDefaults();
builder.AddNpgsqlDbContext<CleaningDbContext>("openflat");
builder.Services.AddSignalR();

var app = builder.Build();

app.MapDefaultEndpoints();
// Endpoints and SignalR hubs will be mapped in Phase 4 (US2)

app.Run();
