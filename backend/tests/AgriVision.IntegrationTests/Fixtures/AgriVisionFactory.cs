using AgriVision.Application.Common.Interfaces.Services;
using AgriVision.Infrastructure.Persistence;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Testcontainers.PostgreSql;
using Xunit;

namespace AgriVision.IntegrationTests.Fixtures;

public class AgriVisionFactory : WebApplicationFactory<Program>, IAsyncLifetime
{
    private readonly PostgreSqlContainer _dbContainer = new PostgreSqlBuilder("postgres:16-alpine")
        .WithDatabase("agrivision_test_db")
        .WithUsername("testuser")
        .WithPassword("testpassword")
        .Build();

    public async Task InitializeAsync()
    {
        await _dbContainer.StartAsync();
    }

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseSetting("ConnectionStrings:DefaultConnection", _dbContainer.GetConnectionString());
        builder.UseSetting("JwtSettings:Secret", new string('x', 32));
        builder.UseSetting("AiService:BaseUrl", "http://127.0.0.1:1");
        builder.ConfigureServices(services =>
        {
            var descriptor = services.SingleOrDefault(
                d => d.ServiceType == typeof(DbContextOptions<AppDbContext>));

            if (descriptor != null)
            {
                services.Remove(descriptor);
            }

            services.AddDbContext<AppDbContext>(options =>
            {
                options.UseNpgsql(_dbContainer.GetConnectionString());
            });

            services.RemoveAll<IImageStorage>();
            services.RemoveAll<IPlantDiseasePredictor>();
            services.AddSingleton<IImageStorage, FakeImageStorage>();
            services.AddSingleton<IPlantDiseasePredictor, FakePlantDiseasePredictor>();

            // Ensure database schema is created
            var sp = services.BuildServiceProvider();
            using var scope = sp.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            db.Database.Migrate();
        });
    }

    public new async Task DisposeAsync()
    {
        await _dbContainer.StopAsync();
        await _dbContainer.DisposeAsync();
    }

    private sealed class FakeImageStorage : IImageStorage
    {
        public Task<ImageUploadResult> UploadImageAsync(
            IFormFile file,
            CancellationToken cancellationToken = default)
        {
            return Task.FromResult(CreateResult(file.FileName));
        }

        public async Task<ImageUploadResult> UploadImageAsync(
            Stream imageStream,
            string fileName,
            CancellationToken cancellationToken = default)
        {
            using var buffer = new MemoryStream();
            await imageStream.CopyToAsync(buffer, cancellationToken);

            if (buffer.Length == 0)
            {
                throw new InvalidOperationException("The uploaded image is empty.");
            }

            return CreateResult(fileName);
        }

        public Task<bool> DeleteImageAsync(
            string publicId,
            CancellationToken cancellationToken = default)
        {
            return Task.FromResult(true);
        }

        private static ImageUploadResult CreateResult(string fileName)
        {
            var safeFileName = Path.GetFileName(fileName);
            return new ImageUploadResult(
                $"integration/{safeFileName}",
                $"https://images.test/{safeFileName}");
        }
    }

    private sealed class FakePlantDiseasePredictor : IPlantDiseasePredictor
    {
        private static readonly AiPredictionResult Result = new(
            ClassIndex: 1,
            ClassName: "Tomato___Early_blight",
            Confidence: 0.94f,
            TopK:
            [
                new AiPredictionTopKItem(1, "Tomato___Early_blight", 0.94f),
                new AiPredictionTopKItem(0, "Tomato___Healthy", 0.06f)
            ]);

        public Task<AiPredictionResult> PredictAsync(
            IFormFile file,
            CancellationToken cancellationToken = default)
        {
            return Task.FromResult(Result);
        }

        public Task<AiPredictionResult> PredictAsync(
            Stream imageStream,
            string fileName,
            CancellationToken cancellationToken = default)
        {
            return Task.FromResult(Result);
        }
    }
}
