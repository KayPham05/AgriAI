using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AgriVision.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class DatabaseImprovement : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "is_active",
                table: "users",
                type: "boolean",
                nullable: false,
                defaultValue: true);

            migrationBuilder.CreateTable(
                name: "admin_audit_logs",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    actor_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    target_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    action = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    occurred_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_admin_audit_logs", x => x.id);
                    table.CheckConstraint("ck_admin_audit_logs_action", "btrim(action) <> ''");
                    table.ForeignKey(
                        name: "FK_admin_audit_logs_users_actor_user_id",
                        column: x => x.actor_user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_admin_audit_logs_users_target_user_id",
                        column: x => x.target_user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "knowledge_documents",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    title = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    content = table.Column<string>(type: "text", nullable: false),
                    source_url = table.Column<string>(type: "text", nullable: false),
                    is_approved = table.Column<bool>(type: "boolean", nullable: false, defaultValue: false),
                    is_public = table.Column<bool>(type: "boolean", nullable: false, defaultValue: false),
                    is_active = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_knowledge_documents", x => x.id);
                    table.CheckConstraint("ck_knowledge_documents_public", "NOT is_public OR (is_approved AND is_active)");
                    table.CheckConstraint("ck_knowledge_documents_required", "btrim(title) <> '' AND btrim(content) <> '' AND btrim(source_url) <> ''");
                });

            migrationBuilder.CreateTable(
                name: "medicines",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    product_name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    active_ingredient = table.Column<string>(type: "text", nullable: false),
                    target_use = table.Column<string>(type: "text", nullable: false),
                    source_url = table.Column<string>(type: "text", nullable: false),
                    safety_warning = table.Column<string>(type: "text", nullable: false),
                    label_reference = table.Column<string>(type: "text", nullable: false),
                    is_approved = table.Column<bool>(type: "boolean", nullable: false, defaultValue: false),
                    is_public = table.Column<bool>(type: "boolean", nullable: false, defaultValue: false),
                    is_active = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_medicines", x => x.id);
                    table.CheckConstraint("ck_medicines_public", "NOT is_public OR (is_approved AND is_active)");
                    table.CheckConstraint("ck_medicines_required", "btrim(product_name) <> '' AND btrim(active_ingredient) <> '' AND btrim(target_use) <> '' AND btrim(source_url) <> '' AND btrim(safety_warning) <> '' AND btrim(label_reference) <> ''");
                });

            migrationBuilder.CreateTable(
                name: "user_sessions",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    expires_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    revoked_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_user_sessions", x => x.id);
                    table.CheckConstraint("ck_user_sessions_expiry", "expires_at > created_at");
                    table.CheckConstraint("ck_user_sessions_revocation", "revoked_at IS NULL OR revoked_at >= created_at");
                    table.ForeignKey(
                        name: "FK_user_sessions_users_user_id",
                        column: x => x.user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "knowledge_document_plant_diseases",
                columns: table => new
                {
                    knowledge_document_id = table.Column<Guid>(type: "uuid", nullable: false),
                    plant_disease_id = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_knowledge_document_plant_diseases", x => new { x.knowledge_document_id, x.plant_disease_id });
                    table.ForeignKey(
                        name: "FK_knowledge_document_plant_diseases_knowledge_documents_knowl~",
                        column: x => x.knowledge_document_id,
                        principalTable: "knowledge_documents",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_knowledge_document_plant_diseases_plant_diseases_plant_dise~",
                        column: x => x.plant_disease_id,
                        principalTable: "plant_diseases",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "medicine_uses",
                columns: table => new
                {
                    medicine_id = table.Column<Guid>(type: "uuid", nullable: false),
                    plant_disease_id = table.Column<Guid>(type: "uuid", nullable: false),
                    label_directions = table.Column<string>(type: "text", nullable: false),
                    is_label_verified = table.Column<bool>(type: "boolean", nullable: false, defaultValue: false),
                    is_approved = table.Column<bool>(type: "boolean", nullable: false, defaultValue: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_medicine_uses", x => new { x.medicine_id, x.plant_disease_id });
                    table.CheckConstraint("ck_medicine_uses_approval", "NOT is_approved OR is_label_verified");
                    table.CheckConstraint("ck_medicine_uses_directions", "btrim(label_directions) <> ''");
                    table.ForeignKey(
                        name: "FK_medicine_uses_medicines_medicine_id",
                        column: x => x.medicine_id,
                        principalTable: "medicines",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_medicine_uses_plant_diseases_plant_disease_id",
                        column: x => x.plant_disease_id,
                        principalTable: "plant_diseases",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_admin_audit_logs_actor_user_id_occurred_at",
                table: "admin_audit_logs",
                columns: new[] { "actor_user_id", "occurred_at" });

            migrationBuilder.CreateIndex(
                name: "IX_admin_audit_logs_target_user_id_occurred_at",
                table: "admin_audit_logs",
                columns: new[] { "target_user_id", "occurred_at" });

            migrationBuilder.CreateIndex(
                name: "IX_knowledge_document_plant_diseases_plant_disease_id",
                table: "knowledge_document_plant_diseases",
                column: "plant_disease_id");

            migrationBuilder.CreateIndex(
                name: "IX_medicine_uses_plant_disease_id",
                table: "medicine_uses",
                column: "plant_disease_id");

            migrationBuilder.CreateIndex(
                name: "IX_user_sessions_user_id_expires_at",
                table: "user_sessions",
                columns: new[] { "user_id", "expires_at" },
                filter: "revoked_at IS NULL");

            migrationBuilder.Sql("""
                CREATE FUNCTION agri127_revoke_user_sessions() RETURNS trigger LANGUAGE plpgsql AS $$
                BEGIN
                    IF OLD.role IS DISTINCT FROM NEW.role OR (OLD.is_active AND NOT NEW.is_active) THEN
                        UPDATE user_sessions SET revoked_at = clock_timestamp()
                        WHERE user_id = NEW.id AND revoked_at IS NULL;
                    END IF;
                    RETURN NEW;
                END $$;
                CREATE TRIGGER revoke_user_sessions AFTER UPDATE OF role, is_active ON users
                FOR EACH ROW EXECUTE FUNCTION agri127_revoke_user_sessions();

                CREATE FUNCTION agri127_guard_session() RETURNS trigger LANGUAGE plpgsql AS $$
                BEGIN
                    IF TG_OP = 'INSERT' THEN
                        PERFORM 1 FROM users WHERE id = NEW.user_id AND is_active FOR SHARE;
                        IF NOT FOUND THEN
                            RAISE EXCEPTION 'Session owner must be an active account' USING ERRCODE = '23514';
                        END IF;
                    ELSIF ROW(NEW.user_id, NEW.created_at, NEW.expires_at) IS DISTINCT FROM ROW(OLD.user_id, OLD.created_at, OLD.expires_at)
                        OR (OLD.revoked_at IS NOT NULL AND NEW.revoked_at IS DISTINCT FROM OLD.revoked_at) THEN
                        RAISE EXCEPTION 'Session identity, lifetime and existing revocation are immutable' USING ERRCODE = '23514';
                    END IF;
                    RETURN NEW;
                END $$;
                CREATE TRIGGER guard_session BEFORE INSERT OR UPDATE ON user_sessions
                FOR EACH ROW EXECUTE FUNCTION agri127_guard_session();

                CREATE FUNCTION agri127_review_document() RETURNS trigger LANGUAGE plpgsql AS $$
                BEGIN
                    IF ROW(NEW.title, NEW.content, NEW.source_url, NEW.is_active)
                        IS DISTINCT FROM ROW(OLD.title, OLD.content, OLD.source_url, OLD.is_active) THEN
                        NEW.is_approved := false;
                        NEW.is_public := false;
                        NEW.updated_at := clock_timestamp();
                    END IF;
                    RETURN NEW;
                END $$;
                CREATE TRIGGER review_document BEFORE UPDATE ON knowledge_documents
                FOR EACH ROW EXECUTE FUNCTION agri127_review_document();

                CREATE FUNCTION agri127_review_medicine() RETURNS trigger LANGUAGE plpgsql AS $$
                BEGIN
                    IF ROW(NEW.product_name, NEW.active_ingredient, NEW.target_use, NEW.source_url, NEW.safety_warning, NEW.label_reference, NEW.is_active)
                        IS DISTINCT FROM ROW(OLD.product_name, OLD.active_ingredient, OLD.target_use, OLD.source_url, OLD.safety_warning, OLD.label_reference, OLD.is_active) THEN
                        NEW.is_approved := false;
                        NEW.is_public := false;
                        NEW.updated_at := clock_timestamp();
                        UPDATE medicine_uses SET is_approved = false, is_label_verified = false WHERE medicine_id = OLD.id;
                    END IF;
                    RETURN NEW;
                END $$;
                CREATE TRIGGER review_medicine BEFORE UPDATE ON medicines
                FOR EACH ROW EXECUTE FUNCTION agri127_review_medicine();

                CREATE FUNCTION agri127_review_medicine_use() RETURNS trigger LANGUAGE plpgsql AS $$
                BEGIN
                    IF ROW(NEW.medicine_id, NEW.plant_disease_id, NEW.label_directions)
                        IS DISTINCT FROM ROW(OLD.medicine_id, OLD.plant_disease_id, OLD.label_directions) THEN
                        NEW.is_approved := false;
                        NEW.is_label_verified := false;
                        UPDATE medicines SET is_approved = false, is_public = false, updated_at = clock_timestamp()
                        WHERE id IN (OLD.medicine_id, NEW.medicine_id);
                    END IF;
                    RETURN NEW;
                END $$;
                CREATE TRIGGER review_medicine_use BEFORE UPDATE ON medicine_uses
                FOR EACH ROW EXECUTE FUNCTION agri127_review_medicine_use();

                CREATE FUNCTION agri127_review_document_link() RETURNS trigger LANGUAGE plpgsql AS $$
                BEGIN
                    IF TG_OP <> 'INSERT' THEN
                        UPDATE knowledge_documents SET is_approved = false, is_public = false, updated_at = clock_timestamp()
                        WHERE id = OLD.knowledge_document_id;
                    END IF;
                    IF TG_OP <> 'DELETE' THEN
                        UPDATE knowledge_documents SET is_approved = false, is_public = false, updated_at = clock_timestamp()
                        WHERE id = NEW.knowledge_document_id;
                    END IF;
                    RETURN NULL;
                END $$;
                CREATE TRIGGER review_document_link AFTER INSERT OR UPDATE OR DELETE ON knowledge_document_plant_diseases
                FOR EACH ROW EXECUTE FUNCTION agri127_review_document_link();
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            throw new NotSupportedException("DatabaseImprovement is forward-only to preserve account, audit and knowledge data.");
        }
    }
}
