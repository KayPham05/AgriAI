using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using AgriVision.Application.Common.Interfaces.Authentication;
using AgriVision.Domain.Entities;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;

namespace AgriVision.Infrastructure.Authentication;

public class JwtTokenGenerator : IJwtTokenGenerator
{
    private readonly IConfiguration _configuration;

    public JwtTokenGenerator(IConfiguration configuration)
    {
        _configuration = configuration;
    }

    public string GenerateToken(User user)
    {
        var secret = _configuration["JwtSettings:Secret"] 
            ?? "AgriVisionAI_Super_Secret_Key_For_JWT_Authentication_987654321!";
        var issuer = _configuration["JwtSettings:Issuer"] ?? "AgriVisionAPI";
        var audience = _configuration["JwtSettings:Audience"] ?? "AgriVisionApp";
        var expiryMinutesStr = _configuration["JwtSettings:ExpiryMinutes"] ?? "1440";

        if (!int.TryParse(expiryMinutesStr, out var expiryMinutes))
        {
            expiryMinutes = 1440;
        }

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secret));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new[]
        {
            new Claim(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
            new Claim(JwtRegisteredClaimNames.Email, user.Email),
            new Claim(JwtRegisteredClaimNames.Name, user.FullName),
            new Claim(ClaimTypes.Role, user.Role),
            new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
        };

        var token = new JwtSecurityToken(
            issuer: issuer,
            audience: audience,
            claims: claims,
            expires: DateTime.UtcNow.AddMinutes(expiryMinutes),
            signingCredentials: credentials
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
