using AgriVision.Application.Common.Interfaces.Services;
using FluentAssertions;

namespace AgriVision.UnitTests.Services;

public class ImageStorageKeyTests
{
    [Theory]
    [InlineData("plants", ".png")]
    [InlineData("plants", ".jpeg")]
    [InlineData("diseases", ".jpg")]
    public void CatalogKeys_AreScopedToOwnerKindAndRecord(string kind, string extension)
    {
        var owner = Guid.NewGuid();
        var record = Guid.NewGuid();
        var image = Guid.NewGuid();
        var context = new ImageStorageContext(owner, Guid.Empty, image, CatalogKind: kind, CatalogId: record);

        var key = ImageStorageKey.Create(context, extension);

        key.Should().Be($"category/{(kind == "plants" ? "plant" : "disease")}/{record:D}/{owner:D}/{image:D}{extension}");
        ImageStorageKey.IsSupported(key).Should().BeTrue();
        ImageStorageKey.Matches(key, context).Should().BeTrue();
        ImageStorageKey.Matches(key, context with { UserId = Guid.NewGuid() }).Should().BeFalse();
        ImageStorageKey.IsCatalogImage(key, kind, record).Should().BeTrue();
        ImageStorageKey.IsCatalogImage(key, kind, Guid.NewGuid()).Should().BeFalse();
        ImageStorageKey.IsCatalogImage(key, kind == "plants" ? "diseases" : "plants", record).Should().BeFalse();
        ImageStorageKey.IsAvatarForUser(key, owner).Should().BeFalse();
    }

    [Theory]
    [InlineData("unknown-kind")]
    [InlineData("missing-record")]
    [InlineData("empty-record")]
    [InlineData("empty-owner")]
    [InlineData("empty-image")]
    [InlineData("avatar")]
    [InlineData("extension")]
    public void CatalogKeys_RejectInvalidUploadContexts(string scenario)
    {
        var context = new ImageStorageContext(Guid.NewGuid(), Guid.Empty, Guid.NewGuid(),
            CatalogKind: "plants", CatalogId: Guid.NewGuid());
        context = scenario switch
        {
            "unknown-kind" => context with { CatalogKind = "medicines" },
            "missing-record" => context with { CatalogId = null },
            "empty-record" => context with { CatalogId = Guid.Empty },
            "empty-owner" => context with { UserId = Guid.Empty },
            "empty-image" => context with { ImageId = Guid.Empty },
            "avatar" => context with { IsAvatar = true },
            _ => context
        };

        FluentActions.Invoking(() => ImageStorageKey.Create(context, scenario == "extension" ? ".svg" : ".png"))
            .Should().Throw<ArgumentException>();
    }

    [Theory]
    [InlineData("../plants", "11111111-1111-1111-1111-111111111111", ".png")]
    [InlineData("medicines", "11111111-1111-1111-1111-111111111111", ".png")]
    [InlineData("plants", "00000000-0000-0000-0000-000000000000", ".png")]
    [InlineData("plants", "not-a-guid", ".png")]
    [InlineData("plants", "11111111-1111-1111-1111-111111111111", ".svg")]
    [InlineData("plants", "11111111-1111-1111-1111-111111111111", ".PNG")]
    public void CatalogKeys_RejectUnsafeStoredPaths(string kind, string record, string extension)
    {
        var key = $"users/{Guid.NewGuid():D}/catalog/{kind}/{record}/{Guid.NewGuid():D}{extension}";
        ImageStorageKey.IsSupported(key).Should().BeFalse();
        ImageStorageKey.IsCatalogImage(key, kind, Guid.NewGuid()).Should().BeFalse();
    }

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
    public void ExistingCatalogKeys_RemainReadableUntilMigrated()
    {
        var id = Guid.NewGuid();
        var key = $"users/{Guid.NewGuid():D}/catalog/plants/{id:D}/{Guid.NewGuid():D}.png";
        ImageStorageKey.IsSupported(key).Should().BeTrue();
        ImageStorageKey.IsCatalogImage(key, "plants", id).Should().BeTrue();
    }

    [Fact]
    public void Upload_RejectsMissingIdentityOrUnsupportedExtension()
    {
        FluentActions.Invoking(() => ImageStorageKey.Create(new(Guid.Empty, Guid.NewGuid(), Guid.NewGuid()), ".png"))
            .Should().Throw<ArgumentException>();
        FluentActions.Invoking(() => ImageStorageKey.Create(new(Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid()), ".svg"))
            .Should().Throw<ArgumentException>();
    }
}
