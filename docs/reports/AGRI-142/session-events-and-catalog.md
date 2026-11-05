# Session notices and catalog acceptance corrections — 2026-11-05

Branch: `AGRI-134-142-integration`, checkout `.worktrees/AGRI-128-knowledge-medicine`. This continues the existing Admin follow-up; no additional Jira key was supplied. Earlier uncommitted work is retained.

## Implemented behavior, pending acceptance

- **Plant link picker:** `SearchableCatalogSelect.tsx` reuses the existing medicine picker's Popover, fuzzy matching and keyboard selection. `PlantDiseaseManager.tsx` places search inside the disease/condition dropdown. All pairs already associated with this plant, including inactive ones, are excluded from new choices. Existing inactive pairs remain restorable in their list. The separate search/pagination for existing links is retained. `PlantDiseasePicker.tsx` uses the shared control and retains its Disease-only eligibility and display of a selected unavailable pair for removal.
- **Capitalization:** `CatalogText.Name`, `CatalogValidation.Name`, `normalizeCatalogName` and `CatalogEditor` uppercase the first character of catalog names, Vietnamese names and medicine product names on blur/save. Remaining casing is preserved: `nativo 750WG` becomes `Nativo 750WG`. Existing whitespace cleanup remains. Scientific-name capitalization, AI mappings, chemical amounts and instructions are not rewritten; existing database names are not bulk-updated.
- **Editable plant categories:** `Plant`, its EF mapping, `PlantDtos` and `PlantService` persist `category`. Admin offers Cây lương thực, Cây công nghiệp, Cây ăn trái and Khác. New plants default to Khác; an older client omitting category on update preserves the stored value. Invalid values are rejected. `catalogApi` uses the backend category for home/plant grouping; prediction DTOs carry it as well.
- **Immediate lock/logout popup:** `SessionEventsHub`, `SessionNoticePublisher`, `ISessionNoticePublisher` and `useSessionEvents` deliver `SessionRevoked` to authenticated session-specific groups. Admin status/logout services capture affected session IDs within the existing user-row transaction, revoke sessions, then publish after commit. A new login cannot receive an old session's event. The hub checks persisted status after joining its group to cover the validation/join race. `AppProvider` uses the existing blocking acknowledgment modal and clears client state only after acknowledgment. Backend authorization rejects revoked sessions immediately.

## Transport and recovery

The hub at `/api/session-events` uses SignalR Long Polling: a held HTTP request completes when a notice is available, so delivery does not wait for a periodic status timer. Its 20-second idle poll timeout fits the existing Next.js `/api` rewrite. Bearer tokens stay in headers, credentials/cookies are disabled on the client, and the hub exposes no client-callable methods or arbitrary group joins. Routing precedes CORS/authentication.

The official `@microsoft/signalr` client is pinned to 9.0.6 and dynamically imported only for an authenticated session. Reconnect uses backoff. Reconnection, returning online and tab focus trigger a bounded authenticated status request to recover a persisted reason missed while disconnected. A reported notice stops the connection and retry loop; effect cleanup stops connections/listeners/timers. Notice delivery failure is logged and cannot roll back a committed revocation. The existing authenticated-request observer remains a fallback.

Immediate delivery requires an online, executing browser and an available backend. This implementation matches the current single-backend deployment. Multiple backend replicas would require a SignalR backplane/shared connection routing; none was configured in this task.

References: [Microsoft SignalR JavaScript client](https://learn.microsoft.com/en-us/aspnet/core/signalr/javascript-client?view=aspnetcore-9.0), [SignalR authentication](https://learn.microsoft.com/en-us/aspnet/core/signalr/authn-and-authz?view=aspnetcore-9.0).

## Migration and actual checks

New migration `20261105100000_PlantCategories` adds `plants.category` with default Khác and backfills known Vietnamese/canonical/legacy plant names to their previous frontend groups. It leaves IDs, AI class mappings and links unchanged. The migration, target model and current snapshot were authored without executing EF/database tooling. Existing migration files were not rewritten. Migration-count expectations and the AdminUserService test fixture were adapted for the new schema/dependency; these tests were **not run**.

Performed during this correction: source inspection, package/lockfile update, dependency installation with `--ignore-scripts`, and Biome formatting of the edited frontend files. Formatting completed successfully; it is not runtime or test evidence.

Per the user's explicit instruction, **no tests, typecheck, lint run, build, browser acceptance or coverage run** were executed for this correction. No live database migration, Docker rebuild, commit, push or PR was performed. Previous results in other reports do not verify this code. Standard test-first/verification execution is deferred to the user's acceptance approval.

## Acceptance and follow-up

Rebuild backend/frontend from this checkout, apply backend `--migrate` separately, then recreate those services using the existing Compose project, environment and database volume.

1. Keep a normal user tab open and idle. Lock that account from a separate Admin session: expect the lock reason popup without F5; acknowledgment returns to login. Repeat forced logout and inspect its distinct message. Exercise multiple tabs and separate user sessions.
2. Disconnect/reconnect the user around an Admin action: expect the persisted reason after reconnection. Confirm old sessions remain unusable after account restoration and a new login is not affected by a prior event.
3. Open Add link: search must be inside the dropdown; active and inactive existing pairs must be absent. Restore an inactive link from its existing row; add another disease without duplicate identity or AI mapping.
4. Edit plant, disease and medicine names with lowercase initial letters and mixed-case suffixes; blur then save/reopen. Scientific names and amounts must preserve casing/content.
5. Edit a plant category, save/reopen and reload the public plant/home list. Confirm the category persists and the plant moves to that group. Unknown/custom plant names start under Khác.

Only after user approval: compile and run targeted service/API/session/picker/category tests, validate the EF snapshot/migration on PostgreSQL, then exercise the two-browser live flow and reconnect behavior through the Docker/Next proxy. Include unauthorized hub access, session isolation, publish-after-commit and existing API manifest consistency in regression coverage.

## Acceptance issue: named culture unavailable in Alpine — 2026-11-05

The user reported `Only the invariant culture is supported ... vi-vn is an invalid culture identifier`. Source inspection located the new `CultureInfo.GetCultureInfo("vi-VN")` call in `CatalogText.Name`; the backend runtime image is `mcr.microsoft.com/dotnet/aspnet:9.0-alpine`. This new dependency on a named culture conflicts with the reported invariant-mode runtime.

Replaced that call with `char.ToUpperInvariant(text[0])`, preserving the remaining name unchanged. .NET 6+ supports Unicode case mapping in invariant mode ([Microsoft compatibility documentation](https://learn.microsoft.com/en-us/dotnet/core/compatibility/globalization/6.0/culture-creation-invariant-mode)), so Vietnamese initials do not require installing ICU or changing container globalization settings. Added regression cases for Vietnamese initials, a mixed-case medicine suffix, empty and null input. These cases are authored but **not executed**.

Verification for this correction: source inspection and documentation review only. No tests, build or live reproduction were run, respecting the user's ongoing pause. After approval, run the name cases both normally and in a fresh process with `DOTNET_SYSTEM_GLOBALIZATION_INVARIANT=1`. Deployment requires rebuilding/recreating backend only; this correction adds no migration and changes no Docker or R2 configuration.
