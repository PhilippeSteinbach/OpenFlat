namespace OpenFlat.Api.Features.Cleaning.Data;

public class CleaningComment
{
    public Guid Id { get; set; }
    public Guid TaskId { get; set; }
    public int UserId { get; set; }
    public string Text { get; set; } = string.Empty;
    public bool IsEdited { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }

    public CleaningTask Task { get; set; } = null!;
}
