using AgriVision.Application.Common.Interfaces.Services;
using AgriVision.Domain.Entities;
using AgriVision.Infrastructure.Persistence;
using AgriVision.TestSupport;
using FluentAssertions;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.TestHost;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;

namespace AgriVision.IntegrationTests.Persistence;

public class CatalogImageMigrationTests(AgriVisionFactory factory) : IClassFixture<AgriVisionFactory>
{
    [Theory]
    [InlineData("plants", false)]
    [InlineData("diseases", false)]
    [InlineData("plants", true)]
    public async Task Move_VerifiesBytesBeforeChangingReference_AndCanRetry(string kind, bool corruptCopy)
    {
        var storage = new MigrationStorage { CorruptCopy = corruptCopy };
        await using var host = factory.WithWebHostBuilder(builder => builder.ConfigureTestServices(services =>
        {
            services.RemoveAll<IImageStorage>();
            services.AddSingleton<IImageStorage>(storage);
        }));
        await using var scope = host.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var id = Guid.NewGuid();
        var owner = Guid.NewGuid();
        var oldKey = $"users/{owner:D}/catalog/{kind}/{id:D}/{Guid.NewGuid():D}.png";
        byte[] bytes = [1, 2, 3, 4];
        storage.Objects[oldKey] = bytes;
        // Inactive catalog records and deleted upload owners must also migrate.
        if (kind == "plants") db.Plants.Add(new Plant { Id = id, Name = $"Move_{id:N}", ImageKey = oldKey, IsActive = false });
        else db.Diseases.Add(new Disease { Id = id, Name = $"Move_{id:N}", ImageKey = oldKey, IsActive = false });
        await db.SaveChangesAsync();
        async Task<string?> CurrentKey() => kind == "plants"
            ? await db.Plants.Where(p => p.Id == id).Select(p => p.ImageKey).SingleAsync()
            : await db.Diseases.Where(d => d.Id == id).Select(d => d.ImageKey).SingleAsync();

        try
        {
            (await CatalogImageMigration.RunAsync(host.Services)).Should().Be(corruptCopy ? 1 : 0);
            if (corruptCopy)
            {
                (await CurrentKey()).Should().Be(oldKey);
                storage.Objects[oldKey].Should().Equal(bytes);
                storage.Deleted.Should().BeEmpty();
                (await db.PendingImageUploads.AnyAsync(p => p.UserId == owner)).Should().BeTrue();
                storage.CorruptCopy = false;
                (await CatalogImageMigration.RunAsync(host.Services)).Should().Be(0);
            }
            var key = (await CurrentKey())!;
            key.Should().StartWith($"category/{(kind == "plants" ? "plant" : "disease")}/{id:D}/{owner:D}/");
            storage.Objects[key].Should().Equal(bytes);
            storage.Objects.ContainsKey(oldKey).Should().BeFalse();
            storage.Deleted.Should().Equal(oldKey);
            (await db.PendingImageUploads.AnyAsync(p => p.Key == key || p.Key == oldKey)).Should().BeFalse();
            var count = storage.UploadCount;
            (await CatalogImageMigration.RunAsync(host.Services)).Should().Be(0);
            storage.UploadCount.Should().Be(count, "already migrated objects are skipped");
        }
        finally
        {
            await db.PendingImageUploads.Where(p => p.UserId == owner).ExecuteDeleteAsync();
            if (kind == "plants") await db.Plants.Where(p => p.Id == id).ExecuteDeleteAsync();
            else await db.Diseases.Where(d => d.Id == id).ExecuteDeleteAsync();
        }
    }

    private sealed class MigrationStorage : IImageStorage
    {
        public Dictionary<string, byte[]> Objects { get; } = [];
        public List<string> Deleted { get; } = [];
        public bool CorruptCopy { get; set; }
        public int UploadCount { get; private set; }
        public Task<ImageDownloadResult?> ReadImageAsync(string key, CancellationToken ct = default) =>
            Task.FromResult(Objects.TryGetValue(key, out var bytes) ? new ImageDownloadResult(bytes, "image/png") : null);
        public Task<bool> DeleteImageAsync(string key, CancellationToken ct = default)
        {
            Deleted.Add(key);
            Objects.Remove(key);
            return Task.FromResult(true);
        }
        public async Task<ImageUploadResult> UploadImageAsync(Stream input, string fileName, ImageStorageContext context, CancellationToken ct = default)
        {
            using var buffer = new MemoryStream();
            await input.CopyToAsync(buffer, ct);
            var key = ImageStorageKey.Create(context, Path.GetExtension(fileName));
            Objects[key] = CorruptCopy ? [0] : buffer.ToArray();
            UploadCount++;
            return new(key, key);
        }
        public Task<ImageUploadResult> UploadImageAsync(IFormFile file, ImageStorageContext context, CancellationToken ct = default) =>
            throw new NotSupportedException();
    }
}
