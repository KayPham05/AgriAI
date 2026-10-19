using AgriVision.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace AgriVision.Infrastructure.Persistence.Configurations;

public class UserSessionConfiguration : IEntityTypeConfiguration<UserSession>
{
    public void Configure(EntityTypeBuilder<UserSession> builder)
    {
        builder.ToTable("user_sessions", table =>
        {
            table.HasCheckConstraint("ck_user_sessions_expiry", "expires_at > created_at");
            table.HasCheckConstraint("ck_user_sessions_revocation", "revoked_at IS NULL OR revoked_at >= created_at");
        });
        builder.HasKey(session => session.Id);
        builder.Property(session => session.Id).HasColumnName("id");
        builder.Property(session => session.UserId).HasColumnName("user_id");
        builder.Property(session => session.CreatedAt).HasColumnName("created_at");
        builder.Property(session => session.ExpiresAt).HasColumnName("expires_at");
        builder.Property(session => session.RevokedAt).HasColumnName("revoked_at");
        builder.HasOne(session => session.User).WithMany().HasForeignKey(session => session.UserId).OnDelete(DeleteBehavior.Cascade);
        builder.HasIndex(session => new { session.UserId, session.ExpiresAt }).HasFilter("revoked_at IS NULL");
    }
}
