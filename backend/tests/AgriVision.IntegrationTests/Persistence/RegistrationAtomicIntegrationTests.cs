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

namespace AgriVision.IntegrationTests.Persistence;

[Trait("Category", "Security")]
public class RegistrationAtomicIntegrationTests : IClassFixture<AgriVisionFactory>, IDisposable
{
    private readonly AgriVisionFactory _factory;
    private readonly string _connectionString;
    private readonly IServiceScope _services;

    public RegistrationAtomicIntegrationTests(AgriVisionFactory factory)
    {
        _factory = factory;
        _services = factory.Services.CreateScope();
        var config = factory.Services.GetRequiredService<IConfiguration>();
        _connectionString = config.GetConnectionString("DefaultConnection")
            ?? config["ConnectionStrings:DefaultConnection"]!;
    }

    public void Dispose() => _services.Dispose();


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





    // 1. Logout nhiều thiết bị: Tạo phiên A/B; logout A trả 204; A gọi /me nhận 401, B vẫn 200; DB chỉ đánh dấu A bị thu hồi.


    // 2. Phạm vi phiên: Sai owner/session không được sửa phiên của tài khoản khác; thiếu/sai sid nhận 401.


    // 3. Logout đồng thời: Hai request đã qua xác thực cùng logout một phiên không gây lỗi ghi đè RevokedAt; trạng thái cuối vẫn bị thu hồi.


    // 4. Đổi mật khẩu: Sau thành công, mọi token cũ nhận 401; đăng nhập bằng mật khẩu mới thành công.


    // 5. Race: đổi mật khẩu trước: Giữ transaction sau khi cập nhật hash, khởi chạy login bằng mật khẩu cũ rồi cho transaction hoàn tất; login phải nhận 401, không tạo phiên mới hợp lệ.



    // 7. Đăng ký thành công: Có đúng một user và một session tương ứng; JWT chứa đúng sid, dùng được với /me.


    // 8. Đăng ký thất bại: Chèn lỗi khi lưu session và khi tạo token; sau rollback không còn user/session, đăng ký lại cùng email thành công.
    [Fact]
    public async Task Scenario8_RegisterAtomic_FailureDuringSessionOrToken_ShouldRollbackCompletely_AndAllowRetry()
    {
        var email = $"atomic_fail_{Guid.NewGuid():N}@example.test";
        var password = "Password123!";

        // Case A: Fault injection during session save
        Guid failedUserId;
        var faultInterceptor = new FaultInjectionDbCommandInterceptor("INSERT INTO user_sessions");
        await using (var db = CreateDbContext(faultInterceptor))
        {
            var unitOfWork = new UnitOfWork(db);
            var userRepo = new UserRepository(db);
            var sessionRepo = new UserSessionRepository(db);
            var jwtGen = _services.ServiceProvider.GetRequiredService<IJwtTokenGenerator>();
            var authService = new AuthService(userRepo, jwtGen, sessionRepo, unitOfWork);

            Func<Task> act = async () => await authService.RegisterAsync(new RegisterRequest("Fault User", email, password));
            await act.Should().ThrowAsync<DbUpdateException>();
            failedUserId = db.ChangeTracker.Entries<User>().Single().Entity.Id;
        }

        // Verify rollback: no user, no session
        await using (var freshDb = CreateDbContext())
        {
            var userExists = await freshDb.Users.AnyAsync(u => u.Email == email);
            userExists.Should().BeFalse("User must be rolled back after session save failure");
            (await freshDb.UserSessions.AnyAsync(s => s.UserId == failedUserId)).Should().BeFalse();
        }

        // Retry registration with same email succeeds!
        using var client = _factory.CreateClient();
        var retryResp = await client.PostAsJsonAsync("/api/auth/register",
            new RegisterRequest("Fault User", email, password));
        retryResp.StatusCode.Should().Be(HttpStatusCode.OK);

        // Case B: Fault injection during token generation
        var emailB = $"atomic_fail_token_{Guid.NewGuid():N}@example.test";
        var faultyTokenGen = new FaultyJwtTokenGenerator();
        Guid failedTokenUserId;

        await using (var db = CreateDbContext())
        {
            var unitOfWork = new UnitOfWork(db);
            var userRepo = new UserRepository(db);
            var sessionRepo = new UserSessionRepository(db);
            var authService = new AuthService(userRepo, faultyTokenGen, sessionRepo, unitOfWork);

            Func<Task> act = async () => await authService.RegisterAsync(new RegisterRequest("Fault Token User", emailB, password));
            await act.Should().ThrowAsync<InvalidOperationException>()
                .WithMessage("Simulated token generation failure");
            failedTokenUserId = db.ChangeTracker.Entries<User>().Single().Entity.Id;
        }

        // Verify rollback for Case B: no user and no session in DB
        await using (var freshDb = CreateDbContext())
        {
            var userExists = await freshDb.Users.AnyAsync(u => u.Email == emailB);
            userExists.Should().BeFalse("User must be rolled back after token generation failure");
            (await freshDb.UserSessions.AnyAsync(s => s.UserId == failedTokenUserId)).Should().BeFalse();
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
        Guid cancelledUserId;

        // Interceptor that cancels the token right after INSERT INTO users
        var cancelInterceptor = new CancelOnCommandDbCommandInterceptor("INSERT INTO users", cts);

        await using (var db = CreateDbContext(cancelInterceptor))
        {
            var unitOfWork = new UnitOfWork(db);
            var userRepo = new UserRepository(db);
            var sessionRepo = new UserSessionRepository(db);
            var jwtGen = _services.ServiceProvider.GetRequiredService<IJwtTokenGenerator>();
            var authService = new AuthService(userRepo, jwtGen, sessionRepo, unitOfWork);

            Func<Task> act = async () => await authService.RegisterAsync(
                new RegisterRequest("Cancel User", email, "Password123!"), cts.Token);

            await act.Should().ThrowAsync<OperationCanceledException>();
            cancelledUserId = db.ChangeTracker.Entries<User>().Single().Entity.Id;
        }

        // Verify in fresh DB scope: no user and no session
        await using (var freshDb = CreateDbContext())
        {
            var userExists = await freshDb.Users.AnyAsync(u => u.Email == email);
            userExists.Should().BeFalse("User must not exist after cancelled transaction");
            (await freshDb.UserSessions.AnyAsync(s => s.UserId == cancelledUserId)).Should().BeFalse();
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
