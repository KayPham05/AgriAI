using AgriVision.Domain.Entities;
using AgriVision.Domain.Enums;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;

namespace AgriVision.Infrastructure.Persistence;

public static class DbInitializer
{
    public static async Task SeedAsync(IServiceProvider serviceProvider)
    {
        using var scope = serviceProvider.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var environment = scope.ServiceProvider.GetRequiredService<IHostEnvironment>();
        var configuration = scope.ServiceProvider.GetRequiredService<IConfiguration>();
        if (environment.IsDevelopment())
        {
            await SeedUsersAsync(context, configuration);
        }
    }

    private static async Task SeedUsersAsync(AppDbContext context, IConfiguration configuration)
    {
        if (await context.Users.AnyAsync())
        {
            return;
        }

        var adminPassword = configuration["DemoUsers:AdminPassword"];
        var userPassword = configuration["DemoUsers:UserPassword"];
        if (adminPassword is null && userPassword is null)
        {
            return;
        }
        if (string.IsNullOrWhiteSpace(adminPassword) || string.IsNullOrWhiteSpace(userPassword))
        {
            throw new InvalidOperationException("Both DemoUsers passwords are required to seed development users.");
        }

        var adminUser = new User
        {
            Id = Guid.NewGuid(),
            FullName = "System Admin",
            Email = "admin@agrivision.ai",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(adminPassword),
            Role = UserRole.Admin,
            CreatedAt = DateTime.UtcNow
        };

        var regularUser = new User
        {
            Id = Guid.NewGuid(),
            FullName = "Demo Farmer",
            Email = "user@agrivision.ai",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(userPassword),
            Role = UserRole.User,
            CreatedAt = DateTime.UtcNow
        };

        await context.Users.AddRangeAsync(adminUser, regularUser);
        await context.SaveChangesAsync();
    }
}
