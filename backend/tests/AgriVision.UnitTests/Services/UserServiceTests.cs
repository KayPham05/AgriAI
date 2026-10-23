using AgriVision.Application.Common.Interfaces.Persistence;
using AgriVision.Application.DTOs.User;
using AgriVision.Application.Services.Implementations;
using AgriVision.Domain.Entities;
using AgriVision.Domain.Enums;
using FluentAssertions;
using Moq;

namespace AgriVision.UnitTests.Services;

public class UserServiceTests
{
    private readonly Mock<IUserRepository> _userRepositoryMock;
    private readonly Mock<IUserSessionRepository> _userSessionRepositoryMock;
    private readonly Mock<IUnitOfWork> _unitOfWorkMock;
    private readonly UserService _userService;

    public UserServiceTests()
    {
        _userRepositoryMock = new Mock<IUserRepository>();
        _userSessionRepositoryMock = new Mock<IUserSessionRepository>();
        _unitOfWorkMock = new Mock<IUnitOfWork>();

        _unitOfWorkMock.Setup(u => u.ExecuteInTransactionAsync(It.IsAny<Func<Task>>(), It.IsAny<CancellationToken>()))
            .Returns<Func<Task>, CancellationToken>((action, _) => action());

        _userService = new UserService(
            _userRepositoryMock.Object,
            _userSessionRepositoryMock.Object,
            _unitOfWorkMock.Object
        );
    }

    [Fact]
    public async Task GetProfileAsync_ShouldReturnUserProfile_WhenUserExists()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var user = new User
        {
            Id = userId,
            FullName = "Nguyen Van A",
            Email = "vana@example.com",
            Role = UserRole.User,
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };

        _userRepositoryMock.Setup(r => r.GetByIdAsync(userId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(user);

        // Act
        var result = await _userService.GetProfileAsync(userId);

        // Assert
        result.Should().NotBeNull();
        result.Id.Should().Be(userId);
        result.FullName.Should().Be("Nguyen Van A");
        result.Email.Should().Be("vana@example.com");
        result.IsActive.Should().BeTrue();
    }

    [Fact]
    public async Task GetProfileAsync_ShouldThrowKeyNotFoundException_WhenUserDoesNotExist()
    {
        // Arrange
        var userId = Guid.NewGuid();
        _userRepositoryMock.Setup(r => r.GetByIdAsync(userId, It.IsAny<CancellationToken>()))
            .ReturnsAsync((User?)null);

        // Act
        var act = async () => await _userService.GetProfileAsync(userId);

        // Assert
        await act.Should().ThrowAsync<KeyNotFoundException>()
            .WithMessage($"*'{userId}' not found*");
    }

    [Fact]
    public async Task UpdateProfileAsync_ShouldUpdateFullName_WhenValid()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var user = new User
        {
            Id = userId,
            FullName = "New Name",
            Email = "user@example.com",
            Role = UserRole.User,
            IsActive = true
        };

        _userRepositoryMock.Setup(r => r.UpdateProfileAsync(userId, "New Name", It.IsAny<DateTime>(), It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);
        _userRepositoryMock.Setup(r => r.GetByIdAsync(userId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(user);

        var request = new UpdateProfileRequest("New Name");

        // Act
        var result = await _userService.UpdateProfileAsync(userId, request);

        // Assert
        result.FullName.Should().Be("New Name");
        _userRepositoryMock.Verify(r => r.UpdateProfileAsync(userId, "New Name", It.IsAny<DateTime>(), It.IsAny<CancellationToken>()), Times.Once);
        _userRepositoryMock.Verify(r => r.UpdateAsync(It.IsAny<User>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task UpdateProfileAsync_ShouldThrowKeyNotFoundException_WhenUserDoesNotExist()
    {
        // Arrange
        var userId = Guid.NewGuid();
        _userRepositoryMock.Setup(r => r.UpdateProfileAsync(userId, "New Name", It.IsAny<DateTime>(), It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);
        _userRepositoryMock.Setup(r => r.GetByIdAsync(userId, It.IsAny<CancellationToken>()))
            .ReturnsAsync((User?)null);

        var request = new UpdateProfileRequest("New Name");

        // Act
        var act = async () => await _userService.UpdateProfileAsync(userId, request);

        // Assert
        await act.Should().ThrowAsync<KeyNotFoundException>()
            .WithMessage($"*'{userId}' not found*");
    }

    [Fact]
    public async Task UpdateProfileAsync_ShouldThrowArgumentException_WhenFullNameIsEmpty()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var request = new UpdateProfileRequest("   ");

        // Act
        var act = async () => await _userService.UpdateProfileAsync(userId, request);

        // Assert
        await act.Should().ThrowAsync<ArgumentException>()
            .WithMessage("*không được để trống*");
        _userRepositoryMock.Verify(r => r.UpdateAsync(It.IsAny<User>(), It.IsAny<CancellationToken>()), Times.Never);
        _userRepositoryMock.Verify(r => r.UpdateProfileAsync(It.IsAny<Guid>(), It.IsAny<string>(), It.IsAny<DateTime>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task ChangePasswordAsync_ShouldThrowArgumentException_WhenCurrentPasswordIncorrect()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var currentHash = BCrypt.Net.BCrypt.HashPassword("CorrectPassword123!");
        var user = new User
        {
            Id = userId,
            Email = "user@example.com",
            PasswordHash = currentHash
        };

        _userRepositoryMock.Setup(r => r.GetByIdAsync(userId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(user);

        var request = new ChangePasswordRequest("WrongPassword!", "NewPassword123!", "NewPassword123!");

        // Act
        var act = async () => await _userService.ChangePasswordAsync(userId, request);

        // Assert
        await act.Should().ThrowAsync<ArgumentException>()
            .WithMessage("*Mật khẩu hiện tại không chính xác*");
        _userRepositoryMock.Verify(r => r.UpdateAsync(It.IsAny<User>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task ChangePasswordAsync_ShouldThrowArgumentException_WhenNewPasswordMismatch()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var request = new ChangePasswordRequest("CurrentPassword123!", "NewPassword123!", "DifferentConfirm123!");

        // Act
        var act = async () => await _userService.ChangePasswordAsync(userId, request);

        // Assert
        await act.Should().ThrowAsync<ArgumentException>()
            .WithMessage("*xác nhận không khớp*");
    }

    [Fact]
    public async Task ChangePasswordAsync_ShouldThrowArgumentException_WhenNewPasswordSameAsCurrent()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var request = new ChangePasswordRequest("SamePassword123!", "SamePassword123!", "SamePassword123!");

        // Act
        var act = async () => await _userService.ChangePasswordAsync(userId, request);

        // Assert
        await act.Should().ThrowAsync<ArgumentException>()
            .WithMessage("*không được trùng*");
    }

    [Fact]
    public async Task ChangePasswordAsync_ShouldUpdatePasswordHashAndRevokeSessions_WhenValid()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var currentHash = BCrypt.Net.BCrypt.HashPassword("CurrentPassword123!");
        var user = new User
        {
            Id = userId,
            Email = "user@example.com",
            PasswordHash = currentHash
        };

        _userRepositoryMock.Setup(r => r.GetByIdAsync(userId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(user);

        var request = new ChangePasswordRequest("CurrentPassword123!", "BrandNewPassword123!", "BrandNewPassword123!");

        // Act
        await _userService.ChangePasswordAsync(userId, request);

        // Assert
        BCrypt.Net.BCrypt.Verify("BrandNewPassword123!", user.PasswordHash).Should().BeTrue();
        user.UpdatedAt.Should().NotBeNull();
        _userRepositoryMock.Verify(r => r.UpdateAsync(user, It.IsAny<CancellationToken>()), Times.Once);
        _userSessionRepositoryMock.Verify(s => s.RevokeAllSessionsByUserIdAsync(userId, It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task UpdateProfileAsync_ShouldThrowArgumentException_WhenFullNameExceeds150Chars()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var longName = new string('A', 151);
        var request = new UpdateProfileRequest(longName);

        // Act
        var act = async () => await _userService.UpdateProfileAsync(userId, request);

        // Assert
        await act.Should().ThrowAsync<ArgumentException>()
            .WithMessage("*không được vượt quá 150 ký tự*");
        _userRepositoryMock.Verify(r => r.UpdateProfileAsync(It.IsAny<Guid>(), It.IsAny<string>(), It.IsAny<DateTime>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task ChangePasswordAsync_ShouldExecuteInsideTransaction()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var currentHash = BCrypt.Net.BCrypt.HashPassword("CurrentPassword123!");
        var user = new User
        {
            Id = userId,
            Email = "user@example.com",
            PasswordHash = currentHash
        };

        _userRepositoryMock.Setup(r => r.GetByIdAsync(userId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(user);

        var request = new ChangePasswordRequest("CurrentPassword123!", "NewPassword123!", "NewPassword123!");

        // Act
        await _userService.ChangePasswordAsync(userId, request);

        // Assert
        _unitOfWorkMock.Verify(u => u.ExecuteInTransactionAsync(It.IsAny<Func<Task>>(), It.IsAny<CancellationToken>()), Times.Once);
        _userRepositoryMock.Verify(r => r.UpdateAsync(user, It.IsAny<CancellationToken>()), Times.Once);
        _userSessionRepositoryMock.Verify(s => s.RevokeAllSessionsByUserIdAsync(userId, It.IsAny<CancellationToken>()), Times.Once);
    }
}
