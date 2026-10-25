using AgriVision.Application.Common.Interfaces.Services;
using FluentAssertions;

namespace AgriVision.UnitTests.Services;

public class ImageStorageKeyTests
{
    [Fact]
    public void AvatarKeys_AreIsolatedFromPredictionsAndOtherOwners()
    {
        var owner = Guid.NewGuid();
        var image = Guid.NewGuid();
        var key = ImageStorageKey.Create(new(owner, Guid.Empty, image, IsAvatar: true), ".png");
        key.Should().Be($"users/{owner:D}/avatars/{image:D}.png");
        ImageStorageKey.IsAvatarForUser(key, owner).Should().BeTrue();
        ImageStorageKey.IsAvatarForUser(key, Guid.NewGuid()).Should().BeFalse();
        ImageStorageKey.Matches(key, new(owner, Guid.NewGuid(), image)).Should().BeFalse();
        ImageStorageKey.IsSupported(key.Replace(".png", ".svg")).Should().BeFalse();
        ImageStorageKey.IsSupported(key.Replace("/avatars/", "/avatars/../")).Should().BeFalse();
    }
    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("r2/predictions/../leaf.png")]
    [InlineData("r2/predictions/leaf.png/other.jpg")]
    [InlineData("users/11111111-1111-1111-1111-111111111111/predictions/22222222-2222-2222-2222-222222222222/33333333-3333-3333-3333-333333333333.exe")]
    [InlineData("users/00000000-0000-0000-0000-000000000000/predictions/22222222-2222-2222-2222-222222222222/33333333-3333-3333-3333-333333333333.png")]
    public void UnsupportedKeys_CannotBeReadOrDeleted(string? key) => ImageStorageKey.IsSupported(key).Should().BeFalse();

    [Theory]
    [InlineData("r2/predictions/leaf.jpg")]
    [InlineData("r2/predictions/leaf.jpeg")]
    [InlineData("r2/predictions/leaf.png")]
    public void ExistingR2Keys_RemainSupported(string key) => ImageStorageKey.IsSupported(key).Should().BeTrue();

    [Fact]
    public void Upload_RejectsMissingIdentityOrUnsupportedExtension()
    {
        FluentActions.Invoking(() => ImageStorageKey.Create(new(Guid.Empty, Guid.NewGuid(), Guid.NewGuid()), ".png"))
            .Should().Throw<ArgumentException>();
        FluentActions.Invoking(() => ImageStorageKey.Create(new(Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid()), ".svg"))
            .Should().Throw<ArgumentException>();
    }
}
