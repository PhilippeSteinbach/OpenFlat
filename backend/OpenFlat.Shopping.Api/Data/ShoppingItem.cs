namespace OpenFlat.Shopping.Api.Data;

public class ShoppingItem
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public int Quantity { get; set; }
    public int AddedByUserId { get; set; }
    public bool IsBought { get; set; }
    public DateTimeOffset? BoughtAt { get; set; }
    public int? BoughtByUserId { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }

    public ICollection<ShoppingComment> Comments { get; set; } = new List<ShoppingComment>();
}
