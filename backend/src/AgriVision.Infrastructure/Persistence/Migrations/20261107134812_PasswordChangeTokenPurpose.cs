using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AgriVision.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class PasswordChangeTokenPurpose : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropCheckConstraint(
                name: "ck_user_action_tokens_purpose",
                table: "user_action_tokens");

            migrationBuilder.AddCheckConstraint(
                name: "ck_user_action_tokens_purpose",
                table: "user_action_tokens",
                sql: "purpose IN ('EmailVerification', 'PasswordReset', 'TwoFactorSetup', 'TwoFactorDisable', 'TwoFactorLogin', 'PasswordChange')");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            throw new NotSupportedException("The password change token purpose migration is forward-only.");
        }
    }
}
