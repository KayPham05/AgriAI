using AgriVision.Application.Common.Interfaces.Persistence;
using AgriVision.Application.Common.Interfaces.Services;
using AgriVision.Application.DTOs.User;
using AgriVision.Application.Services.Interfaces;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;

namespace AgriVision.Application.Services.Implementations;

public sealed class UserAvatarService(IUserRepository users, IUserService profiles, IImageStorage storage,
    IImageUploadJournal journal, IUnitOfWork unitOfWork, ILogger<UserAvatarService> logger) : IUserAvatarService
{
    public const int MaxBytes = 15 * 1024 * 1024;

    public async Task<UserProfileDto> UploadAsync(Guid userId, IFormFile file, CancellationToken cancellationToken = default)
    {
        if (file == null || file.Length < 1 || file.Length > MaxBytes)
            throw new ArgumentException("Ảnh đại diện phải có dung lượng từ 1 byte đến 15 MB.");
        if (file.ContentType is not ("image/jpeg" or "image/png"))
            throw new ArgumentException("Chỉ hỗ trợ ảnh JPG hoặc PNG.");
        await using var buffer = new MemoryStream();
        await using (var stream = file.OpenReadStream())
        {
            var chunk = new byte[81920];
            int count;
            while ((count = await stream.ReadAsync(chunk, cancellationToken)) > 0)
            {
                if (buffer.Length + count > MaxBytes) throw new ArgumentException("Ảnh đại diện vượt quá 15 MB.");
                await buffer.WriteAsync(chunk.AsMemory(0, count), cancellationToken);
            }
        }
        var bytes = buffer.ToArray();
        var png = bytes.Length >= 24 && bytes.AsSpan(0, 8).SequenceEqual(new byte[] { 137, 80, 78, 71, 13, 10, 26, 10 })
            && bytes.AsSpan(12, 4).SequenceEqual("IHDR"u8);
        var jpeg = bytes.Length >= 4 && bytes[0] == 255 && bytes[1] == 216 && bytes[2] == 255 && bytes[^2] == 255 && bytes[^1] == 217;
        if (!(png && file.ContentType == "image/png") && !(jpeg && file.ContentType == "image/jpeg"))
            throw new ArgumentException("Nội dung ảnh không đúng định dạng JPG hoặc PNG.");

        var context = new ImageStorageContext(userId, Guid.Empty, Guid.NewGuid(), IsAvatar: true);
        var extension = png ? ".png" : ".jpg";
        var key = ImageStorageKey.Create(context, extension);
        var url = ImageStorageKey.AvatarUrlPrefix + key;
        await journal.ReserveAsync(context, key, cancellationToken);
        var uploaded = false;
        var persisted = false;
        string? previous = null;
        var updatedAt = DateTime.UtcNow;
        try
        {
            buffer.Position = 0;
            var upload = await storage.UploadImageAsync(buffer, "avatar" + extension, context, cancellationToken);
            uploaded = true;
            if (upload.PublicId != key) throw new InvalidOperationException("Avatar storage key mismatch.");
            await unitOfWork.ExecuteInTransactionAsync(async () =>
            {
                if (await users.GetByIdForUpdateAsync(userId, cancellationToken) == null)
                    throw new KeyNotFoundException("User not found.");
                var previousUrl = await users.GetAvatarUrlAsync(userId, cancellationToken);
                if (previousUrl?.StartsWith(ImageStorageKey.AvatarUrlPrefix, StringComparison.Ordinal) == true)
                {
                    previous = previousUrl[ImageStorageKey.AvatarUrlPrefix.Length..];
                    if (!ImageStorageKey.IsAvatarForUser(previous, userId)) throw new InvalidOperationException("Invalid avatar metadata.");
                    await journal.RetireAvatarAsync(userId, previous, cancellationToken);
                }
                await users.UpdateAvatarAsync(userId, url, updatedAt, cancellationToken);
                await journal.CompleteAsync(key, cancellationToken);
            }, cancellationToken);
            persisted = true;
        }
        finally
        {
            using var cleanup = new CancellationTokenSource(TimeSpan.FromSeconds(10));
            try
            {
                // A failed commit acknowledgement must not delete an avatar that did persist.
                if (!persisted) persisted = await users.GetAvatarUrlAsync(userId, cleanup.Token) == url;
                if (persisted) await journal.CompleteAsync(key, cleanup.Token);
                else if (await storage.DeleteImageAsync(key, cleanup.Token) && uploaded)
                    await journal.CompleteAsync(key, cleanup.Token);
                if (persisted && previous != null && await storage.DeleteImageAsync(previous, cleanup.Token))
                    await journal.CompleteAsync(previous, cleanup.Token);
            }
            catch (Exception error)
            {
                logger.LogWarning(error, "Avatar cleanup remains pending for the explicit image cleanup command.");
            }
        }
        return (await profiles.GetProfileAsync(userId, cancellationToken)) with { AvatarUrl = url, UpdatedAt = updatedAt };
    }

    public async Task<ImageDownloadResult?> ReadAsync(Guid userId, string key, CancellationToken cancellationToken = default)
    {
        if (!ImageStorageKey.IsAvatarForUser(key, userId)) return null;
        if (await users.GetAvatarUrlAsync(userId, cancellationToken) != ImageStorageKey.AvatarUrlPrefix + key) return null;
        return await storage.ReadImageAsync(key, cancellationToken);
    }
}
