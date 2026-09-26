using AgriVision.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace AgriVision.Infrastructure.Persistence.Configurations;

public class DiseaseConfiguration : IEntityTypeConfiguration<Disease>
{
    public void Configure(EntityTypeBuilder<Disease> builder)
    {
        builder.ToTable("diseases");

        builder.HasKey(d => d.Id);
        builder.Property(d => d.Id).HasColumnName("id");

        builder.Property(d => d.Name)
            .HasColumnName("name")
            .HasMaxLength(150)
            .IsRequired();

        builder.HasIndex(d => d.Name)
            .IsUnique()
            .HasDatabaseName("ix_diseases_name");

        builder.Property(d => d.VietnameseName)
            .HasColumnName("vietnamese_name")
            .HasMaxLength(200);

        builder.Property(d => d.Description)
            .HasColumnName("description");

        builder.Property(d => d.Symptoms)
            .HasColumnName("symptoms");

        builder.Property(d => d.Treatment)
            .HasColumnName("treatment");

        builder.Property(d => d.Prevention)
            .HasColumnName("prevention");

        builder.Property(d => d.IsActive)
            .HasColumnName("is_active")
            .HasDefaultValue(true);

        builder.Property(d => d.CreatedAt)
            .HasColumnName("created_at")
            .HasColumnType("timestamp with time zone")
            .IsRequired();

        builder.Property(d => d.UpdatedAt)
            .HasColumnName("updated_at")
            .HasColumnType("timestamp with time zone");
    }
}
