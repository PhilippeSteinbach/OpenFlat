using OpenFlat.Api.Shared;
using Microsoft.AspNetCore.SignalR;
using OpenFlat.Api.Features.Shopping.Data;
using OpenFlat.Api.Features.Shopping.Hubs;
using OpenFlat.Api.Features.Shopping.Services;
using OpenFlat.Shared.Users;

namespace OpenFlat.Api.Features.Shopping.Endpoints;

public static class ItemEndpoints
{
    public static void MapItemEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/items");

        // GET /api/items — List all items (active + recently bought)
        group.MapGet("/", async (ShoppingItemService service) =>
        {
            var result = await service.ListAsync();
            return Results.Ok(new
            {
                active = result.Active.Select(ToDto).ToList(),
                recentlyBought = result.RecentlyBought.Select(ToDto).ToList(),
            });
        });

        // POST /api/items — Create a new shopping item
        group.MapPost("/", async (
            CreateItemRequest req,
            HttpContext ctx,
            ShoppingItemService service,
            IHubContext<ShoppingHub> hub) =>
        {
            var userId = UserHelper.GetUserId(ctx);
            var item = await service.CreateAsync(req.Name, req.Quantity, userId);
            var dto = ToDto(item);
            await hub.Clients.All.SendAsync("ItemCreated", dto);
            return Results.Created($"/api/items/{item.Id}", dto);
        });

        // GET /api/items/{itemId} — Get a single item with comments
        group.MapGet("/{itemId:guid}", async (Guid itemId, ShoppingItemService service) =>
        {
            var item = await service.GetByIdAsync(itemId);
            if (item is null) return Results.NotFound();
            return Results.Ok(ToDetailDto(item));
        });

        // PUT /api/items/{itemId} — Update an item
        group.MapPut("/{itemId:guid}", async (
            Guid itemId,
            UpdateItemRequest req,
            ShoppingItemService service,
            IHubContext<ShoppingHub> hub) =>
        {
            var item = await service.UpdateAsync(itemId, req.Name, req.Quantity);
            var dto = ToDto(item);
            await hub.Clients.All.SendAsync("ItemUpdated", dto);
            return Results.Ok(dto);
        });

        // DELETE /api/items/{itemId} — Delete an item
        group.MapDelete("/{itemId:guid}", async (
            Guid itemId,
            ShoppingItemService service,
            IHubContext<ShoppingHub> hub) =>
        {
            await service.DeleteAsync(itemId);
            await hub.Clients.All.SendAsync("ItemDeleted", itemId);
            return Results.NoContent();
        });

        // POST /api/items/{itemId}/buy — Check off an item
        group.MapPost("/{itemId:guid}/buy", async (
            Guid itemId,
            HttpContext ctx,
            ShoppingItemService service,
            IHubContext<ShoppingHub> hub) =>
        {
            var userId = UserHelper.GetUserId(ctx);
            var item = await service.BuyAsync(itemId, userId);
            var dto = ToDto(item);
            await hub.Clients.All.SendAsync("ItemBought", dto);
            return Results.Ok(dto);
        });

        // POST /api/items/{itemId}/undo — Undo buy
        group.MapPost("/{itemId:guid}/undo", async (
            Guid itemId,
            ShoppingItemService service,
            IHubContext<ShoppingHub> hub) =>
        {
            var item = await service.UndoBuyAsync(itemId);
            var dto = ToDto(item);
            await hub.Clients.All.SendAsync("ItemUndone", dto);
            return Results.Ok(dto);
        });

        // ── Comment endpoints ──────────────────────

        // GET /api/items/{itemId}/comments
        group.MapGet("/{itemId:guid}/comments", async (Guid itemId, ShoppingItemService service) =>
        {
            var item = await service.GetByIdAsync(itemId);
            if (item is null) return Results.NotFound();
            return Results.Ok(item.Comments
                .OrderBy(c => c.CreatedAt)
                .Select(ToCommentDto)
                .ToList());
        });

        // POST /api/items/{itemId}/comments
        group.MapPost("/{itemId:guid}/comments", async (
            Guid itemId,
            CreateCommentRequest req,
            HttpContext ctx,
            ShoppingItemService service,
            IHubContext<ShoppingHub> hub) =>
        {
            var userId = UserHelper.GetUserId(ctx);
            var comment = await service.AddCommentAsync(itemId, userId, req.Text);
            var dto = ToCommentDto(comment);
            await hub.Clients.All.SendAsync("CommentAdded", itemId, dto);
            return Results.Created($"/api/items/{itemId}/comments/{comment.Id}", dto);
        });

        // PUT /api/items/{itemId}/comments/{commentId}
        group.MapPut("/{itemId:guid}/comments/{commentId:guid}", async (
            Guid itemId,
            Guid commentId,
            UpdateCommentRequest req,
            HttpContext ctx,
            ShoppingItemService service,
            IHubContext<ShoppingHub> hub) =>
        {
            var userId = UserHelper.GetUserId(ctx);
            var comment = await service.UpdateCommentAsync(itemId, commentId, userId, req.Text);
            var dto = ToCommentDto(comment);
            await hub.Clients.All.SendAsync("CommentUpdated", itemId, dto);
            return Results.Ok(dto);
        });

        // DELETE /api/items/{itemId}/comments/{commentId}
        group.MapDelete("/{itemId:guid}/comments/{commentId:guid}", async (
            Guid itemId,
            Guid commentId,
            HttpContext ctx,
            ShoppingItemService service,
            IHubContext<ShoppingHub> hub) =>
        {
            var userId = UserHelper.GetUserId(ctx);
            await service.DeleteCommentAsync(itemId, commentId, userId);
            await hub.Clients.All.SendAsync("CommentDeleted", itemId, commentId);
            return Results.NoContent();
        });
    }

    // ── Helpers ──────────────────────

    private static ItemDto ToDto(ShoppingItem item) => new(
        item.Id,
        item.Name,
        item.Quantity,
        item.AddedByUserId,
        PredefinedUsers.GetById(item.AddedByUserId)?.Name ?? "Unknown",
        item.IsBought,
        item.BoughtAt,
        item.BoughtByUserId,
        item.BoughtByUserId.HasValue ? PredefinedUsers.GetById(item.BoughtByUserId.Value)?.Name : null,
        item.CreatedAt,
        item.UpdatedAt,
        item.Comments?.Count ?? 0
    );

    private static ItemDetailDto ToDetailDto(ShoppingItem item) => new(
        ToDto(item),
        item.Comments.OrderBy(c => c.CreatedAt).Select(ToCommentDto).ToList()
    );

    private static CommentDto ToCommentDto(ShoppingComment c) => new(
        c.Id,
        c.UserId,
        PredefinedUsers.GetById(c.UserId)?.Name ?? "Unknown",
        c.Text,
        c.IsEdited,
        c.CreatedAt,
        c.UpdatedAt
    );
}

// ── DTOs ──────────────────────

public record CreateItemRequest(string Name, int Quantity);
public record UpdateItemRequest(string Name, int Quantity);
public record CreateCommentRequest(string Text);
public record UpdateCommentRequest(string Text);

public record ItemDto(
    Guid Id, string Name, int Quantity,
    int AddedByUserId, string AddedByUserName,
    bool IsBought, DateTimeOffset? BoughtAt,
    int? BoughtByUserId, string? BoughtByUserName,
    DateTimeOffset CreatedAt, DateTimeOffset UpdatedAt,
    int CommentCount);

public record ItemDetailDto(ItemDto Item, List<CommentDto> Comments);

public record CommentDto(
    Guid Id, int UserId, string UserName,
    string Text, bool IsEdited,
    DateTimeOffset CreatedAt, DateTimeOffset UpdatedAt);
