using OpenFlat.Shared.Users;

namespace OpenFlat.Api.Shared;

public static class UserHelper
{
    public static int GetUserId(HttpContext ctx)
    {
        var header = ctx.Request.Headers["X-User-Id"].FirstOrDefault();
        if (int.TryParse(header, out var userId) && PredefinedUsers.IsValid(userId))
            return userId;
        throw new ValidationException("Missing or invalid X-User-Id header.");
    }
}
