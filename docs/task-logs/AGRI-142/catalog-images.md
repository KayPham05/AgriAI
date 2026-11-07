# Catalog image upload — 2026-11-05

Branch: `AGRI-134-142-integration`; existing Admin/catalog work retained.

- Added Admin plant/disease image selection, preview, upload, replacement and removal; connected saved images to user catalog/home surfaces.
- Reused R2 and the upload journal with catalog-specific keys, activity-aware public reads and durable replacement cleanup. Added migration `20261105120000_CatalogImages`; prior migrations preserved.
- Prepared API/component cases and manifest/schema expectations; **did not run tests, builds, typecheck, lint or browser checks** per the user's pause. Source inspection and frontend formatting only.
- No live migration, Docker rebuild, R2 credential changes, commit, push or PR. Rebuild/migrate and user acceptance remain; uploads require configured R2.
- [Technical details, affected files, limits and acceptance steps](../../reports/AGRI-142/catalog-images.md).

## Additional tests requested — 2026-11-05

- Extended API tests and manifest for file validation/5 MiB boundary, missing resources, guest deletion, missing stored objects, reactivation and repeat removal.
- Added storage-key/public-URL unit coverage and PostgreSQL cases for cleanup retry/protection and stale text/status saves preserving newly replaced images.
- Extended frontend tests for validation, preview/discard, loading/disabled state, authenticated preview, removal confirmation, request cancellation, upload retry and user-catalog image selection/fallbacks.
- Updated the technical report with affected test paths, expected behavior and outstanding checks. Only source review and formatting were performed; **tests remain unrun**, as requested. No new passing result or coverage percentage is claimed.
