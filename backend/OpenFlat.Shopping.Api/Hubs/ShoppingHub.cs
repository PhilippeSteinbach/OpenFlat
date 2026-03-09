using Microsoft.AspNetCore.SignalR;

namespace OpenFlat.Shopping.Api.Hubs;

/// <summary>
/// SignalR hub for real-time shopping list updates.
/// Server-to-client only — all broadcasts go through IHubContext&lt;ShoppingHub&gt;.
/// Client methods: ItemCreated, ItemUpdated, ItemBought, ItemUndone, ItemDeleted,
/// ItemAutoCleared, CommentAdded, CommentUpdated, CommentDeleted.
/// </summary>
public class ShoppingHub : Hub
{
}
