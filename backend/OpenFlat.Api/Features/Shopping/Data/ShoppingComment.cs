namespace OpenFlat.Api.Features.Shopping.Data;

public class ShoppingComment
{
    public Guid Id { get; set; }
    public Guid ItemId { get; set; }
    public int UserId { get; set; }
    public string Text { get; set; } = string.Empty;
    public bool IsEdited { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }

    public ShoppingItem Item { get; set; } = null!;
}
