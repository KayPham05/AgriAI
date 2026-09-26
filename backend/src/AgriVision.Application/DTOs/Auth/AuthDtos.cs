namespace AgriVision.Application.DTOs.Auth;

public record RegisterRequest(string FullName, string Email, string Password);

public record LoginRequest(string Email, string Password);

public record UserDto(Guid Id, string FullName, string Email, string Role, DateTime CreatedAt);

public record AuthResponse(string Token, UserDto User);
