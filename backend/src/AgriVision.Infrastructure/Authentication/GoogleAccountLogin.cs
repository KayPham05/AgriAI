using AgriVision.Application.Common.Interfaces.Authentication;
using AgriVision.Domain.Entities;
using AgriVision.Infrastructure.Persistence;
using Google.Apis.Auth;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Npgsql;

namespace AgriVision.Infrastructure.Authentication;

public sealed class GoogleAccountLogin(AppDbContext database, IConfiguration configuration) : IGoogleAccountLogin
{
    public async Task<User> AuthenticateAsync(string credential, CancellationToken cancellationToken)
    {
        var clientId = configuration["Google:ClientId"];
        if (string.IsNullOrWhiteSpace(clientId))
            throw new UnauthorizedAccessException("Đăng nhập Google chưa được cấu hình.");

        GoogleJsonWebSignature.Payload identity;
        try
        {
            identity = await GoogleJsonWebSignature.ValidateAsync(credential,
                new GoogleJsonWebSignature.ValidationSettings { Audience = [clientId] }).WaitAsync(cancellationToken);
        }
        catch (InvalidJwtException)
        {
            throw new UnauthorizedAccessException("Thông tin đăng nhập Google không hợp lệ.");
        }

        if (string.IsNullOrWhiteSpace(identity.Subject))
            throw new UnauthorizedAccessException("Thông tin đăng nhập Google không hợp lệ.");

        var existing = await FindUserAsync(identity.Subject, cancellationToken);
        if (existing is not null)
            return existing;

        var email = identity.Email?.Trim().ToLowerInvariant();
        if (!identity.EmailVerified || string.IsNullOrEmpty(email) || email.Length > 255
            || (!email.EndsWith("@gmail.com", StringComparison.Ordinal) && string.IsNullOrWhiteSpace(identity.HostedDomain)))
            throw new UnauthorizedAccessException("Hãy sử dụng tài khoản Gmail hoặc Google Workspace đã xác minh.");

        if (await database.Users.AnyAsync(user => user.Email.ToLower() == email, cancellationToken))
            throw new InvalidOperationException("Email đã có tài khoản AgriAI. Hãy đăng nhập bằng mật khẩu.");

        var name = string.IsNullOrWhiteSpace(identity.Name) ? email.Split('@')[0] : identity.Name;
        var account = new User
        {
            Email = email,
            FullName = name[..Math.Min(name.Length, 100)],
            EmailVerifiedAt = DateTime.UtcNow
        };
        database.UserIdentities.Add(new UserIdentity { ProviderSubject = identity.Subject, User = account });
        try
        {
            await database.SaveChangesAsync(cancellationToken);
            return account;
        }
        catch (DbUpdateException exception) when (exception.InnerException is PostgresException
            { SqlState: PostgresErrorCodes.UniqueViolation })
        {
            database.ChangeTracker.Clear();
            return await FindUserAsync(identity.Subject, cancellationToken)
                ?? throw new InvalidOperationException("Email đã có tài khoản AgriAI. Hãy đăng nhập bằng mật khẩu.");
        }
    }

    private Task<User?> FindUserAsync(string subject, CancellationToken cancellationToken) =>
        database.UserIdentities.Where(item => item.Provider == "Google" && item.ProviderSubject == subject)
            .Select(item => item.User).SingleOrDefaultAsync(cancellationToken);
}
