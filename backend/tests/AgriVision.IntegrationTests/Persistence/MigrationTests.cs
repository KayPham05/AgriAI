using AgriVision.Domain.Entities;
using AgriVision.Infrastructure.Persistence;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using Testcontainers.PostgreSql;

namespace AgriVision.IntegrationTests.Persistence;

public class MigrationTests
{
    [Fact]
    public async Task Upgrade_ShouldPreserveLegacyRecords_BackfillImages_AndApplyOnlyOnce()
    {
        await using var postgres = new PostgreSqlBuilder("postgres:16-alpine")
            .WithDatabase("migration_test").WithUsername("testuser").WithPassword("testpassword").Build();
        await postgres.StartAsync();
        await using var database = new AppDbContext(new DbContextOptionsBuilder<AppDbContext>()
            .UseNpgsql(postgres.GetConnectionString()).Options);
        var migrator = database.GetService<IMigrator>();
        await migrator.MigrateAsync("20260925161222_InitialCreate");
        var plantId = Guid.NewGuid();
        var diseaseId = Guid.NewGuid();
        var classId = Guid.NewGuid();
        var predictionId = Guid.NewGuid();
        await database.Database.ExecuteSqlInterpolatedAsync($"""
            INSERT INTO plants (id, name, created_at) VALUES ({plantId}, 'Legacy Plant', now());
            INSERT INTO diseases (id, name, created_at) VALUES ({diseaseId}, 'Legacy Disease', now());
            INSERT INTO plant_diseases (id, plant_id, disease_id, class_name, class_index)
                VALUES ({classId}, {plantId}, {diseaseId}, 'Legacy___Class', 0);
            INSERT INTO predictions (id, image_path, image_public_id, predicted_plant_disease_id, confidence, created_at)
                VALUES ({predictionId}, '/legacy.jpg', 'legacy/image', {classId}, 0.9, now());
            """);
        await database.Database.MigrateAsync();
        await database.Database.MigrateAsync();
        (await database.Database.GetAppliedMigrationsAsync()).Should().HaveCount(3);
        database.Database.HasPendingModelChanges().Should().BeFalse();
        var legacy = await database.Predictions.Include(prediction => prediction.Images).SingleAsync();
        legacy.Id.Should().Be(predictionId);
        legacy.ResultSnapshotJson.Should().BeNull();
        legacy.Images.Should().ContainSingle();
        legacy.Images.Single().ImagePath.Should().Be("/legacy.jpg");
        legacy.Images.Single().ExpiresAt.Should().Be(legacy.CreatedAt.AddDays(30));

        var user = new User { Email = "google-only@example.com", FullName = "Google account", PasswordHash = null };
        database.Users.Add(user);
        database.UserIdentities.Add(new UserIdentity { User = user, ProviderSubject = "verified-provider-subject" });
        database.UserActionTokens.Add(new UserActionToken
        {
            User = user, Purpose = "EmailVerification", TokenHash = new string('a', 64),
            ExpiresAt = DateTime.UtcNow.AddHours(1)
        });
        await database.SaveChangesAsync();
        (await database.UserIdentities.CountAsync()).Should().Be(1);
        (await database.UserActionTokens.CountAsync()).Should().Be(1);
        database.UserActionTokens.Add(new UserActionToken
        {
            UserId = user.Id, Purpose = "PasswordReset", TokenHash = new string('a', 64),
            ExpiresAt = DateTime.UtcNow.AddHours(1)
        });
        var duplicateHash = () => database.SaveChangesAsync();
        await duplicateHash.Should().ThrowAsync<DbUpdateException>();
        database.ChangeTracker.Clear();
        database.UserIdentities.Add(new UserIdentity { UserId = user.Id, ProviderSubject = "verified-provider-subject" });
        var duplicateIdentity = () => database.SaveChangesAsync();
        await duplicateIdentity.Should().ThrowAsync<DbUpdateException>();
        database.ChangeTracker.Clear();
        database.UserActionTokens.Add(new UserActionToken
        {
            UserId = user.Id, Purpose = "InvalidPurpose", TokenHash = new string('b', 64),
            ExpiresAt = DateTime.UtcNow.AddHours(1)
        });
        var invalidPurpose = () => database.SaveChangesAsync();
        await invalidPurpose.Should().ThrowAsync<DbUpdateException>();
        database.ChangeTracker.Clear();
        await database.Users.Where(account => account.Id == user.Id).ExecuteDeleteAsync();
        (await database.UserActionTokens.CountAsync()).Should().Be(0);
        (await database.UserIdentities.CountAsync()).Should().Be(0);
    }
}
