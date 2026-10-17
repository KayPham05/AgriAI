using AgriVision.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace AgriVision.Infrastructure.Persistence.Configurations;

public class AdminAuditLogConfiguration : IEntityTypeConfiguration<AdminAuditLog>
{
    public void Configure(EntityTypeBuilder<AdminAuditLog> builder)
    {
        builder.ToTable("admin_audit_logs", table => table.HasCheckConstraint("ck_admin_audit_logs_action", "btrim(action) <> ''"));
        builder.HasKey(log => log.Id);
        builder.Property(log => log.Id).HasColumnName("id");
        builder.Property(log => log.ActorUserId).HasColumnName("actor_user_id");
        builder.Property(log => log.TargetUserId).HasColumnName("target_user_id");
        builder.Property(log => log.Action).HasColumnName("action").HasMaxLength(100).IsRequired();
        builder.Property(log => log.OccurredAt).HasColumnName("occurred_at");
        builder.HasOne(log => log.ActorUser).WithMany().HasForeignKey(log => log.ActorUserId).OnDelete(DeleteBehavior.SetNull);
        builder.HasOne(log => log.TargetUser).WithMany().HasForeignKey(log => log.TargetUserId).OnDelete(DeleteBehavior.SetNull);
        builder.HasIndex(log => new { log.ActorUserId, log.OccurredAt });
        builder.HasIndex(log => new { log.TargetUserId, log.OccurredAt });
    }
}
