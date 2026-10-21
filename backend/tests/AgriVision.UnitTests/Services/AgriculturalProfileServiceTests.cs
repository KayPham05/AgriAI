using AgriVision.Application.Common.Interfaces.Persistence;
using AgriVision.Application.DTOs.AgriculturalProfile;
using AgriVision.Application.Services.Implementations;
using AgriVision.Domain.Entities;
using FluentAssertions;
using Moq;

namespace AgriVision.UnitTests.Services;

public class AgriculturalProfileServiceTests
{
    private readonly Mock<IAgriculturalProfileRepository> _repository = new();
    private readonly AgriculturalProfileService _service;
    private readonly Guid _owner = Guid.NewGuid();

    public AgriculturalProfileServiceTests() => _service = new AgriculturalProfileService(_repository.Object);

    [Fact]
    public async Task Create_NormalizesFieldsAndUsesAuthenticatedOwner()
    {
        AgriculturalProfile? saved = null;
        _repository.Setup(repository => repository.AddAsync(It.IsAny<AgriculturalProfile>(), It.IsAny<CancellationToken>()))
            .Callback<AgriculturalProfile, CancellationToken>((profile, _) => saved = profile)
            .Returns(Task.CompletedTask);
        var before = DateTime.UtcNow;

        var result = await _service.CreateAsync(_owner, new("  Vườn nhà  ", "  Đất phù sa  "));

        result.Id.Should().NotBeEmpty();
        result.UserId.Should().Be(_owner);
        result.Name.Should().Be("Vườn nhà");
        result.Description.Should().Be("Đất phù sa");
        result.PredictionCount.Should().Be(0);
        result.CreatedAt.Should().BeOnOrAfter(before);
        result.UpdatedAt.Should().BeNull();
        saved!.UserId.Should().Be(_owner);
        saved.Name.Should().Be("Vườn nhà");
        saved.Description.Should().Be("Đất phù sa");
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData(" \t\r\n ")]
    public async Task Create_NormalizesOptionalDescriptionToNull(string? description)
    {
        var result = await _service.CreateAsync(_owner, new("Vườn", description));
        result.Description.Should().BeNull();
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData(" \t ")]
    public async Task Create_RejectsMissingNameBeforeSaving(string? name)
    {
        var action = () => _service.CreateAsync(_owner, new(name!));
        await action.Should().ThrowAsync<ArgumentException>();
        _repository.Verify(repository => repository.AddAsync(It.IsAny<AgriculturalProfile>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task Update_KeepsIdentityAndCreationDateAndReturnsPredictionCount()
    {
        var profile = ConfigureProfile();
        var originalCreatedAt = profile.CreatedAt;
        _repository.Setup(repository => repository.GetPredictionCountAsync(profile.Id, It.IsAny<CancellationToken>())).ReturnsAsync(3);

        var result = await _service.UpdateAsync(profile.Id, _owner, new("  Vườn mới  ", "  Ghi chú mới  "));

        result.Id.Should().Be(profile.Id);
        result.UserId.Should().Be(_owner);
        result.Name.Should().Be("Vườn mới");
        result.Description.Should().Be("Ghi chú mới");
        result.CreatedAt.Should().Be(originalCreatedAt);
        result.UpdatedAt.Should().NotBeNull();
        result.PredictionCount.Should().Be(3);
        _repository.Verify(repository => repository.UpdateAsync(
            It.Is<AgriculturalProfile>(item => item.Id == profile.Id && item.Name == "Vườn mới" && item.UserId == _owner),
            It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task Update_RejectsOversizedNameWithoutChangingProfile()
    {
        var profile = ConfigureProfile();
        var action = () => _service.UpdateAsync(profile.Id, _owner, new(new string('a', 151)));
        await action.Should().ThrowAsync<ArgumentException>();
        profile.Name.Should().Be("Vườn nhà");
        _repository.Verify(repository => repository.UpdateAsync(It.IsAny<AgriculturalProfile>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task Read_ReturnsCountWithoutLoadingPredictionRecords()
    {
        var profile = ConfigureProfile();
        _repository.Setup(repository => repository.GetPredictionCountAsync(profile.Id, It.IsAny<CancellationToken>())).ReturnsAsync(5);
        var result = await _service.GetByIdAsync(profile.Id, _owner);
        result.PredictionCount.Should().Be(5);
        result.Name.Should().Be("Vườn nhà");
    }

    [Theory]
    [InlineData("read", false)]
    [InlineData("update", false)]
    [InlineData("delete", false)]
    [InlineData("read", true)]
    [InlineData("update", true)]
    [InlineData("delete", true)]
    public async Task ForeignAndMissingProfiles_ReturnSameNotFoundWithoutWrites(string operation, bool missing)
    {
        var profile = ConfigureProfile();
        var id = missing ? Guid.NewGuid() : profile.Id;
        var caller = Guid.NewGuid();
        Func<Task> action = operation switch
        {
            "read" => () => _service.GetByIdAsync(id, caller),
            "update" => () => _service.UpdateAsync(id, caller, new("Stolen")),
            _ => () => _service.DeleteAsync(id, caller)
        };
        await action.Should().ThrowAsync<KeyNotFoundException>();
        _repository.Verify(repository => repository.UpdateAsync(It.IsAny<AgriculturalProfile>(), It.IsAny<CancellationToken>()), Times.Never);
        _repository.Verify(repository => repository.DeleteAsync(It.IsAny<AgriculturalProfile>(), It.IsAny<CancellationToken>()), Times.Never);
        _repository.Verify(repository => repository.GetPredictionCountAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task Delete_RemovesOnlyOwnedProfile()
    {
        var profile = ConfigureProfile();
        await _service.DeleteAsync(profile.Id, _owner);
        _repository.Verify(repository => repository.DeleteAsync(
            It.Is<AgriculturalProfile>(item => item.Id == profile.Id && item.UserId == _owner), It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task List_UsesOwnerScopeAndForwardsCancellation()
    {
        using var cancellation = new CancellationTokenSource();
        var token = cancellation.Token;
        _repository.Setup(repository => repository.GetByUserIdAsync(_owner, token))
            .ReturnsAsync(new List<AgriculturalProfileDto>
            {
                new(Guid.NewGuid(), _owner, "Vườn nhà", null, DateTime.UtcNow, null, 2)
            });
        var result = await _service.GetByUserIdAsync(_owner, token);
        result.Should().ContainSingle().Which.PredictionCount.Should().Be(2);
    }

    private AgriculturalProfile ConfigureProfile()
    {
        var profile = new AgriculturalProfile { UserId = _owner, Name = "Vườn nhà", CreatedAt = DateTime.UtcNow.AddDays(-1) };
        _repository.Setup(repository => repository.GetByIdAsync(profile.Id, It.IsAny<CancellationToken>())).ReturnsAsync(profile);
        return profile;
    }
}
