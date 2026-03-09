namespace OpenFlat.Api.Features.Cleaning.Data;

public enum CleaningEffort
{
    None = 0,    // 0 points
    Normal = 1,  // 1 point
    Big = 2,     // 2 points
    Huge = 3,    // 4 points
    Custom = 4   // user-defined
}

public enum FrequencyUnit
{
    Days,
    Weeks
}

public class CleaningTask
{
    public Guid Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public CleaningEffort Effort { get; set; } = CleaningEffort.Normal;
    public int Points { get; set; }
    public int FrequencyValue { get; set; } = 7;
    public FrequencyUnit FrequencyUnit { get; set; } = FrequencyUnit.Days;
    public DateOnly DueDate { get; set; }
    public int[] RotationOrder { get; set; } = [];
    public int RotationIndex { get; set; }
    public int? AssignedUserId { get; set; }
    public DateTimeOffset? LastCompletedAt { get; set; }
    public int? LastCompletedByUserId { get; set; }
    public int CreatedByUserId { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }

    public ICollection<CleaningComment> Comments { get; set; } = new List<CleaningComment>();
    public ICollection<CleaningCompletionLog> CompletionLogs { get; set; } = new List<CleaningCompletionLog>();
}
