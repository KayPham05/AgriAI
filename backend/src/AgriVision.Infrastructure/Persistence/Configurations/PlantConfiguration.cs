using AgriVision.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace AgriVision.Infrastructure.Persistence.Configurations;

public class PlantConfiguration : IEntityTypeConfiguration<Plant>
{
    public void Configure(EntityTypeBuilder<Plant> builder)
    {
        builder.ToTable("plants");

        builder.HasKey(p => p.Id);
        builder.Property(p => p.Id).HasColumnName("id");

        builder.Property(p => p.Name)
            .HasColumnName("name")
            .HasMaxLength(100)
            .IsRequired();

        builder.HasIndex(p => p.Name)
            .IsUnique()
            .HasDatabaseName("ix_plants_name");

        builder.Property(p => p.VietnameseName)
            .HasColumnName("vietnamese_name")
            .HasMaxLength(150);

        builder.Property(p => p.ScientificName)
            .HasColumnName("scientific_name")
            .HasMaxLength(200);

        builder.Property(p => p.Description)
            .HasColumnName("description");

        builder.Property(p => p.IsActive)
            .HasColumnName("is_active")
            .HasDefaultValue(true);

        builder.Property(p => p.CreatedAt)
            .HasColumnName("created_at")
            .HasColumnType("timestamp with time zone")
            .IsRequired();

        builder.Property(p => p.UpdatedAt)
            .HasColumnName("updated_at")
            .HasColumnType("timestamp with time zone");
    }
}
