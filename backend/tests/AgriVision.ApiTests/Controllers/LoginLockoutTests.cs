using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using AgriVision.Application.DTOs.Auth;
using AgriVision.Infrastructure.Persistence;
using AgriVision.TestSupport;
using FluentAssertions;
using Microsoft.AspNetCore.Hosting;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace AgriVision.ApiTests.Controllers;

public class LoginLockoutTests : IClassFixture<LoginLockoutTests.LockoutFactory>
{
    private readonly LockoutFactory _factory;
    public LoginLockoutTests(LockoutFactory factory) => _factory = factory;

    [Fact]
    [Trait("ApiCase", "auth.login.lockout")]
    public async Task FiveFailures_PersistAndDoubleAfterEveryFiveMore_ThenResetOnSuccess()
    {
        using var client = _factory.CreateClient();
        var email = $"lockout-{Guid.NewGuid():N}@example.test";
        const string password = "Password123!";
        using var registered = await client.PostAsJsonAsync("/api/auth/register", new RegisterRequest("Lockout test", email, password));
        registered.EnsureSuccessStatusCode();
        var original = (await registered.Content.ReadFromJsonAsync<AuthResponse>())!;
        await SetFixturePasswordAsync(original.User.Id, password);
        foreach (var minutes in new[] { 5, 10, 20 })
        {
            for (var attempt = 1; attempt <= 4; attempt++)
            {
                using var wrong = await client.PostAsJsonAsync("/api/auth/login", new LoginRequest(email.ToUpperInvariant(), "Incorrect!"));
                wrong.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
            }
            using var fifth = await client.PostAsJsonAsync("/api/auth/login", new LoginRequest(email, "Incorrect!"));
            fifth.StatusCode.Should().Be(HttpStatusCode.TooManyRequests);
            fifth.Headers.RetryAfter!.Delta.Should().Be(TimeSpan.FromMinutes(minutes));
            var body = await fifth.Content.ReadFromJsonAsync<JsonElement>();
            body.GetProperty("code").GetString().Should().Be("LOGIN_LOCKED");
            body.GetProperty("retryAfterSeconds").GetInt64().Should().Be(minutes * 60);
            _factory.Clock.Advance(TimeSpan.FromSeconds(1));
            using var blocked = await client.PostAsJsonAsync("/api/auth/login", new LoginRequest(email, password));
            blocked.StatusCode.Should().Be(HttpStatusCode.TooManyRequests);
            blocked.Headers.RetryAfter!.Delta.Should().Be(TimeSpan.FromSeconds(minutes * 60 - 1));
            _factory.Clock.Advance(TimeSpan.FromSeconds(minutes * 60 - 1));
        }
        using var success = await client.PostAsJsonAsync("/api/auth/login", new LoginRequest(email, password));
        success.StatusCode.Should().Be(HttpStatusCode.OK);
        // A complete new batch starts again at five minutes after a successful login.
        for (var i = 0; i < 4; i++)
        {
            using var wrong = await client.PostAsJsonAsync("/api/auth/login", new LoginRequest(email, "Incorrect!"));
            wrong.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        }
        using var resetLock = await client.PostAsJsonAsync("/api/auth/login", new LoginRequest(email, "Incorrect!"));
        resetLock.Headers.RetryAfter!.Delta.Should().Be(TimeSpan.FromMinutes(5));
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        (await db.UserSessions.CountAsync(s => s.UserId == original.User.Id)).Should().Be(2);
    }

    [Fact]
    [Trait("ApiCase", "auth.login.lockout_concurrency")]
    public async Task ConcurrentFailures_DoNotLoseCounts_AndDoNotLockAnotherAccount()
    {
        using var client = _factory.CreateClient();
        var email = $"race-{Guid.NewGuid():N}@example.test";
        using var register = await client.PostAsJsonAsync("/api/auth/register", new RegisterRequest("Race test", email, "Password123!"));
        register.EnsureSuccessStatusCode();
        var account = (await register.Content.ReadFromJsonAsync<AuthResponse>())!;
        await SetFixturePasswordAsync(account.User.Id, "Password123!");
        var responses = await Task.WhenAll(Enumerable.Range(0, 5).Select(_ =>
            client.PostAsJsonAsync("/api/auth/login", new LoginRequest(email, "Incorrect!"))));
        try
        {
            responses.Select(r => r.StatusCode).Should().BeEquivalentTo(new[]
            {
                HttpStatusCode.Unauthorized, HttpStatusCode.Unauthorized,
                HttpStatusCode.Unauthorized, HttpStatusCode.Unauthorized, HttpStatusCode.TooManyRequests
            });
        }
        finally { foreach (var response in responses) response.Dispose(); }
        var otherEmail = $"other-{Guid.NewGuid():N}@example.test";
        using var other = await client.PostAsJsonAsync("/api/auth/register", new RegisterRequest("Other test", otherEmail, "Password123!"));
        other.EnsureSuccessStatusCode();
        using var login = await client.PostAsJsonAsync("/api/auth/login", new LoginRequest(otherEmail, "Password123!"));
        login.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    private async Task SetFixturePasswordAsync(Guid userId, string password)
    {
        // Test transaction ordering, not BCrypt cost under coverage/parallel runner load.
        // The production registration/password hash settings are unchanged.
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var hash = BCrypt.Net.BCrypt.HashPassword(password, workFactor: 4);
        await db.Users.Where(user => user.Id == userId)
            .ExecuteUpdateAsync(update => update.SetProperty(user => user.PasswordHash, hash));
    }

    public sealed class LockoutFactory : AgriVisionFactory
    {
        public TestClock Clock { get; } = new();
        protected override void ConfigureWebHost(IWebHostBuilder builder)
        {
            base.ConfigureWebHost(builder);
            builder.ConfigureServices(services => services.AddSingleton<TimeProvider>(Clock));
        }
    }
    public sealed class TestClock : TimeProvider
    {
        private DateTimeOffset _now = new(2026, 11, 27, 0, 0, 0, TimeSpan.Zero);
        public override DateTimeOffset GetUtcNow() => _now;
        public void Advance(TimeSpan amount) => _now += amount;
    }
}
