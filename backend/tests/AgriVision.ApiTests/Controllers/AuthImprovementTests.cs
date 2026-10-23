using System.IdentityModel.Tokens.Jwt;
using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Security.Claims;
using System.Text;
using AgriVision.Application.Common.Interfaces.Authentication;
using AgriVision.Application.Common.Interfaces.Persistence;
using AgriVision.Application.DTOs.Auth;
using AgriVision.Application.DTOs.User;
using AgriVision.Application.Services.Implementations;
using AgriVision.Application.Services.Interfaces;
using AgriVision.Domain.Entities;
using AgriVision.Domain.Enums;
using AgriVision.Infrastructure.Persistence;
using AgriVision.Infrastructure.Persistence.Repositories;
using AgriVision.TestSupport;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.IdentityModel.Tokens;
using Npgsql;
using System.Data.Common;
using Xunit;

namespace AgriVision.ApiTests.Controllers;

[Trait("Category", "Security")]
public class AuthImprovementTests : IClassFixture<AgriVisionFactory>, IDisposable
{
    private readonly AgriVisionFactory _factory;
    private readonly string _connectionString;
    private readonly IServiceScope _services;

    public AuthImprovementTests(AgriVisionFactory factory)
    {
        _factory = factory;
        _services = factory.Services.CreateScope();
        var config = factory.Services.GetRequiredService<IConfiguration>();
        _connectionString = config.GetConnectionString("DefaultConnection") 
            ?? config["ConnectionStrings:DefaultConnection"]!;
    }

    public void Dispose() => _services.Dispose();

    private WebApplicationFactory<Program> CreateRaceFactory(DbCommandInterceptor interceptor)
        => _factory.WithWebHostBuilder(builder => builder.ConfigureServices(services =>
        {
            services.RemoveAll<DbContextOptions<AppDbContext>>();
            services.AddDbContext<AppDbContext>(options =>
                options.UseNpgsql(_connectionString).AddInterceptors(interceptor));
        }));

    private AppDbContext CreateDbContext(DbCommandInterceptor? interceptor = null)
    {
        var builder = new DbContextOptionsBuilder<AppDbContext>()
            .UseNpgsql(_connectionString);

        if (interceptor != null)
        {
            builder.AddInterceptors(interceptor);
        }

        return new AppDbContext(builder.Options);
    }

    private string CreateToken(Guid userId, Guid? sessionId, bool omitSid = false, string? customSid = null)
    {
        var configuration = _factory.Services.GetRequiredService<IConfiguration>();
        var secret = configuration["JwtSettings:Secret"]!;
        var credentials = new SigningCredentials(
            new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secret)), SecurityAlgorithms.HmacSha256);

        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, userId.ToString()),
            new(ClaimTypes.Role, "User")
        };

        if (!omitSid)
        {
            claims.Add(new Claim("sid", customSid ?? sessionId?.ToString() ?? Guid.NewGuid().ToString()));
        }

        var token = new JwtSecurityToken(
            issuer: configuration["JwtSettings:Issuer"] ?? "AgriVisionAPI",
            audience: configuration["JwtSettings:Audience"] ?? "AgriVisionApp",
            claims: claims,
            expires: DateTime.UtcNow.AddHours(2),
            signingCredentials: credentials);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    private static async Task WaitForLockWaitAsync(string connectionString, int waiterPid, int blockerPid, TimeSpan timeout)
    {
        using var cts = new CancellationTokenSource(timeout);
        await using var conn = new NpgsqlConnection(connectionString);
        await conn.OpenAsync(cts.Token);

        while (!cts.Token.IsCancellationRequested)
        {
            await using var cmd = new NpgsqlCommand(
                "SELECT COUNT(*)::int FROM pg_stat_activity WHERE pid = @waiter AND wait_event_type = 'Lock' AND @blocker = ANY(pg_blocking_pids(pid));",
                conn);
            cmd.Parameters.AddWithValue("waiter", waiterPid);
            cmd.Parameters.AddWithValue("blocker", blockerPid);
            var count = (int)(await cmd.ExecuteScalarAsync(cts.Token) ?? 0);
            if (count > 0)
            {
                return;
            }
            await Task.Yield();
        }
        throw new TimeoutException("Timed out waiting for PostgreSQL lock wait state.");
    }

    // 1. Logout nhiều thiết bị: Tạo phiên A/B; logout A trả 204; A gọi /me nhận 401, B vẫn 200; DB chỉ đánh dấu A bị thu hồi.
    [Trait("ApiCase", "existing.AuthImprovementTests.Scenario1_MultiDeviceLogout_ShouldRevokeOnlyCurrentSession_AndKeepOtherSessionActive")]
    [Fact]
    public async Task Scenario1_MultiDeviceLogout_ShouldRevokeOnlyCurrentSession_AndKeepOtherSessionActive()
    {
        using var client = _factory.CreateClient();
        var email = $"multi_dev_{Guid.NewGuid():N}@example.test";
        var password = "Password123!";

        // Register -> Session A
        using var regResponse = await client.PostAsJsonAsync("/api/auth/register",
            new RegisterRequest("Multi Dev User", email, password));
        regResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        var authA = (await regResponse.Content.ReadFromJsonAsync<AuthResponse>())!;

        // Login -> Session B
        using var loginResponse = await client.PostAsJsonAsync("/api/auth/login",
            new LoginRequest(email, password));
        loginResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        var authB = (await loginResponse.Content.ReadFromJsonAsync<AuthResponse>())!;

        var handler = new JwtSecurityTokenHandler();
        var sidA = Guid.Parse(handler.ReadJwtToken(authA.Token).Claims.First(c => c.Type == "sid").Value);
        var sidB = Guid.Parse(handler.ReadJwtToken(authB.Token).Claims.First(c => c.Type == "sid").Value);
        sidA.Should().NotBe(sidB);

        // Logout with Session A's token
        using var logoutRequest = new HttpRequestMessage(HttpMethod.Post, "/api/auth/logout");
        logoutRequest.Headers.Authorization = new AuthenticationHeaderValue("Bearer", authA.Token);
        using var logoutResponse = await client.SendAsync(logoutRequest);
        logoutResponse.StatusCode.Should().Be(HttpStatusCode.NoContent);

        // A calls /me -> 401
        using var meRequestA = new HttpRequestMessage(HttpMethod.Get, "/api/auth/me");
        meRequestA.Headers.Authorization = new AuthenticationHeaderValue("Bearer", authA.Token);
        using var meResponseA = await client.SendAsync(meRequestA);
        meResponseA.StatusCode.Should().Be(HttpStatusCode.Unauthorized);

        // B calls /me -> 200
        using var meRequestB = new HttpRequestMessage(HttpMethod.Get, "/api/auth/me");
        meRequestB.Headers.Authorization = new AuthenticationHeaderValue("Bearer", authB.Token);
        using var meResponseB = await client.SendAsync(meRequestB);
        meResponseB.StatusCode.Should().Be(HttpStatusCode.OK);

        // Verify in DB via fresh scope
        await using var db = CreateDbContext();
        var sessionADb = await db.UserSessions.AsNoTracking().SingleAsync(s => s.Id == sidA);
        var sessionBDb = await db.UserSessions.AsNoTracking().SingleAsync(s => s.Id == sidB);

        sessionADb.RevokedAt.Should().NotBeNull("Session A must be revoked");
        sessionBDb.RevokedAt.Should().BeNull("Session B must remain active");
    }

    // 2. Phạm vi phiên: Sai owner/session không được sửa phiên của tài khoản khác; thiếu/sai sid nhận 401.
    [Trait("ApiCase", "existing.AuthImprovementTests.Scenario2_SessionScope_ShouldRejectInvalidOrCrossUserSid")]
    [Fact]
    public async Task Scenario2_SessionScope_ShouldRejectInvalidOrCrossUserSid()
    {
        using var client = _factory.CreateClient();
        var user1Email = $"user1_{Guid.NewGuid():N}@example.test";
        var user2Email = $"user2_{Guid.NewGuid():N}@example.test";

        var reg1 = await client.PostAsJsonAsync("/api/auth/register", new RegisterRequest("User 1", user1Email, "Password123!"));
        var auth1 = (await reg1.Content.ReadFromJsonAsync<AuthResponse>())!;

        var reg2 = await client.PostAsJsonAsync("/api/auth/register", new RegisterRequest("User 2", user2Email, "Password123!"));
        var auth2 = (await reg2.Content.ReadFromJsonAsync<AuthResponse>())!;

        var handler = new JwtSecurityTokenHandler();
        var sid2 = Guid.Parse(handler.ReadJwtToken(auth2.Token).Claims.First(c => c.Type == "sid").Value);

        // 2a: Token with User 1 id but User 2's session id
        var crossUserToken = CreateToken(auth1.User.Id, sid2);
        using var crossRequest = new HttpRequestMessage(HttpMethod.Post, "/api/auth/logout");
        crossRequest.Headers.Authorization = new AuthenticationHeaderValue("Bearer", crossUserToken);
        using var crossResponse = await client.SendAsync(crossRequest);
        crossResponse.StatusCode.Should().Be(HttpStatusCode.Unauthorized);

        // Verify User 2's session was NOT revoked
        await using (var db = CreateDbContext())
        {
            var session2 = await db.UserSessions.AsNoTracking().SingleAsync(s => s.Id == sid2);
            session2.RevokedAt.Should().BeNull();
        }

        // 2b: Token missing sid claim
        var missingSidToken = CreateToken(auth1.User.Id, null, omitSid: true);
        using var missingSidReq = new HttpRequestMessage(HttpMethod.Post, "/api/auth/logout");
        missingSidReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", missingSidToken);
        using var missingSidResp = await client.SendAsync(missingSidReq);
        missingSidResp.StatusCode.Should().Be(HttpStatusCode.Unauthorized);

        // 2c: Token with malformed sid claim
        var malformedSidToken = CreateToken(auth1.User.Id, null, customSid: "not-a-guid");
        using var malformedReq = new HttpRequestMessage(HttpMethod.Post, "/api/auth/logout");
        malformedReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", malformedSidToken);
        using var malformedResp = await client.SendAsync(malformedReq);
        malformedResp.StatusCode.Should().Be(HttpStatusCode.Unauthorized);

        // 2d: Missing / malformed sid calling /api/auth/me also returns 401
        using var meMissingReq = new HttpRequestMessage(HttpMethod.Get, "/api/auth/me");
        meMissingReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", missingSidToken);
        (await client.SendAsync(meMissingReq)).StatusCode.Should().Be(HttpStatusCode.Unauthorized);

        using var meMalformedReq = new HttpRequestMessage(HttpMethod.Get, "/api/auth/me");
        meMalformedReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", malformedSidToken);
        (await client.SendAsync(meMalformedReq)).StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    // 3. Logout đồng thời: Hai request đã qua xác thực cùng logout một phiên không gây lỗi ghi đè RevokedAt; trạng thái cuối vẫn bị thu hồi.
    [Trait("ApiCase", "existing.AuthImprovementTests.Scenario3_ConcurrentLogout_ShouldNotCorruptOrThrow_AndEndInRevokedState")]
    [Fact]
    public async Task Scenario3_ConcurrentLogout_ShouldNotCorruptOrThrow_AndEndInRevokedState()
    {
        var gate = new LogoutGate();
        using var gatedFactory = _factory.WithWebHostBuilder(builder => builder.ConfigureServices(services =>
        {
            services.RemoveAll<IAuthService>();
            services.AddScoped<AuthService>();
            services.AddScoped<IAuthService>(sp => new GatedAuthService(sp.GetRequiredService<AuthService>(), gate));
        }));
        using var client1 = gatedFactory.CreateClient();
        using var client2 = gatedFactory.CreateClient();
        var email = $"concurrent_logout_{Guid.NewGuid():N}@example.test";

        var reg = await client1.PostAsJsonAsync("/api/auth/register", new RegisterRequest("Concurrent User", email, "Password123!"));
        var auth = (await reg.Content.ReadFromJsonAsync<AuthResponse>())!;

        var handler = new JwtSecurityTokenHandler();
        var sid = Guid.Parse(handler.ReadJwtToken(auth.Token).Claims.First(c => c.Type == "sid").Value);

        using var req1 = new HttpRequestMessage(HttpMethod.Post, "/api/auth/logout");
        req1.Headers.Authorization = new AuthenticationHeaderValue("Bearer", auth.Token);

        using var req2 = new HttpRequestMessage(HttpMethod.Post, "/api/auth/logout");
        req2.Headers.Authorization = new AuthenticationHeaderValue("Bearer", auth.Token);

        var task1 = client1.SendAsync(req1);
        var task2 = client2.SendAsync(req2);

        await gate.BothAuthenticated.Task.WaitAsync(TimeSpan.FromSeconds(30));
        gate.First.TrySetResult(true);
        await gate.FirstRevoked.Task.WaitAsync(TimeSpan.FromSeconds(30));
        await using var snapshot = CreateDbContext();
        var firstRevokedAt = await snapshot.UserSessions.AsNoTracking()
            .Where(s => s.Id == sid).Select(s => s.RevokedAt).SingleAsync();
        firstRevokedAt.Should().NotBeNull();
        gate.Second.TrySetResult(true);
        await Task.WhenAll(task1, task2).WaitAsync(TimeSpan.FromSeconds(30));

        var resp1 = await task1;
        resp1.StatusCode.Should().Be(HttpStatusCode.NoContent);
        var resp2 = await task2;
        resp2.StatusCode.Should().Be(HttpStatusCode.NoContent);

        await using var db = CreateDbContext();
        var session = await db.UserSessions.AsNoTracking().SingleAsync(s => s.Id == sid);
        session.RevokedAt.Should().NotBeNull();
        session.RevokedAt.Should().Be(firstRevokedAt, "the second authenticated logout must not overwrite the first revocation");
    }

    // 4. Đổi mật khẩu: Sau thành công, mọi token cũ nhận 401; đăng nhập bằng mật khẩu mới thành công.
    [Trait("ApiCase", "existing.AuthImprovementTests.Scenario4_ChangePassword_ShouldRevokeAllExistingSessions_AndRequireNewPassword")]
    [Fact]
    public async Task Scenario4_ChangePassword_ShouldRevokeAllExistingSessions_AndRequireNewPassword()
    {
        using var client = _factory.CreateClient();
        var email = $"change_pwd_{Guid.NewGuid():N}@example.test";
        var oldPassword = "OldPassword123!";
        var newPassword = "NewPassword456!";

        // Session 1
        var reg = await client.PostAsJsonAsync("/api/auth/register", new RegisterRequest("Pwd User", email, oldPassword));
        var auth1 = (await reg.Content.ReadFromJsonAsync<AuthResponse>())!;

        // Session 2
        var login = await client.PostAsJsonAsync("/api/auth/login", new LoginRequest(email, oldPassword));
        var auth2 = (await login.Content.ReadFromJsonAsync<AuthResponse>())!;

        // Change password using Session 1
        using var changeReq = new HttpRequestMessage(HttpMethod.Post, "/api/users/change-password")
        {
            Content = JsonContent.Create(new ChangePasswordRequest(oldPassword, newPassword, newPassword))
        };
        changeReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", auth1.Token);
        using var changeResp = await client.SendAsync(changeReq);
        changeResp.StatusCode.Should().Be(HttpStatusCode.NoContent);

        // Both Session 1 and Session 2 tokens must now get 401
        using var me1 = new HttpRequestMessage(HttpMethod.Get, "/api/auth/me");
        me1.Headers.Authorization = new AuthenticationHeaderValue("Bearer", auth1.Token);
        (await client.SendAsync(me1)).StatusCode.Should().Be(HttpStatusCode.Unauthorized);

        using var me2 = new HttpRequestMessage(HttpMethod.Get, "/api/auth/me");
        me2.Headers.Authorization = new AuthenticationHeaderValue("Bearer", auth2.Token);
        (await client.SendAsync(me2)).StatusCode.Should().Be(HttpStatusCode.Unauthorized);

        // Login with old password fails
        var failLogin = await client.PostAsJsonAsync("/api/auth/login", new LoginRequest(email, oldPassword));
        failLogin.StatusCode.Should().Be(HttpStatusCode.Unauthorized);

        // Login with new password succeeds
        var successLogin = await client.PostAsJsonAsync("/api/auth/login", new LoginRequest(email, newPassword));
        successLogin.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    // 5. Race: đổi mật khẩu trước: Giữ transaction sau khi cập nhật hash, khởi chạy login bằng mật khẩu cũ rồi cho transaction hoàn tất; login phải nhận 401, không tạo phiên mới hợp lệ.
    [Trait("ApiCase", "existing.AuthImprovementTests.Scenario5_Race_PasswordChangeBeforeLogin_ShouldRejectLoginWithOldPassword")]
    [Fact]
    public async Task Scenario5_Race_PasswordChangeBeforeLogin_ShouldRejectLoginWithOldPassword()
    {
        using var client = _factory.CreateClient();
        var email = $"race_pwd_first_{Guid.NewGuid():N}@example.test";
        const string oldPassword = "Password123!";
        const string newPassword = "NewPassword456!";
        using var registration = await client.PostAsJsonAsync("/api/auth/register",
            new RegisterRequest("Race User", email, oldPassword));
        registration.StatusCode.Should().Be(HttpStatusCode.OK);
        var auth = (await registration.Content.ReadFromJsonAsync<AuthResponse>())!;

        var blocker = new GateDbCommandInterceptor("UPDATE users", pauseAfterExecution: true);
        var waiter = new GateDbCommandInterceptor("FOR UPDATE");
        using var changeFactory = CreateRaceFactory(blocker);
        using var loginFactory = CreateRaceFactory(waiter);
        using var changeClient = changeFactory.CreateClient();
        using var loginClient = loginFactory.CreateClient();
        using var changeRequest = new HttpRequestMessage(HttpMethod.Post, "/api/users/change-password")
        {
            Content = JsonContent.Create(new ChangePasswordRequest(oldPassword, newPassword, newPassword))
        };
        changeRequest.Headers.Authorization = new AuthenticationHeaderValue("Bearer", auth.Token);
        var changeTask = changeClient.SendAsync(changeRequest);
        try
        {
            await blocker.CommandExecutedEvent.Task.WaitAsync(TimeSpan.FromSeconds(30));
            var loginTask = loginClient.PostAsJsonAsync("/api/auth/login", new LoginRequest(email, oldPassword));
            var waiterPid = await waiter.CommandStarted.Task.WaitAsync(TimeSpan.FromSeconds(30));
            var blockerPid = await blocker.CommandStarted.Task.WaitAsync(TimeSpan.FromSeconds(30));
            await WaitForLockWaitAsync(_connectionString, waiterPid, blockerPid, TimeSpan.FromSeconds(30));
            blocker.Release();

            using var changeResponse = await changeTask.WaitAsync(TimeSpan.FromSeconds(30));
            changeResponse.StatusCode.Should().Be(HttpStatusCode.NoContent);
            using var loginResponse = await loginTask.WaitAsync(TimeSpan.FromSeconds(30));
            loginResponse.StatusCode.Should().Be(HttpStatusCode.Unauthorized);

            await using var freshDb = CreateDbContext();
            var sessions = await freshDb.UserSessions.AsNoTracking().Where(s => s.UserId == auth.User.Id).ToListAsync();
            sessions.Should().ContainSingle("the rejected login must not create a session");
            sessions.Should().OnlyContain(s => s.RevokedAt != null);
        }
        finally
        {
            blocker.Release();
            await changeTask.WaitAsync(TimeSpan.FromSeconds(30));
        }
    }

    [Trait("ApiCase", "existing.AuthImprovementTests.Scenario6_Race_LoginBeforePasswordChange_ShouldRevokeNewlyIssuedToken")]
    [Fact]
    public async Task Scenario6_Race_LoginBeforePasswordChange_ShouldRevokeNewlyIssuedToken()
    {
        using var client = _factory.CreateClient();
        var email = $"race_login_first_{Guid.NewGuid():N}@example.test";
        const string oldPassword = "Password123!";
        const string newPassword = "NewPassword456!";
        using var registration = await client.PostAsJsonAsync("/api/auth/register",
            new RegisterRequest("Race User", email, oldPassword));
        registration.StatusCode.Should().Be(HttpStatusCode.OK);
        var auth = (await registration.Content.ReadFromJsonAsync<AuthResponse>())!;

        var blocker = new GateDbCommandInterceptor("FOR UPDATE", pauseAfterExecution: true);
        var waiter = new GateDbCommandInterceptor("FOR UPDATE");
        using var loginFactory = CreateRaceFactory(blocker);
        using var changeFactory = CreateRaceFactory(waiter);
        using var loginClient = loginFactory.CreateClient();
        using var changeClient = changeFactory.CreateClient();
        var loginTask = loginClient.PostAsJsonAsync("/api/auth/login", new LoginRequest(email, oldPassword));
        try
        {
            await blocker.CommandExecutedEvent.Task.WaitAsync(TimeSpan.FromSeconds(30));
            using var changeRequest = new HttpRequestMessage(HttpMethod.Post, "/api/users/change-password")
            {
                Content = JsonContent.Create(new ChangePasswordRequest(oldPassword, newPassword, newPassword))
            };
            changeRequest.Headers.Authorization = new AuthenticationHeaderValue("Bearer", auth.Token);
            var changeTask = changeClient.SendAsync(changeRequest);
            var waiterPid = await waiter.CommandStarted.Task.WaitAsync(TimeSpan.FromSeconds(30));
            var blockerPid = await blocker.CommandStarted.Task.WaitAsync(TimeSpan.FromSeconds(30));
            await WaitForLockWaitAsync(_connectionString, waiterPid, blockerPid, TimeSpan.FromSeconds(30));
            blocker.Release();

            using var loginResponse = await loginTask.WaitAsync(TimeSpan.FromSeconds(30));
            loginResponse.StatusCode.Should().Be(HttpStatusCode.OK);
            var issued = (await loginResponse.Content.ReadFromJsonAsync<AuthResponse>())!;
            using var changeResponse = await changeTask.WaitAsync(TimeSpan.FromSeconds(30));
            changeResponse.StatusCode.Should().Be(HttpStatusCode.NoContent);
            using var me = new HttpRequestMessage(HttpMethod.Get, "/api/auth/me");
            me.Headers.Authorization = new AuthenticationHeaderValue("Bearer", issued.Token);
            using var meResponse = await client.SendAsync(me);
            meResponse.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
            await using var freshDb = CreateDbContext();
            var sessions = await freshDb.UserSessions.AsNoTracking().Where(s => s.UserId == auth.User.Id).ToListAsync();
            sessions.Should().HaveCount(2);
            sessions.Should().OnlyContain(s => s.RevokedAt != null);
        }
        finally
        {
            blocker.Release();
            await loginTask.WaitAsync(TimeSpan.FromSeconds(30));
        }
    }
    // 7. Đăng ký thành công: Có đúng một user và một session tương ứng; JWT chứa đúng sid, dùng được với /me.
    [Trait("ApiCase", "existing.AuthImprovementTests.Scenario7_RegisterAtomic_Success_ShouldCreateExactlyOneUserAndSession")]
    [Fact]
    public async Task Scenario7_RegisterAtomic_Success_ShouldCreateExactlyOneUserAndSession()
    {
        using var client = _factory.CreateClient();
        var email = $"atomic_reg_success_{Guid.NewGuid():N}@example.test";

        var response = await client.PostAsJsonAsync("/api/auth/register",
            new RegisterRequest("Atomic Reg", email, "Password123!"));
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var auth = (await response.Content.ReadFromJsonAsync<AuthResponse>())!;

        var handler = new JwtSecurityTokenHandler();
        var jwt = handler.ReadJwtToken(auth.Token);
        var sidClaim = jwt.Claims.FirstOrDefault(c => c.Type == "sid")?.Value;
        sidClaim.Should().NotBeNull();
        var sessionId = Guid.Parse(sidClaim!);

        // Verify in fresh DB scope
        await using var db = CreateDbContext();
        var users = await db.Users.AsNoTracking().Where(u => u.Email == email).ToListAsync();
        users.Should().ContainSingle();

        var sessions = await db.UserSessions.AsNoTracking().Where(s => s.UserId == users[0].Id).ToListAsync();
        sessions.Should().ContainSingle();
        sessions[0].Id.Should().Be(sessionId);
        sessions[0].RevokedAt.Should().BeNull();

        // Verify token works on /api/auth/me
        using var meReq = new HttpRequestMessage(HttpMethod.Get, "/api/auth/me");
        meReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", auth.Token);
        var meResp = await client.SendAsync(meReq);
        meResp.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    // 8. Đăng ký thất bại: Chèn lỗi khi lưu session và khi tạo token; sau rollback không còn user/session, đăng ký lại cùng email thành công.


    // 9. Cancellation: Hủy sau khi user đã được lưu nhưng trước commit; không còn user/session sau khi transaction kết thúc.


    private sealed class LogoutGate
    {
        public int Arrivals;
        public TaskCompletionSource<bool> BothAuthenticated { get; } = new(TaskCreationOptions.RunContinuationsAsynchronously);
        public TaskCompletionSource<bool> First { get; } = new(TaskCreationOptions.RunContinuationsAsynchronously);
        public TaskCompletionSource<bool> Second { get; } = new(TaskCreationOptions.RunContinuationsAsynchronously);
        public TaskCompletionSource<bool> FirstRevoked { get; } = new(TaskCreationOptions.RunContinuationsAsynchronously);
    }

    private sealed class GatedAuthService(AuthService inner, LogoutGate gate) : IAuthService
    {
        public Task<AuthResponse> RegisterAsync(RegisterRequest request, CancellationToken cancellationToken = default)
            => inner.RegisterAsync(request, cancellationToken);

        public Task<AuthResponse> LoginAsync(LoginRequest request, CancellationToken cancellationToken = default)
            => inner.LoginAsync(request, cancellationToken);

        public Task<UserDto> GetCurrentUserAsync(Guid userId, CancellationToken cancellationToken = default)
            => inner.GetCurrentUserAsync(userId, cancellationToken);

        public async Task LogoutAsync(Guid userId, Guid sessionId, CancellationToken cancellationToken = default)
        {
            var first = Interlocked.Increment(ref gate.Arrivals) == 1;
            if (!first) gate.BothAuthenticated.TrySetResult(true);
            await (first ? gate.First : gate.Second).Task.WaitAsync(TimeSpan.FromSeconds(30), cancellationToken);
            await inner.LogoutAsync(userId, sessionId, cancellationToken);
            if (first) gate.FirstRevoked.TrySetResult(true);
        }
    }

    private sealed class FaultyJwtTokenGenerator : IJwtTokenGenerator
    {
        public string GenerateToken(User user, Guid? sessionId = null)
        {
            throw new InvalidOperationException("Simulated token generation failure");
        }
    }
}

// Helpers for Concurrency and Interception
public class GateDbCommandInterceptor : DbCommandInterceptor
{
    private readonly string _targetSubstring;
    private readonly bool _pauseAfterExecution;
    private readonly SemaphoreSlim _gate = new(0, 1);
    public TaskCompletionSource<int> CommandStarted { get; } = new(TaskCreationOptions.RunContinuationsAsynchronously);
    public TaskCompletionSource<bool> CommandExecutedEvent { get; } = new(TaskCreationOptions.RunContinuationsAsynchronously);

    public GateDbCommandInterceptor(string targetSubstring, bool pauseAfterExecution = false)
    {
        _targetSubstring = targetSubstring;
        _pauseAfterExecution = pauseAfterExecution;
    }

    private int _released;
    public void Release()
    {
        if (Interlocked.Exchange(ref _released, 1) == 0) _gate.Release();
    }

    public override ValueTask<InterceptionResult<DbDataReader>> ReaderExecutingAsync(
        DbCommand command, CommandEventData eventData, InterceptionResult<DbDataReader> result,
        CancellationToken cancellationToken = default)
    {
        if (command.CommandText.Contains(_targetSubstring, StringComparison.OrdinalIgnoreCase))
            CommandStarted.TrySetResult(((NpgsqlConnection)command.Connection!).ProcessID);
        return base.ReaderExecutingAsync(command, eventData, result, cancellationToken);
    }

    public override async ValueTask<DbDataReader> ReaderExecutedAsync(
        DbCommand command,
        CommandExecutedEventData eventData,
        DbDataReader result,
        CancellationToken cancellationToken = default)
    {
        if (command.CommandText.Contains(_targetSubstring, StringComparison.OrdinalIgnoreCase))
        {
            CommandExecutedEvent.TrySetResult(true);
            if (_pauseAfterExecution)
            {
                if (!await _gate.WaitAsync(TimeSpan.FromSeconds(30), cancellationToken))
                    throw new TimeoutException("The test did not release the database command gate.");
            }
        }
        return await base.ReaderExecutedAsync(command, eventData, result, cancellationToken);
    }

    public override async ValueTask<int> NonQueryExecutedAsync(
        DbCommand command,
        CommandExecutedEventData eventData,
        int result,
        CancellationToken cancellationToken = default)
    {
        if (command.CommandText.Contains(_targetSubstring, StringComparison.OrdinalIgnoreCase))
        {
            CommandExecutedEvent.TrySetResult(true);
            if (_pauseAfterExecution)
            {
                if (!await _gate.WaitAsync(TimeSpan.FromSeconds(30), cancellationToken))
                    throw new TimeoutException("The test did not release the database command gate.");
            }
        }
        return await base.NonQueryExecutedAsync(command, eventData, result, cancellationToken);
    }
}

public class FaultInjectionDbCommandInterceptor : DbCommandInterceptor
{
    private readonly string _targetSubstring;

    public FaultInjectionDbCommandInterceptor(string targetSubstring)
    {
        _targetSubstring = targetSubstring;
    }

    public override ValueTask<InterceptionResult<DbDataReader>> ReaderExecutingAsync(
        DbCommand command, CommandEventData eventData, InterceptionResult<DbDataReader> result,
        CancellationToken cancellationToken = default)
    {
        if (command.CommandText.Contains(_targetSubstring, StringComparison.OrdinalIgnoreCase))
            throw new DbUpdateException("Fault injected during session save", (Exception?)null);
        return base.ReaderExecutingAsync(command, eventData, result, cancellationToken);
    }

    public override ValueTask<InterceptionResult<int>> NonQueryExecutingAsync(
        DbCommand command,
        CommandEventData eventData,
        InterceptionResult<int> result,
        CancellationToken cancellationToken = default)
    {
        if (command.CommandText.Contains(_targetSubstring, StringComparison.OrdinalIgnoreCase))
        {
            throw new DbUpdateException("Fault injected during session save", (Exception?)null);
        }
        return base.NonQueryExecutingAsync(command, eventData, result, cancellationToken);
    }
}

public class CancelOnCommandDbCommandInterceptor : DbCommandInterceptor
{
    private readonly string _targetSubstring;
    private readonly CancellationTokenSource _cts;

    public CancelOnCommandDbCommandInterceptor(string targetSubstring, CancellationTokenSource cts)
    {
        _targetSubstring = targetSubstring;
        _cts = cts;
    }

    public override ValueTask<DbDataReader> ReaderExecutedAsync(
        DbCommand command, CommandExecutedEventData eventData, DbDataReader result,
        CancellationToken cancellationToken = default)
    {
        if (command.CommandText.Contains(_targetSubstring, StringComparison.OrdinalIgnoreCase))
            _cts.Cancel();
        return base.ReaderExecutedAsync(command, eventData, result, cancellationToken);
    }

    public override ValueTask<int> NonQueryExecutedAsync(
        DbCommand command,
        CommandExecutedEventData eventData,
        int result,
        CancellationToken cancellationToken = default)
    {
        if (command.CommandText.Contains(_targetSubstring, StringComparison.OrdinalIgnoreCase))
        {
            _cts.Cancel();
        }
        return base.NonQueryExecutedAsync(command, eventData, result, cancellationToken);
    }
}
