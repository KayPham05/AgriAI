using AgriVision.Application.Common.Interfaces.Services;
using AgriVision.Domain.Entities;
using AgriVision.Infrastructure.Persistence;
using AgriVision.Infrastructure.Persistence.Repositories;
using AgriVision.TestSupport;
using FluentAssertions;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.TestHost;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;

namespace AgriVision.IntegrationTests.Persistence;

public class CatalogImagePersistenceTests(AgriVisionFactory factory) : IClassFixture<AgriVisionFactory>
{
    [Theory]
    [InlineData("plants", true)]
    [InlineData("plants", false)]
    [InlineData("diseases", true)]
    [InlineData("diseases", false)]
    public async Task Cleanup_PreservesReferencedCatalogImages_AndRetriesRetiredImages(string kind, bool active)
    {
        var storage = new CleanupStorage { FailDeletion = true };
        await using var host = factory.WithWebHostBuilder(builder => builder.ConfigureTestServices(services =>
        {
            services.RemoveAll<IImageStorage>();
            services.AddSingleton<IImageStorage>(storage);
        }));
        await using var scope = host.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var owner = new User { Email = $"catalog_{Guid.NewGuid():N}@example.test", FullName = "Catalog fixture", Role = "Admin" };
        var id = Guid.NewGuid();
        string Key() => ImageStorageKey.Create(new(owner.Id, Guid.Empty, Guid.NewGuid(), CatalogKind: kind, CatalogId: id), ".png");
        var current = Key();
        var retired = Key();
        var recent = Key();
        db.Users.Add(owner);
        if (kind == "plants") db.Plants.Add(new Plant { Id = id, Name = $"Cleanup_{id:N}", ImageKey = current, IsActive = active });
        else db.Diseases.Add(new Disease { Id = id, Name = $"Cleanup_{id:N}", ImageKey = current, IsActive = active });
        db.PendingImageUploads.AddRange(
            new PendingImageUpload { Key = current, UserId = owner.Id, CreatedAt = DateTime.UtcNow.AddHours(-2) },
            new PendingImageUpload { Key = retired, UserId = owner.Id, CreatedAt = DateTime.UtcNow.AddHours(-2) },
            new PendingImageUpload { Key = recent, UserId = owner.Id });
        await db.SaveChangesAsync();

        try
        {
            (await ImageExpiryCleanup.RunAsync(host.Services)).Should().Be(1);
            storage.Attempted.Should().Equal(retired);
            (await db.PendingImageUploads.AnyAsync(p => p.Key == current)).Should().BeFalse();
            (await db.PendingImageUploads.AnyAsync(p => p.Key == retired)).Should().BeTrue();

            storage.FailDeletion = false;
            (await ImageExpiryCleanup.RunAsync(host.Services)).Should().Be(0);
            storage.Deleted.Should().Equal(retired);
            (await db.PendingImageUploads.AnyAsync(p => p.Key == retired)).Should().BeFalse();
            (await db.PendingImageUploads.AnyAsync(p => p.Key == recent)).Should().BeTrue();
            var savedKey = kind == "plants"
                ? await db.Plants.Where(p => p.Id == id).Select(p => p.ImageKey).SingleAsync()
                : await db.Diseases.Where(d => d.Id == id).Select(d => d.ImageKey).SingleAsync();
            savedKey.Should().Be(current);
            // Retrying must not delete a current image after its journal row is gone.
            (await ImageExpiryCleanup.RunAsync(host.Services)).Should().Be(0);
            storage.Deleted.Should().Equal(retired);
        }
        finally
        {
            // Isolate theory rows even when a cleanup assertion fails.
            await db.PendingImageUploads.Where(p => p.UserId == owner.Id).ExecuteDeleteAsync();
        }
    }

    [Theory]
    [InlineData("plants", false)]
    [InlineData("plants", true)]
    [InlineData("diseases", false)]
    [InlineData("diseases", true)]
    public async Task StaleTextOrStatusSave_DoesNotOverwriteAnImageReplacedByAnotherContext(string kind, bool deactivate)
    {
        await using var staleScope = factory.Services.CreateAsyncScope();
        var stale = staleScope.ServiceProvider.GetRequiredService<AppDbContext>();
        var id = Guid.NewGuid();
        var owner = Guid.NewGuid();
        string Key() => ImageStorageKey.Create(new(owner, Guid.Empty, Guid.NewGuid(), CatalogKind: kind, CatalogId: id), ".png");
        var oldKey = Key();
        var replacement = Key();
        if (kind == "plants") stale.Plants.Add(new Plant { Id = id, Name = $"Stale_{id:N}", ImageKey = oldKey });
        else stale.Diseases.Add(new Disease { Id = id, Name = $"Stale_{id:N}", ImageKey = oldKey });
        await stale.SaveChangesAsync();

        await using var replacementScope = factory.Services.CreateAsyncScope();
        var fresh = replacementScope.ServiceProvider.GetRequiredService<AppDbContext>();
        if (kind == "plants")
        {
            var repo = new PlantRepository(stale);
            var draft = (await repo.GetByIdAsync(id))!;
            await fresh.Plants.Where(p => p.Id == id).ExecuteUpdateAsync(u => u.SetProperty(p => p.ImageKey, replacement));
            draft.ImageKey.Should().Be(oldKey, "the draft was opened before the replacement");
            if (deactivate) await repo.DeleteAsync(draft);
            else { draft.Description = "Updated content"; await repo.UpdateAsync(draft); }
            var saved = await fresh.Plants.AsNoTracking().SingleAsync(p => p.Id == id);
            saved.ImageKey.Should().Be(replacement);
            saved.IsActive.Should().Be(!deactivate);
            if (!deactivate) saved.Description.Should().Be("Updated content");
        }
        else
        {
            var repo = new DiseaseRepository(stale);
            var draft = (await repo.GetByIdAsync(id))!;
            await fresh.Diseases.Where(d => d.Id == id).ExecuteUpdateAsync(u => u.SetProperty(d => d.ImageKey, replacement));
            draft.ImageKey.Should().Be(oldKey, "the draft was opened before the replacement");
            if (deactivate) await repo.DeleteAsync(draft);
            else { draft.Description = "Updated content"; await repo.UpdateAsync(draft); }
            var saved = await fresh.Diseases.AsNoTracking().SingleAsync(d => d.Id == id);
            saved.ImageKey.Should().Be(replacement);
            saved.IsActive.Should().Be(!deactivate);
            if (!deactivate) saved.Description.Should().Be("Updated content");
        }
    }

    private sealed class CleanupStorage : IImageStorage
    {
        public bool FailDeletion { get; set; }
        public List<string> Attempted { get; } = [];
        public List<string> Deleted { get; } = [];

        public Task<bool> DeleteImageAsync(string key, CancellationToken cancellationToken = default)
        {
            Attempted.Add(key);
            if (FailDeletion) throw new IOException("Synthetic deletion failure");
            Deleted.Add(key);
            return Task.FromResult(true);
        }

        public Task<ImageDownloadResult?> ReadImageAsync(string publicId, CancellationToken cancellationToken = default) => throw new NotSupportedException();
        public Task<ImageUploadResult> UploadImageAsync(IFormFile file, ImageStorageContext context, CancellationToken cancellationToken = default) => throw new NotSupportedException();
        public Task<ImageUploadResult> UploadImageAsync(Stream imageStream, string fileName, ImageStorageContext context, CancellationToken cancellationToken = default) => throw new NotSupportedException();
    }
}
