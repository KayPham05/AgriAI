using AgriVision.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace AgriVision.Infrastructure.Persistence.Configurations;

public class PendingImageUploadConfiguration : IEntityTypeConfiguration<PendingImageUpload>
{
    public void Configure(EntityTypeBuilder<PendingImageUpload> builder)
    {
        builder.ToTable("pending_image_uploads");
        builder.HasKey(item => item.Key);
        builder.Property(item => item.Key).HasColumnName("object_key").HasMaxLength(200);
        builder.Property(item => item.UserId).HasColumnName("user_id");
        builder.Property(item => item.CreatedAt).HasColumnName("created_at");
        builder.HasIndex(item => item.UserId);
        builder.HasIndex(item => item.CreatedAt);
    }
}
