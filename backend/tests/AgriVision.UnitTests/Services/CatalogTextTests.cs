using AgriVision.Application.Common;
using FluentAssertions;

namespace AgriVision.UnitTests.Services;

public class CatalogTextTests
{
    [Theory]
    [InlineData("đốm lá", "Đốm lá")]
    [InlineData("ớt", "Ớt")]
    [InlineData("lúa", "Lúa")]
    [InlineData("  nativo 750WG  ", "Nativo 750WG")]
    [InlineData("", "")]
    [InlineData(null, null)]
    public void Name_CapitalizesInitialAndPreservesRemainingCase(string? input, string? expected) =>
        CatalogText.Name(input).Should().Be(expected);

    [Theory]
    [InlineData("  Solanum  lycopersicum  ", "Solanum lycopersicum")]
    [InlineData(" Ca_chua___Benh ", "Ca_chua___Benh")]
    [InlineData("  Pha  2,5 g/L.\r\n\r\n  Phun sau 7–10 ngày. ", "Pha 2,5 g/L.\n\nPhun sau 7–10 ngày.")]
    public void Normalize_PreservesMeaningAndParagraphs(string input, string expected) =>
        CatalogText.Normalize(input).Should().Be(expected);

    [Theory]
    [InlineData("Đốm lá", "dom la", 0)]
    [InlineData("Cà chua bi", "ca chua", 1)]
    [InlineData("Cà chua", "ca chya", 2)]
    [InlineData("Cà chua", "xyz", -1)]
    public void Search_RanksExactBeforeApproximate(string name, string query, int expected) =>
        CatalogText.MatchScore(name, query).Should().Be(expected);
}
