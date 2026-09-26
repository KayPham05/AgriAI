using AgriVision.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace AgriVision.Infrastructure.Persistence.Configurations;

public class PredictionConfiguration : IEntityTypeConfiguration<Prediction>
{
    public void Configure(EntityTypeBuilder<Prediction> builder)
    {
        builder.ToTable("predictions");

        builder.HasKey(p => p.Id);
        builder.Property(p => p.Id).HasColumnName("id");

        builder.Property(p => p.UserId)
            .HasColumnName("user_id");

        builder.Property(p => p.ImagePath)
            .HasColumnName("image_path")
            .IsRequired();

        builder.Property(p => p.ImagePublicId)
            .HasColumnName("image_public_id");

        builder.Property(p => p.PredictedPlantDiseaseId)
            .HasColumnName("predicted_plant_disease_id")
            .IsRequired();

        builder.Property(p => p.Confidence)
            .HasColumnName("confidence")
            .IsRequired();

        builder.Property(p => p.CreatedAt)
            .HasColumnName("created_at")
            .HasColumnType("timestamp with time zone")
            .IsRequired();

        builder.HasIndex(p => p.UserId)
            .HasDatabaseName("ix_predictions_user_id");

        builder.HasIndex(p => p.CreatedAt)
            .HasDatabaseName("ix_predictions_created_at");

        builder.HasOne(p => p.User)
            .WithMany(u => u.Predictions)
            .HasForeignKey(p => p.UserId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasOne(p => p.PredictedPlantDisease)
            .WithMany(pd => pd.Predictions)
            .HasForeignKey(p => p.PredictedPlantDiseaseId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
