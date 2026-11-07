using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AgriVision.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class EmailTwoFactor : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropCheckConstraint(
                name: "ck_user_action_tokens_purpose",
                table: "user_action_tokens");

            migrationBuilder.AddColumn<bool>(
                name: "email_two_factor_enabled",
                table: "users",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<int>(
                name: "failed_attempts",
                table: "user_action_tokens",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddCheckConstraint(
                name: "ck_user_action_tokens_purpose",
                table: "user_action_tokens",
                sql: "purpose IN ('EmailVerification', 'PasswordReset', 'TwoFactorSetup', 'TwoFactorDisable', 'TwoFactorLogin')");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            throw new NotSupportedException("The email two-factor migration is forward-only.");
        }
    }
}
