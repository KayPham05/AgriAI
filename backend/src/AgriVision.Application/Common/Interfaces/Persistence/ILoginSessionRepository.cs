using AgriVision.Domain.Entities;

namespace AgriVision.Application.Common.Interfaces.Persistence;

public interface ILoginSessionRepository
{
    Task AddAsync(LoginSession session, CancellationToken cancellationToken = default);
    Task<bool> IsActiveAsync(Guid sessionId, Guid userId, CancellationToken cancellationToken = default);
    Task EndAsync(Guid sessionId, Guid userId, CancellationToken cancellationToken = default);
}
