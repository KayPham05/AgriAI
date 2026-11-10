using AgriVision.Domain.Entities;

namespace AgriVision.Application.Common.Interfaces.Authentication;

public interface IEmailTwoFactor
{
    Task<Guid> IssueAsync(User user, string purpose, CancellationToken cancellationToken);
    Task<User?> VerifyAsync(Guid challengeId, string code, Guid? accountId, bool? enable, CancellationToken cancellationToken);
    Task<Guid?> ResendAsync(Guid challengeId, Guid? accountId, string purpose, CancellationToken cancellationToken);
    Task<User?> VerifyPasswordChangeAsync(Guid challengeId, string code, Guid accountId, CancellationToken cancellationToken);
}

public sealed class TwoFactorRequiredException(Guid challengeId) : Exception
{
    public Guid ChallengeId { get; } = challengeId;
}
