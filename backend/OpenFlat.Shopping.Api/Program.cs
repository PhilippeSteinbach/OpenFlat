using OpenFlat.Shopping.Api.Data;

var builder = WebApplication.CreateBuilder(args);

builder.AddServiceDefaults();
builder.AddNpgsqlDbContext<ShoppingDbContext>("openflat");
builder.Services.AddSignalR();

var app = builder.Build();

app.MapDefaultEndpoints();
// Endpoints and SignalR hubs will be mapped in Phase 5 (US3)

app.Run();
