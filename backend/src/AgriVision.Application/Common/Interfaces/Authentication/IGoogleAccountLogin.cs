using AgriVision.Domain.Entities;

namespace AgriVision.Application.Common.Interfaces.Authentication;

public interface IGoogleAccountLogin
{
    Task<User> AuthenticateAsync(string credential, CancellationToken cancellationToken);
}
