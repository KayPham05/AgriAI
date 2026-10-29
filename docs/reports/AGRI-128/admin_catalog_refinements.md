# AGRI-128 — Admin catalog refinements, 2026-10-29

Branch: `AGRI-128-knowledge-medicine` (base HEAD `8c146bf`). Implements the five
changes explicitly approved after planning. Earlier classification/search work
in the same worktree is preserved; this update replaces the external pair search.

## Behavior and affected paths

- `frontend/src/features/knowledge/PlantDiseasePicker.tsx` and
  `frontend/src/components/ui/popover.tsx`: an anchored popup with a search input
  above plant/disease options. Supports Vietnamese accent/underscore-insensitive
  matching, keyboard arrows/Enter, Escape, focus return, scrolling and selection.
  Search resets on reopen; closing or selecting the current pair preserves drafts.
  Uses existing Radix and UI components; no dependency changes. The shadcn CLI docs
  request failed due to the sandbox network proxy; official shadcn/Radix Popover
  documentation was read as fallback.
- `MedicineUses.tsx`: removes external search, explanatory copy and result counts;
  linked uses remain visible regardless of popup search. Eligibility checks and
  explicit save/verify/approve actions remain in place.
- `catalogUi.ts` removes the old target-use content field; `PublicCatalog.tsx`
  uses active ingredient for medicine list summaries. Public per-pair instructions
  remain under “Hướng dẫn theo đối tượng sử dụng”.
- `KnowledgeAdmin.tsx`: read-only related diseases/conditions below plant status,
  and condition classification below disease status, in both list and detail.
  No additional edit/navigation or relationship mutation actions in these summaries.
- `PlantDiseaseManager.tsx`: 20 rows/page, existing SearchField's 500 ms debounce,
  reset to page one on search/clear, empty state and bounded page after filtering.
  Filtering/pagination operate on the existing complete lookup; no new endpoints.

## API and database compatibility

`DTOs/Medicine/MedicineDtos.cs` accepts omitted/null `TargetUse`. `MedicineService`
preserves a legacy value when omitted on update; new medicines use an empty value.
Legacy clients can still supply the field. Response properties and existing rows
are retained. All other required medicine fields and approval rules stay enforced.

Migration `20261028225650_OptionalMedicineTargetUse` (UTC timestamp, generated on
October 29 local time) only replaces `ck_medicines_required` to omit its nonempty
`target_use` clause. Configuration and EF snapshot match. No column or row is
deleted. Down restores the old check and will reject blank target values rather
than deleting or rewriting them; downgrading a populated new schema is not automatic.

Tests: optional-field create/update HTTP regression with unique ApiCase
`knowledge.medicine_optional_target`, API manifest mappings, migration history
count 9, popup/retired-field/metadata/pagination-debounce frontend regressions.

## Verification record

Before implementation: API create without target returned failure (one failing
regression); frontend tests exposed missing popup, retired field and metadata.
An initial pagination fixture incorrectly advertised another page indefinitely;
fixed the fixture to represent the complete 100-item lookup page, then confirmed
the pagination regression failed on 25 visible rows instead of 20.

Focused frontend: 42/42 passed. Typecheck and lint (236 files) passed after removing
leftover search state and placing the Radix wrapper under shared UI as required
by repo lint rules. Full-suite/build/deployment results from October 29 follow;
earlier test results are not presented as this run's evidence.

- Frontend: `corepack pnpm test --maxWorkers=2`, 453/453 tests in 63 files passed.
- Backend: .NET SDK 9.0.305, `dotnet test backend/AgriVision.sln --no-restore
  --filter 'Category!=RealCheckpoint&Category!=RealR2'`: 168 unit and 241 API tests
  passed. Integration initially passed 63/65; both failures were hardcoded counts
  of eight applied migrations in `CatalogImportTests.cs`. Updated those two
  assertions to nine and reran the affected theory: 2/2 passed, including catalog
  preservation and protected downgrade checks. The remaining 63 were not rerun.
- Docker backend/frontend build succeeded. Ran `backend --migrate` separately:
  the log confirms only the medicine check constraint replacement and the new
  migration history entry. Then `up -d --no-deps --wait` completed with both
  containers healthy. No database rows or AI classifications were edited for UAT.
- Direct `http://localhost:5080/api/health` and proxied
  `http://localhost:3000/api/health` returned HTTP 200/Healthy; homepage returned
  200. An initial probe used the nonexistent `/health` route (404), then the
  configured `/api/health` route was checked successfully.
- Browser at 06:06 local confirmed related conditions immediately below plant
  activity and condition type immediately below disease activity, using live
  application data. Popup, retired field and pagination/debounce have component
  and integration test coverage; their live browser UAT remains incomplete.
- On continuation around 11:00, frontend was stopped and the browser session no
  longer authenticated. Started the existing frontend with `--no-deps`; at 11:01
  backend/frontend/PostgreSQL were healthy and both health URLs again returned
  200/Healthy. The browser could load the public app, but further login interaction
  timed out. No CAPTCHA bypass, authentication change or real-content save was
  attempted. AI was already stopped and was not started or updated.

Local artifacts: `.cache/classification-verification/admin-refine-*.log`,
`admin-refine-backend/*.trx`, `optional-target-red/*.trx`, `pagination-red.log`.

Before deployment, PostgreSQL was backed up to
`.cache/database-verification/agrivision_before_optional_target_20261029_055840_e1d144a98b3f42b7937fd116465a4c8d.dump`
(82,927 bytes); `pg_restore --list` succeeded. Restoration has not been tested.
Backups/logs stay untracked.

No AI update, RealCheckpoint/RealR2 test, coverage rerun, commit, push or remote CI
acceptance is included in this change.

## PR delivery scope, 2026-10-29

The user requested a PR targeting `AGRI-128-backend-improvement` and explicitly
requested no repeat tests. The recorded local results above remain historical;
no new test, coverage or CI success is claimed during PR preparation. The earlier
PR #46 is merged. Target ref at preparation is d565022.

Known separate issue: the user page's history GET currently returns 503 when all
four R2 settings are empty because prediction-service construction resolves image
storage. This change does not modify authentication, history, R2 registration,
credentials or Compose. Previous container configuration and the reason earlier
sessions did not show this error remain unverified. This PR does not fix that issue.

PR: [#50](https://github.com/KayPham05/AgriAI/pull/50), head AGRI-128-knowledge-medicine into AGRI-128-backend-improvement. Implementation commit 7bdcf1f; merge-tree against d565022 reported no conflicts. Review requested from trunthong09012005 and kats205; CI and approval remain pending. No tests rerun for delivery.

