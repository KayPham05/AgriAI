namespace AgriVision.Application.Common.Interfaces.Authentication;

public sealed class LoginLockedException(long retryAfterSeconds) : Exception("Login is temporarily locked. Please try again later.")
{
    public long RetryAfterSeconds { get; } = retryAfterSeconds;
}
