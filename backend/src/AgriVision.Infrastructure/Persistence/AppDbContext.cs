using AgriVision.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace AgriVision.Infrastructure.Persistence;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
    {
    }

    public DbSet<User> Users => Set<User>();
    public DbSet<Plant> Plants => Set<Plant>();
    public DbSet<Disease> Diseases => Set<Disease>();
    public DbSet<PlantDisease> PlantDiseases => Set<PlantDisease>();
    public DbSet<Prediction> Predictions => Set<Prediction>();
    public DbSet<PredictionDetail> PredictionDetails => Set<PredictionDetail>();
    public DbSet<PredictionImage> PredictionImages => Set<PredictionImage>();
    public DbSet<UserIdentity> UserIdentities => Set<UserIdentity>();
    public DbSet<UserActionToken> UserActionTokens => Set<UserActionToken>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(AppDbContext).Assembly);
    }
}
