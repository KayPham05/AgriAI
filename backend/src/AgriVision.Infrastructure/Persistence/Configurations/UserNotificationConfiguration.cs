using AgriVision.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace AgriVision.Infrastructure.Persistence.Configurations;

public class UserNotificationConfiguration : IEntityTypeConfiguration<UserNotification>
{
    public void Configure(EntityTypeBuilder<UserNotification> builder)
    {
        builder.ToTable("user_notifications", table => table.HasCheckConstraint("ck_user_notifications_message", "btrim(message) <> ''"));
        builder.HasKey(n => n.Id);
        builder.Property(n => n.Id).HasColumnName("id");
        builder.Property(n => n.Kind).HasColumnName("kind").HasMaxLength(40).HasDefaultValue("Warning");
        builder.Property(n => n.UserId).HasColumnName("user_id");
        builder.Property(n => n.ActorUserId).HasColumnName("actor_user_id");
        builder.Property(n => n.ImageId).HasColumnName("image_id");
        builder.Property(n => n.Message).HasColumnName("message").HasMaxLength(1000).IsRequired();
        builder.Property(n => n.CreatedAt).HasColumnName("created_at");
        builder.Property(n => n.ReadAt).HasColumnName("read_at");
        builder.Property(n => n.DismissedAt).HasColumnName("dismissed_at");
        builder.HasOne(n => n.User).WithMany().HasForeignKey(n => n.UserId).OnDelete(DeleteBehavior.Cascade);
        builder.HasOne<User>().WithMany().HasForeignKey(n => n.ActorUserId).OnDelete(DeleteBehavior.SetNull);
        builder.HasOne<PredictionImage>().WithMany().HasForeignKey(n => n.ImageId).OnDelete(DeleteBehavior.SetNull);
        builder.HasIndex(n => new { n.UserId, n.CreatedAt, n.Id });
    }
}
