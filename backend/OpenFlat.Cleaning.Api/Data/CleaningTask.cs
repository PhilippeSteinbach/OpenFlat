namespace OpenFlat.Cleaning.Api.Data;

public class CleaningTask
{
    public Guid Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public int Points { get; set; }
    public bool IsDone { get; set; }
    public DateOnly? DueDate { get; set; }
    public DateTimeOffset? CompletedAt { get; set; }
    public int? AssignedUserId { get; set; }
    public int CreatedByUserId { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }

    public ICollection<CleaningComment> Comments { get; set; } = new List<CleaningComment>();
}
