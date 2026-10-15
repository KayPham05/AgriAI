using AgriVision.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace AgriVision.Infrastructure.Persistence.Configurations;

public class UserNotificationConfiguration : IEntityTypeConfiguration<UserNotification>
{
    public void Configure(EntityTypeBuilder<UserNotification> builder)
    {
        builder.ToTable("user_notifications");
        builder.HasKey(item => item.Id);
        builder.Property(item => item.Id).HasColumnName("id");
        builder.Property(item => item.UserId).HasColumnName("user_id");
        builder.Property(item => item.AdminId).HasColumnName("admin_id");
        builder.Property(item => item.ImageId).HasColumnName("image_id");
        builder.Property(item => item.Title).HasColumnName("title").HasMaxLength(150).IsRequired();
        builder.Property(item => item.Message).HasColumnName("message").HasMaxLength(1000).IsRequired();
        builder.Property(item => item.CreatedAt).HasColumnName("created_at");
        builder.Property(item => item.ReadAt).HasColumnName("read_at");
        builder.Property(item => item.DismissedAt).HasColumnName("dismissed_at");
        builder.HasOne<User>().WithMany().HasForeignKey(item => item.UserId).OnDelete(DeleteBehavior.Cascade);
        builder.HasOne<User>().WithMany().HasForeignKey(item => item.AdminId).OnDelete(DeleteBehavior.Restrict);
        builder.HasOne<PredictionImage>().WithMany().HasForeignKey(item => item.ImageId).OnDelete(DeleteBehavior.SetNull);
        builder.HasIndex(item => new { item.UserId, item.CreatedAt });
    }
}
