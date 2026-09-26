using AgriVision.Domain.Entities;
using AgriVision.Domain.Enums;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

namespace AgriVision.Infrastructure.Persistence;

public static class DbInitializer
{
    public static async Task SeedAsync(IServiceProvider serviceProvider)
    {
        using var scope = serviceProvider.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var logger = scope.ServiceProvider.GetService<ILogger<AppDbContext>>();

        try
        {
            if (context.Database.IsNpgsql())
            {
                await context.Database.MigrateAsync();
            }

            await SeedUsersAsync(context);
            await SeedMasterDataAsync(context);
        }
        catch (Exception ex)
        {
            logger?.LogError(ex, "An error occurred while seeding the database.");
        }
    }

    private static async Task SeedUsersAsync(AppDbContext context)
    {
        if (await context.Users.AnyAsync())
        {
            return;
        }

        var adminUser = new User
        {
            Id = Guid.NewGuid(),
            FullName = "System Admin",
            Email = "admin@agrivision.ai",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("AdminPassword123!"),
            Role = UserRole.Admin,
            CreatedAt = DateTime.UtcNow
        };

        var regularUser = new User
        {
            Id = Guid.NewGuid(),
            FullName = "Demo Farmer",
            Email = "user@agrivision.ai",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("UserPassword123!"),
            Role = UserRole.User,
            CreatedAt = DateTime.UtcNow
        };

        await context.Users.AddRangeAsync(adminUser, regularUser);
        await context.SaveChangesAsync();
    }

    private static async Task SeedMasterDataAsync(AppDbContext context)
    {
        if (await context.Plants.AnyAsync() || await context.Diseases.AnyAsync())
        {
            return;
        }

        // 1. Seed Plants
        var tomato = new Plant { Name = "Tomato", VietnameseName = "Cà chua", ScientificName = "Solanum lycopersicum" };
        var potato = new Plant { Name = "Potato", VietnameseName = "Khoai tây", ScientificName = "Solanum tuberosum" };
        var corn = new Plant { Name = "Corn", VietnameseName = "Ngô", ScientificName = "Zea mays" };
        var rice = new Plant { Name = "Rice", VietnameseName = "Lúa", ScientificName = "Oryza sativa" };
        var mango = new Plant { Name = "Mango", VietnameseName = "Xoài", ScientificName = "Mangifera indica" };

        var plants = new[] { tomato, potato, corn, rice, mango };
        await context.Plants.AddRangeAsync(plants);

        // 2. Seed Diseases
        var healthy = new Disease { Name = "Healthy", VietnameseName = "Khỏe mạnh", Description = "Lá cây phát triển bình thường, không có dấu hiệu nấm hoặc vi khuẩn." };
        var earlyBlight = new Disease { Name = "Early Blight", VietnameseName = "Bệnh đốm vòng", Description = "Xuất hiện các đốm nâu tròn có vòng đồng tâm trên lá." };
        var lateBlight = new Disease { Name = "Late Blight", VietnameseName = "Bệnh sương mai", Description = "Vết bệnh ướt sương, hoại tử nhanh chóng trên diện rộng." };
        var bacterialSpot = new Disease { Name = "Bacterial Spot", VietnameseName = "Bệnh đốm vi khuẩn", Description = "Các đốm mọng nước nhỏ biến thành màu đen nâu trên lá và quả." };
        var yellowLeafCurl = new Disease { Name = "Yellow Leaf Curl Virus", VietnameseName = "Virus xoăn vàng lá", Description = "Lá cuộn lại, biến vàng rìa lá, cây còi cọc." };

        var diseases = new[] { healthy, earlyBlight, lateBlight, bacterialSpot, yellowLeafCurl };
        await context.Diseases.AddRangeAsync(diseases);

        await context.SaveChangesAsync();

        // 3. Seed PlantDiseases
        if (!await context.PlantDiseases.AnyAsync())
        {
            var plantDiseases = new List<PlantDisease>
            {
                new PlantDisease { PlantId = tomato.Id, DiseaseId = healthy.Id, ClassName = "Tomato___Healthy", ClassIndex = 0 },
                new PlantDisease { PlantId = tomato.Id, DiseaseId = earlyBlight.Id, ClassName = "Tomato___Early_blight", ClassIndex = 1 },
                new PlantDisease { PlantId = tomato.Id, DiseaseId = lateBlight.Id, ClassName = "Tomato___Late_blight", ClassIndex = 2 },
                new PlantDisease { PlantId = tomato.Id, DiseaseId = bacterialSpot.Id, ClassName = "Tomato___Bacterial_spot", ClassIndex = 3 },
                new PlantDisease { PlantId = tomato.Id, DiseaseId = yellowLeafCurl.Id, ClassName = "Tomato___Tomato_Yellow_Leaf_Curl_Virus", ClassIndex = 4 },
                new PlantDisease { PlantId = potato.Id, DiseaseId = healthy.Id, ClassName = "Potato___healthy", ClassIndex = 5 },
                new PlantDisease { PlantId = potato.Id, DiseaseId = earlyBlight.Id, ClassName = "Potato___Early_blight", ClassIndex = 6 },
                new PlantDisease { PlantId = potato.Id, DiseaseId = lateBlight.Id, ClassName = "Potato___Late_blight", ClassIndex = 7 },
                new PlantDisease { PlantId = corn.Id, DiseaseId = healthy.Id, ClassName = "Corn___healthy", ClassIndex = 8 },
                new PlantDisease { PlantId = rice.Id, DiseaseId = healthy.Id, ClassName = "Rice___healthy", ClassIndex = 9 },
                new PlantDisease { PlantId = mango.Id, DiseaseId = healthy.Id, ClassName = "Mango___healthy", ClassIndex = 10 }
            };

            await context.PlantDiseases.AddRangeAsync(plantDiseases);
            await context.SaveChangesAsync();
        }
    }
}
