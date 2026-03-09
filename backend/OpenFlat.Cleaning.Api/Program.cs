using OpenFlat.Cleaning.Api.Data;
using OpenFlat.Cleaning.Api.Endpoints;
using OpenFlat.Cleaning.Api.Hubs;
using OpenFlat.Cleaning.Api.Services;

var builder = WebApplication.CreateBuilder(args);

builder.AddServiceDefaults();
builder.AddNpgsqlDbContext<CleaningDbContext>("openflat");
builder.Services.AddSignalR();
builder.Services.AddScoped<CleaningTaskService>();
builder.Services.AddScoped<LeaderboardService>();

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

app.MapTaskEndpoints();
app.MapLeaderboardEndpoints();
app.MapHub<CleaningHub>("/hubs/cleaning");

app.Run();
