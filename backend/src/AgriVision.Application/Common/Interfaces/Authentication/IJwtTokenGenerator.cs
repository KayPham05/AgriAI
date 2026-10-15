using AgriVision.Domain.Entities;

namespace AgriVision.Application.Common.Interfaces.Authentication;

public interface IJwtTokenGenerator
{
    string GenerateToken(User user);
}
