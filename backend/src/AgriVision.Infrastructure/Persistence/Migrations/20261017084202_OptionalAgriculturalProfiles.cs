using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AgriVision.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class OptionalAgriculturalProfiles : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "agricultural_profile_id",
                table: "predictions",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "agricultural_profiles",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    name = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: false),
                    description = table.Column<string>(type: "text", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_agricultural_profiles", x => x.id);
                    table.CheckConstraint("ck_agricultural_profiles_name", "btrim(name) <> ''");
                    table.ForeignKey(
                        name: "FK_agricultural_profiles_users_user_id",
                        column: x => x.user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_predictions_agricultural_profile_id",
                table: "predictions",
                column: "agricultural_profile_id");

            migrationBuilder.CreateIndex(
                name: "IX_predictions_user_id_agricultural_profile_id_created_at_id",
                table: "predictions",
                columns: new[] { "user_id", "agricultural_profile_id", "created_at", "id" });

            migrationBuilder.CreateIndex(
                name: "IX_predictions_user_id_created_at_id",
                table: "predictions",
                columns: new[] { "user_id", "created_at", "id" });

            migrationBuilder.CreateIndex(
                name: "IX_agricultural_profiles_user_id_created_at",
                table: "agricultural_profiles",
                columns: new[] { "user_id", "created_at" });

            migrationBuilder.AddForeignKey(
                name: "FK_predictions_agricultural_profiles_agricultural_profile_id",
                table: "predictions",
                column: "agricultural_profile_id",
                principalTable: "agricultural_profiles",
                principalColumn: "id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.Sql("""
                CREATE FUNCTION agri127_guard_profile_owner() RETURNS trigger LANGUAGE plpgsql AS $$
                BEGIN
                    IF NEW.user_id IS DISTINCT FROM OLD.user_id THEN
                        RAISE EXCEPTION 'Profile ownership cannot be transferred' USING ERRCODE = '23514';
                    END IF;
                    RETURN NEW;
                END $$;
                CREATE TRIGGER guard_profile_owner BEFORE UPDATE OF user_id ON agricultural_profiles
                FOR EACH ROW EXECUTE FUNCTION agri127_guard_profile_owner();

                CREATE FUNCTION agri127_guard_prediction_profile() RETURNS trigger LANGUAGE plpgsql AS $$
                BEGIN
                    -- Preserve the existing users -> predictions ON DELETE SET NULL policy.
                    IF TG_OP = 'UPDATE' AND NEW.user_id IS NULL AND OLD.user_id IS NOT NULL THEN
                        NEW.agricultural_profile_id := NULL;
                    END IF;
                    IF TG_OP = 'UPDATE' AND NEW.agricultural_profile_id IS NOT NULL
                        AND NEW.agricultural_profile_id IS DISTINCT FROM OLD.agricultural_profile_id THEN
                        RAISE EXCEPTION 'Profile can only be selected when saving a new diagnosis; existing links may only be removed'
                            USING ERRCODE = '23514';
                    END IF;
                    IF NEW.agricultural_profile_id IS NOT NULL THEN
                        PERFORM 1 FROM agricultural_profiles
                        WHERE id = NEW.agricultural_profile_id AND user_id = NEW.user_id FOR SHARE;
                        IF NOT FOUND THEN
                            RAISE EXCEPTION 'Diagnosis and profile must have the same owner' USING ERRCODE = '23514';
                        END IF;
                    END IF;
                    RETURN NEW;
                END $$;
                CREATE TRIGGER guard_prediction_profile BEFORE INSERT OR UPDATE OF agricultural_profile_id, user_id ON predictions
                FOR EACH ROW EXECUTE FUNCTION agri127_guard_prediction_profile();
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            throw new NotSupportedException("OptionalAgriculturalProfiles is forward-only to preserve profiles and diagnosis grouping.");
        }
    }
}
