# AGRI-142 — Catalog acceptance corrections

- Date: 2026-11-05
- Branch: `AGRI-134-142-integration`
- Existing PR: #60; this follow-up is not committed/pushed.

Implemented current disease images in plant leaf references, guest catalog navigation, readable plant disease labels, permanent Admin deletion preserving user history/shared catalog data, and new catalog image prefixes plus an explicit old-image migration command.

Schema migration: `20261105155108_CatalogPermanentDeletion`. Live database/R2 operations and Docker deployment are not performed.

Focused frontend: 35/35 passed; typecheck and changed-file format/lint passed. Backend build passed with the documented host C# 12 workaround. Final backend results and initial failures are maintained in the [technical report](../../reports/AGRI-142/catalog-acceptance-corrections.md).

Backend final verification on 2026-11-05: Unit 216/216, API 275/275 and Integration 76/76 in three fresh processes; zero skipped. Original downgrade-fixture and capitalization-assertion failures are retained in the report. Frontend full regression on 2026-11-06 passed 541/541 across 75 files after correcting stale HTTP/catalog/navigation fixtures. Typecheck, changed-file lint/format and diff whitespace checks passed.

Remaining: user acceptance on the rebuilt app, live schema migration and catalog-image migration using existing R2 settings. No live data, Docker services or Git commits were changed by verification. Default-language CI build and existing PR conflicts remain documented separately.

## Live deployment update — 2026-11-06

At the user's explicit request, rebuilt frontend/backend production Docker images from this worktree, backed up the live database and applied `20261105155108_CatalogPermanentDeletion` (16 migrations total). Migrated all 3 referenced old catalog images on real R2 into `category/plant/` (2) and `category/disease/` (1), with byte verification and source cleanup. No old catalog references or pending image journal entries remain. Existing catalog records, 39 predictions and 39 prediction images were preserved.

Frontend/backend and PostgreSQL are healthy. Homepage/catalog API and active migrated images return 200; the inactive plant's image correctly returns 404 for anonymous users. AI remains stopped per the user's later instruction. Database backups before and after migration are under ignored `.cache/backups/`; logs and HTTP evidence are under `.cache/deployment-20261106/`. The post-migration backup contains the new R2 references. No tests were rerun, no commit/push/PR update was made. User acceptance remains pending. See the technical report for commands, backup identity and limits.

## Admin action row follow-up — 2026-11-06

Updated only the Admin catalog action layout in `KnowledgeAdmin.tsx`: status and permanent-delete buttons share a wrapping horizontal row across plants/diseases/medicines; removed deactivate from active medicine actions. Existing restore/confirmation guards remain. Navigation deferred per user request. Component Biome and diff whitespace checks passed. No tests added/changed/run and no build or Docker operations; this change is not deployed.

## Guest navigation follow-up — 2026-11-06

Changed IntroPage Tra cứu destination to `/plants`. Added existing `/about` to AppProvider public-page handling, fixing the guest redirect to the landing page while preserving private-page gates. Two source files changed; Biome and focused diff whitespace checks passed after line-ending normalization. Per user scope, no tests, build, Docker operations or runtime acceptance; code remains undeployed.

## Guest diagnosis and account save — 2026-11-06

Implemented public `/diagnose` and guest navigation, tab-scoped result/history restoration, bounded one-hour in-memory backend image/result retention, and explicit login-to-save without rerunning inference. Saving binds to the authenticated owner, supports same-owner retry, writes through the existing R2 journal and stores the original snapshot. Private saved preview and agricultural profile actions remain available after login on the diagnosis page. No new migration is needed.

API production build passed with 0 warnings/errors; frontend typecheck, seven-file Biome check and diff whitespace check passed. No tests written/changed/run and no Docker/live AI/R2/database operation. The two added API routes require future tests and manifest entries; existing inventory CI is not claimed passing. Implementation details, affected files, retention limits and deferred verification are in [guest diagnosis report](../../reports/AGRI-142/guest-diagnosis-save.md). User acceptance remains pending.

## Guest-flow automated tests — 2026-11-06

User subsequently authorized tests. Added 29 cases covering anonymous diagnosis and preview, tab restoration/storage failure, real login-dialog/account-save flow, original snapshot/image/time preservation, retries and concurrent saves, owner isolation, expiry/eviction and deleted-history protection. Added actual API case mappings for the two guest routes. Updated existing navigation and image-retention assertions to reflect the implemented public-page and save-time behavior. Only tests, manifest and documentation changed in this follow-up.

Fresh final results: frontend **558/558** (77 files, two workers), backend Unit **223/223**, API **280/280**, Integration **76/76** (real checkpoint and R2 categories excluded). Backend solution build passed with the existing local C# 12 override; frontend typecheck, five-test-file Biome check and diff whitespace check passed. Initial fixture/timestamp failures and one login-form timeout are documented, with corrections, in the [technical report](../../reports/AGRI-142/guest-diagnosis-save.md).

Docker was used only for disposable PostgreSQL test containers. No live app rebuild/migration, AI startup, real R2 mutation, commit, push or PR update. Real browser/user acceptance and default-language GitHub Actions validation remain separate; coverage percentages were not measured. Logs are under ignored `.cache/guest-*` in the worktree.
