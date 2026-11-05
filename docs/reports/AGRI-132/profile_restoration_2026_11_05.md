# AGRI-132 — Preserve the Backend Improvement profile when adding email 2FA

- Date: 2026-11-05 (Asia/Saigon).
- Current branch: `AGRI-132-forgot-password`.
- Requested baseline: `AGRI-128-backend-improvement`, resolved to `c39a2622973558c1e39315be0eb2e910614b370e`.
- Local DoD: profile source restoration and automated verification complete; interactive browser/viewport acceptance remains unverified because browser access is disabled in Work settings. No Figma file was edited or claimed to have been visually revalidated.

## What was wrong

The signed-in `/profile` route used the legacy `ProfilePage` instead of the baseline branch's `UserProfilePage`. The latter, its account API client, the persisted avatar editor and the corresponding backend profile/avatar services were missing from the working branch. Adding 2FA to the legacy screen therefore left the user with a different layout and session-only avatar behavior.

The earlier conclusion that avatar persistence was simply unimplemented described the active branch only; it was incomplete relative to Backend Improvement, which already contained that functionality. This follow-up restores that existing implementation rather than designing a replacement.

## Restored baseline and bounded additions

- `frontend/src/features/profile/ProfileRoute.tsx`, `frontend/src/views/ProfilePage.tsx`, `frontend/src/components/profile/ProfileAvatarEditor.tsx`, `frontend/src/providers/sessionProfile.ts` and `frontend/src/services/userApi.ts` match the requested Git baseline after line-ending normalization.
- `frontend/src/views/UserProfilePage.tsx` matches the baseline after removing exactly the 2FA import and the inserted separator/control. All original layout classes, headings, account navigation, forms, preferences, password dialog and avatar controls remain. The 2FA control is placed inside the existing account-security section, not in a new outer card or replacement page.
- `EmailTwoFactorSettings.tsx` retains its existing setup/disable/verification behavior but now renders an inline group for that security section. It reuses the current Checkbox, Label, Dialog and Button.
- The original `UserService`, `UserAvatarService`, user controller, DTOs/repositories and transaction interfaces are restored from the same branch. The original avatar-aware R2 key/context/journal handling, retired-avatar cleanup and `UserAvatarUrl` migration are restored too. Current email recovery, Google login, 2FA and SMTP behavior remain in place; this is not a wholesale replacement of authentication or the application provider.
- Compatibility changes add the existing account-update callback/cache synchronization to `AppProvider`/`AppContexts`, add the optional avatar field to auth API data and include the stored avatar in current auth responses. The current user entity/configuration/EF snapshot retain 2FA fields while adding back the baseline avatar property.
- The original avatar API tests were adapted to the existing integration test project/fixture rather than adding a new test project. Test helper namespaces and service overrides match this repository's active fixture.
- Original comparison evidence and pre-edit backups are local/ignored under `.cache/profile-restore/`. `source_verification.json` records all five exact comparisons and the profile-minus-2FA comparison as true.

## Fresh verification

- The route regression test failed before restoration because `Hồ sơ của bạn` and the original account form/navigation were absent. It now verifies that the signed-in route opens that screen and that the 2FA checkbox and password button share the existing security region.
- Focused frontend run: 29 tests across profile route, original profile form, avatar editor and user API passed. TypeScript initially reported the new callback's missing type import and one test context missing its mock; those were corrected. The subsequent `pnpm typecheck` passed.
- Final full frontend run: **58 files, 383 tests passed, zero failed**, using `pnpm test --maxWorkers=2 --reporter=verbose --testTimeout=15000 --hookTimeout=15000`. Evidence: `.cache/profile-restore/frontend-tests.txt`, run starting at 14:48:48 Asia/Saigon; duration 254.56 seconds.
- Changed-file Biome checking passed and formatted three integration/glue/test files. The source comparison above was repeated after formatting and still passed.
- Final full backend run: **83 unit tests and 98 PostgreSQL integration tests passed; zero failed; one existing gated AI checkpoint test skipped**. Command: `dotnet test backend/AgriVision.sln --no-restore --verbosity minimal --logger trx --results-directory .cache/profile-restore/tests/final`. Evidence: `ASUS_DESKTOP-60AI9UR_2026-11-05_14_48_22_net9.0.trx` and `ASUS_DESKTOP-60AI9UR_2026-11-05_14_48_27_net9.0.trx` in that directory.
- Restored avatar API coverage verifies upload, profile/auth-me persistence, owner-only reads, replacement and old-URL rejection, invalid uploads, storage failure preservation and retry. These use disposable PostgreSQL and a controlled storage double, not real bucket mutations.
- `docker compose build backend frontend` passed, including the Next.js production build. The local database already lists the original `20261025094714_UserAvatarUrl` migration, so no migration or database reset was run. `docker compose up -d --no-deps --wait --wait-timeout 45 backend frontend` then completed with both containers healthy.
- Browser inventory reported `Local browser use is disabled in Work settings`; no interactive screenshot, Figma comparison or 375/768/1280 viewport acceptance was performed. Source parity and automated rendering/interaction checks establish the bounded change, but do not replace that visual acceptance.

## Limits and preservation

No commit, push, branch switch, history rewrite, real-user email, bucket upload/delete or database migration was performed. Existing data and unrelated dirty-worktree changes were preserved. Other Backend Improvement pages/services are not part of this profile restoration. Real inference and GitHub Actions status are not claimed.
