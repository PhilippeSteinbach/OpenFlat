using OpenFlat.Shopping.Api.Data;
using OpenFlat.Shopping.Api.Endpoints;
using OpenFlat.Shopping.Api.Hubs;
using OpenFlat.Shopping.Api.Services;

var builder = WebApplication.CreateBuilder(args);

builder.AddServiceDefaults();
builder.AddNpgsqlDbContext<ShoppingDbContext>("openflat");
builder.Services.AddSignalR();
builder.Services.AddScoped<ShoppingItemService>();
builder.Services.AddHostedService<AutoClearService>();

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

app.MapItemEndpoints();
app.MapHub<ShoppingHub>("/hubs/shopping");

app.Run();
