using AgriVision.Application.Common.Interfaces.Authentication;
using AgriVision.Application.Common.Interfaces.Persistence;
using AgriVision.Application.DTOs.Auth;
using AgriVision.Application.Services.Implementations;
using AgriVision.Domain.Entities;
using AgriVision.Domain.Enums;
using FluentAssertions;
using Moq;

namespace AgriVision.UnitTests.Services;

public class AuthServiceTests
{
    private readonly Mock<IUserRepository> _userRepositoryMock;
    private readonly Mock<IUserSessionRepository> _userSessionRepositoryMock;
    private readonly Mock<IJwtTokenGenerator> _jwtTokenGeneratorMock;
    private readonly AuthService _authService;

    public AuthServiceTests()
    {
        _userRepositoryMock = new Mock<IUserRepository>();
        _userSessionRepositoryMock = new Mock<IUserSessionRepository>();
        _jwtTokenGeneratorMock = new Mock<IJwtTokenGenerator>();

        _authService = new AuthService(
            _userRepositoryMock.Object,
            _jwtTokenGeneratorMock.Object,
            _userSessionRepositoryMock.Object
        );
    }

    [Fact]
    public async Task RegisterAsync_ShouldCreateUser_WhenEmailIsNotTaken()
    {
        // Arrange
        var request = new RegisterRequest("Test User", "test@example.com", "Password123!");
        _userRepositoryMock.Setup(r => r.GetByEmailAsync(request.Email, It.IsAny<CancellationToken>()))
            .ReturnsAsync((User?)null);

        _jwtTokenGeneratorMock.Setup(g => g.GenerateToken(It.IsAny<User>()))
            .Returns("fake-jwt-token");

        // Act
        var result = await _authService.RegisterAsync(request);

        // Assert
        result.Should().NotBeNull();
        result.Token.Should().Be("fake-jwt-token");
        result.User.Email.Should().Be("test@example.com");
        result.User.FullName.Should().Be("Test User");
        result.User.Role.Should().Be(UserRole.User);

        _userRepositoryMock.Verify(r => r.AddAsync(It.IsAny<User>(), It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task RegisterAsync_ShouldThrowInvalidOperationException_WhenEmailIsAlreadyRegistered()
    {
        // Arrange
        var request = new RegisterRequest("Test User", "existing@example.com", "Password123!");

        _userRepositoryMock.Setup(r => r.ExistsByEmailAsync(request.Email, It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);

        // Act
        var act = async () => await _authService.RegisterAsync(request);

        // Assert
        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*already exists*");
    }

    [Fact]
    public async Task LoginAsync_ShouldReturnAuthResponse_WhenCredentialsAreValid()
    {
        // Arrange
        var password = "Password123!";
        var passwordHash = BCrypt.Net.BCrypt.HashPassword(password);
        var user = new User
        {
            Id = Guid.NewGuid(),
            FullName = "Valid User",
            Email = "valid@example.com",
            PasswordHash = passwordHash,
            Role = UserRole.User
        };

        var request = new LoginRequest("valid@example.com", password);

        _userRepositoryMock.Setup(r => r.GetByEmailAsync(request.Email, It.IsAny<CancellationToken>()))
            .ReturnsAsync(user);

        _jwtTokenGeneratorMock.Setup(g => g.GenerateToken(user))
            .Returns("valid-jwt-token");

        // Act
        var result = await _authService.LoginAsync(request);

        // Assert
        result.Should().NotBeNull();
        result.Token.Should().Be("valid-jwt-token");
        result.User.Email.Should().Be(user.Email);
    }

    [Fact]
    public async Task LoginAsync_ShouldThrowUnauthorizedAccessException_WhenUserNotFound()
    {
        // Arrange
        var request = new LoginRequest("nonexistent@example.com", "Password123!");

        _userRepositoryMock.Setup(r => r.GetByEmailAsync(request.Email, It.IsAny<CancellationToken>()))
            .ReturnsAsync((User?)null);

        // Act
        var act = async () => await _authService.LoginAsync(request);

        // Assert
        await act.Should().ThrowAsync<UnauthorizedAccessException>()
            .WithMessage("*Invalid email or password*");
    }

    [Fact]
    public async Task LoginAsync_ShouldRejectPasswordLogin_ForProviderOnlyAccount()
    {
        var request = new LoginRequest("google@example.com", "Password123!");
        _userRepositoryMock.Setup(repository => repository.GetByEmailAsync(request.Email, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new User { Email = request.Email, PasswordHash = null });
        var act = () => _authService.LoginAsync(request);
        await act.Should().ThrowAsync<UnauthorizedAccessException>();
        _jwtTokenGeneratorMock.Verify(generator => generator.GenerateToken(It.IsAny<User>()), Times.Never);
    }

    [Fact]
    public async Task LoginAsync_ShouldThrowUnauthorizedAccessException_WhenUserIsInactive()
    {
        // Arrange
        var password = "Password123!";
        var passwordHash = BCrypt.Net.BCrypt.HashPassword(password);
        var inactiveUser = new User
        {
            Id = Guid.NewGuid(),
            FullName = "Inactive User",
            Email = "inactive@example.com",
            PasswordHash = passwordHash,
            IsActive = false
        };

        var request = new LoginRequest("inactive@example.com", password);
        _userRepositoryMock.Setup(r => r.GetByEmailAsync(request.Email, It.IsAny<CancellationToken>()))
            .ReturnsAsync(inactiveUser);

        // Act
        var act = async () => await _authService.LoginAsync(request);

        // Assert
        await act.Should().ThrowAsync<UnauthorizedAccessException>()
            .WithMessage("*vô hiệu hóa*");
        _userSessionRepositoryMock.Verify(s => s.AddAsync(It.IsAny<UserSession>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task LoginAsync_ShouldCreateUserSession_WhenLoginSucceeds()
    {
        // Arrange
        var password = "Password123!";
        var passwordHash = BCrypt.Net.BCrypt.HashPassword(password);
        var user = new User
        {
            Id = Guid.NewGuid(),
            FullName = "Active User",
            Email = "active@example.com",
            PasswordHash = passwordHash,
            IsActive = true
        };

        var request = new LoginRequest("active@example.com", password);
        _userRepositoryMock.Setup(r => r.GetByEmailAsync(request.Email, It.IsAny<CancellationToken>()))
            .ReturnsAsync(user);
        _jwtTokenGeneratorMock.Setup(g => g.GenerateToken(user)).Returns("token-123");

        // Act
        var result = await _authService.LoginAsync(request);

        // Assert
        result.Should().NotBeNull();
        _userSessionRepositoryMock.Verify(s => s.AddAsync(It.Is<UserSession>(
            session => session.UserId == user.Id && session.RevokedAt == null
        ), It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task LogoutAsync_ShouldRevokeAllSessionsForUser()
    {
        // Arrange
        var userId = Guid.NewGuid();

        // Act
        await _authService.LogoutAsync(userId);

        // Assert
        _userSessionRepositoryMock.Verify(s => s.RevokeAllSessionsByUserIdAsync(userId, It.IsAny<CancellationToken>()), Times.Once);
    }
}
