using System.Security.Cryptography;
using System.Text;
using System.Globalization;
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
        var cutoff = now.AddSeconds(-60);
        var normalizedEmail = email.Trim().ToLowerInvariant();
        var user = await database.Users.FirstOrDefaultAsync(
            user => user.Email.ToLower() == normalizedEmail && user.IsActive && user.PasswordHash != null,
            cancellationToken);
        if (user is null || await database.UserActionTokens.AnyAsync(token =>
                token.UserId == user.Id && token.Purpose == Purpose && token.CreatedAt > cutoff,
                cancellationToken))
            return;

        var code = RandomNumberGenerator.GetInt32(100_000_000).ToString("D8", CultureInfo.InvariantCulture);
        var actionToken = new UserActionToken
        {
            UserId = user.Id,
            Purpose = Purpose,
            CreatedAt = now,
            ExpiresAt = now.AddSeconds(60)
        };
        actionToken.TokenHash = Hash(actionToken.Id, code);
        database.UserActionTokens.Add(actionToken);
        await database.SaveChangesAsync(cancellationToken);
        try
        {
            await emailSender.SendAsync(user.Email, "Mã đặt lại mật khẩu AgriAI",
                EmailTemplate.Create("Đặt lại mật khẩu", "Sử dụng mã dưới đây để tiếp tục đặt lại mật khẩu.", code,
                    "Mã có hiệu lực trong 60 giây. Nếu bạn không yêu cầu thao tác này, hãy bỏ qua email."), cancellationToken);
        }
        catch (Exception exception) when (!cancellationToken.IsCancellationRequested)
        {
            logger.LogWarning("Password reset email failed for user {UserId} ({ErrorType}).",
                user.Id, exception.GetType().Name);
        }
    }

    public async Task<bool> VerifyAsync(string token, CancellationToken cancellationToken)
    {
        var candidates = await database.UserActionTokens.AsNoTracking().Where(item => item.Purpose == Purpose
            && item.ConsumedAt == null && item.ExpiresAt > DateTime.UtcNow).ToListAsync(cancellationToken);
        return candidates.Any(item => Matches(item, token));
    }

    public async Task<bool> ResetAsync(string token, string password, CancellationToken cancellationToken)
    {
        var now = DateTime.UtcNow;
        var candidates = database.UserActionTokens.AsNoTracking().Where(item =>
            item.Purpose == Purpose && item.ConsumedAt == null && item.ExpiresAt > now);
        var actionToken = (await candidates.ToListAsync(cancellationToken)).SingleOrDefault(item => Matches(item, token));
        if (actionToken is null)
            return false;

        var passwordHash = BCrypt.Net.BCrypt.HashPassword(password);
        await using var transaction = await database.Database.BeginTransactionAsync(cancellationToken);
        var updated = await database.Users.Where(user =>
                user.Id == actionToken.UserId && user.IsActive && user.PasswordHash != null)
            .ExecuteUpdateAsync(update => update.SetProperty(user => user.PasswordHash, passwordHash)
                .SetProperty(user => user.UpdatedAt, now), cancellationToken);
        if (updated != 1)
            return false;

        var consumed = await database.UserActionTokens.Where(item => item.Id == actionToken.Id && item.ConsumedAt == null
                && item.ExpiresAt > now)
            .ExecuteUpdateAsync(update => update.SetProperty(item => item.ConsumedAt, now), cancellationToken);
        if (consumed != 1)
            return false;

        await database.UserActionTokens.Where(item => item.UserId == actionToken.UserId && item.ConsumedAt == null
                && (item.Purpose == Purpose || item.Purpose == "TwoFactorLogin"))
            .ExecuteUpdateAsync(update => update.SetProperty(item => item.ConsumedAt, now), cancellationToken);
        await database.UserSessions.Where(session => session.UserId == actionToken.UserId && session.RevokedAt == null)
            .ExecuteUpdateAsync(update => update.SetProperty(session => session.RevokedAt, now)
                .SetProperty(session => session.RevocationReason, "password_reset"), cancellationToken);
        await transaction.CommitAsync(cancellationToken);
        if (emailSender is not null)
        {
            try
            {
                var user = await database.Users.AsNoTracking().SingleAsync(item => item.Id == actionToken.UserId, cancellationToken);
                await emailSender.SendAsync(user.Email, "Mật khẩu AgriAI đã được đổi",
                    EmailTemplate.Create("Đổi mật khẩu thành công", "Mật khẩu tài khoản của bạn đã được cập nhật.",
                        null, "Nếu bạn không thực hiện thao tác này, hãy liên hệ hỗ trợ ngay."), cancellationToken);
            }
            catch (Exception exception) when (!cancellationToken.IsCancellationRequested)
            {
                logger.LogWarning("Password change notification failed for user {UserId} ({ErrorType}).",
                    actionToken.UserId, exception.GetType().Name);
            }
        }
        return true;
    }

    private static bool Matches(UserActionToken token, string code) =>
        token.TokenHash == Hash(token.Id, code.Trim()) || token.TokenHash == LegacyHash(code.Trim());

    private static string Hash(Guid tokenId, string token) =>
        Convert.ToHexStringLower(SHA256.HashData(Encoding.UTF8.GetBytes($"{tokenId:N}:{token}")));

    private static string LegacyHash(string token) =>
        Convert.ToHexStringLower(SHA256.HashData(Encoding.UTF8.GetBytes(token)));
}
