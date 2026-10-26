using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AgriVision.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class PrivateImageUploadJournal : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "pending_image_uploads",
                columns: table => new
                {
                    object_key = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_pending_image_uploads", x => x.object_key);
                });

            migrationBuilder.CreateIndex(
                name: "IX_pending_image_uploads_created_at",
                table: "pending_image_uploads",
                column: "created_at");

            migrationBuilder.CreateIndex(
                name: "IX_pending_image_uploads_user_id",
                table: "pending_image_uploads",
                column: "user_id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "pending_image_uploads");
        }
    }
}
