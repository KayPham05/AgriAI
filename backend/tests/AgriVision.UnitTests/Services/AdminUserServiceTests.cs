using AgriVision.Application.Common.Interfaces.Persistence;
using AgriVision.Application.DTOs.Admin;
using AgriVision.Application.Services.Implementations;
using AgriVision.Domain.Entities;
using AgriVision.Domain.Enums;
using FluentAssertions;
using Moq;

namespace AgriVision.UnitTests.Services;

public class AdminUserServiceTests
{
    private readonly Mock<IUserRepository> _userRepositoryMock;
    private readonly Mock<IUserSessionRepository> _userSessionRepositoryMock;
    private readonly Mock<IAdminAuditLogRepository> _auditLogRepositoryMock;
    private readonly Mock<IPredictionRepository> _predictionRepositoryMock;
    private readonly AdminUserService _adminUserService;

    public AdminUserServiceTests()
    {
        _userRepositoryMock = new Mock<IUserRepository>();
        _userSessionRepositoryMock = new Mock<IUserSessionRepository>();
        _auditLogRepositoryMock = new Mock<IAdminAuditLogRepository>();
        _predictionRepositoryMock = new Mock<IPredictionRepository>();

        _adminUserService = new AdminUserService(
            _userRepositoryMock.Object,
            _userSessionRepositoryMock.Object,
            _auditLogRepositoryMock.Object,
            _predictionRepositoryMock.Object
        );
    }

    [Fact]
    public async Task GetUsersAsync_ShouldReturnPagedUsers()
    {
        // Arrange
        var users = new List<User>
        {
            new()
            {
                Id = Guid.NewGuid(),
                FullName = "Admin User",
                Email = "admin@example.com",
                Role = UserRole.Admin,
                IsActive = true,
                CreatedAt = DateTime.UtcNow
            },
            new()
            {
                Id = Guid.NewGuid(),
                FullName = "Regular User",
                Email = "user@example.com",
                Role = UserRole.User,
                IsActive = true,
                CreatedAt = DateTime.UtcNow
            }
        };

        _userRepositoryMock.Setup(r => r.GetPagedUsersAsync(
                It.IsAny<string?>(),
                It.IsAny<string?>(),
                It.IsAny<bool?>(),
                1,
                10,
                It.IsAny<CancellationToken>()))
            .ReturnsAsync((users, 2));

        var filter = new AdminUserFilterParams();

        // Act
        var result = await _adminUserService.GetUsersAsync(filter);

        // Assert
        result.Should().NotBeNull();
        result.TotalCount.Should().Be(2);
        result.Items.Should().HaveCount(2);
    }

    [Theory]
    [InlineData(0, 10)]
    [InlineData(1, 0)]
    public async Task GetUsersAsync_ShouldThrowArgumentException_WhenPaginationInvalid(int page, int size)
    {
        var filter = new AdminUserFilterParams(PageNumber: page, PageSize: size);
        var act = () => _adminUserService.GetUsersAsync(filter);
        await act.Should().ThrowAsync<ArgumentException>();
    }

    [Fact]
    public async Task GetUserByIdAsync_ShouldReturnUser_WhenExists()
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
        _predictionRepositoryMock.Setup(p => p.GetCountByUserIdAsync(userId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(7);

        // Act
        var result = await _adminUserService.GetUserByIdAsync(userId);

        // Assert
        result.Should().NotBeNull();
        result.Id.Should().Be(userId);
        result.FullName.Should().Be("Nguyen Van A");
        result.PredictionCount.Should().Be(7);
    }

    [Fact]
    public async Task GetUserByIdAsync_ShouldThrowKeyNotFoundException_WhenDoesNotExist()
    {
        var userId = Guid.NewGuid();
        _userRepositoryMock.Setup(r => r.GetByIdAsync(userId, It.IsAny<CancellationToken>()))
            .ReturnsAsync((User?)null);

        var act = () => _adminUserService.GetUserByIdAsync(userId);
        await act.Should().ThrowAsync<KeyNotFoundException>();
    }

    [Fact]
    public async Task SetUserStatusAsync_ShouldDeactivateUser_RevokeSessions_AndLogAudit()
    {
        // Arrange
        var adminId = Guid.NewGuid();
        var targetUserId = Guid.NewGuid();
        var targetUser = new User
        {
            Id = targetUserId,
            FullName = "Bad Actor",
            Email = "bad@example.com",
            Role = UserRole.User,
            IsActive = true
        };

        _userRepositoryMock.Setup(r => r.GetByIdAsync(targetUserId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(targetUser);

        // Act
        var result = await _adminUserService.SetUserStatusAsync(adminId, targetUserId, false);

        // Assert
        result.IsActive.Should().BeFalse();
        targetUser.IsActive.Should().BeFalse();
        _userRepositoryMock.Verify(r => r.UpdateAsync(targetUser, It.IsAny<CancellationToken>()), Times.Once);
        _userSessionRepositoryMock.Verify(s => s.RevokeAllSessionsByUserIdAsync(targetUserId, It.IsAny<CancellationToken>()), Times.Once);
        _auditLogRepositoryMock.Verify(a => a.AddAsync(It.Is<AdminAuditLog>(l =>
            l.ActorUserId == adminId &&
            l.TargetUserId == targetUserId &&
            l.Action == "DeactivateUser"), It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task SetUserStatusAsync_ShouldPreventAdmin_FromDeactivatingThemselves()
    {
        var adminId = Guid.NewGuid();
        var act = () => _adminUserService.SetUserStatusAsync(adminId, adminId, false);
        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*cannot deactivate their own account*");
    }

    [Fact]
    public async Task SetUserRoleAsync_ShouldChangeUserRole_AndLogAudit()
    {
        // Arrange
        var adminId = Guid.NewGuid();
        var targetUserId = Guid.NewGuid();
        var targetUser = new User
        {
            Id = targetUserId,
            FullName = "Regular User",
            Email = "user@example.com",
            Role = UserRole.User
        };

        _userRepositoryMock.Setup(r => r.GetByIdAsync(targetUserId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(targetUser);

        // Act
        var result = await _adminUserService.SetUserRoleAsync(adminId, targetUserId, UserRole.Admin);

        // Assert
        result.Role.Should().Be(UserRole.Admin);
        targetUser.Role.Should().Be(UserRole.Admin);
        _userRepositoryMock.Verify(r => r.UpdateAsync(targetUser, It.IsAny<CancellationToken>()), Times.Once);
        _userSessionRepositoryMock.Verify(s => s.RevokeAllSessionsByUserIdAsync(targetUserId, It.IsAny<CancellationToken>()), Times.Once);
        _auditLogRepositoryMock.Verify(a => a.AddAsync(It.Is<AdminAuditLog>(l =>
            l.ActorUserId == adminId &&
            l.TargetUserId == targetUserId &&
            l.Action == "ChangeRoleTo_Admin"), It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task SetUserRoleAsync_ShouldThrowArgumentException_WhenRoleIsInvalid()
    {
        var adminId = Guid.NewGuid();
        var targetUserId = Guid.NewGuid();

        var act = () => _adminUserService.SetUserRoleAsync(adminId, targetUserId, "SuperUser");
        await act.Should().ThrowAsync<ArgumentException>()
            .WithMessage("*Vai trò không hợp lệ*");
    }

    [Fact]
    public async Task SetUserRoleAsync_ShouldPreventAdmin_FromRemovingOwnAdminRole()
    {
        var adminId = Guid.NewGuid();
        var act = () => _adminUserService.SetUserRoleAsync(adminId, adminId, UserRole.User);
        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*cannot remove their own admin role*");
    }

    [Fact]
    public async Task GetAuditLogsAsync_ShouldReturnPagedLogs()
    {
        // Arrange
        var logs = new List<AdminAuditLog>
        {
            new()
            {
                Id = Guid.NewGuid(),
                ActorUserId = Guid.NewGuid(),
                ActorUser = new User { Email = "admin@example.com" },
                TargetUserId = Guid.NewGuid(),
                TargetUser = new User { Email = "target@example.com" },
                Action = "DeactivateUser",
                OccurredAt = DateTime.UtcNow
            }
        };

        _auditLogRepositoryMock.Setup(r => r.GetPagedLogsAsync(1, 20, It.IsAny<CancellationToken>()))
            .ReturnsAsync((logs, 1));

        // Act
        var result = await _adminUserService.GetAuditLogsAsync(1, 20);

        // Assert
        result.Should().NotBeNull();
        result.TotalCount.Should().Be(1);
        result.Items.Should().HaveCount(1);
        result.Items.First().ActorEmail.Should().Be("admin@example.com");
        result.Items.First().TargetEmail.Should().Be("target@example.com");
        result.Items.First().Action.Should().Be("DeactivateUser");
    }
}
