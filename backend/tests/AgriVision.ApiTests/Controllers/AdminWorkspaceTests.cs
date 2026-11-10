using System.Net;
using System.Net.Http.Json;
using AgriVision.ApiTests.Helpers;
using AgriVision.Application.Common.Interfaces.Services;
using AgriVision.Domain.Entities;
using AgriVision.Infrastructure.Persistence;
using AgriVision.Infrastructure.Services;
using AgriVision.TestSupport;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace AgriVision.ApiTests.Controllers;

public class AdminWorkspaceTests(AgriVisionFactory factory) : IClassFixture<AgriVisionFactory>
{
    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    [Trait("ApiCase", "admin.workspace.authorization")]
    public async Task Workspace_RejectsNonAdmins(bool authenticated)
    {
        using var client = factory.CreateClient();
        if (authenticated) await ApiTestClient.Register(client);
        var expected = authenticated ? HttpStatusCode.Forbidden : HttpStatusCode.Unauthorized;
        foreach (var path in new[] { "/api/admin/images", "/api/admin/sessions", $"/api/admin/images/{Guid.NewGuid()}/content" })
            (await client.GetAsync(path)).StatusCode.Should().Be(expected);
        foreach (var path in new[] { $"/api/admin/users/{Guid.NewGuid()}/warnings", $"/api/admin/images/{Guid.NewGuid()}/warnings", $"/api/admin/users/{Guid.NewGuid()}/logout-all" })
            (await client.PostAsJsonAsync(path, new { message = "Fixture" })).StatusCode.Should().Be(expected);
        (await client.DeleteAsync($"/api/admin/images/{Guid.NewGuid()}")).StatusCode.Should().Be(expected);
    }

    [Fact]
    [Trait("ApiCase", "admin.workspace.lifecycle")]
    public async Task Workspace_QueriesRealRows_DeliversPrivateWarnings_RevokesSessions_AndRetainsHistoryAfterImageDeletion()
    {
        using var admin = factory.CreateClient();
        await ApiTestClient.Admin(admin, factory);
        using var owner = factory.CreateClient();
        var user = await ApiTestClient.Register(owner);
        using var other = factory.CreateClient();
        await ApiTestClient.Register(other);
        var imageId = Guid.NewGuid();
        var predictionId = Guid.NewGuid();
        var storageKey = $"users/{user.User.Id:D}/predictions/{predictionId:D}/{imageId:D}.jpg";
        await using (var scope = factory.Services.CreateAsyncScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var pairId = await db.PlantDiseases.Select(p => p.Id).FirstAsync();
            db.Predictions.Add(new Prediction { Id = predictionId, UserId = user.User.Id, PredictedPlantDiseaseId = pairId, ImagePublicId = storageKey,
                Confidence = .9, Images = [new PredictionImage { Id = imageId, PredictionId = predictionId,
                    ImagePublicId = storageKey,
                    ExpiresAt = DateTime.UtcNow.AddDays(1) }] });
            await db.SaveChangesAsync();
        }
        foreach (var resource in new[] { "images", "sessions" })
        {
            using var response = await admin.GetAsync($"/api/admin/{resource}?search={Uri.EscapeDataString(user.User.Email)}&pageSize=1");
            response.StatusCode.Should().Be(HttpStatusCode.OK);
            var body = await ApiTestClient.Json(response);
            body.GetProperty("items").GetArrayLength().Should().Be(1);
            body.GetProperty("items")[0].GetProperty("userId").GetGuid().Should().Be(user.User.Id);
            body.GetRawText().Should().NotContain("passwordHash").And.NotContain("imagePublicId").And.NotContain("token");
        }
        (await admin.GetAsync($"/api/admin/images/{imageId}/content")).StatusCode.Should().Be(HttpStatusCode.OK);
        (await admin.PostAsJsonAsync($"/api/admin/images/{imageId}/warnings", new { message = "Please upload a leaf photo." }))
            .StatusCode.Should().Be(HttpStatusCode.NoContent);
        var notifications = await owner.GetAsync("/api/users/notifications");
        notifications.StatusCode.Should().Be(HttpStatusCode.OK);
        var notice = (await ApiTestClient.Json(notifications)).GetProperty("items")[0];
        notice.GetProperty("message").GetString().Should().Be("Please upload a leaf photo.");
        (await ApiTestClient.Json(await other.GetAsync("/api/users/notifications"))).GetProperty("totalCount").GetInt32().Should().Be(0);
        (await other.PutAsync($"/api/users/notifications/{notice.GetProperty("id").GetGuid()}/read", null)).StatusCode.Should().Be(HttpStatusCode.NotFound);
        (await owner.PutAsync($"/api/users/notifications/{notice.GetProperty("id").GetGuid()}/read", null)).StatusCode.Should().Be(HttpStatusCode.NoContent);
        (await other.DeleteAsync($"/api/users/notifications/{notice.GetProperty("id").GetGuid()}")).StatusCode.Should().Be(HttpStatusCode.NotFound);
        (await owner.DeleteAsync($"/api/users/notifications/{notice.GetProperty("id").GetGuid()}")).StatusCode.Should().Be(HttpStatusCode.NoContent);
        (await admin.PostAsJsonAsync($"/api/admin/users/{user.User.Id}/warnings", new { message = "Account warning" })).StatusCode.Should().Be(HttpStatusCode.NoContent);
        (await other.DeleteAsync("/api/users/notifications")).StatusCode.Should().Be(HttpStatusCode.NoContent);
        (await owner.PutAsync("/api/users/notifications/read", null)).StatusCode.Should().Be(HttpStatusCode.NoContent);
        var readNotice = (await ApiTestClient.Json(await owner.GetAsync("/api/users/notifications"))).GetProperty("items")[0];
        readNotice.GetProperty("readAt").ValueKind.Should().Be(System.Text.Json.JsonValueKind.String);
        (await owner.DeleteAsync("/api/users/notifications")).StatusCode.Should().Be(HttpStatusCode.NoContent);
        (await ApiTestClient.Json(await owner.GetAsync("/api/users/notifications"))).GetProperty("totalCount").GetInt32().Should().Be(0);
        (await admin.DeleteAsync($"/api/admin/images/{imageId}")).StatusCode.Should().Be(HttpStatusCode.NoContent);
        (await admin.DeleteAsync($"/api/admin/images/{imageId}")).StatusCode.Should().Be(HttpStatusCode.NoContent);
        (await admin.GetAsync($"/api/admin/images/{imageId}/content")).StatusCode.Should().Be(HttpStatusCode.NotFound);
        await using (var scope = factory.Services.CreateAsyncScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            (await db.Predictions.AnyAsync(p => p.Id == predictionId)).Should().BeTrue();
            (await db.Predictions.SingleAsync(p => p.Id == predictionId)).ImagePublicId.Should().BeNull();
            (await db.PredictionImages.SingleAsync(i => i.Id == imageId)).DeletedAt.Should().NotBeNull();
        }
        (await admin.PostAsync($"/api/admin/users/{user.User.Id}/logout-all", null)).StatusCode.Should().Be(HttpStatusCode.NoContent);
        (await owner.GetAsync("/api/auth/me")).StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    [Trait("ApiCase", "admin.workspace.validation")]
    public async Task Workspace_ValidatesPagingAndModeration_AndPagesStableSessionRows()
    {
        using var admin = factory.CreateClient();
        var administrator = await ApiTestClient.Admin(admin, factory);
        using var owner = factory.CreateClient();
        var user = await ApiTestClient.Register(owner);
        await using (var scope = factory.Services.CreateAsyncScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var now = DateTime.UtcNow;
            db.UserSessions.AddRange(Enumerable.Range(0, 11).Select(index => new UserSession {
                UserId = user.User.Id, CreatedAt = now.AddDays(-2), ExpiresAt = index % 2 == 0 ? now.AddDays(1) : now.AddDays(-1),
                RevokedAt = index == 0 ? now : null }));
            await db.SaveChangesAsync();
        }
        var filter = $"search={Uri.EscapeDataString(user.User.Email)}&pageSize=10";
        var first = await ApiTestClient.Json(await admin.GetAsync($"/api/admin/sessions?{filter}"));
        var second = await ApiTestClient.Json(await admin.GetAsync($"/api/admin/sessions?{filter}&pageNumber=2"));
        first.GetProperty("items").GetArrayLength().Should().Be(10);
        second.GetProperty("items").GetArrayLength().Should().Be(2);
        var rows = first.GetProperty("items").EnumerateArray().Concat(second.GetProperty("items").EnumerateArray()).ToArray();
        rows.Select(row => row.GetProperty("id").GetGuid()).Should().OnlyHaveUniqueItems();
        rows.Select(row => row.GetProperty("status").GetString()).Should().Contain(["Active", "Expired", "Ended"]);
        foreach (var resource in new[] { "users", "images", "sessions" })
        {
            (await admin.GetAsync($"/api/admin/{resource}?pageSize=101")).StatusCode.Should().Be(HttpStatusCode.BadRequest);
            (await admin.GetAsync($"/api/admin/{resource}?pageNumber=0")).StatusCode.Should().Be(HttpStatusCode.BadRequest);
        }
        (await admin.PostAsJsonAsync($"/api/admin/users/{user.User.Id}/warnings", new { message = "  " })).StatusCode.Should().Be(HttpStatusCode.BadRequest);
        (await admin.PostAsJsonAsync($"/api/admin/users/{Guid.NewGuid()}/warnings", new { message = "Missing" })).StatusCode.Should().Be(HttpStatusCode.NotFound);
        (await admin.PostAsync($"/api/admin/users/{administrator.User.Id}/logout-all", null)).StatusCode.Should().Be(HttpStatusCode.BadRequest);
        (await admin.PutAsJsonAsync($"/api/admin/users/{user.User.Id}/status", new { isActive = false, reason = "Moderation reason" })).StatusCode.Should().Be(HttpStatusCode.OK);
        var locked = await ApiTestClient.Json(await admin.GetAsync($"/api/admin/users/{user.User.Id}"));
        locked.GetProperty("lockReason").GetString().Should().Be("Moderation reason");
        locked.GetProperty("lockedAt").ValueKind.Should().Be(System.Text.Json.JsonValueKind.String);
        (await owner.GetAsync("/api/auth/me")).StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        (await admin.PutAsJsonAsync($"/api/admin/users/{user.User.Id}/status", new { isActive = true })).StatusCode.Should().Be(HttpStatusCode.OK);
        (await owner.GetAsync("/api/auth/me")).StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        using var anonymous = factory.CreateClient();
        (await anonymous.GetAsync("/api/users/notifications")).StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        (await anonymous.PutAsync("/api/users/notifications/read", null)).StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        (await anonymous.DeleteAsync("/api/users/notifications")).StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task ImageDeletion_WhenStorageFails_PreservesImageAndHistoryForRetry()
    {
        using var owner = factory.CreateClient();
        var user = await ApiTestClient.Register(owner);
        await using var scope = factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var prediction = new Prediction { UserId = user.User.Id, Confidence = .9,
            PredictedPlantDiseaseId = await db.PlantDiseases.Select(p => p.Id).FirstAsync() };
        var image = new PredictionImage { Prediction = prediction, PredictionId = prediction.Id,
            UploadedAt = DateTime.UtcNow.AddDays(-2), ExpiresAt = DateTime.UtcNow.AddDays(-1) };
        image.ImagePublicId = ImageStorageKey.Create(new(user.User.Id, prediction.Id, image.Id), ".jpg");
        prediction.ImagePublicId = image.ImagePublicId;
        db.PredictionImages.Add(image);
        await db.SaveChangesAsync();
        var storage = new FailedStorage();
        var service = new AdminImageService(db, storage);
        (await service.ReadAsync(image.Id, default)).Should().BeNull();
        Func<Task> delete = () => service.DeleteAsync(user.User.Id, image.Id, default);
        await delete.Should().ThrowAsync<ImageStorageException>();
        storage.DeleteCalls.Should().Be(1);
        db.ChangeTracker.Clear();
        (await db.PredictionImages.SingleAsync(i => i.Id == image.Id)).DeletedAt.Should().BeNull();
        (await db.Predictions.SingleAsync(p => p.Id == prediction.Id)).ImagePublicId.Should().Be(image.ImagePublicId);
        (await db.AdminAuditLogs.AnyAsync(a => a.Action == "DeleteImage_" + image.Id)).Should().BeFalse();
    }

    private sealed class FailedStorage : IImageStorage
    {
        public int DeleteCalls { get; private set; }
        public Task<bool> DeleteImageAsync(string publicId, CancellationToken cancellationToken = default)
        {
            DeleteCalls++;
            return Task.FromResult(false);
        }
        public Task<ImageDownloadResult?> ReadImageAsync(string publicId, CancellationToken cancellationToken = default) => throw new NotSupportedException();
        public Task<ImageUploadResult> UploadImageAsync(Microsoft.AspNetCore.Http.IFormFile file, ImageStorageContext context, CancellationToken cancellationToken = default) => throw new NotSupportedException();
        public Task<ImageUploadResult> UploadImageAsync(Stream stream, string name, ImageStorageContext context, CancellationToken cancellationToken = default) => throw new NotSupportedException();
    }
}
