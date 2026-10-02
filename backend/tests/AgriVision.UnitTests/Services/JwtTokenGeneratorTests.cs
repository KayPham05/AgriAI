using AgriVision.Domain.Entities;
using AgriVision.Infrastructure.Authentication;
using FluentAssertions;
using Microsoft.Extensions.Configuration;

namespace AgriVision.UnitTests.Services;

public class JwtTokenGeneratorTests
{
    [Fact]
    public void GenerateToken_ShouldRejectMissingSecret()
    {
        var generator = new JwtTokenGenerator(new ConfigurationBuilder().Build());

        Action act = () => generator.GenerateToken(new User());

        act.Should().Throw<InvalidOperationException>()
            .WithMessage("*JwtSettings:Secret*");
    }
}
