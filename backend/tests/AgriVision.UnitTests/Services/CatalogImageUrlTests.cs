using AgriVision.Application.Common;
using FluentAssertions;

namespace AgriVision.UnitTests.Services;

public class CatalogImageUrlTests
{
    [Theory]
    [InlineData(null)]
    [InlineData("")]
    public void MissingImage_HasNoPublicUrl(string? key) =>
        CatalogImageUrl.Create("plants", Guid.NewGuid(), key).Should().BeNull();

    [Theory]
    [InlineData("plants")]
    [InlineData("diseases")]
    public void PublicUrl_ChangesOnReplacement_WithoutExposingStorageOwner(string kind)
    {
        var owner = Guid.NewGuid();
        var id = Guid.NewGuid();
        var image = Guid.NewGuid();
        var first = CatalogImageUrl.Create(kind, id, $"users/{owner:D}/catalog/{kind}/{id:D}/{image:D}.png");
        var replaced = CatalogImageUrl.Create(kind, id, $"users/{owner:D}/catalog/{kind}/{id:D}/{Guid.NewGuid():D}.jpg");

        first.Should().Be($"/api/catalog/{kind}/{id:D}/image?v={image:D}.png");
        first.Should().NotContain(owner.ToString("D")).And.NotContain("users/");
        replaced.Should().NotBe(first);
    }
}
