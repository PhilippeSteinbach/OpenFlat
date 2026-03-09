using OpenFlat.Finance.Api.Data;
using OpenFlat.Finance.Api.Endpoints;
using OpenFlat.Finance.Api.Services;

var builder = WebApplication.CreateBuilder(args);

builder.AddServiceDefaults();
builder.AddNpgsqlDbContext<FinanceDbContext>("openflat");
builder.Services.AddScoped<ExpenseService>();
builder.Services.AddScoped<SettlementService>();

var app = builder.Build();

app.MapDefaultEndpoints();

// Handle service exceptions as proper HTTP responses
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
    catch (ForbiddenException ex)
    {
        ctx.Response.StatusCode = 403;
        await ctx.Response.WriteAsJsonAsync(new { title = "Forbidden", detail = ex.Message, status = 403 });
    }
});

app.MapExpenseEndpoints();
app.MapSettlementEndpoints();

app.Run();
