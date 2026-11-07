namespace AgriVision.Application.Common.Interfaces.Authentication;

public interface IPasswordRecovery
{
    Task RequestAsync(string email, CancellationToken cancellationToken);
    Task<bool> ResetAsync(string token, string password, CancellationToken cancellationToken);
}
