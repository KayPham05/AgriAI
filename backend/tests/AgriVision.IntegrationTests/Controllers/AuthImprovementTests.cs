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
using AgriVision.Domain.Entities;
using AgriVision.Domain.Enums;
using AgriVision.Infrastructure.Persistence;
using AgriVision.Infrastructure.Persistence.Repositories;
using AgriVision.IntegrationTests.Fixtures;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.IdentityModel.Tokens;
using Npgsql;
using System.Data.Common;
using Xunit;

namespace AgriVision.IntegrationTests.Controllers;

[Trait("Category", "Security")]
public class AuthImprovementTests : IClassFixture<AgriVisionFactory>
{
    private readonly AgriVisionFactory _factory;
    private readonly string _connectionString;

    public AuthImprovementTests(AgriVisionFactory factory)
    {
        _factory = factory;
        var config = factory.Services.GetRequiredService<IConfiguration>();
        _connectionString = config.GetConnectionString("DefaultConnection") 
            ?? config["ConnectionStrings:DefaultConnection"]!;
    }

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

    private static async Task WaitForLockWaitAsync(string connectionString, TimeSpan timeout)
    {
        using var cts = new CancellationTokenSource(timeout);
        await using var conn = new NpgsqlConnection(connectionString);
        await conn.OpenAsync(cts.Token);

        while (!cts.Token.IsCancellationRequested)
        {
            await using var cmd = new NpgsqlCommand(
                "SELECT COUNT(*)::int FROM pg_stat_activity WHERE wait_event_type = 'Lock' AND state = 'active';",
                conn);
            var count = (int)(await cmd.ExecuteScalarAsync(cts.Token) ?? 0);
            if (count > 0)
            {
                return;
            }
            await Task.Delay(25, cts.Token);
        }
        throw new TimeoutException("Timed out waiting for PostgreSQL lock wait state.");
    }

    // 1. Logout nhiều thiết bị: Tạo phiên A/B; logout A trả 204; A gọi /me nhận 401, B vẫn 200; DB chỉ đánh dấu A bị thu hồi.
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
    [Fact]
    public async Task Scenario3_ConcurrentLogout_ShouldNotCorruptOrThrow_AndEndInRevokedState()
    {
        using var client1 = _factory.CreateClient();
        using var client2 = _factory.CreateClient();
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

        await Task.WhenAll(task1, task2);

        var resp1 = await task1;
        resp1.StatusCode.Should().Be(HttpStatusCode.NoContent);
        var resp2 = await task2;
        resp2.StatusCode.Should().Be(HttpStatusCode.NoContent);

        await using var db = CreateDbContext();
        var session = await db.UserSessions.AsNoTracking().SingleAsync(s => s.Id == sid);
        session.RevokedAt.Should().NotBeNull();
    }

    // 4. Đổi mật khẩu: Sau thành công, mọi token cũ nhận 401; đăng nhập bằng mật khẩu mới thành công.
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
        changeResp.StatusCode.Should().Be(HttpStatusCode.OK);

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
    [Fact]
    public async Task Scenario5_Race_PasswordChangeBeforeLogin_ShouldRejectLoginWithOldPassword()
    {
        var email = $"race_pwd_first_{Guid.NewGuid():N}@example.test";
        var oldPassword = "Password123!";
        var newPassword = "NewPassword456!";

        Guid userId;
        await using (var seedDb = CreateDbContext())
        {
            var user = new User
            {
                Id = Guid.NewGuid(),
                FullName = "Race User 1",
                Email = email,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(oldPassword),
                Role = UserRole.User,
                CreatedAt = DateTime.UtcNow
            };
            seedDb.Users.Add(user);
            await seedDb.SaveChangesAsync();
            userId = user.Id;
        }

        var interceptor = new GateDbCommandInterceptor("UPDATE users", pauseAfterExecution: true);

        await using var dbScope1 = CreateDbContext(interceptor);
        var unitOfWork1 = new UnitOfWork(dbScope1);
        var userRepo1 = new UserRepository(dbScope1);
        var sessionRepo1 = new UserSessionRepository(dbScope1);
        var userService1 = new UserService(userRepo1, sessionRepo1, unitOfWork1);

        // Start password change in Scope 1 (it will pause after executing UPDATE users)
        var changePwdTask = Task.Run(async () =>
        {
            await userService1.ChangePasswordAsync(userId, new ChangePasswordRequest(oldPassword, newPassword, newPassword));
        });

        // Wait until Scope 1 executes UPDATE users and pauses
        await interceptor.CommandExecutedEvent.Task.WaitAsync(TimeSpan.FromSeconds(30));

        // Now start login in Scope 2 using old password
        await using var dbScope2 = CreateDbContext();
        var unitOfWork2 = new UnitOfWork(dbScope2);
        var userRepo2 = new UserRepository(dbScope2);
        var sessionRepo2 = new UserSessionRepository(dbScope2);
        var jwtGen = _factory.Services.GetRequiredService<IJwtTokenGenerator>();
        var authService2 = new AuthService(userRepo2, jwtGen, sessionRepo2, unitOfWork2);

        var loginTask = Task.Run(async () =>
        {
            return await authService2.LoginAsync(new LoginRequest(email, oldPassword));
        });

        // Verify Scope 2 blocks on PostgreSQL row lock
        await WaitForLockWaitAsync(_connectionString, TimeSpan.FromSeconds(30));

        // Release Scope 1 to commit its transaction
        interceptor.Release();
        await changePwdTask;

        // Scope 2 unblocks, reads updated hash, and must throw UnauthorizedAccessException
        Func<Task> act = async () => await loginTask;
        await act.Should().ThrowAsync<UnauthorizedAccessException>();

        // Verify no new active session was created in DB
        await using (var freshDb = CreateDbContext())
        {
            var sessions = await freshDb.UserSessions.Where(s => s.UserId == userId && s.RevokedAt == null).ToListAsync();
            sessions.Should().BeEmpty();
        }
    }

    // 6. Race: login trước: Giữ login trước lúc lưu session, khởi chạy đổi mật khẩu rồi giải phóng login; sau khi đổi mật khẩu hoàn tất, token vừa cấp phải nhận 401.
    [Fact]
    public async Task Scenario6_Race_LoginBeforePasswordChange_ShouldRevokeNewlyIssuedToken()
    {
        var email = $"race_login_first_{Guid.NewGuid():N}@example.test";
        var oldPassword = "Password123!";
        var newPassword = "NewPassword456!";

        Guid userId;
        await using (var seedDb = CreateDbContext())
        {
            var user = new User
            {
                Id = Guid.NewGuid(),
                FullName = "Race User 2",
                Email = email,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(oldPassword),
                Role = UserRole.User,
                CreatedAt = DateTime.UtcNow
            };
            seedDb.Users.Add(user);
            await seedDb.SaveChangesAsync();
            userId = user.Id;
        }

        // Intercept Scope 1 login: pause right after SELECT ... FOR UPDATE (holding the row lock)
        var interceptor = new GateDbCommandInterceptor("FOR UPDATE", pauseAfterExecution: true);

        await using var dbScope1 = CreateDbContext(interceptor);
        var unitOfWork1 = new UnitOfWork(dbScope1);
        var userRepo1 = new UserRepository(dbScope1);
        var sessionRepo1 = new UserSessionRepository(dbScope1);
        var jwtGen = _factory.Services.GetRequiredService<IJwtTokenGenerator>();
        var authService1 = new AuthService(userRepo1, jwtGen, sessionRepo1, unitOfWork1);

        var loginTask = Task.Run(async () =>
        {
            return await authService1.LoginAsync(new LoginRequest(email, oldPassword));
        });

        // Wait until Scope 1 executes SELECT ... FOR UPDATE and pauses
        await interceptor.CommandExecutedEvent.Task.WaitAsync(TimeSpan.FromSeconds(30));

        // Now start password change in Scope 2
        await using var dbScope2 = CreateDbContext();
        var unitOfWork2 = new UnitOfWork(dbScope2);
        var userRepo2 = new UserRepository(dbScope2);
        var sessionRepo2 = new UserSessionRepository(dbScope2);
        var userService2 = new UserService(userRepo2, sessionRepo2, unitOfWork2);

        var changePwdTask = Task.Run(async () =>
        {
            await userService2.ChangePasswordAsync(userId, new ChangePasswordRequest(oldPassword, newPassword, newPassword));
        });

        // Verify Scope 2 blocks on PostgreSQL row lock waiting for Scope 1
        await WaitForLockWaitAsync(_connectionString, TimeSpan.FromSeconds(30));

        // Release Scope 1 to save session and commit
        interceptor.Release();
        var authResponse = await loginTask;
        authResponse.Should().NotBeNull();

        // Scope 2 now proceeds, revokes all sessions (including the one just created by Scope 1), and commits
        await changePwdTask;

        // Verify token issued by Scope 1 receives 401 when calling /api/auth/me
        using var client = _factory.CreateClient();
        using var meReq = new HttpRequestMessage(HttpMethod.Get, "/api/auth/me");
        meReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", authResponse.Token);
        var meResp = await client.SendAsync(meReq);
        meResp.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    // 7. Đăng ký thành công: Có đúng một user và một session tương ứng; JWT chứa đúng sid, dùng được với /me.
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
    [Fact]
    public async Task Scenario8_RegisterAtomic_FailureDuringSessionOrToken_ShouldRollbackCompletely_AndAllowRetry()
    {
        var email = $"atomic_fail_{Guid.NewGuid():N}@example.test";
        var password = "Password123!";

        // Case A: Fault injection during session save
        var faultInterceptor = new FaultInjectionDbCommandInterceptor("INSERT INTO user_sessions");
        await using (var db = CreateDbContext(faultInterceptor))
        {
            var unitOfWork = new UnitOfWork(db);
            var userRepo = new UserRepository(db);
            var sessionRepo = new UserSessionRepository(db);
            var jwtGen = _factory.Services.GetRequiredService<IJwtTokenGenerator>();
            var authService = new AuthService(userRepo, jwtGen, sessionRepo, unitOfWork);

            Func<Task> act = async () => await authService.RegisterAsync(new RegisterRequest("Fault User", email, password));
            await act.Should().ThrowAsync<DbUpdateException>();
        }

        // Verify rollback: no user, no session
        await using (var freshDb = CreateDbContext())
        {
            var userExists = await freshDb.Users.AnyAsync(u => u.Email == email);
            userExists.Should().BeFalse("User must be rolled back after session save failure");
        }

        // Retry registration with same email succeeds!
        using var client = _factory.CreateClient();
        var retryResp = await client.PostAsJsonAsync("/api/auth/register",
            new RegisterRequest("Fault User", email, password));
        retryResp.StatusCode.Should().Be(HttpStatusCode.OK);

        // Case B: Fault injection during token generation
        var emailB = $"atomic_fail_token_{Guid.NewGuid():N}@example.test";
        var faultyTokenGen = new FaultyJwtTokenGenerator();

        await using (var db = CreateDbContext())
        {
            var unitOfWork = new UnitOfWork(db);
            var userRepo = new UserRepository(db);
            var sessionRepo = new UserSessionRepository(db);
            var authService = new AuthService(userRepo, faultyTokenGen, sessionRepo, unitOfWork);

            Func<Task> act = async () => await authService.RegisterAsync(new RegisterRequest("Fault Token User", emailB, password));
            await act.Should().ThrowAsync<InvalidOperationException>()
                .WithMessage("Simulated token generation failure");
        }

        // Verify rollback for Case B: no user and no session in DB
        await using (var freshDb = CreateDbContext())
        {
            var userExists = await freshDb.Users.AnyAsync(u => u.Email == emailB);
            userExists.Should().BeFalse("User must be rolled back after token generation failure");
            var userObj = await freshDb.Users.FirstOrDefaultAsync(u => u.Email == emailB);
            if (userObj != null)
            {
                var sessions = await freshDb.UserSessions.Where(s => s.UserId == userObj.Id).ToListAsync();
                sessions.Should().BeEmpty();
            }
        }

        // Retry registration for Case B with same email succeeds!
        var retryRespB = await client.PostAsJsonAsync("/api/auth/register",
            new RegisterRequest("Fault Token User", emailB, password));
        retryRespB.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    // 9. Cancellation: Hủy sau khi user đã được lưu nhưng trước commit; không còn user/session sau khi transaction kết thúc.
    [Fact]
    public async Task Scenario9_RegisterAtomic_Cancellation_ShouldRollbackCompletely()
    {
        var email = $"cancel_reg_{Guid.NewGuid():N}@example.test";
        using var cts = new CancellationTokenSource();

        // Interceptor that cancels the token right after INSERT INTO users
        var cancelInterceptor = new CancelOnCommandDbCommandInterceptor("INSERT INTO users", cts);

        await using (var db = CreateDbContext(cancelInterceptor))
        {
            var unitOfWork = new UnitOfWork(db);
            var userRepo = new UserRepository(db);
            var sessionRepo = new UserSessionRepository(db);
            var jwtGen = _factory.Services.GetRequiredService<IJwtTokenGenerator>();
            var authService = new AuthService(userRepo, jwtGen, sessionRepo, unitOfWork);

            Func<Task> act = async () => await authService.RegisterAsync(
                new RegisterRequest("Cancel User", email, "Password123!"), cts.Token);

            await act.Should().ThrowAsync<OperationCanceledException>();
        }

        // Verify in fresh DB scope: no user and no session
        await using (var freshDb = CreateDbContext())
        {
            var userExists = await freshDb.Users.AnyAsync(u => u.Email == email);
            userExists.Should().BeFalse("User must not exist after cancelled transaction");
            var sessionCount = await freshDb.UserSessions.CountAsync();
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
    public TaskCompletionSource<bool> CommandExecutedEvent { get; } = new(TaskCreationOptions.RunContinuationsAsynchronously);

    public GateDbCommandInterceptor(string targetSubstring, bool pauseAfterExecution = false)
    {
        _targetSubstring = targetSubstring;
        _pauseAfterExecution = pauseAfterExecution;
    }

    public void Release() => _gate.Release();

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
                await _gate.WaitAsync(TimeSpan.FromSeconds(30), cancellationToken);
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
                await _gate.WaitAsync(TimeSpan.FromSeconds(30), cancellationToken);
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
