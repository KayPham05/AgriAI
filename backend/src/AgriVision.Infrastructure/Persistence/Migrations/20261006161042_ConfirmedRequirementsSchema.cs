using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AgriVision.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class ConfirmedRequirementsSchema : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<string>(
                name: "password_hash",
                table: "users",
                type: "text",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "text");

            migrationBuilder.AddColumn<DateTime>(
                name: "email_verified_at",
                table: "users",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "result_snapshot",
                table: "predictions",
                type: "jsonb",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "condition_type",
                table: "diseases",
                type: "character varying(30)",
                maxLength: 30,
                nullable: false,
                defaultValue: "Unknown");

            migrationBuilder.AddColumn<bool>(
                name: "is_content_approved",
                table: "diseases",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "medication",
                table: "diseases",
                type: "text",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "prediction_images",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    prediction_id = table.Column<Guid>(type: "uuid", nullable: false),
                    position = table.Column<int>(type: "integer", nullable: false),
                    image_path = table.Column<string>(type: "text", nullable: true),
                    image_public_id = table.Column<string>(type: "text", nullable: true),
                    confidence = table.Column<double>(type: "double precision", nullable: false),
                    uploaded_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    expires_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    deleted_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_prediction_images", x => x.id);
                    table.CheckConstraint("ck_prediction_images_expiry", "expires_at > uploaded_at");
                    table.CheckConstraint("ck_prediction_images_position", "position >= 0");
                    table.ForeignKey(
                        name: "FK_prediction_images_predictions_prediction_id",
                        column: x => x.prediction_id,
                        principalTable: "predictions",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "user_action_tokens",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    purpose = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    token_hash = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    expires_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    consumed_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_user_action_tokens", x => x.id);
                    table.CheckConstraint("ck_user_action_tokens_expiry", "expires_at > created_at");
                    table.CheckConstraint("ck_user_action_tokens_hash", "token_hash ~ '^[0-9a-f]{64}$'");
                    table.CheckConstraint("ck_user_action_tokens_purpose", "purpose IN ('EmailVerification', 'PasswordReset')");
                    table.ForeignKey(
                        name: "FK_user_action_tokens_users_user_id",
                        column: x => x.user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "user_identities",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    provider = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    provider_subject = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_user_identities", x => x.id);
                    table.ForeignKey(
                        name: "FK_user_identities_users_user_id",
                        column: x => x.user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.AddCheckConstraint(
                name: "ck_diseases_condition_type",
                table: "diseases",
                sql: "condition_type IN ('Unknown', 'Healthy', 'NutrientDeficiency', 'Disease')");

            migrationBuilder.CreateIndex(
                name: "IX_prediction_images_expires_at",
                table: "prediction_images",
                column: "expires_at");

            migrationBuilder.CreateIndex(
                name: "IX_prediction_images_prediction_id_position",
                table: "prediction_images",
                columns: new[] { "prediction_id", "position" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_user_action_tokens_expires_at",
                table: "user_action_tokens",
                column: "expires_at");

            migrationBuilder.CreateIndex(
                name: "IX_user_action_tokens_token_hash",
                table: "user_action_tokens",
                column: "token_hash",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_user_action_tokens_user_id",
                table: "user_action_tokens",
                column: "user_id");

            migrationBuilder.CreateIndex(
                name: "IX_user_identities_provider_provider_subject",
                table: "user_identities",
                columns: new[] { "provider", "provider_subject" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_user_identities_user_id",
                table: "user_identities",
                column: "user_id");

            // Preserve legacy image references without inventing historical result snapshots.
            migrationBuilder.Sql("""
                INSERT INTO prediction_images
                    (id, prediction_id, position, image_path, image_public_id, confidence, uploaded_at, expires_at)
                SELECT id, id, 0, image_path, image_public_id, confidence,
                    created_at, created_at + interval '30 days'
                FROM predictions WHERE image_path <> '';
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "prediction_images");

            migrationBuilder.DropTable(
                name: "user_action_tokens");

            migrationBuilder.DropTable(
                name: "user_identities");

            migrationBuilder.DropCheckConstraint(
                name: "ck_diseases_condition_type",
                table: "diseases");

            migrationBuilder.DropColumn(
                name: "email_verified_at",
                table: "users");

            migrationBuilder.DropColumn(
                name: "result_snapshot",
                table: "predictions");

            migrationBuilder.DropColumn(
                name: "condition_type",
                table: "diseases");

            migrationBuilder.DropColumn(
                name: "is_content_approved",
                table: "diseases");

            migrationBuilder.DropColumn(
                name: "medication",
                table: "diseases");

            migrationBuilder.AlterColumn<string>(
                name: "password_hash",
                table: "users",
                type: "text",
                nullable: false,
                defaultValue: "",
                oldClrType: typeof(string),
                oldType: "text",
                oldNullable: true);
        }
    }
}
