using AgriVision.Domain.Entities;

namespace AgriVision.Application.Common.Interfaces.Authentication;

public interface IEmailTwoFactor
{
    Task<Guid> IssueAsync(User user, string purpose, CancellationToken cancellationToken);
    Task<User?> VerifyAsync(Guid challengeId, string code, Guid? accountId, bool? enable, CancellationToken cancellationToken);
}

public sealed class TwoFactorRequiredException(Guid challengeId) : Exception
{
    public Guid ChallengeId { get; } = challengeId;
}
