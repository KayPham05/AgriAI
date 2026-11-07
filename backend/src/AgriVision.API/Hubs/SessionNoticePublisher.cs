using AgriVision.Application.Services.Interfaces;
using Microsoft.AspNetCore.SignalR;

namespace AgriVision.API.Hubs;

public sealed class SessionNoticePublisher(
    IHubContext<SessionEventsHub> hub,
    ILogger<SessionNoticePublisher> logger) : ISessionNoticePublisher
{
    public async Task PublishAsync(IReadOnlyCollection<Guid> sessionIds, SessionNotice notice)
    {
        if (sessionIds.Count == 0) return;
        // Independent of the admin HTTP request, which may disconnect after the transaction commits.
        using var timeout = new CancellationTokenSource(TimeSpan.FromSeconds(5));
        try
        {
            await hub.Clients.Groups(sessionIds.Select(SessionEventsHub.SessionGroup).ToArray())
                .SendAsync(SessionEventsHub.NoticeEvent, notice, timeout.Token);
        }
        catch (Exception exception)
        {
            logger.LogWarning(exception, "Session revocation committed, but live notice delivery failed. API validation remains active.");
        }
    }
}
