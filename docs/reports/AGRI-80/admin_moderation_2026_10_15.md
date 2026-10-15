# AGRI-80 - Account and image moderation

Branch: `AGRI-80-create-crm-admin-page`. Work started2026-10-14; local browser verification completed2026-10-15 Asia/Bangkok. Requested account/image management and removal of visible CRM text are implemented and verified locally. This does not certify GitHub CI, model quality or Cloudinary private access.

## Implemented behavior

- Account directory shows active/locked status, saved lock reason and retained warning count. Admin can lock, restore, send a warning or forcibly sign out a regular user. Admin accounts are excluded from account moderation by both UI and backend, preventing accidental self-lockout.
- Locking records a reason, blocks new login, revokes existing sessions and rejects legacy tokens. Restoration permits new login without reviving old sessions. Force logout revokes all existing sessions while permitting subsequent login. A revocation cutoff also rejects sessions created before the cutoff, including concurrent issuance and older sid-less tokens.
- Warnings are persisted for the selected account. Image warnings derive the recipient from the stored image owner, rather than trusting an owner supplied by the browser. User explicitly selected in-app delivery. User notifications support persisted read/dismiss state; dismissal hides a notice without removing its moderation history or warning count.
- Authenticated website polls notifications/session validity every15seconds and refreshes on window focus/opening notifications. Server authorization is immediate; an active user tab returns to login on its next check. Network/service errors do not falsely sign a user out. This is polling, not websocket push; background browser throttling can delay intervals until focus resumes.
- Image deletion uses the existing storage service and clears URLs/public IDs only after storage confirms deletion. The prediction and historical result remain. Repeating successful deletion is idempotent; failed storage deletion leaves the image metadata intact for retry. Deleted/expired image metadata can still receive an owner warning.
- Confirmation dialogs identify the target, require lock reasons/warning messages, disable actions while pending and display errors. Account reason limit500; warning limit1000. Lists refresh from backend after success, preserving search/page state.
- Desktop/mobile labels, accessible names, footer and metadata now use Quản trị in place of CRM. Legacy internal component filenames remain implementation identifiers; no visible CRM text was found in non-test frontend source or inspected browser output.

## API and persistence

All admin routes retain server-side `CurrentAdmin` authorization. User notification routes derive the recipient from the authenticated identity and return no other user's notices.

| Route | Behavior |
| --- | --- |
| `PUT /api/admin/users/{id}/lock` | Lock/restore; lock requires reason |
| `POST /api/admin/users/{id}/logout-all` | Revoke every existing session |
| `POST /api/admin/users/{id}/warnings` | Persist account warning |
| `POST /api/admin/images/{id}/warnings` | Persist warning for stored image owner |
| `DELETE /api/admin/images/{id}` | Delete stored image, retain history |
| `GET /api/notifications` | Current user's non-dismissed notices |
| `POST /api/notifications/read-all` | Mark own notices read |
| `DELETE /api/notifications` | Dismiss own notices while retaining records |

Migration `20261014164729_AdminModeration` adds nullable `locked_at`, `lock_reason`, `sessions_revoked_at` fields and `user_notifications` with recipient/admin/image references, indexes and read/dismiss timestamps. Up contains no data deletion. Down is forward-only to protect moderation history. Existing migrations/volumes are preserved; normal HTTP startup still only checks readiness.

Related backend sources: `AdminController.cs`, `NotificationsController.cs`, `Program.cs`, `AuthService.cs`, `User.cs`, `UserNotification.cs`, `AdminDtos.cs`, `NotificationDto.cs`, `IAdminRepository.cs`, `INotificationRepository.cs`, `AdminRepository.cs`, `NotificationRepository.cs`, `LoginSessionRepository.cs`, `UserConfiguration.cs`, `UserNotificationConfiguration.cs`, `AppDbContext.cs`, infrastructure DI and generated migration/snapshot under their existing backend layers.

Related frontend sources: `src/features/admin/` (especially AdminUsers, AdminImages, AdminActionDialog and AdminRecordList), `src/services/adminApi.ts`, `notificationsApi.ts`, `authApi.ts`, `src/providers/useAccountNotifications.ts`, `AppProvider.tsx`, `src/components/modals/NotificationsModal.tsx`, and admin page metadata. Tests extend `AdminCrmPage.test.tsx`, `App.startup.test.tsx` and backend `AdminControllerTests.cs`; migration-count assertions updated in MigrationTests/CatalogImportTests. No new dependency, dataset, model, credential or role change.

## Actual verification

1. Backend RED: three new HTTP integration flows failed against missing endpoints; previous three admin cases passed. GREEN: all six admin cases passed with PostgreSQL.
2. Full `dotnet test backend/AgriVision.sln --no-restore --verbosity quiet --logger trx --results-directory .cache/admin-verification/moderation-backend`:33unit and39integration PASS. TRX files `GIGABYTE_THONGDZ_2026-10-14_23_53_22.trx` and `GIGABYTE_THONGDZ_2026-10-14_23_53_18.trx` respectively. Subsequent filtered AdminControllerTests run6/6 PASS after adding explicit legacy-token and failed-storage assertions. Tests isolate PostgreSQL; inference/storage are fake in integration fixtures.
3. Frontend RED: three moderation UI cases failed before controls were added; two notification/revocation cases failed before wiring. Final `corepack pnpm test --maxWorkers=1`:178/178 in26files PASS49.11s. Typecheck and strict lint153files PASS. New/changed frontend files were formatted; whole-project format still flags pre-existing `src/App.routing.test.tsx` and `src/services/authApi.test.ts`. Do not interpret command-chain exit1 from those format findings as test failure. No coverage measurement was performed.
4. Docker backend/frontend production builds PASS. Before applying migration, saved custom dump `.cache/database-verification/agrivision_pre_moderation_20261014_235859_cbd5077914d94e7896284506895ddc06.dump`35418bytes. `pg_restore --list` read its contents; restoration was not tested. `backend --migrate` applied only AdminModeration, then backend/frontend were recreated. All four services healthy afterward.
5. Live Chromium against localhost:3000 used a uniquely named newly registered User fixture and a real uploaded test image through the normal backend/AI/storage path. UI sent account warning; recipient saw it and marked it read. Force logout returned an already-open user tab to login and old token401. Lock blocked login and removed the active session; restore allowed fresh login. Image warning reached the correct account and survived reload. Admin deleted the physical local image (original URL404), while authenticated prediction detail still returned200 with null image path.
6. Checked image/user layouts at1280/768/375: no horizontal document overflow, no visible CRM metadata/copy, no page errors. Inspected desktop/mobile user list, mobile confirmation and mobile image capture. Read-only review opened/cancelled a confirmation on existing data without submitting a real moderation action. No visual correction was needed.
7. Logged out verification admin sessions, removed the fixture's stored image, then deleted only its own prediction/account records using its exact generated UUID/email. Notification/session fixture records cascade accordingly. Browser cleanup reported PASS. Existing accounts, credentials, prediction history and volumes were preserved. Verification admin session history remains retained.

Ignored live harnesses: `.cache/admin-verification/moderation_browser.py`, `moderation_review.py`; captures `moderation_users_<width>.png`, `moderation_images_<width>.png`, `moderation_dialog_375.png`. Passwords/tokens were held in memory and not printed or written to artifacts. Initial migration generation required design-time placeholder configuration; no live connection was used for generation. An initial Windows pnpm command could not parse a parenthesized path; using the existing app directory resolved formatting. Effect refresh dependencies were corrected without disabling lint rules. `git diff --check` passed.

## Limits and delivery state

Cloudinary deletion/private access, email delivery, websocket push, full accessibility, new branch-coverage percentages and GitHub Actions were not verified or introduced. Actual storage smoke used the existing local fallback. No existing real account was moderated or warned. No commit, staging, push or Jira transition. Historical reports remain intact and are superseded only for the newly implemented scope above.
