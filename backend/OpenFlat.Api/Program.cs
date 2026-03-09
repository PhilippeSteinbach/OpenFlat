using OpenFlat.Api.Features.Cleaning.Data;
using OpenFlat.Api.Features.Cleaning.Endpoints;
using OpenFlat.Api.Features.Cleaning.Hubs;
using OpenFlat.Api.Features.Cleaning.Services;
using OpenFlat.Api.Features.Finance.Data;
using OpenFlat.Api.Features.Finance.Endpoints;
using OpenFlat.Api.Features.Finance.Services;
using OpenFlat.Api.Features.Shopping.Data;
using OpenFlat.Api.Features.Shopping.Endpoints;
using OpenFlat.Api.Features.Shopping.Hubs;
using OpenFlat.Api.Features.Shopping.Services;
using OpenFlat.Api.Shared;

var builder = WebApplication.CreateBuilder(args);

builder.AddServiceDefaults();

// All three DbContexts share the same "openflat" database (separate schemas)
builder.AddNpgsqlDbContext<CleaningDbContext>("openflat");
builder.AddNpgsqlDbContext<ShoppingDbContext>("openflat");
builder.AddNpgsqlDbContext<FinanceDbContext>("openflat");

builder.Services.AddSignalR();

// Cleaning services
builder.Services.AddScoped<CleaningTaskService>();
builder.Services.AddScoped<LeaderboardService>();

// Shopping services
builder.Services.AddScoped<ShoppingItemService>();
builder.Services.AddHostedService<AutoClearService>();

// Finance services
builder.Services.AddScoped<ExpenseService>();
builder.Services.AddScoped<SettlementService>();

var app = builder.Build();

app.MapDefaultEndpoints();

// Unified exception-handling middleware
app.Use(async (ctx, next) =>
{
    try
    {
        await next();
    }
    catch (ValidationException ex)
    {
        ctx.Response.StatusCode = 400;
        await ctx.Response.WriteAsJsonAsync(new { title = "Validation Error", detail = ex.Message, status = 400 });
    }
    catch (NotFoundException ex)
    {
        ctx.Response.StatusCode = 404;
        await ctx.Response.WriteAsJsonAsync(new { title = "Not Found", detail = ex.Message, status = 404 });
    }
    catch (ConflictException ex)
    {
        ctx.Response.StatusCode = 409;
        await ctx.Response.WriteAsJsonAsync(new { title = "Conflict", detail = ex.Message, status = 409 });
    }
    catch (ForbiddenException ex)
    {
        ctx.Response.StatusCode = 403;
        await ctx.Response.WriteAsJsonAsync(new { title = "Forbidden", detail = ex.Message, status = 403 });
    }
});

// Cleaning endpoints + hub
app.MapTaskEndpoints();
app.MapLeaderboardEndpoints();
app.MapHub<CleaningHub>("/hubs/cleaning");

// Shopping endpoints + hub
app.MapItemEndpoints();
app.MapHub<ShoppingHub>("/hubs/shopping");

// Finance endpoints
app.MapExpenseEndpoints();
app.MapSettlementEndpoints();

app.Run();

// Enables WebApplicationFactory<Program> for integration tests
public partial class Program { }
