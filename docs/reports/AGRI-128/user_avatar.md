# AGRI-128 — User avatar and supported profile fields

## 2026-10-25 — Implementation after remote main merge

The user re-authorized avatar upload after the earlier cancellation and merge of
`origin/main` at `018bf32`. This entry supersedes the cancelled avatar scope only;
earlier verification records remain historical.

- Added nullable `User.AvatarUrl`, mapped to `users.avatar_url`, and returned it in
  profile and authentication DTOs. Existing accounts start with null.
- Added authenticated `POST /api/users/avatar` (multipart `file`, JPEG/PNG,
  maximum 15 MB) and `GET /api/users/avatar/{*key}`. The latter serves only the
  owner's current avatar with `no-store` and `nosniff`; foreign/retired URLs return
  404. The persisted URL is an authenticated API path, not a public R2 URL.
- Reused private R2 storage, quota reservations, per-user transaction locking and
  the durable upload journal. Replacement retires the old object; failed cleanup
  remains eligible for the existing explicit `--expire-images` command. Current
  avatars are protected from pending-upload cleanup. No scheduler was added.
- Added migration `20261025094714_UserAvatarUrl` and snapshot. Its reversible
  Down removes the new nullable column; earlier protected migrations are intact.
  Migration tests now cross this new reversible boundary explicitly.
- Frontend confirms a preview before upload, retains the preview for retry on
  failure, and updates the profile, navbar and persisted account on success.
  Private images use authenticated fetches. Removed unsupported display name,
  phone and province/city fields. Full name is editable; email and role remain
  read-only. Guest local-avatar behavior is preserved.

Affected implementation areas: User entity/configuration/migration, auth/profile
DTO mappings, UserAvatarService and controller, storage key/journal/cleanup, and
frontend profile editor, private image rendering, API adapter and account state.
API manifest and focused backend/frontend tests were updated.

## Fresh local verification

| Check | Actual result |
| --- | --- |
| Backend unit tests | 138/138 passed, no skips |
| Full API suite, PostgreSQL Testcontainers with fake storage/AI | 208/208 passed, no skips |
| Migration, catalog import and upload-journal integration tests | 22/22 passed, no skips |
| Frontend full Vitest | 377/377 passed across 55 files |
| Frontend typecheck, lint and production build | Passed |
| Production browser fixtures, 1280/768/375 px | Confirmation before upload, failed-upload retry, authenticated image reads, persistence after reload and unsupported-field removal passed; no page errors or horizontal overflow |
| Git whitespace check | Passed |

Red/green evidence: missing endpoint/adapter and old unsupported fields failed
before implementation. The first full API run had one test fixture failure from
counting all users' pending uploads; scoping the assertion to its owner fixed it,
and the final full API run passed. The initial full integration run had 62 passes
and two failures from the old seven-migration expectation; after updating the
count and reversible-boundary checks, all 22 relevant integration tests passed.
The whole integration suite was not rerun after that correction.

Ignored local artifacts: `.cache/verification/AGRI-128/avatar/` contains unit/API
TRX, `integration/avatar-persistence.trx`, and browser `results.json`/screenshots.
Final full API evidence is `api-final/api.trx`. Browser evidence uses HTTP fixtures,
not a deployed backend or live R2. File validation checks MIME and image signatures;
it does not fully decode or re-encode images.

## Deployment and remaining limits

The application database migration has **not** been applied. Back up the database
and run the project's explicit `--migrate` workflow before deploying this backend;
ordinary HTTP startup only checks schema. No application DB volumes were changed.
No live R2, real AI inference, new coverage measurement or GitHub CI was run for
this change. The user subsequently requested committing and pushing this work to
`AGRI-128-backend-improvement`. Unrelated local files
and the pre-existing deleted development settings example were preserved.

Presence-only diagnostics subsequently confirmed all four R2 settings are empty
both in `.env` and the running backend container. Live uploads remain blocked by
that environment configuration; no credentials were printed or added to Git.
