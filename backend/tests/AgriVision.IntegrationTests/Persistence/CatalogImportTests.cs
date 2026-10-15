using System.Reflection;
using AgriVision.Domain.Entities;
using AgriVision.Infrastructure.Persistence;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql;
using Testcontainers.PostgreSql;

namespace AgriVision.IntegrationTests.Persistence;

public class CatalogImportTests
{
    // Frozen contract from the v1.4 manifest (SHA-256 recorded in the catalog report).
    // Independent of the SQL being tested; CI does not need the local dataset.
    private static readonly string[] ExpectedLabels = """
        Ca_chua___Chay_la_som
        Ca_chua___Dom_la_Septoria
        Ca_chua___Dom_muc_tieu
        Ca_chua___Dom_vi_khuan
        Ca_chua___Khoe_manh
        Ca_chua___Moc_la
        Ca_chua___Moc_suong
        Ca_chua___Nhen_do
        Ca_chua___Virus_kham_la
        Ca_chua___Virus_xoan_vang_la
        Ca_phe___Dom_chay_phoma
        Ca_phe___Dom_la_cercospora
        Ca_phe___Gi_sat
        Ca_phe___Khoe_manh
        Ca_phe___Sau_duc_la
        Cam___Khoe_manh
        Cam___Loet_vi_khuan
        Cam___Mac_nhieu_benh_cung_luc
        Cam___Vang_la_thieu_dinh_duong
        Che___Chay_la_nau
        Che___Dom_la_do
        Che___Dom_tao
        Che___Khoe_manh
        Che___Than_thu
        Lua___Bac_la_lua
        Lua___Chay_la
        Lua___Dom_nau
        Lua___Dom_than_la
        Lua___Khoe_manh
        Lua___Sau_gai_an_la
        Lua___Thoi_chop_la
        Lua___Vang_lui
        Ngo___Chay_la
        Ngo___Dom_la_xam
        Ngo___Gi_sat
        Ngo___Khoe_manh
        Nho___Chay_la
        Nho___Esca
        Nho___Khoe_manh
        Nho___Thoi_den
        Ot___Dom_la_cercospora
        Ot___Dom_vi_khuan
        Ot___Khoe_manh
        Ot___Phan_trang
        Ot___Thieu_dinh_duong
        Ot___Virus_xoan_la
        Sau_rieng___Chay_la
        Sau_rieng___Dom_la_phomopsis
        Sau_rieng___Dom_tao
        Sau_rieng___Khoe_manh
        Sau_rieng___Ray_gay_hai
        Xoai___bo_cat_la
        Xoai___bo_hong
        Xoai___bo_xit
        Xoai___kho_canh
        Xoai___khoe_manh
        Xoai___loet_vi_khuan
        Xoai___phan_trang
        Xoai___than_thu
        """.Split('\n', StringSplitOptions.TrimEntries | StringSplitOptions.RemoveEmptyEntries);

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task Import_ShouldAlignIndices_KeepLegacyHistory_AndBeRepeatable(bool hasLegacyCatalog)
    {
        await using var postgres = new PostgreSqlBuilder("postgres:16-alpine")
            .WithDatabase("catalog_test").WithUsername("testuser").WithPassword("testpassword").Build();
        await postgres.StartAsync();
        await using var database = new AppDbContext(new DbContextOptionsBuilder<AppDbContext>()
            .UseNpgsql(postgres.GetConnectionString()).Options);
        await MigrateToPreCatalogAsync(database);

        var legacyClassId = Guid.NewGuid();
        var potatoClassId = Guid.NewGuid();
        var predictionId = Guid.NewGuid();
        if (hasLegacyCatalog)
        {
            var disease = new Disease { Name = "Early Blight", Description = "Preserved catalog content" };
            var tomato = new PlantDisease
            {
                Id = legacyClassId, Plant = new Plant { Name = "Tomato" }, Disease = disease,
                ClassName = "Tomato___Early_blight", ClassIndex = 1
            };
            var potato = new PlantDisease
            {
                Id = potatoClassId, Plant = new Plant { Name = "Potato" }, Disease = disease,
                ClassName = "Potato___Early_blight", ClassIndex = 6
            };
            database.PlantDiseases.AddRange(tomato, potato);
            database.Predictions.Add(new Prediction
            {
                Id = predictionId, PredictedPlantDisease = potato, Confidence = 0.9,
                ImagePath = "/legacy.jpg", ResultSnapshotJson = "{\"legacy\":true}"
            });
            await database.SaveChangesAsync();
            database.ChangeTracker.Clear();
        }

        var sql = await ReadImportSqlAsync();
        await database.Database.ExecuteSqlRawAsync(sql);
        var idsAfterFirstImport = await database.PlantDiseases.OrderBy(p => p.ClassIndex).Select(p => p.Id).ToListAsync();
        await database.Database.ExecuteSqlRawAsync(sql);
        (await database.PlantDiseases.OrderBy(p => p.ClassIndex).Select(p => p.Id).ToListAsync())
            .Should().Equal(idsAfterFirstImport);

        var active = await database.PlantDiseases.Where(p => p.IsActive).OrderBy(p => p.ClassIndex).ToListAsync();
        active.Should().HaveCount(59);
        active.Select(p => p.ClassIndex).Should().Equal(Enumerable.Range(0, 59));
        active.Select(p => p.ClassName).Should().Equal(ExpectedLabels);
        var identities = await database.PlantDiseases.Where(p => p.IsActive).OrderBy(p => p.ClassIndex)
            .Select(p => p.Plant.Name + "___" + p.Disease.Name).ToListAsync();
        identities.Should().Equal(ExpectedLabels);
        (await database.Plants.CountAsync(p => p.IsActive)).Should().Be(10);
        (await database.Diseases.CountAsync()).Should().Be(44);
        (await database.Diseases.AnyAsync(d => d.IsContentApproved)).Should().BeFalse();
        (await database.Diseases.Where(d => d.Name == "Khoe_manh" || d.Name == "khoe_manh")
            .AllAsync(d => d.ConditionType == "Healthy")).Should().BeTrue();
        (await database.Diseases.Where(d => d.Name == "Thieu_dinh_duong" || d.Name == "Vang_la_thieu_dinh_duong")
            .AllAsync(d => d.ConditionType == "NutrientDeficiency")).Should().BeTrue();
        (await database.Database.GetAppliedMigrationsAsync()).Should().HaveCount(2);

        if (hasLegacyCatalog)
        {
            active[0].Id.Should().Be(legacyClassId);
            var archived = await database.PlantDiseases.SingleAsync(p => p.Id == potatoClassId);
            archived.IsActive.Should().BeFalse();
            archived.ClassIndex.Should().Be(59);
            archived.ClassName.Should().Be("Potato___Early_blight");
            var history = await database.Predictions.SingleAsync(p => p.Id == predictionId);
            history.PredictedPlantDiseaseId.Should().Be(potatoClassId);
            history.ImagePath.Should().Be("/legacy.jpg");
            history.ResultSnapshotJson.Should().Contain("\"legacy\": true");
            (await database.Diseases.SingleAsync(d => d.Name == "Chay_la_som"))
                .Description.Should().Be("Preserved catalog content");
        }
    }

    [Theory]
    [InlineData("plant-alias", "Both legacy and canonical", false)]
    [InlineData("disease-alias", "Both legacy and canonical", false)]
    [InlineData("duplicate-class", "Duplicate class identities", false)]
    [InlineData("wrong-plant", "plant/condition identity conflicts", false)]
    [InlineData("wrong-condition", "plant/condition identity conflicts", false)]
    [InlineData("occupied-pair", "ix_plant_diseases_plant_id_disease_id", false)]
    [InlineData("plant-alias", "Both legacy and canonical", true)]
    [InlineData("disease-alias", "Both legacy and canonical", true)]
    [InlineData("duplicate-class", "Duplicate class identities", true)]
    [InlineData("wrong-plant", "plant/condition identity conflicts", true)]
    [InlineData("wrong-condition", "plant/condition identity conflicts", true)]
    [InlineData("occupied-pair", "ix_plant_diseases_plant_id_disease_id", true)]
    public async Task Import_ShouldRollbackAllChanges_WhenCatalogConflicts(string conflict, string expectedError, bool useEfMigration)
    {
        await using var postgres = new PostgreSqlBuilder("postgres:16-alpine")
            .WithDatabase("catalog_conflict_test").WithUsername("testuser").WithPassword("testpassword").Build();
        await postgres.StartAsync();
        await using var database = new AppDbContext(new DbContextOptionsBuilder<AppDbContext>()
            .UseNpgsql(postgres.GetConnectionString()).Options);
        await MigrateToPreCatalogAsync(database);

        var plant = new Plant { Name = conflict == "wrong-plant" ? "Rice" : "Tomato" };
        var disease = new Disease { Name = conflict == "wrong-condition" ? "Late Blight" : "Early Blight" };
        var existing = new PlantDisease
        {
            Plant = plant, Disease = disease, ClassIndex = 7,
            ClassName = conflict switch
            {
                "wrong-plant" or "wrong-condition" => "Ca_chua___Chay_la_som",
                "occupied-pair" => "Legacy___Unmapped",
                _ => "Tomato___Early_blight"
            }
        };
        database.PlantDiseases.Add(existing);
        database.Predictions.Add(new Prediction
        {
            PredictedPlantDisease = existing, Confidence = 0.9, ImagePath = "/preserve.jpg",
            ResultSnapshotJson = "{\"keep\":true}"
        });
        switch (conflict)
        {
            case "plant-alias":
                database.Plants.Add(new Plant { Name = "Ca_chua" });
                break;
            case "disease-alias":
                database.Diseases.AddRange(new Disease { Name = "Healthy" }, new Disease { Name = "Khoe_manh" });
                break;
            case "duplicate-class":
                database.PlantDiseases.Add(new PlantDisease
                {
                    Plant = new Plant { Name = "Rice" }, Disease = disease,
                    ClassName = existing.ClassName, ClassIndex = 8
                });
                break;
        }
        await database.SaveChangesAsync();
        database.ChangeTracker.Clear();
        var before = await CaptureStateAsync(database);
        var sql = await ReadImportSqlAsync();

        Func<Task> import = useEfMigration
            ? () => database.Database.MigrateAsync()
            : async () => { await database.Database.ExecuteSqlRawAsync(sql); };
        await import.Should().ThrowAsync<PostgresException>().WithMessage("*" + expectedError + "*");
        // Includes the late unique-pair failure, after rename/index/create statements.
        (await CaptureStateAsync(database)).Should().Be(before);
        (await database.Database.GetAppliedMigrationsAsync()).Should().HaveCount(2);
    }

    [Fact]
    public async Task Import_ShouldPreserveApprovedContent_AndReactivateCanonicalRecords()
    {
        await using var postgres = new PostgreSqlBuilder("postgres:16-alpine")
            .WithDatabase("catalog_content_test").WithUsername("testuser").WithPassword("testpassword").Build();
        await postgres.StartAsync();
        await using var database = new AppDbContext(new DbContextOptionsBuilder<AppDbContext>()
            .UseNpgsql(postgres.GetConnectionString()).Options);
        await MigrateToPreCatalogAsync(database);
        var disease = new Disease
        {
            Name = "Chay_la_som", VietnameseName = "Nội dung đã duyệt", ConditionType = "Disease",
            Description = "Approved description", Symptoms = "Approved symptoms",
            Treatment = "Approved treatment", Prevention = "Approved prevention",
            Medication = "Approved medication", IsContentApproved = true, IsActive = false
        };
        var plant = new Plant { Name = "Ca_chua", ScientificName = "Preserved scientific name", IsActive = false };
        var existing = new PlantDisease
        {
            Plant = plant, Disease = disease, ClassName = ExpectedLabels[0], ClassIndex = 123, IsActive = false
        };
        database.PlantDiseases.Add(existing);
        await database.SaveChangesAsync();
        var diseaseId = disease.Id;
        var plantId = plant.Id;
        var classId = existing.Id;
        database.ChangeTracker.Clear();

        var sql = await ReadImportSqlAsync();
        await database.Database.ExecuteSqlRawAsync(sql);
        await database.Database.ExecuteSqlRawAsync(sql);
        var preserved = await database.Diseases.SingleAsync(d => d.Id == diseaseId);
        preserved.IsActive.Should().BeTrue();
        preserved.IsContentApproved.Should().BeTrue();
        preserved.ConditionType.Should().Be("Disease");
        preserved.VietnameseName.Should().Be("Nội dung đã duyệt");
        preserved.Description.Should().Be("Approved description");
        preserved.Symptoms.Should().Be("Approved symptoms");
        preserved.Treatment.Should().Be("Approved treatment");
        preserved.Prevention.Should().Be("Approved prevention");
        preserved.Medication.Should().Be("Approved medication");
        (await database.Diseases.Where(d => d.Id != diseaseId).AllAsync(d => !d.IsContentApproved && d.Medication == null))
            .Should().BeTrue();
        var preservedPlant = await database.Plants.SingleAsync(p => p.Id == plantId);
        preservedPlant.IsActive.Should().BeTrue();
        preservedPlant.ScientificName.Should().Be("Preserved scientific name");
        var preservedClass = await database.PlantDiseases.SingleAsync(p => p.Id == classId);
        preservedClass.IsActive.Should().BeTrue();
        preservedClass.ClassIndex.Should().Be(0);
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task Migration_ShouldCreateCatalog_OrAdoptExistingImport_WithoutChangingIds(bool alreadyImported)
    {
        await using var postgres = new PostgreSqlBuilder("postgres:16-alpine")
            .WithDatabase("catalog_migration_test").WithUsername("testuser").WithPassword("testpassword").Build();
        await postgres.StartAsync();
        await using var database = new AppDbContext(new DbContextOptionsBuilder<AppDbContext>()
            .UseNpgsql(postgres.GetConnectionString()).Options);
        await MigrateToPreCatalogAsync(database);
        if (alreadyImported)
            await database.Database.ExecuteSqlRawAsync(await ReadImportSqlAsync());
        var beforeIds = await database.PlantDiseases.OrderBy(p => p.ClassIndex).Select(p => p.Id).ToListAsync();

        await database.Database.MigrateAsync();
        var afterIds = await database.PlantDiseases.OrderBy(p => p.ClassIndex).Select(p => p.Id).ToListAsync();
        if (alreadyImported) afterIds.Should().Equal(beforeIds);
        await database.Database.MigrateAsync();
        (await database.PlantDiseases.OrderBy(p => p.ClassIndex).Select(p => p.Id).ToListAsync()).Should().Equal(afterIds);
        (await database.PlantDiseases.Where(p => p.IsActive).OrderBy(p => p.ClassIndex).Select(p => p.ClassName).ToListAsync())
            .Should().Equal(ExpectedLabels);
        (await database.Database.GetAppliedMigrationsAsync()).Should().HaveCount(3)
            .And.Contain("20261007032722_DatasetV14Catalog");

        var state = await CaptureStateAsync(database);
        var downgrade = () => MigrateToPreCatalogAsync(database);
        await downgrade.Should().ThrowAsync<NotSupportedException>().WithMessage("*forward-only*");
        (await CaptureStateAsync(database)).Should().Be(state);
        (await database.Database.GetAppliedMigrationsAsync()).Should().HaveCount(3);
    }

    private static Task MigrateToPreCatalogAsync(AppDbContext database) =>
        database.GetService<IMigrator>().MigrateAsync("20261006161042_ConfirmedRequirementsSchema");

    private static async Task<string> ReadImportSqlAsync()
    {
        using var stream = Assembly.GetExecutingAssembly().GetManifestResourceStream("dataset-v1.4-catalog.sql")!;
        using var reader = new StreamReader(stream);
        return await reader.ReadToEndAsync();
    }

    private static Task<string> CaptureStateAsync(AppDbContext database)
    {
        // Compare every persisted business row/field with a fixed SQL statement.
        const string sql = """
            SELECT jsonb_build_object(
                'users', (SELECT COALESCE(jsonb_agg(to_jsonb(r) ORDER BY r.id), '[]'::jsonb) FROM users r),
                'plants', (SELECT COALESCE(jsonb_agg(to_jsonb(r) ORDER BY r.id), '[]'::jsonb) FROM plants r),
                'diseases', (SELECT COALESCE(jsonb_agg(to_jsonb(r) ORDER BY r.id), '[]'::jsonb) FROM diseases r),
                'plant_diseases', (SELECT COALESCE(jsonb_agg(to_jsonb(r) ORDER BY r.id), '[]'::jsonb) FROM plant_diseases r),
                'predictions', (SELECT COALESCE(jsonb_agg(to_jsonb(r) ORDER BY r.id), '[]'::jsonb) FROM predictions r),
                'prediction_details', (SELECT COALESCE(jsonb_agg(to_jsonb(r) ORDER BY r.id), '[]'::jsonb) FROM prediction_details r),
                'prediction_images', (SELECT COALESCE(jsonb_agg(to_jsonb(r) ORDER BY r.id), '[]'::jsonb) FROM prediction_images r),
                'user_identities', (SELECT COALESCE(jsonb_agg(to_jsonb(r) ORDER BY r.id), '[]'::jsonb) FROM user_identities r),
                'user_action_tokens', (SELECT COALESCE(jsonb_agg(to_jsonb(r) ORDER BY r.id), '[]'::jsonb) FROM user_action_tokens r)
            )::text AS "Value"
            """;
        return database.Database.SqlQueryRaw<string>(sql).SingleAsync();
    }
}
