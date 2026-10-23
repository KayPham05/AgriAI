using System.IdentityModel.Tokens.Jwt;
using AgriVision.Domain.Entities;
using AgriVision.Domain.Enums;
using AgriVision.Infrastructure.Authentication;
using FluentAssertions;
using Microsoft.Extensions.Configuration;

namespace AgriVision.UnitTests.Services;

public class JwtTokenGeneratorTests
{
    private readonly IConfiguration _validConfig = new ConfigurationBuilder()
        .AddInMemoryCollection(new Dictionary<string, string?>
        {
            ["JwtSettings:Secret"] = "super-secret-key-that-is-at-least-32-bytes-long!",
            ["JwtSettings:Issuer"] = "AgriVisionAPI",
            ["JwtSettings:Audience"] = "AgriVisionApp",
            ["JwtSettings:ExpiryMinutes"] = "60"
        })
        .Build();

    [Fact]
    public void GenerateToken_ShouldRejectMissingSecret()
    {
        var generator = new JwtTokenGenerator(new ConfigurationBuilder().Build());

        Action act = () => generator.GenerateToken(new User());

        act.Should().Throw<InvalidOperationException>()
            .WithMessage("*JwtSettings:Secret*");
    }

    [Fact]
    public void GenerateToken_ShouldIncludeSidClaim_WhenSessionIdProvided()
    {
        var generator = new JwtTokenGenerator(_validConfig);
        var sessionId = Guid.NewGuid();
        var user = new User
        {
            Id = Guid.NewGuid(),
            Email = "test@example.com",
            FullName = "Test User",
            Role = UserRole.User
        };

        var tokenString = generator.GenerateToken(user, sessionId);

        var handler = new JwtSecurityTokenHandler();
        var jwt = handler.ReadJwtToken(tokenString);

        jwt.Claims.Should().Contain(c => c.Type == "sid" && c.Value == sessionId.ToString());
    }

    [Fact]
    public void GenerateToken_ShouldNotIncludeSidClaim_WhenSessionIdNull()
    {
        var generator = new JwtTokenGenerator(_validConfig);
        var user = new User
        {
            Id = Guid.NewGuid(),
            Email = "test@example.com",
            FullName = "Test User",
            Role = UserRole.User
        };

        var tokenString = generator.GenerateToken(user);

        var handler = new JwtSecurityTokenHandler();
        var jwt = handler.ReadJwtToken(tokenString);

        jwt.Claims.Should().NotContain(c => c.Type == "sid");
    }
}
