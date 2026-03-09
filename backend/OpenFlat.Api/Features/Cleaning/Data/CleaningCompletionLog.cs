namespace OpenFlat.Api.Features.Cleaning.Data;

public class CleaningCompletionLog
{
    public Guid Id { get; set; }
    public Guid TaskId { get; set; }
    public int CompletedByUserId { get; set; }
    public int? AssignedUserId { get; set; }
    public int PointsEarned { get; set; }
    public DateTimeOffset CompletedAt { get; set; }

    public CleaningTask Task { get; set; } = null!;
}
