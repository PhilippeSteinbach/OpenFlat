namespace OpenFlat.Shared.Models;

/// <summary>
/// Shared DTO for user information returned in API responses.
/// </summary>
public record UserDto(int Id, string Name, string Role);

/// <summary>
/// Shared DTO for comment data returned in API responses.
/// </summary>
public record CommentDto(
    Guid Id,
    int UserId,
    string UserName,
    string Text,
    bool IsEdited,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt);

/// <summary>
/// Request body for creating or updating a comment.
/// </summary>
public record CommentRequest(string Text);
