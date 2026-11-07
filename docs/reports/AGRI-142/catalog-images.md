# Admin plant and disease images — 2026-11-05

Branch: `AGRI-134-142-integration`; checkout `.worktrees/AGRI-128-knowledge-medicine`. Continues the approved catalog work; no new Jira key supplied. Acceptance is pending.

## Implemented scope

- `CatalogImageEditor.tsx` adds an image section beneath the Admin content form for plants and diseases. Save a new catalog item first, then select a JPG/PNG up to 5 MiB, inspect its preview and choose Save image. Existing images can be replaced or removed with confirmation. Upload errors retain the selected file for retry. Image actions do not discard unsaved content, and returning to the list warns about an unsaved image selection.
- `CatalogImagesController` provides GET/PUT/DELETE `/api/catalog/{kind}/{id:guid}/image`. PUT/DELETE require Admin; GET serves active catalog images publicly and allows Admin to inspect inactive images. Images use no-store responses and nosniff headers; original storage keys are not exposed in DTOs. Uploads are multipart with server-side size/MIME/signature validation, bounded reading and the existing upload timeout/rate policy.
- `CatalogImageService` uses the existing `IImageStorage`/R2 adapter. `ImageStorageContext` and `ImageStorageKey` support separate owner/catalog/entity/image keys. Existing prediction/avatar key formats remain unchanged. A database row lock serializes replacements; the new key is committed before retiring the old image. Storage failures preserve the old reference. Cleanup rechecks persisted references after uncertain commits and uses the existing durable upload journal for failures. Plant/disease text and status writes preserve independently changed image keys.
- `ImageUploadJournal` reserves catalog uploads under an Admin-specific limit (`StorageLimits:MaxCatalogImagesPerAdmin`, default 1000), separate from the private prediction count. `ImageExpiryCleanup` protects any image still referenced by a plant or disease and can retry retired/orphaned catalog objects. Active catalog images have no automatic expiry.
- Plant and disease DTOs expose versioned `imageUrl` paths. `catalogApi`, the home plant cards, legacy plant/disease views and `PublicCatalog` consume the uploaded image. Existing local reference images remain fallbacks where available. Catalog API images bypass Next's image optimizer cache, so access still follows current activity status. A newly added plant can display its own photo instead of the generic logo.

## Persistence and deployment

Migration `20261105120000_CatalogImages` adds nullable `image_key` columns to `plants` and `diseases`. It preserves IDs, class labels, content, links and existing migrations. Downgrade refuses to discard referenced image keys; remove the images through the API first. Migration, target model and snapshot were prepared without running EF or modifying a live database.

Rebuild frontend/backend from this checkout, run backend `--migrate` separately, then recreate those services using the existing Compose project/environment/database volume. Upload and image retrieval require the existing R2 configuration to be valid. No credentials, bucket settings, container volumes, AI models or new storage dependencies were changed. Catalog list/text operations do not instantiate the image service.

## Actual verification and limits

Performed: source inspection and Biome formatting of edited frontend files. No tests, typecheck, lint, build, browser run, live R2 operation, Docker rebuild or migration execution was performed, honoring the user's testing pause. No commit, push or PR.

Prepared but **not run**: `CatalogImagesTests` covers both catalog kinds, Admin authorization, malformed-file rejection, public reads, replacement, upload failure retaining the prior image, inactive-image privacy and removal/journal cleanup using fake storage and isolated PostgreSQL. `CatalogImageEditor.test.tsx` covers preview/explicit multipart upload and retained selection after a failed upload. The API manifest includes all three routes and the new discoverable ApiCase; existing migration-count expectations are updated to 14. These additions are not passing-test evidence.

File validation follows the existing avatar path's bounded content/signature approach; it does not decode/re-encode files or strip EXIF. Visual preview and real R2 operations remain to be accepted. Existing statically curated disease reference relationships were not replaced by a new taxonomy.

## User acceptance / deferred checks

1. Open Admin → Plants or Diseases → Details/edit → Image. Upload a PNG/JPG, save, reopen and inspect the image. For a new item, save its content first.
2. Reload the home plant group and public catalog/detail page. Inspect the uploaded photo; a plant absent from frontend templates must use its new photo.
3. Replace an image, interrupt/fail an upload and retry, then remove the saved image. Confirm content drafts remain and prior images survive failed uploads.
4. Deactivate the catalog item: its image URL must return 404 publicly, while Admin can still preview it. Restore the item and confirm its image returns.
5. After test execution is authorized: run the prepared API/component cases, EF model/migration checks, storage-key/journal/cleanup/avatar/prediction regressions and manifest inventory; then perform two-session authorization and real R2 acceptance through the Docker proxy. Include large files, spoofed MIME, concurrent replacements/text edits and failed-cleanup recovery.

## Follow-up: additional test authoring — 2026-11-05

The user requested writing tests. The earlier instruction to defer test execution remains in effect. This follow-up changes tests, the API case inventory and documentation only; it does not change application behavior.

### Authored coverage matrix (not executed)

| Contract / requirement | Expected behavior | Test file / case |
|---|---|---|
| PUT catalog image, both kinds | Reject empty/corrupt/unsupported MIME, PNG declared JPEG and files above 5 MiB; preserve existing URL/object and create no pending journal entry | `backend/tests/AgriVision.ApiTests/Controllers/CatalogImagesTests.cs`, `catalog.images.validation` |
| PUT/GET file-size boundary | Accept a 5 MiB PNG-signature fixture and return all bytes | Same file, `catalog.images.size-boundary` |
| GET/PUT/DELETE resource selection | Missing record returns 404; unsupported kind returns 400; no upload occurs | Same file, `catalog.images.missing-record` |
| Existing image lifecycle | Guest cannot delete; absent storage object returns 404 and can recover; public access returns after reactivation; repeated removal returns 204 and null image URL; nosniff header is present | Same file, extended `catalog.images.lifecycle` |
| Catalog storage keys and public URLs | Scope keys to owner/kind/record; reject malformed identities, traversal/type/extension mismatches; do not expose owner in public URL; replacement changes version | `backend/tests/AgriVision.UnitTests/Services/ImageStorageKeyTests.cs`, `CatalogImageUrlTests.cs` |
| Cleanup safety and retry | Preserve current images for active **and inactive** plants/diseases, retain recent intents, retry failed retired-image deletion, keep repeated cleanup idempotent | `backend/tests/AgriVision.IntegrationTests/Persistence/CatalogImagePersistenceTests.cs`, `Cleanup_PreservesReferencedCatalogImages_AndRetriesRetiredImages` |
| Stale text/status edits | A form loaded before another context replaced the image must retain the new key while saving text or deactivating the item | Same file, `StaleTextOrStatusSave_DoesNotOverwriteAnImageReplacedByAnotherContext` |
| Admin image editor | Require a saved record, validate type/size, preview and discard, respect disabled/loading state, authenticate saved preview, cancel/confirm removal, prevent duplicate submit, abort on unmount, retry failed upload with the same file | `frontend/tests/component/admin/CatalogImageEditor.test.tsx` |
| User catalog adapter and image URLs | Prefer uploaded images for known/new plants and matched diseases; preserve fallback logo and disease identity/content; resolve configured API base and reject non-catalog sources | `frontend/tests/unit/services/catalogApi.test.ts`, `frontend/tests/unit/catalogImages.test.ts` |

The API manifest maps the three added unique case IDs to the routes they exercise. API/integration tests use the existing disposable PostgreSQL fixture and fake storage; they do not require a real R2 bucket. The stale-save test uses two contexts in a deterministic sequence, with no sleep or timing assumptions.

### Actual checks and remaining limits

- Source/contract review only. Biome formatted the three edited frontend test files. The checkout-local `corepack pnpm exec biome` command could not find Biome; formatting used the existing `D:/AgriAI/frontend/node_modules/@biomejs/cli-win32-x64/biome.exe` binary without installing dependencies.
- A scoped `git diff --check` completed with no whitespace errors for tracked changes; Git reported LF/CRLF conversion notices. This does not compile or execute the new/untracked test files.
- **No test, build, typecheck, lint, browser, Docker, live migration or real-storage operation was run.** The added assertions have no execution or coverage result yet; earlier test results are not evidence for these changes.
- The size-boundary test exercises application file validation through TestServer, not Kestrel's complete request-body limit or image decoding. UI tests use jsdom and do not establish visual layout or browser image decoding.
- Simultaneous upload replacement/commit-acknowledgement failure, catalog quota races, full migration compatibility, transport limits and real R2 acceptance still need dedicated verification. This test-authoring update does not claim exhaustive coverage or acceptance of those scenarios.
