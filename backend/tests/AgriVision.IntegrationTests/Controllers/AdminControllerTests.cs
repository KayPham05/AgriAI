using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using AgriVision.Application.DTOs.Auth;
using AgriVision.Application.Common.Interfaces.Authentication;
using AgriVision.Application.Common.Interfaces.Services;
using AgriVision.Infrastructure.Persistence.Repositories;
using Microsoft.AspNetCore.Http;
using AgriVision.Domain.Entities;
using AgriVision.Domain.Enums;
using AgriVision.Infrastructure.Persistence;
using AgriVision.IntegrationTests.Fixtures;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace AgriVision.IntegrationTests.Controllers;

public class AdminControllerTests : IClassFixture<AgriVisionFactory>
{
    private readonly AgriVisionFactory _factory;
    public AdminControllerTests(AgriVisionFactory factory) => _factory = factory;

    [Fact]
    public async Task AdminEndpoints_ShouldRejectAnonymousAndRegularUsers()
    {
        using var client = _factory.CreateClient();
        foreach (var path in new[] { "summary", "activity", "users", "images", "sessions" })
            (await client.GetAsync($"/api/admin/{path}")).StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        var user = await RegisterAsync(client);
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", user.Token);
        foreach (var path in new[] { "summary", "activity", "users", "images", "sessions" })
            (await client.GetAsync($"/api/admin/{path}")).StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task Admin_ShouldReadDatabaseRecords_ValidatePaging_AndRejectDemotedAdmin()
    {
        using var client = _factory.CreateClient();
        var admin = await LoginAdminAsync(client);
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var label = await db.PlantDiseases.FirstAsync();
        var prediction = new Prediction
        {
            UserId = admin.User.Id, PredictedPlantDiseaseId = label.Id,
            ImagePath = "https://images.test/expired.jpg", Confidence = 0.9,
            Images = new List<PredictionImage>
            {
                new() { ImagePath = "https://images.test/expired.jpg", UploadedAt = DateTime.UtcNow.AddDays(-40), ExpiresAt = DateTime.UtcNow.AddDays(-10) }
            }
        };
        db.Predictions.Add(prediction);
        await db.SaveChangesAsync();
        var users = await client.GetStringAsync("/api/admin/users?pageSize=1");
        using var usersJson = JsonDocument.Parse(users);
        usersJson.RootElement.GetProperty("items").GetArrayLength().Should().Be(1);
        users.Should().NotContain("passwordHash").And.NotContain("token");
        (await client.GetAsync("/api/admin/users?pageSize=101")).StatusCode.Should().Be(HttpStatusCode.BadRequest);
        (await client.GetAsync("/api/admin/images?pageNumber=0")).StatusCode.Should().Be(HttpStatusCode.BadRequest);
        using var images = JsonDocument.Parse(await client.GetStringAsync($"/api/admin/images?userId={admin.User.Id}"));
        var image = images.RootElement.GetProperty("items").EnumerateArray().Single();
        image.GetProperty("imageUrl").ValueKind.Should().Be(JsonValueKind.Null);
        image.GetProperty("status").GetString().Should().Be("Expired");
        using var summary = JsonDocument.Parse(await client.GetStringAsync("/api/admin/summary"));
        summary.RootElement.GetProperty("userCount").GetInt32().Should().BeGreaterThan(0);
        var account = await db.Users.FindAsync(admin.User.Id);
        account!.Role = UserRole.User;
        await db.SaveChangesAsync();
        (await client.GetAsync("/api/admin/users")).StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task Activity_ShouldAggregateSevenVietnamDays_WithoutPagingOrAnonymousImages()
    {
        using var client = _factory.CreateClient();
        var admin = await LoginAdminAsync(client);
        using var baseline = JsonDocument.Parse(await client.GetStringAsync("/api/admin/activity"));
        var before = baseline.RootElement.GetProperty("days").EnumerateArray()
            .ToDictionary(day => day.GetProperty("date").GetString()!, day => (
                Users: day.GetProperty("userCount").GetInt32(),
                Images: day.GetProperty("imageCount").GetInt32(),
                Sessions: day.GetProperty("sessionCount").GetInt32()));
        before.Should().HaveCount(7);
        baseline.RootElement.GetProperty("timeZone").GetString().Should().Be("Asia/Ho_Chi_Minh");
        var start = DateTime.SpecifyKind(DateTime.UtcNow.AddHours(7).Date.AddDays(-6).AddHours(-7), DateTimeKind.Utc);
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var label = await db.PlantDiseases.FirstAsync();
        var user = new User { FullName = "Activity fixture", Email = $"activity-{Guid.NewGuid()}@test.com", CreatedAt = start };
        var outside = new User { FullName = "Outside window", Email = $"outside-{Guid.NewGuid()}@test.com", CreatedAt = start.AddTicks(-10) };
        db.Users.AddRange(user, outside);
        var prediction = new Prediction { UserId = user.Id, PredictedPlantDiseaseId = label.Id };
        var anonymous = new Prediction { PredictedPlantDiseaseId = label.Id };
        for (var i = 0; i < 12; i++)
            db.PredictionImages.Add(new PredictionImage { Prediction = prediction, Position = i, UploadedAt = start.AddHours(23), ExpiresAt = start.AddDays(2), DeletedAt = start.AddDays(1) });
        db.PredictionImages.Add(new PredictionImage { Prediction = anonymous, UploadedAt = start, ExpiresAt = start.AddDays(30) });
        db.LoginSessions.AddRange(
            new LoginSession { Id = Guid.NewGuid(), UserId = user.Id, CreatedAt = start.AddDays(1), ExpiresAt = start.AddDays(2), EndedAt = start.AddDays(1).AddHours(1) },
            new LoginSession { Id = Guid.NewGuid(), UserId = user.Id, CreatedAt = start.AddTicks(-10), ExpiresAt = start.AddDays(2) });
        await db.SaveChangesAsync();
        using var result = JsonDocument.Parse(await client.GetStringAsync("/api/admin/activity"));
        var days = result.RootElement.GetProperty("days").EnumerateArray().ToArray();
        days.Should().HaveCount(7);
        for (var i = 0; i < days.Length; i++)
        {
            var day = days[i];
            var date = DateOnly.FromDateTime(start.AddHours(7).AddDays(i)).ToString("yyyy-MM-dd");
            day.GetProperty("date").GetString().Should().Be(date);
            day.GetProperty("userCount").GetInt32().Should().Be(before[date].Users + (i == 0 ? 1 : 0));
            day.GetProperty("imageCount").GetInt32().Should().Be(before[date].Images + (i == 0 ? 12 : 0));
            day.GetProperty("sessionCount").GetInt32().Should().Be(before[date].Sessions + (i == 1 ? 1 : 0));
        }
    }
    [Fact]
    public async Task LoginSessions_ShouldBePersisted_AndLogoutInvalidateTrackedToken()
    {
        using var client = _factory.CreateClient();
        var admin = await LoginAdminAsync(client);
        using var sessions = JsonDocument.Parse(await client.GetStringAsync($"/api/admin/sessions?userId={admin.User.Id}"));
        var items = sessions.RootElement.GetProperty("items");
        items.GetArrayLength().Should().Be(2); // Registration and explicit login.
        items.EnumerateArray().All(item => item.GetProperty("status").GetString() == "Active").Should().BeTrue();
        sessions.RootElement.ToString().Should().NotContain(admin.Token).And.NotContain("passwordHash");
        (await client.PostAsync("/api/auth/logout", null)).StatusCode.Should().Be(HttpStatusCode.NoContent);
        (await client.GetAsync("/api/admin/summary")).StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        (await client.GetAsync("/api/auth/me")).StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task LockAndRestore_ShouldRevokeSessions_AndRequireNewLogin()
    {
        using var adminClient = _factory.CreateClient();
        var admin = await LoginAdminAsync(adminClient);
        using var userClient = _factory.CreateClient();
        var user = await RegisterAsync(userClient);
        userClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", user.Token);
        var path = $"/api/admin/users/{user.User.Id}/lock";
        (await userClient.PutAsJsonAsync(path, new { isLocked = true, reason = "Violation" })).StatusCode.Should().Be(HttpStatusCode.Forbidden);
        (await adminClient.PutAsJsonAsync(path, new { isLocked = true, reason = "Repeated abusive content" })).StatusCode.Should().Be(HttpStatusCode.NoContent);
        (await userClient.GetAsync("/api/auth/me")).StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        (await userClient.PostAsJsonAsync("/api/auth/login", new LoginRequest(user.User.Email, "Password123!"))).StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        (await adminClient.PutAsJsonAsync(path, new { isLocked = false })).StatusCode.Should().Be(HttpStatusCode.NoContent);
        (await userClient.GetAsync("/api/auth/me")).StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        (await userClient.PostAsJsonAsync("/api/auth/login", new LoginRequest(user.User.Email, "Password123!"))).StatusCode.Should().Be(HttpStatusCode.OK);
        (await adminClient.PutAsJsonAsync($"/api/admin/users/{admin.User.Id}/lock", new { isLocked = true, reason = "self" })).StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task ForceLogout_ShouldEndAllSessions_ButAllowNewLogin()
    {
        using var adminClient = _factory.CreateClient();
        await LoginAdminAsync(adminClient);
        using var userClient = _factory.CreateClient();
        var user = await RegisterAsync(userClient);
        var secondResponse = await userClient.PostAsJsonAsync("/api/auth/login", new LoginRequest(user.User.Email, "Password123!"));
        var second = (await secondResponse.Content.ReadFromJsonAsync<AuthResponse>())!;
        using var legacyScope = _factory.Services.CreateScope();
        var legacyDb = legacyScope.ServiceProvider.GetRequiredService<AppDbContext>();
        var legacyUser = (await legacyDb.Users.FindAsync(user.User.Id))!;
        var legacyToken = legacyScope.ServiceProvider.GetRequiredService<IJwtTokenGenerator>().GenerateToken(legacyUser);
        (await adminClient.PostAsync($"/api/admin/users/{user.User.Id}/logout-all", null)).StatusCode.Should().Be(HttpStatusCode.NoContent);
        foreach (var token in new[] { user.Token, second.Token, legacyToken })
        {
            userClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
            (await userClient.GetAsync("/api/auth/me")).StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        }
        (await userClient.PostAsJsonAsync("/api/auth/login", new LoginRequest(user.User.Email, "Password123!"))).StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task ModerationWarningsAndImageDeletion_ShouldPreserveHistory_AndKeepNoticesPrivate()
    {
        using var adminClient = _factory.CreateClient();
        await LoginAdminAsync(adminClient);
        using var userClient = _factory.CreateClient();
        var user = await RegisterAsync(userClient);
        userClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", user.Token);
        using var otherClient = _factory.CreateClient();
        var other = await RegisterAsync(otherClient);
        otherClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", other.Token);
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var label = await db.PlantDiseases.FirstAsync();
        var prediction = new Prediction { UserId = user.User.Id, PredictedPlantDiseaseId = label.Id, ImagePath = "https://images.test/moderation.jpg", ImagePublicId = "integration/moderation" };
        var image = new PredictionImage { Prediction = prediction, ImagePath = prediction.ImagePath, ImagePublicId = prediction.ImagePublicId, ExpiresAt = DateTime.UtcNow.AddDays(30) };
        db.PredictionImages.Add(image);
        await db.SaveChangesAsync();
        var userWarning = $"/api/admin/users/{user.User.Id}/warnings";
        (await adminClient.PostAsJsonAsync(userWarning, new { message = "   " })).StatusCode.Should().Be(HttpStatusCode.BadRequest);
        (await otherClient.PostAsJsonAsync(userWarning, new { message = "abuse" })).StatusCode.Should().Be(HttpStatusCode.Forbidden);
        (await adminClient.PostAsJsonAsync(userWarning, new { message = "Respect the community rules" })).StatusCode.Should().Be(HttpStatusCode.NoContent);
        (await adminClient.PostAsJsonAsync($"/api/admin/images/{image.Id}/warnings", new { message = "Do not upload inappropriate images" })).StatusCode.Should().Be(HttpStatusCode.NoContent);
        var notices = await userClient.GetStringAsync("/api/notifications");
        notices.Should().Contain("Respect the community rules").And.Contain("Do not upload inappropriate images");
        (await otherClient.GetStringAsync("/api/notifications")).Should().NotContain("Respect the community rules");
        (await userClient.PostAsync("/api/notifications/read-all", null)).StatusCode.Should().Be(HttpStatusCode.NoContent);
        (await userClient.GetStringAsync("/api/notifications")).Should().NotContain("\"readAt\":null");
        var failedStorageRepository = new AdminRepository(db, new RejectingImageStorage());
        await Assert.ThrowsAsync<InvalidOperationException>(() => failedStorageRepository.DeleteImageAsync(image.Id, default));
        await db.Entry(image).ReloadAsync();
        image.DeletedAt.Should().BeNull();
        image.ImagePath.Should().NotBeNull();
        (await adminClient.DeleteAsync($"/api/admin/images/{image.Id}")).StatusCode.Should().Be(HttpStatusCode.NoContent);
        await db.Entry(image).ReloadAsync();
        image.DeletedAt.Should().NotBeNull();
        image.ImagePath.Should().BeNull();
        (await db.Predictions.AnyAsync(item => item.Id == prediction.Id)).Should().BeTrue();
        (await adminClient.DeleteAsync($"/api/admin/images/{image.Id}")).StatusCode.Should().Be(HttpStatusCode.NoContent);
        (await userClient.DeleteAsync("/api/notifications")).StatusCode.Should().Be(HttpStatusCode.NoContent);
        (await userClient.GetStringAsync("/api/notifications")).Should().Be("[]");
    }

    private static async Task<AuthResponse> RegisterAsync(HttpClient client)
    {
        var response = await client.PostAsJsonAsync("/api/auth/register",
            new RegisterRequest("Admin integration", $"admin-{Guid.NewGuid()}@example.test", "Password123!"));
        response.EnsureSuccessStatusCode();
        return (await response.Content.ReadFromJsonAsync<AuthResponse>())!;
    }

    private sealed class RejectingImageStorage : IImageStorage
    {
        public Task<ImageUploadResult> UploadImageAsync(IFormFile file, CancellationToken cancellationToken = default) => throw new NotSupportedException();
        public Task<ImageUploadResult> UploadImageAsync(Stream stream, string name, CancellationToken cancellationToken = default) => throw new NotSupportedException();
        public Task<bool> DeleteImageAsync(string id, CancellationToken cancellationToken = default) => Task.FromResult(false);
    }

    private async Task<AuthResponse> LoginAdminAsync(HttpClient client)
    {
        var account = await RegisterAsync(client);
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var user = await db.Users.FindAsync(account.User.Id);
        user!.Role = UserRole.Admin;
        await db.SaveChangesAsync();
        var response = await client.PostAsJsonAsync("/api/auth/login", new LoginRequest(account.User.Email, "Password123!"));
        response.EnsureSuccessStatusCode();
        var login = (await response.Content.ReadFromJsonAsync<AuthResponse>())!;
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", login.Token);
        return login;
    }
}
