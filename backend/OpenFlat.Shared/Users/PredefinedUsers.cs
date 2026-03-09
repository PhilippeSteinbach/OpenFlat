namespace OpenFlat.Shared.Users;

/// <summary>
/// Compile-time constants for the 5 predefined household users.
/// No User table in the DB — all user_id columns reference these IDs (1–5).
/// </summary>
public static class PredefinedUsers
{
    public static readonly IReadOnlyList<UserInfo> All = new[]
    {
        new UserInfo(1, "Alex", "Coordinator"),
        new UserInfo(2, "Jordan", "Coordinator"),
        new UserInfo(3, "Sam", "Resident"),
        new UserInfo(4, "Taylor", "Resident"),
        new UserInfo(5, "Casey", "Resident"),
    };

    /// <summary>
    /// Validates that a user ID is within the predefined range (1–5).
    /// </summary>
    public static bool IsValid(int userId) => userId >= 1 && userId <= 5;

    /// <summary>
    /// Gets a user by ID, or null if not found.
    /// </summary>
    public static UserInfo? GetById(int userId) =>
        All.FirstOrDefault(u => u.Id == userId);
}

/// <summary>
/// Immutable record for a predefined household user.
/// </summary>
public record UserInfo(int Id, string Name, string Role);
