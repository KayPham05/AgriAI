using System.Security.Cryptography;
using System.Text;
using AgriVision.Application.Common.Interfaces.Authentication;
using AgriVision.Domain.Entities;
using AgriVision.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace AgriVision.Infrastructure.Authentication;

public sealed class PasswordRecovery(
    AppDbContext database,
    ILogger<PasswordRecovery> logger,
    IAccountEmailSender? emailSender = null) : IPasswordRecovery
{
    private const string Purpose = "PasswordReset";

    public async Task RequestAsync(string email, CancellationToken cancellationToken)
    {
        if (emailSender is null)
            return;

        var now = DateTime.UtcNow;
        var cutoff = now.AddMinutes(-2);
        var normalizedEmail = email.Trim().ToLowerInvariant();
        var user = await database.Users.FirstOrDefaultAsync(
            user => user.Email.ToLower() == normalizedEmail && user.IsActive && user.PasswordHash != null,
            cancellationToken);
        if (user is null || await database.UserActionTokens.AnyAsync(token =>
                token.UserId == user.Id && token.Purpose == Purpose && token.CreatedAt > cutoff,
                cancellationToken))
            return;

        var code = Convert.ToHexString(RandomNumberGenerator.GetBytes(16));
        database.UserActionTokens.Add(new UserActionToken
        {
            UserId = user.Id,
            Purpose = Purpose,
            TokenHash = Hash(code),
            CreatedAt = now,
            ExpiresAt = now.AddMinutes(15)
        });
        await database.SaveChangesAsync(cancellationToken);
        try
        {
            await emailSender.SendAsync(user.Email, "Đặt lại mật khẩu AgriAI",
                $"Mã đặt lại mật khẩu của bạn là {code}. Mã có hiệu lực trong 15 phút. " +
                "Nếu bạn không yêu cầu đặt lại mật khẩu, hãy bỏ qua email này.", cancellationToken);
        }
        catch (Exception exception) when (!cancellationToken.IsCancellationRequested)
        {
            logger.LogWarning("Password reset email failed for user {UserId} ({ErrorType}).",
                user.Id, exception.GetType().Name);
        }
    }

    public async Task<bool> ResetAsync(string token, string password, CancellationToken cancellationToken)
    {
        var hash = Hash(token.Trim().ToUpperInvariant());
        var now = DateTime.UtcNow;
        var tokens = database.UserActionTokens.Where(item =>
            item.Purpose == Purpose && item.ConsumedAt == null && item.ExpiresAt > now);
        var userId = await tokens.Where(item => item.TokenHash == hash)
            .Select(item => (Guid?)item.UserId).SingleOrDefaultAsync(cancellationToken);
        if (userId is null)
            return false;

        var passwordHash = BCrypt.Net.BCrypt.HashPassword(password);
        await using var transaction = await database.Database.BeginTransactionAsync(cancellationToken);
        var updated = await database.Users.Where(user =>
                user.Id == userId && user.IsActive && user.PasswordHash != null)
            .ExecuteUpdateAsync(update => update.SetProperty(user => user.PasswordHash, passwordHash)
                .SetProperty(user => user.UpdatedAt, now), cancellationToken);
        if (updated != 1 || !await tokens.AnyAsync(item => item.TokenHash == hash, cancellationToken))
            return false;

        await database.UserActionTokens.Where(item => item.UserId == userId && item.ConsumedAt == null
                && (item.Purpose == Purpose || item.Purpose == "TwoFactorLogin"))
            .ExecuteUpdateAsync(update => update.SetProperty(item => item.ConsumedAt, now), cancellationToken);
        await transaction.CommitAsync(cancellationToken);
        return true;
    }

    private static string Hash(string token) =>
        Convert.ToHexStringLower(SHA256.HashData(Encoding.UTF8.GetBytes(token)));
}
