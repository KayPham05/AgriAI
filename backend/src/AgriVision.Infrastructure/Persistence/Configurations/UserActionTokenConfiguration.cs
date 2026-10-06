using AgriVision.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace AgriVision.Infrastructure.Persistence.Configurations;

public class UserActionTokenConfiguration : IEntityTypeConfiguration<UserActionToken>
{
    public void Configure(EntityTypeBuilder<UserActionToken> builder)
    {
        builder.ToTable("user_action_tokens", table =>
        {
            table.HasCheckConstraint("ck_user_action_tokens_purpose", "purpose IN ('EmailVerification', 'PasswordReset')");
            table.HasCheckConstraint("ck_user_action_tokens_expiry", "expires_at > created_at");
            table.HasCheckConstraint("ck_user_action_tokens_hash", "token_hash ~ '^[0-9a-f]{64}$'");
        });
        builder.HasKey(token => token.Id);
        builder.Property(token => token.Id).HasColumnName("id");
        builder.Property(token => token.UserId).HasColumnName("user_id");
        builder.Property(token => token.Purpose).HasColumnName("purpose").HasMaxLength(30).IsRequired();
        builder.Property(token => token.TokenHash).HasColumnName("token_hash").HasMaxLength(64).IsRequired();
        builder.Property(token => token.CreatedAt).HasColumnName("created_at");
        builder.Property(token => token.ExpiresAt).HasColumnName("expires_at");
        builder.Property(token => token.ConsumedAt).HasColumnName("consumed_at");
        builder.HasIndex(token => token.TokenHash).IsUnique();
        builder.HasIndex(token => token.ExpiresAt);
        builder.HasOne(token => token.User).WithMany().HasForeignKey(token => token.UserId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
