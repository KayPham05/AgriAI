using System.Security.Claims;
using AgriVision.Application.Common.Interfaces.Persistence;
using AgriVision.Domain.Enums;
using Microsoft.AspNetCore.Authorization;

namespace AgriVision.API.Authentication;

public class CurrentAdminRequirement : IAuthorizationRequirement;

public class CurrentAdminHandler(IUserRepository users) : AuthorizationHandler<CurrentAdminRequirement>
{
    protected override async Task HandleRequirementAsync(AuthorizationHandlerContext context, CurrentAdminRequirement requirement)
    {
        if (!Guid.TryParse(context.User.FindFirstValue(ClaimTypes.NameIdentifier) ?? context.User.FindFirstValue("sub"), out var id)) return;
        var user = await users.GetByIdAsync(id);
        if (user?.Role == UserRole.Admin) context.Succeed(requirement);
    }
}
