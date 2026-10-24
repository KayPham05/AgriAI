using AgriVision.Application.DTOs.Prediction;
using AgriVision.Infrastructure.Persistence.Repositories;
using AgriVision.Infrastructure.Persistence;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Npgsql;
using Testcontainers.PostgreSql;

namespace AgriVision.IntegrationTests.Persistence;

public class DatabaseImprovementTests : IAsyncLifetime
{
    private readonly PostgreSqlContainer _postgres = new PostgreSqlBuilder("postgres:16-alpine")
        .WithDatabase("agri127_test").WithUsername("testuser").WithPassword("testpassword").Build();

    public async Task InitializeAsync()
    {
        await _postgres.StartAsync();
        await using var database = CreateDatabase();
        await database.Database.MigrateAsync();
    }

    public async Task DisposeAsync() => await _postgres.DisposeAsync();

    private AppDbContext CreateDatabase() => new(new DbContextOptionsBuilder<AppDbContext>()
        .UseNpgsql(_postgres.GetConnectionString()).Options);

    private static async Task<Guid> CreateUserAsync(AppDbContext database)
    {
        var id = Guid.NewGuid();
        await database.Database.ExecuteSqlInterpolatedAsync($"""
            INSERT INTO users (id, full_name, email, created_at)
            VALUES ({id}, 'Database test', {id + "@example.test"}, now());
            """);
        return id;
    }

    private static async Task<Guid> CreateSessionAsync(AppDbContext database, Guid userId)
    {
        var id = Guid.NewGuid();
        await database.Database.ExecuteSqlInterpolatedAsync($"""
            INSERT INTO user_sessions (id, user_id, created_at, expires_at)
            VALUES ({id}, {userId}, now(), now() + interval '1 day');
            """);
        return id;
    }

    private static async Task<Guid> CreateProfileAsync(AppDbContext database, Guid userId)
    {
        var id = Guid.NewGuid();
        await database.Database.ExecuteSqlInterpolatedAsync($"""
            INSERT INTO agricultural_profiles (id, user_id, name, created_at)
            VALUES ({id}, {userId}, 'My crop records', now())
            """);
        return id;
    }

    private static async Task<Guid> CreatePredictionAsync(AppDbContext database, Guid userId, Guid? profileId)
    {
        var id = Guid.NewGuid();
        var classId = await database.PlantDiseases.OrderBy(p => p.ClassIndex).Select(p => p.Id).FirstAsync();
        const string snapshot = "{\"warning\":null}";
        await database.Database.ExecuteSqlInterpolatedAsync($"""
            INSERT INTO predictions (id, user_id, agricultural_profile_id, image_path, predicted_plant_disease_id, confidence, created_at, result_snapshot)
            VALUES ({id}, {userId}, {profileId}, 'https://example.test/image', {classId}, 0.9, now(), {snapshot}::jsonb)
            """);
        return id;
    }

    [Theory]
    [InlineData("scoped")]
    [InlineData("by-id")]
    [InlineData("all")]
    public async Task RepositoryRevocation_HandlesSessionsCreatedOnAnAheadClock(string operation)
    {
        await using var database = CreateDatabase();
        var userId = await CreateUserAsync(database);
        var id = Guid.NewGuid();
        var created = DateTime.UtcNow.AddMinutes(5);
        await database.Database.ExecuteSqlInterpolatedAsync($"""
            INSERT INTO user_sessions (id, user_id, created_at, expires_at)
            VALUES ({id}, {userId}, {created}, {created.AddDays(1)});
            """);
        var other = await CreateSessionAsync(database, userId);
        var repository = new UserSessionRepository(database);
        if (operation == "scoped") await repository.RevokeSessionAsync(userId, id);
        else if (operation == "by-id") await repository.RevokeSessionAsync(id);
        else await repository.RevokeAllSessionsByUserIdAsync(userId);
        var session = await database.UserSessions.AsNoTracking().SingleAsync(x => x.Id == id);
        session.RevokedAt.Should().NotBeNull();
        session.RevokedAt!.Value.Should().BeOnOrAfter(session.CreatedAt);
        var otherSession = await database.UserSessions.AsNoTracking().SingleAsync(x => x.Id == other);
        if (operation == "all") otherSession.RevokedAt.Should().NotBeNull();
        else otherSession.RevokedAt.Should().BeNull();
    }

    [Theory]
    [InlineData("role")]
    [InlineData("status")]
    public async Task AccountChanges_RevokeSessionsEvenWhenApplicationClockWasAhead(string change)
    {
        await using var database = CreateDatabase();
        var userId = await CreateUserAsync(database);
        var created = DateTime.UtcNow.AddMinutes(5);
        var futureSession = Guid.NewGuid();
        var priorSession = Guid.NewGuid();
        await database.Database.ExecuteSqlInterpolatedAsync($"""
            INSERT INTO user_sessions (id, user_id, created_at, expires_at)
            VALUES ({futureSession}, {userId}, {created}, {created.AddDays(1)});
            """);
        await database.Database.ExecuteSqlInterpolatedAsync($"""
            INSERT INTO user_sessions (id, user_id, created_at, expires_at, revoked_at)
            VALUES ({priorSession}, {userId}, now() - interval '1 day', now() + interval '1 day', now() - interval '1 hour');
            """);
        var revokedBefore = (await database.UserSessions.AsNoTracking().SingleAsync(x => x.Id == priorSession)).RevokedAt;
        if (change == "role") await database.Database.ExecuteSqlInterpolatedAsync($"UPDATE users SET role = 'Admin' WHERE id = {userId}");
        else await database.Database.ExecuteSqlInterpolatedAsync($"UPDATE users SET is_active = false WHERE id = {userId}");
        var affected = await database.UserSessions.AsNoTracking().SingleAsync(x => x.Id == futureSession);
        affected.RevokedAt.Should().NotBeNull();
        affected.RevokedAt!.Value.Should().BeOnOrAfter(affected.CreatedAt);
        (await database.UserSessions.AsNoTracking().SingleAsync(x => x.Id == priorSession)).RevokedAt.Should().Be(revokedBefore);
        var user = await database.Users.AsNoTracking().SingleAsync(x => x.Id == userId);
        if (change == "role") user.Role.Should().Be("Admin");
        else user.IsActive.Should().BeFalse();
    }

    [Fact]
    public async Task Profiles_ShouldBeOptional_AndDeletingProfileShouldPreserveHistoryAndSnapshot()
    {
        await using var database = CreateDatabase();
        var userId = await CreateUserAsync(database);
        var profileId = await CreateProfileAsync(database, userId);
        var grouped = await CreatePredictionAsync(database, userId, profileId);
        var ungrouped = await CreatePredictionAsync(database, userId, null);
        await database.Database.ExecuteSqlInterpolatedAsync($"DELETE FROM agricultural_profiles WHERE id = {profileId}");

        var ids = await database.Database.SqlQuery<Guid>($"""
            SELECT id AS "Value" FROM predictions
            WHERE user_id = {userId} AND agricultural_profile_id IS NULL AND result_snapshot IS NOT NULL
            """).ToListAsync();
        ids.Should().BeEquivalentTo(new[] { grouped, ungrouped });
    }

    [Fact]
    public async Task Profile_ShouldRejectOtherOwner_AndDirectTransfer_ButAllowDetach()
    {
        await using var database = CreateDatabase();
        var owner = await CreateUserAsync(database);
        var other = await CreateUserAsync(database);
        var first = await CreateProfileAsync(database, owner);
        var second = await CreateProfileAsync(database, owner);
        Func<Task> crossOwner = async () => await CreatePredictionAsync(database, other, first);
        (await crossOwner.Should().ThrowAsync<PostgresException>()).Which.SqlState.Should().Be(PostgresErrorCodes.CheckViolation);
        var id = await CreatePredictionAsync(database, owner, first);
        Func<Task> move = async () => await database.Database.ExecuteSqlInterpolatedAsync($"""
            UPDATE predictions SET agricultural_profile_id = {second} WHERE id = {id}
            """);
        (await move.Should().ThrowAsync<PostgresException>()).Which.SqlState.Should().Be(PostgresErrorCodes.CheckViolation);
        await database.Database.ExecuteSqlInterpolatedAsync($"UPDATE predictions SET agricultural_profile_id = NULL WHERE id = {id}");
        (await database.Predictions.CountAsync(p => p.Id == id)).Should().Be(1);
        (await move.Should().ThrowAsync<PostgresException>()).Which.SqlState.Should().Be(PostgresErrorCodes.CheckViolation);
        var ungrouped = await CreatePredictionAsync(database, owner, null);
        Func<Task> attachLater = async () => await database.Database.ExecuteSqlInterpolatedAsync($"""
            UPDATE predictions SET agricultural_profile_id = {first} WHERE id = {ungrouped}
            """);
        (await attachLater.Should().ThrowAsync<PostgresException>()).Which.SqlState.Should().Be(PostgresErrorCodes.CheckViolation);
    }

    [Fact]
    public async Task DeletingAccount_ShouldKeepHistoryWithoutOwnerOrProfile()
    {
        await using var database = CreateDatabase();
        var owner = await CreateUserAsync(database);
        var profile = await CreateProfileAsync(database, owner);
        var prediction = await CreatePredictionAsync(database, owner, profile);
        await database.Database.ExecuteSqlInterpolatedAsync($"DELETE FROM users WHERE id = {owner}");
        (await database.Database.SqlQuery<bool>($"""
            SELECT user_id IS NULL AND agricultural_profile_id IS NULL AND result_snapshot IS NOT NULL AS "Value"
            FROM predictions WHERE id = {prediction}
            """).SingleAsync()).Should().BeTrue();
    }

    [Fact]
    public async Task KnowledgeLinks_ShouldSupportSeveralClasses_AndRejectDuplicatesOrUnknownClasses()
    {
        await using var database = CreateDatabase();
        var id = Guid.NewGuid();
        await database.Database.ExecuteSqlInterpolatedAsync($"""
            INSERT INTO knowledge_documents (id, title, content, source_url, created_at, updated_at)
            VALUES ({id}, 'Guide', 'Care advice', 'https://example.test/source', now(), now())
            """);
        var classes = await database.PlantDiseases.OrderBy(p => p.ClassIndex).Select(p => p.Id).Take(2).ToListAsync();
        foreach (var classId in classes)
            await database.Database.ExecuteSqlInterpolatedAsync($"""
                INSERT INTO knowledge_document_plant_diseases (knowledge_document_id, plant_disease_id) VALUES ({id}, {classId})
                """);
        Func<Task> duplicate = async () => await database.Database.ExecuteSqlInterpolatedAsync($"""
            INSERT INTO knowledge_document_plant_diseases (knowledge_document_id, plant_disease_id) VALUES ({id}, {classes[0]})
            """);
        (await duplicate.Should().ThrowAsync<PostgresException>()).Which.SqlState.Should().Be(PostgresErrorCodes.UniqueViolation);
        Func<Task> invalid = async () => await database.Database.ExecuteSqlInterpolatedAsync($"""
            INSERT INTO knowledge_document_plant_diseases (knowledge_document_id, plant_disease_id) VALUES ({id}, {Guid.NewGuid()})
            """);
        (await invalid.Should().ThrowAsync<PostgresException>()).Which.SqlState.Should().Be(PostgresErrorCodes.ForeignKeyViolation);
        (await database.Database.SqlQuery<int>($"""
            SELECT count(*)::int AS "Value" FROM knowledge_document_plant_diseases WHERE knowledge_document_id = {id}
            """).SingleAsync()).Should().Be(2);
    }

    [Fact]
    public async Task AuditLog_ShouldPreserveActionWhenAccountIsDeleted()
    {
        await using var database = CreateDatabase();
        var actorId = await CreateUserAsync(database);
        var targetId = await CreateUserAsync(database);
        var id = Guid.NewGuid();
        await database.Database.ExecuteSqlInterpolatedAsync($"""
            INSERT INTO admin_audit_logs (id, actor_user_id, target_user_id, action, occurred_at)
            VALUES ({id}, {actorId}, {targetId}, 'AccountDisabled', now())
            """);
        await database.Database.ExecuteSqlInterpolatedAsync($"DELETE FROM users WHERE id = {targetId}");
        (await database.Database.SqlQuery<string>($"""
            SELECT action AS "Value" FROM admin_audit_logs WHERE id = {id} AND target_user_id IS NULL
            """).SingleAsync()).Should().Be("AccountDisabled");
    }

    [Fact]
    public async Task RevokingOneSession_ShouldLeaveOtherSessionUsable()
    {
        await using var database = CreateDatabase();
        var userId = await CreateUserAsync(database);
        var first = await CreateSessionAsync(database, userId);
        var second = await CreateSessionAsync(database, userId);
        await database.Database.ExecuteSqlInterpolatedAsync($"UPDATE user_sessions SET revoked_at = now() WHERE id = {first}");

        var usable = await database.Database.SqlQuery<Guid>($"""
            SELECT id AS "Value" FROM user_sessions
            WHERE user_id = {userId} AND revoked_at IS NULL AND expires_at > now()
            """).ToListAsync();
        usable.Should().Equal(second);
    }

    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public async Task DisablingOrChangingRole_ShouldRevokeAllExistingSessions(bool disable)
    {
        await using var database = CreateDatabase();
        var userId = await CreateUserAsync(database);
        await CreateSessionAsync(database, userId);
        await CreateSessionAsync(database, userId);
        if (disable)
            await database.Database.ExecuteSqlInterpolatedAsync($"UPDATE users SET is_active = false WHERE id = {userId}");
        else
            await database.Database.ExecuteSqlInterpolatedAsync($"UPDATE users SET role = 'Admin' WHERE id = {userId}");

        var count = await database.Database.SqlQuery<int>($"""
            SELECT count(*)::int AS "Value" FROM user_sessions WHERE user_id = {userId} AND revoked_at IS NULL
            """).SingleAsync();
        count.Should().Be(0);
        if (disable)
        {
            Func<Task> createSession = async () => await CreateSessionAsync(database, userId);
            await createSession.Should().ThrowAsync<PostgresException>();
        }
    }

    [Fact]
    public async Task Session_ShouldRejectInvalidExpiry_AndUnknownOwner()
    {
        await using var database = CreateDatabase();
        var userId = await CreateUserAsync(database);
        var id = Guid.NewGuid();
        Func<Task> invalidExpiry = async () => await database.Database.ExecuteSqlInterpolatedAsync($"""
            INSERT INTO user_sessions (id, user_id, created_at, expires_at)
            VALUES ({id}, {userId}, now(), now() - interval '1 second')
            """);
        (await invalidExpiry.Should().ThrowAsync<PostgresException>()).Which.SqlState.Should().Be(PostgresErrorCodes.CheckViolation);
        Func<Task> invalidOwner = async () => await CreateSessionAsync(database, Guid.NewGuid());
        await invalidOwner.Should().ThrowAsync<PostgresException>();
    }

    [Fact]
    [Trait("Category", "Security")]
    public async Task ProfileOwnership_ShouldNotBeTransferred_OrBypassedByChangingPredictionOwner()
    {
        await using var database = CreateDatabase();
        var owner = await CreateUserAsync(database);
        var other = await CreateUserAsync(database);
        var profile = await CreateProfileAsync(database, owner);
        var prediction = await CreatePredictionAsync(database, owner, profile);
        Func<Task> transfer = async () => await database.Database.ExecuteSqlInterpolatedAsync($"""
            UPDATE agricultural_profiles SET user_id = {other} WHERE id = {profile}
            """);
        (await transfer.Should().ThrowAsync<PostgresException>()).Which.SqlState.Should().Be(PostgresErrorCodes.CheckViolation);
        Func<Task> bypass = async () => await database.Database.ExecuteSqlInterpolatedAsync($"""
            UPDATE predictions SET user_id = {other} WHERE id = {prediction}
            """);
        (await bypass.Should().ThrowAsync<PostgresException>()).Which.SqlState.Should().Be(PostgresErrorCodes.CheckViolation);
        var saved = await database.Predictions.SingleAsync(item => item.Id == prediction);
        saved.UserId.Should().Be(owner);
        saved.AgriculturalProfileId.Should().Be(profile);
        saved.ResultSnapshotJson.Should().NotBeNull();
    }

    [Theory]
    [Trait("Category", "Security")]
    [InlineData("revive")]
    [InlineData("extend")]
    [InlineData("transfer")]
    public async Task SessionIdentityAndRevocation_ShouldResistModification(string mutation)
    {
        await using var database = CreateDatabase();
        var owner = await CreateUserAsync(database);
        var other = await CreateUserAsync(database);
        var session = await CreateSessionAsync(database, owner);
        await database.Database.ExecuteSqlInterpolatedAsync($"UPDATE user_sessions SET revoked_at = now() WHERE id = {session}");
        Func<Task> modify = mutation switch
        {
            "revive" => async () => await database.Database.ExecuteSqlInterpolatedAsync($"UPDATE user_sessions SET revoked_at = NULL WHERE id = {session}"),
            "extend" => async () => await database.Database.ExecuteSqlInterpolatedAsync($"UPDATE user_sessions SET expires_at = expires_at + interval '1 day' WHERE id = {session}"),
            _ => async () => await database.Database.ExecuteSqlInterpolatedAsync($"UPDATE user_sessions SET user_id = {other} WHERE id = {session}")
        };
        (await modify.Should().ThrowAsync<PostgresException>()).Which.SqlState.Should().Be(PostgresErrorCodes.CheckViolation);
        (await database.Database.SqlQuery<bool>($"""
            SELECT user_id = {owner} AND revoked_at IS NOT NULL AS "Value" FROM user_sessions WHERE id = {session}
            """).SingleAsync()).Should().BeTrue();
    }

    [Fact]
    public async Task Document_ShouldDefaultToDraft_AndRequireReviewAgainAfterEditing()
    {
        await using var database = CreateDatabase();
        var id = Guid.NewGuid();
        await database.Database.ExecuteSqlInterpolatedAsync($"""
            INSERT INTO knowledge_documents (id, title, content, source_url, created_at, updated_at)
            VALUES ({id}, 'Care guide', 'Verified care information', 'https://example.test/source', now(), now())
            """);
        var draft = await database.Database.SqlQuery<bool>($"""
            SELECT NOT is_approved AND NOT is_public AS "Value" FROM knowledge_documents WHERE id = {id}
            """).SingleAsync();
        draft.Should().BeTrue();
        await database.Database.ExecuteSqlInterpolatedAsync($"UPDATE knowledge_documents SET is_approved = true, is_public = true WHERE id = {id}");
        await database.Database.ExecuteSqlInterpolatedAsync($"""
            UPDATE knowledge_documents SET content = 'Changed content', is_approved = true, is_public = true WHERE id = {id}
            """);
        var requiresReview = await database.Database.SqlQuery<bool>($"""
            SELECT NOT is_approved AND NOT is_public AS "Value" FROM knowledge_documents WHERE id = {id}
            """).SingleAsync();
        requiresReview.Should().BeTrue();
    }

    [Theory]
    [InlineData("insert")]
    [InlineData("update")]
    [InlineData("delete")]
    public async Task DocumentClassChanges_ShouldRequireReviewAgain(string operation)
    {
        await using var database = CreateDatabase();
        var document = Guid.NewGuid();
        var classes = await database.PlantDiseases.OrderBy(item => item.ClassIndex).Select(item => item.Id).Take(2).ToListAsync();
        await database.Database.ExecuteSqlInterpolatedAsync($"""
            INSERT INTO knowledge_documents (id, title, content, source_url, created_at, updated_at)
            VALUES ({document}, 'Rice guide', 'Reviewed content', 'https://example.test/rice', now(), now());
            INSERT INTO knowledge_document_plant_diseases (knowledge_document_id, plant_disease_id)
            VALUES ({document}, {classes[0]});
            UPDATE knowledge_documents SET is_approved = true, is_public = true WHERE id = {document};
            """);
        switch (operation)
        {
            case "insert":
                await database.Database.ExecuteSqlInterpolatedAsync($"""
                    INSERT INTO knowledge_document_plant_diseases (knowledge_document_id, plant_disease_id)
                    VALUES ({document}, {classes[1]})
                    """);
                break;
            case "update":
                await database.Database.ExecuteSqlInterpolatedAsync($"""
                    UPDATE knowledge_document_plant_diseases SET plant_disease_id = {classes[1]}
                    WHERE knowledge_document_id = {document} AND plant_disease_id = {classes[0]}
                    """);
                break;
            default:
                await database.Database.ExecuteSqlInterpolatedAsync($"DELETE FROM knowledge_document_plant_diseases WHERE knowledge_document_id = {document}");
                break;
        }
        (await database.Database.SqlQuery<bool>($"""
            SELECT NOT is_approved AND NOT is_public AND content = 'Reviewed content' AS "Value"
            FROM knowledge_documents WHERE id = {document}
            """).SingleAsync()).Should().BeTrue();
        var remaining = await database.KnowledgeDocumentPlantDiseases.CountAsync(item => item.KnowledgeDocumentId == document);
        remaining.Should().Be(operation == "insert" ? 2 : operation == "delete" ? 0 : 1);
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    public async Task Profile_ShouldRejectBlankName_WithoutCreatingRecord(string name)
    {
        await using var database = CreateDatabase();
        var owner = await CreateUserAsync(database);
        var profile = Guid.NewGuid();
        Func<Task> create = async () => await database.Database.ExecuteSqlInterpolatedAsync($"""
            INSERT INTO agricultural_profiles (id, user_id, name, created_at) VALUES ({profile}, {owner}, {name}, now())
            """);
        (await create.Should().ThrowAsync<PostgresException>()).Which.SqlState.Should().Be(PostgresErrorCodes.CheckViolation);
        (await database.AgriculturalProfiles.AnyAsync(item => item.Id == profile)).Should().BeFalse();
    }

    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public async Task AccountChangeRacingSessionCreation_ShouldLeaveNoUsableOldSession(bool disable)
    {
        await using var database = CreateDatabase();
        var owner = await CreateUserAsync(database);
        await using var sessionDatabase = CreateDatabase();
        await using var transaction = await sessionDatabase.Database.BeginTransactionAsync();
        await sessionDatabase.Database.ExecuteSqlRawAsync("SET LOCAL statement_timeout = '10s'");
        await database.Database.OpenConnectionAsync();
        await database.Database.ExecuteSqlRawAsync("SET statement_timeout = '10s'");
        await CreateSessionAsync(sessionDatabase, owner);
        // Session INSERT holds a shared owner-row lock until commit; the update must revoke it afterward.
        var change = disable
            ? database.Database.ExecuteSqlInterpolatedAsync($"UPDATE users SET is_active = false WHERE id = {owner}")
            : database.Database.ExecuteSqlInterpolatedAsync($"UPDATE users SET role = 'Admin' WHERE id = {owner}");
        await transaction.CommitAsync();
        await change;
        (await database.Database.SqlQuery<int>($"""
            SELECT count(*)::int AS "Value" FROM user_sessions WHERE user_id = {owner} AND revoked_at IS NULL
            """).SingleAsync()).Should().Be(0);
        (await database.Users.AnyAsync(item => item.Id == owner)).Should().BeTrue();
    }

    [Fact]
    public async Task Medicine_ShouldRequireMandatoryFields_AndVerifiedLabelBeforeUseApproval()
    {
        await using var database = CreateDatabase();
        var id = Guid.NewGuid();
        Func<Task> missingIngredient = async () => await database.Database.ExecuteSqlInterpolatedAsync($"""
            INSERT INTO medicines (id, product_name, active_ingredient, target_use, source_url, safety_warning, label_reference, created_at, updated_at)
            VALUES ({id}, 'Test product', ' ', 'Test target', 'https://example.test/label', 'Test warning', 'Test label', now(), now())
            """);
        (await missingIngredient.Should().ThrowAsync<PostgresException>()).Which.SqlState.Should().Be(PostgresErrorCodes.CheckViolation);
        await database.Database.ExecuteSqlInterpolatedAsync($"""
            INSERT INTO medicines (id, product_name, active_ingredient, target_use, source_url, safety_warning, label_reference, created_at, updated_at)
            VALUES ({id}, 'Test product', 'Test ingredient', 'Test target', 'https://example.test/label', 'Test warning', 'Test label', now(), now())
            """);
        var classId = await database.PlantDiseases.OrderBy(p => p.ClassIndex).Select(p => p.Id).FirstAsync();
        Func<Task> unverified = async () => await database.Database.ExecuteSqlInterpolatedAsync($"""
            INSERT INTO medicine_uses (medicine_id, plant_disease_id, label_directions, is_approved)
            VALUES ({id}, {classId}, 'Follow verified label', true)
            """);
        (await unverified.Should().ThrowAsync<PostgresException>()).Which.SqlState.Should().Be(PostgresErrorCodes.CheckViolation);
        await database.Database.ExecuteSqlInterpolatedAsync($"""
            INSERT INTO medicine_uses (medicine_id, plant_disease_id, label_directions, is_label_verified, is_approved)
            VALUES ({id}, {classId}, 'Follow verified label', true, true)
            """);
        await database.Database.ExecuteSqlInterpolatedAsync($"UPDATE medicines SET is_approved = true, is_public = true WHERE id = {id}");
        await database.Database.ExecuteSqlInterpolatedAsync($"UPDATE medicines SET safety_warning = 'Updated warning' WHERE id = {id}");
        (await database.Database.SqlQuery<bool>($"""
            SELECT NOT is_approved AND NOT is_public AS "Value" FROM medicines WHERE id = {id}
            """).SingleAsync()).Should().BeTrue();
        (await database.Database.SqlQuery<bool>($"""
            SELECT NOT is_approved AND NOT is_label_verified AS "Value" FROM medicine_uses WHERE medicine_id = {id}
            """).SingleAsync()).Should().BeTrue();
    }

    [Fact]
    public async Task EditingMedicineDirections_ShouldRevokeUseAndProductApproval()
    {
        await using var database = CreateDatabase();
        var medicine = Guid.NewGuid();
        var classId = await database.PlantDiseases.OrderBy(item => item.ClassIndex).Select(item => item.Id).FirstAsync();
        await database.Database.ExecuteSqlInterpolatedAsync($"""
            INSERT INTO medicines (id, product_name, active_ingredient, target_use, source_url, safety_warning, label_reference, created_at, updated_at)
            VALUES ({medicine}, 'Test product', 'Test ingredient', 'Test target', 'https://example.test/label', 'Test warning', 'Test label', now(), now());
            INSERT INTO medicine_uses (medicine_id, plant_disease_id, label_directions, is_label_verified, is_approved)
            VALUES ({medicine}, {classId}, 'Original label instructions', true, true);
            UPDATE medicines SET is_approved = true, is_public = true WHERE id = {medicine};
            UPDATE medicine_uses SET label_directions = 'Changed instructions', is_label_verified = true, is_approved = true
            WHERE medicine_id = {medicine} AND plant_disease_id = {classId};
            """);
        (await database.Database.SqlQuery<bool>($"""
            SELECT NOT m.is_approved AND NOT m.is_public AND NOT u.is_approved AND NOT u.is_label_verified
                AND u.label_directions = 'Changed instructions' AS "Value"
            FROM medicines m JOIN medicine_uses u ON u.medicine_id = m.id WHERE m.id = {medicine}
            """).SingleAsync()).Should().BeTrue();
    }

    [Fact]
    public async Task UnitOfWork_ShouldRollbackAllOperations_WhenExceptionThrownMidTransaction()
    {
        await using var database = CreateDatabase();
        var userId = await CreateUserAsync(database);
        var sessionId = await CreateSessionAsync(database, userId);

        var initialPasswordHash = "initial-hash";
        await database.Database.ExecuteSqlInterpolatedAsync($"UPDATE users SET password_hash = {initialPasswordHash} WHERE id = {userId}");

        var unitOfWork = new UnitOfWork(database);

        var act = async () =>
        {
            await unitOfWork.ExecuteInTransactionAsync(async () =>
            {
                // Step 1: Update password hash in users table
                await database.Database.ExecuteSqlInterpolatedAsync($"UPDATE users SET password_hash = 'new-hash-midway' WHERE id = {userId}");

                // Step 2: Mid-transaction failure before session revocation
                throw new InvalidOperationException("Simulated mid-transaction failure during session revocation");
            });
        };

        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("Simulated mid-transaction failure during session revocation");

        // Verify in PostgreSQL that Step 1 was rolled back and password hash is untouched
        var currentPasswordHash = await database.Database.SqlQuery<string>($"""
            SELECT password_hash AS "Value" FROM users WHERE id = {userId}
            """).SingleAsync();
        currentPasswordHash.Should().Be(initialPasswordHash);

        // Verify that the session was NOT revoked
        var sessionRevoked = await database.Database.SqlQuery<bool>($"""
            SELECT revoked_at IS NOT NULL AS "Value" FROM user_sessions WHERE id = {sessionId}
            """).SingleAsync();
        sessionRevoked.Should().BeFalse();
    }

    [Fact]
    public async Task PredictionRepository_ShouldFilterByUnspecifiedDateTimeKind_WithoutTimezoneException()
    {
        await using var database = CreateDatabase();
        var userId = await CreateUserAsync(database);
        var predictionId = await CreatePredictionAsync(database, userId, null);

        var repository = new PredictionRepository(database);

        // Pass dates with DateTimeKind.Unspecified (mimicking ASP.NET Core query parameter model binding)
        var fromDate = DateTime.SpecifyKind(DateTime.UtcNow.AddDays(-1), DateTimeKind.Unspecified);
        var toDate = DateTime.SpecifyKind(DateTime.UtcNow.AddDays(1), DateTimeKind.Unspecified);

        var filter = new PredictionFilterParams(FromDate: fromDate, ToDate: toDate);

        // Must execute cleanly against real PostgreSQL timestamptz column without Npgsql exception
        var (items, totalCount) = await repository.GetFilteredByUserIdAsync(userId, filter);

        totalCount.Should().Be(1);
        items.Should().ContainSingle(p => p.Id == predictionId);

        // Verify out-of-range date filter returns 0
        var futureFilter = new PredictionFilterParams(
            FromDate: DateTime.SpecifyKind(DateTime.UtcNow.AddDays(2), DateTimeKind.Unspecified),
            ToDate: DateTime.SpecifyKind(DateTime.UtcNow.AddDays(3), DateTimeKind.Unspecified));

        var (futureItems, futureCount) = await repository.GetFilteredByUserIdAsync(userId, futureFilter);
        futureCount.Should().Be(0);
        futureItems.Should().BeEmpty();
    }
}
