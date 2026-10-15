using AgriVision.Application.Common.Interfaces.Persistence;
using AgriVision.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace AgriVision.Infrastructure.Persistence.Repositories;

public class LoginSessionRepository(AppDbContext context) : ILoginSessionRepository
{
    public async Task AddAsync(LoginSession session, CancellationToken cancellationToken = default)
    {
        context.LoginSessions.Add(session);
        await context.SaveChangesAsync(cancellationToken);
    }

    public Task<bool> IsActiveAsync(Guid sessionId, Guid userId, CancellationToken cancellationToken = default) =>
        context.LoginSessions.AnyAsync(session => session.Id == sessionId && session.UserId == userId
            && session.EndedAt == null && session.ExpiresAt > DateTime.UtcNow
            && session.User.LockedAt == null
            && (session.User.SessionsRevokedAt == null || session.CreatedAt > session.User.SessionsRevokedAt), cancellationToken);

    public async Task EndAsync(Guid sessionId, Guid userId, CancellationToken cancellationToken = default) =>
        await context.LoginSessions.Where(session => session.Id == sessionId && session.UserId == userId && session.EndedAt == null)
            .ExecuteUpdateAsync(update => update.SetProperty(session => session.EndedAt, DateTime.UtcNow), cancellationToken);
}
