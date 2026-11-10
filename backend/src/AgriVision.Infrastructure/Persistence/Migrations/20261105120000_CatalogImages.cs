using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AgriVision.Infrastructure.Persistence.Migrations;

public partial class CatalogImages : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AddColumn<string>(name: "image_key", table: "plants", type: "character varying(200)", maxLength: 200, nullable: true);
        migrationBuilder.AddColumn<string>(name: "image_key", table: "diseases", type: "character varying(200)", maxLength: 200, nullable: true);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        // Dropping referenced keys would orphan objects and lose the catalog's image ownership.
        migrationBuilder.Sql("""
            DO $$ BEGIN
                IF EXISTS (SELECT 1 FROM plants WHERE image_key IS NOT NULL)
                    OR EXISTS (SELECT 1 FROM diseases WHERE image_key IS NOT NULL) THEN
                    RAISE EXCEPTION 'Remove catalog images through the API before downgrading CatalogImages.';
                END IF;
            END $$;
            """);
        migrationBuilder.DropColumn(name: "image_key", table: "plants");
        migrationBuilder.DropColumn(name: "image_key", table: "diseases");
    }
}
