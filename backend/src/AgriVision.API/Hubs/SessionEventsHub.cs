using System.Security.Claims;
using AgriVision.Application.Services.Interfaces;
using AgriVision.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;

namespace AgriVision.API.Hubs;

[Authorize]
public sealed class SessionEventsHub(AppDbContext db) : Hub
{
    public const string NoticeEvent = "SessionRevoked";
    public static string SessionGroup(Guid sessionId) => $"session:{sessionId:D}";

    public override async Task OnConnectedAsync()
    {
        if (!Guid.TryParse(Context.User?.FindFirstValue("sid"), out var sessionId) ||
            !Guid.TryParse(Context.User?.FindFirstValue(ClaimTypes.NameIdentifier), out var userId))
        {
            Context.Abort();
            return;
        }

        // Session-scoped groups keep a new login from receiving an old session's logout.
        await Groups.AddToGroupAsync(Context.ConnectionId, SessionGroup(sessionId), Context.ConnectionAborted);
        // Recheck after joining so a revocation between JWT validation and group join is not missed.
        var session = await db.UserSessions.AsNoTracking().Include(s => s.User)
            .SingleOrDefaultAsync(s => s.Id == sessionId && s.UserId == userId, Context.ConnectionAborted);
        if (session is null)
        {
            Context.Abort();
            return;
        }
        SessionNotice? notice = !session.User.IsActive ? SessionNotice.Locked(session.User.LockReason)
            : session.RevokedAt != null && session.RevocationReason != null
                ? SessionNotice.Revoked(session.RevocationReason) : null;
        if (notice != null)
            await Clients.Caller.SendAsync(NoticeEvent, notice, Context.ConnectionAborted);
        else if (session.RevokedAt != null || session.ExpiresAt <= DateTime.UtcNow)
            Context.Abort();
        await base.OnConnectedAsync();
    }
}
