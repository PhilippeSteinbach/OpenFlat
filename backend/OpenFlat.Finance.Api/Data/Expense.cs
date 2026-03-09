namespace OpenFlat.Finance.Api.Data;

public class Expense
{
    public Guid Id { get; set; }
    public int AmountCents { get; set; }
    public string Description { get; set; } = string.Empty;
    public int LoggedByUserId { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
}
