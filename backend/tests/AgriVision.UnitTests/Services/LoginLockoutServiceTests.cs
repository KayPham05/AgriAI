using AgriVision.Application.Common.Interfaces.Authentication;
using AgriVision.Application.Common.Interfaces.Persistence;
using AgriVision.Application.DTOs.Auth;
using AgriVision.Application.Services.Implementations;
using AgriVision.Domain.Entities;
using FluentAssertions;
using Moq;

namespace AgriVision.UnitTests.Services;

public class LoginLockoutServiceTests
{
    private readonly User _user = new() { Email = "lock@example.test", PasswordHash = BCrypt.Net.BCrypt.HashPassword("Correct!", workFactor: 4) };
    private readonly Mock<IUserRepository> _users = new();
    private readonly Mock<IUserSessionRepository> _sessions = new();
    private readonly Mock<IJwtTokenGenerator> _tokens = new();
    private readonly Mock<IEmailTwoFactor> _twoFactor = new();
    private readonly Clock _clock = new();
    private readonly AuthService _service;

    public LoginLockoutServiceTests()
    {
        _users.Setup(u => u.GetByEmailForUpdateAsync(It.IsAny<string>(), It.IsAny<CancellationToken>())).ReturnsAsync(_user);
        _tokens.Setup(t => t.GenerateToken(It.IsAny<User>(), It.IsAny<Guid?>())).Returns("session-token");
        var transactions = new Mock<IUnitOfWork>();
        transactions.Setup(t => t.ExecuteInTransactionAsync(It.IsAny<Func<Task<AuthResponse>>>(), It.IsAny<CancellationToken>()))
            .Returns<Func<Task<AuthResponse>>, CancellationToken>((action, _) => action());
        _service = new AuthService(_users.Object, _tokens.Object, _sessions.Object, transactions.Object,
            twoFactor: _twoFactor.Object, timeProvider: _clock);
    }

    [Fact]
    public async Task CorrectPasswordBeforeFifthFailure_ResetsPartialBatchAndEscalation()
    {
        _user.FailedLoginAttempts = 4;
        _user.LoginLockoutLevel = 2;
        _user.LoginLockedUntil = _clock.GetUtcNow().UtcDateTime;
        var result = await _service.LoginAsync(new LoginRequest(_user.Email, "Correct!"));
        result.Token.Should().Be("session-token");
        _user.FailedLoginAttempts.Should().Be(0);
        _user.LoginLockoutLevel.Should().Be(0);
        _user.LoginLockedUntil.Should().BeNull();
        _users.Verify(u => u.UpdateAsync(_user, It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task AttemptsDuringLock_DoNotCountOrExtendIt_EvenWithCorrectPassword()
    {
        var until = _clock.GetUtcNow().UtcDateTime.AddMinutes(5);
        _user.LoginLockedUntil = until;
        _user.LoginLockoutLevel = 1;
        foreach (var password in new[] { "Wrong!", "Correct!" })
        {
            var action = () => _service.LoginAsync(new LoginRequest(_user.Email, password));
            (await action.Should().ThrowAsync<LoginLockedException>()).Which.RetryAfterSeconds.Should().Be(300);
        }
        _user.LoginLockedUntil.Should().Be(until);
        _user.FailedLoginAttempts.Should().Be(0);
        _user.LoginLockoutLevel.Should().Be(1);
        _sessions.Verify(s => s.AddAsync(It.IsAny<UserSession>(), It.IsAny<CancellationToken>()), Times.Never);
        _users.Verify(u => u.UpdateAsync(It.IsAny<User>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task HighEscalation_DoesNotOverflowTheRepresentableTimestamp()
    {
        _user.FailedLoginAttempts = 4;
        _user.LoginLockoutLevel = int.MaxValue;
        var action = () => _service.LoginAsync(new LoginRequest(_user.Email, "Wrong!"));
        (await action.Should().ThrowAsync<LoginLockedException>()).Which.RetryAfterSeconds.Should().BeGreaterThan(300);
        _user.LoginLockedUntil.Should().BeAfter(_clock.GetUtcNow().UtcDateTime.AddYears(100));
    }

    [Fact]
    public async Task TwoFactorChallenge_DoesNotResetUntilAuthenticationCompletes_AndCannotBypassActiveLock()
    {
        _user.EmailTwoFactorEnabled = true;
        _user.FailedLoginAttempts = 4;
        _user.LoginLockoutLevel = 1;
        _twoFactor.Setup(t => t.IssueAsync(_user, "TwoFactorLogin", It.IsAny<CancellationToken>())).ReturnsAsync(Guid.NewGuid());
        var login = () => _service.LoginAsync(new LoginRequest(_user.Email, "Correct!"));
        await login.Should().ThrowAsync<TwoFactorRequiredException>();
        _user.FailedLoginAttempts.Should().Be(4);
        _user.LoginLockoutLevel.Should().Be(1);
        _user.LoginLockedUntil = _clock.GetUtcNow().UtcDateTime.AddMinutes(5);
        var complete = () => _service.CompleteLoginAsync(_user, CancellationToken.None);
        await complete.Should().ThrowAsync<LoginLockedException>();
        _user.LoginLockedUntil = _clock.GetUtcNow().UtcDateTime;
        await _service.CompleteLoginAsync(_user, CancellationToken.None);
        _user.LoginLockoutLevel.Should().Be(0);
        _user.FailedLoginAttempts.Should().Be(0);
        _user.LoginLockedUntil.Should().BeNull();
    }

    [Fact]
    public async Task InactiveAccountWithWrongPassword_KeepsGenericCredentialError()
    {
        _user.IsActive = false;
        var action = () => _service.LoginAsync(new LoginRequest(_user.Email, "Wrong!"));
        await action.Should().ThrowAsync<UnauthorizedAccessException>().WithMessage("Invalid email or password.");
        _user.FailedLoginAttempts.Should().Be(0);
        _user.LoginLockoutLevel.Should().Be(0);
    }

    private sealed class Clock : TimeProvider
    {
        public override DateTimeOffset GetUtcNow() => new(2026, 11, 27, 0, 0, 0, TimeSpan.Zero);
    }
}
