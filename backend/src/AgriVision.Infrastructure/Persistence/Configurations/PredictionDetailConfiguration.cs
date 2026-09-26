using AgriVision.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace AgriVision.Infrastructure.Persistence.Configurations;

public class PredictionDetailConfiguration : IEntityTypeConfiguration<PredictionDetail>
{
    public void Configure(EntityTypeBuilder<PredictionDetail> builder)
    {
        builder.ToTable("prediction_details", t =>
        {
            t.HasCheckConstraint("ck_prediction_details_rank", "rank > 0");
        });

        builder.HasKey(pd => pd.Id);
        builder.Property(pd => pd.Id).HasColumnName("id");

        builder.Property(pd => pd.PredictionId)
            .HasColumnName("prediction_id")
            .IsRequired();

        builder.Property(pd => pd.PlantDiseaseId)
            .HasColumnName("plant_disease_id")
            .IsRequired();

        builder.Property(pd => pd.Probability)
            .HasColumnName("probability")
            .IsRequired();

        builder.Property(pd => pd.Rank)
            .HasColumnName("rank")
            .IsRequired();

        builder.HasIndex(pd => new { pd.PredictionId, pd.Rank })
            .IsUnique()
            .HasDatabaseName("ix_prediction_details_prediction_id_rank");

        builder.HasIndex(pd => pd.PredictionId)
            .HasDatabaseName("ix_prediction_details_prediction_id");

        builder.HasOne(pd => pd.Prediction)
            .WithMany(p => p.PredictionDetails)
            .HasForeignKey(pd => pd.PredictionId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(pd => pd.PlantDisease)
            .WithMany(pd => pd.PredictionDetails)
            .HasForeignKey(pd => pd.PlantDiseaseId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
