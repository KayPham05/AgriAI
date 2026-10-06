using AgriVision.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace AgriVision.Infrastructure.Persistence.Configurations;

public class PredictionImageConfiguration : IEntityTypeConfiguration<PredictionImage>
{
    public void Configure(EntityTypeBuilder<PredictionImage> builder)
    {
        builder.ToTable("prediction_images", table =>
        {
            table.HasCheckConstraint("ck_prediction_images_position", "position >= 0");
            table.HasCheckConstraint("ck_prediction_images_expiry", "expires_at > uploaded_at");
        });
        builder.HasKey(image => image.Id);
        builder.Property(image => image.Id).HasColumnName("id");
        builder.Property(image => image.PredictionId).HasColumnName("prediction_id");
        builder.Property(image => image.Position).HasColumnName("position");
        builder.Property(image => image.ImagePath).HasColumnName("image_path");
        builder.Property(image => image.ImagePublicId).HasColumnName("image_public_id");
        builder.Property(image => image.Confidence).HasColumnName("confidence");
        builder.Property(image => image.UploadedAt).HasColumnName("uploaded_at");
        builder.Property(image => image.ExpiresAt).HasColumnName("expires_at");
        builder.Property(image => image.DeletedAt).HasColumnName("deleted_at");
        builder.HasIndex(image => new { image.PredictionId, image.Position }).IsUnique();
        builder.HasIndex(image => image.ExpiresAt);
        builder.HasOne(image => image.Prediction).WithMany(prediction => prediction.Images)
            .HasForeignKey(image => image.PredictionId).OnDelete(DeleteBehavior.Cascade);
    }
}
