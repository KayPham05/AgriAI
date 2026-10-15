using AgriVision.Domain.Entities;

namespace AgriVision.Application.Common.Interfaces.Authentication;

public interface IJwtTokenGenerator
{
    string GenerateToken(User user);
    GeneratedSessionToken GenerateSessionToken(User user);
}

public record GeneratedSessionToken(string Token, Guid SessionId, DateTime CreatedAt, DateTime ExpiresAt);
