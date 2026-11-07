using System.Globalization;
using System.Security.Cryptography;
using System.Text;
using AgriVision.Application.Common.Interfaces.Authentication;
using AgriVision.Domain.Entities;
using AgriVision.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace AgriVision.Infrastructure.Authentication;

public sealed class EmailTwoFactor(
    AppDbContext database,
    IConfiguration configuration,
    ILogger<EmailTwoFactor> logger,
    IAccountEmailSender? emailSender = null) : IEmailTwoFactor
{
    public async Task<Guid> IssueAsync(User user, string purpose, CancellationToken cancellationToken)
    {
        if (emailSender is null)
            throw new InvalidOperationException("Dịch vụ gửi mã xác minh chưa được cấu hình.");

        var action = purpose switch
        {
            "TwoFactorSetup" => "bật xác thực hai lớp",
            "TwoFactorDisable" => "tắt xác thực hai lớp",
            "TwoFactorLogin" => "đăng nhập",
            "PasswordChange" => "đổi mật khẩu",
            _ => throw new ArgumentOutOfRangeException(nameof(purpose))
        };

        var now = DateTime.UtcNow;
        var recent = now.AddSeconds(-30);
        if (await database.UserActionTokens.AnyAsync(item => item.UserId == user.Id
                && item.Purpose == purpose && item.CreatedAt > recent, cancellationToken))
            throw new InvalidOperationException("Vui lòng đợi 30 giây trước khi yêu cầu mã mới.");

        var code = RandomNumberGenerator.GetInt32(100_000_000).ToString("D8", CultureInfo.InvariantCulture);
        var challengeId = Guid.NewGuid();
        database.UserActionTokens.Add(new UserActionToken
        {
            Id = challengeId,
            UserId = user.Id,
            Purpose = purpose,
            TokenHash = Hash(challengeId, code),
            CreatedAt = now,
            ExpiresAt = now.AddSeconds(60)
        });
        await database.SaveChangesAsync(cancellationToken);
        await emailSender.SendAsync(user.Email, $"Mã {action} AgriAI",
            EmailTemplate.Create($"Mã {action}", "Nhập mã xác nhận dưới đây để tiếp tục.", code,
                "Mã chỉ dùng cho yêu cầu này và có hiệu lực trong 60 giây."), cancellationToken);
        return challengeId;
    }

    public async Task<User?> VerifyAsync(
        Guid challengeId, string code, Guid? accountId, bool? enable, CancellationToken cancellationToken)
    {
        var now = DateTime.UtcNow;
        var purpose = enable switch
        {
            true => "TwoFactorSetup",
            false => "TwoFactorDisable",
            null => "TwoFactorLogin"
        };
        var hash = Hash(challengeId, code);
        var eligible = database.UserActionTokens.Where(item => item.Id == challengeId && item.Purpose == purpose
            && item.ConsumedAt == null && item.FailedAttempts < 5 && item.ExpiresAt > now && item.User.IsActive
            && (accountId.HasValue ? item.UserId == accountId && item.User.EmailTwoFactorEnabled != enable
                : item.User.EmailTwoFactorEnabled));

        await using var transaction = await database.Database.BeginTransactionAsync(cancellationToken);
        var consumed = await eligible.Where(item => item.TokenHash == hash)
            .ExecuteUpdateAsync(update => update.SetProperty(item => item.ConsumedAt, now), cancellationToken);
        if (consumed == 0)
        {
            await eligible.Where(item => item.TokenHash != hash).ExecuteUpdateAsync(
                update => update.SetProperty(item => item.FailedAttempts, item => item.FailedAttempts + 1), cancellationToken);
            await transaction.CommitAsync(cancellationToken);
            return null;
        }

        var user = await database.UserActionTokens.Where(item => item.Id == challengeId)
            .Select(item => item.User).SingleAsync(cancellationToken);
        if (enable.HasValue)
        {
            user.EmailTwoFactorEnabled = enable.Value;
            user.EmailVerifiedAt ??= now;
            await database.SaveChangesAsync(cancellationToken);
        }
        await transaction.CommitAsync(cancellationToken);
        if (enable.HasValue && emailSender is not null)
        {
            try
            {
                var action = enable.Value ? "bật" : "tắt";
                var title = enable.Value ? "Xác thực hai yếu tố đã bật" : "Xác thực hai yếu tố đã tắt";
                var intro = enable.Value
                    ? "Tài khoản của bạn đã bật xác thực hai yếu tố thành công."
                    : "Tài khoản của bạn đã tắt xác thực hai yếu tố thành công.";
                var footer = enable.Value
                    ? "Mỗi lần đăng nhập mới, AgriAI sẽ gửi một mã 8 chữ số đến email này."
                    : "Tài khoản của bạn sẽ không còn yêu cầu mã xác minh khi đăng nhập.";
                await emailSender.SendAsync(user.Email, $"Đã {action} xác thực hai yếu tố AgriAI",
                    EmailTemplate.Create(title, intro, null, footer), cancellationToken);
            }
            catch (Exception exception) when (!cancellationToken.IsCancellationRequested)
            {
                logger.LogWarning("Two-factor setup notification failed for user {UserId} ({ErrorType}).",
                    user.Id, exception.GetType().Name);
            }
        }
        return user;
    }

    public async Task<Guid?> ResendAsync(Guid challengeId, Guid? accountId, string purpose, CancellationToken cancellationToken)
    {
        var challenge = await database.UserActionTokens.AsNoTracking()
            .Where(item => item.Id == challengeId && item.Purpose == purpose && item.ConsumedAt == null && item.User.IsActive
                && (!accountId.HasValue || item.UserId == accountId.Value))
            .Select(item => item.User)
            .SingleOrDefaultAsync(cancellationToken);
        return challenge is null ? null : await IssueAsync(challenge, purpose, cancellationToken);
    }

    public async Task<User?> VerifyPasswordChangeAsync(Guid challengeId, string code, Guid accountId, CancellationToken cancellationToken)
    {
        var now = DateTime.UtcNow;
        var hash = Hash(challengeId, code);
        var eligible = database.UserActionTokens.Where(item => item.Id == challengeId
            && item.Purpose == "PasswordChange" && item.UserId == accountId && item.ConsumedAt == null
            && item.FailedAttempts < 5 && item.ExpiresAt > now && item.User.IsActive);
        await using var transaction = await database.Database.BeginTransactionAsync(cancellationToken);
        var consumed = await eligible.Where(item => item.TokenHash == hash)
            .ExecuteUpdateAsync(update => update.SetProperty(item => item.ConsumedAt, now), cancellationToken);
        if (consumed == 0)
        {
            await eligible.Where(item => item.TokenHash != hash).ExecuteUpdateAsync(
                update => update.SetProperty(item => item.FailedAttempts, item => item.FailedAttempts + 1), cancellationToken);
            await transaction.CommitAsync(cancellationToken);
            return null;
        }
        var user = await database.UserActionTokens.Where(item => item.Id == challengeId)
            .Select(item => item.User).SingleAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);
        return user;
    }

    private string Hash(Guid challengeId, string code)
    {
        var key = Encoding.UTF8.GetBytes(configuration["JwtSettings:Secret"]!);
        return Convert.ToHexStringLower(HMACSHA256.HashData(key, Encoding.UTF8.GetBytes($"{challengeId:N}:{code}")));
    }
}
