# AGRI-128 — Prediction directly on the landing page

Date: 2026-11-03. Branch: `AGRI-128-backend-improvement`, base `c39a262`.
Scope: upload a leaf image and read its prediction on `/`, without signing in,
saving history, selecting a profile or uploading an image to persistent storage.
Overall AGRI-128 DoD remains incomplete; real-checkpoint acceptance is separate.

## Changes and contracts

- `frontend/src/features/introduction/LandingPredictionSection.tsx`: adds the
  `#try-prediction` section immediately below the existing introduction hero.
  Reuses `DiagnosePage` without an auth token or history callback. It neither
  consumes auth/history contexts nor reads/writes browser persistence.
- `frontend/src/views/IntroPage.tsx`: mounts the section; hero and closing-banner
  trial links lead to it. Registration remains available for account features;
  prediction itself does not open authentication.
- `frontend/src/views/DiagnosePage.tsx`: optional history callback and an embedded
  presentation without a second h1 or the full-page stepper. Existing `/diagnose`
  still supplies its callback, token and profiles unchanged. The anonymous landing
  section omits the optional catalog lookup/modal action. Fixed the hidden file
  input's dimensions to prevent it inheriting full width and causing overflow.
- Uses existing `POST /api/predictions`, without Authorization or profile ID.
  `PredictionsController.Predict` passes a null user ID for anonymous requests;
  the existing guest service path does not save predictions/images. No backend
  code, auth mechanism, schema, dataset, labels, confidence thresholds or model
  artifacts changed. Existing low-confidence/error handling is reused.
- Tests: `frontend/tests/integration/diagnosis/LandingPrediction.test.tsx` uses
  the real upload/response adapter with synthetic XHR/Image fixtures; verifies
  no token/profile field, no storage writes, existing history preserved,
  explicit submit/loading/result, invalid empty image, server failure and retry.
  `frontend/tests/component/views/IntroPage.test.tsx` verifies the anonymous CTA.

## Verification

Commands ran from `frontend/` with Node 24.15.0 and pnpm 10.34.5, using locked
dependencies. No commit/push or unrelated local changes were staged.

- Before implementation: the three new integration tests failed because the
  landing section did not exist. Log: `.cache/verification/AGRI-128/landing-red.log`.
- Landing + IntroPage + existing DiagnosePage suites: 23/23 passed in 3 files.
- Admin entrance + app startup + landing suites after removing the unnecessary
  public-catalog startup request: 11/11 passed in 3 files.
- Typecheck and full frontend lint passed; lint checked 251 files.
- Changed-file Biome check passed. Production build passed after the final
  input-sizing and catalog-request changes.
- First full run: 484 passed, 2 failed and 1 unhandled error, 70 files, exit 1.
  Failures were fresh Admin login cases in `App.adminEntrance.test.tsx` and
  `App.startup.test.tsx`: the initial landing catalog request conflicted with
  startup isolation/mocks. Removed that request rather than weakening assertions.
  Log: `.cache/verification/AGRI-128/landing-full.log`.
- Post-fix full suite with two workers: **481 passed, 5 failed** in 70 files,
  exit 1, duration 344.18 seconds. All five failures were timeouts:
  `App.adminEntrance.test.tsx` (fresh Admin session), `App.startup.test.tsx`
  (fresh Admin login), and `AdminCrmPage.test.tsx` (mock records/charts, dashboard
  search, and in-memory account locking). Log:
  `.cache/verification/AGRI-128/landing-full-final.log`.
- Investigated resource contention: Windows reported about 1.43 GiB free of
  15.84 GiB visible RAM while tests and browser preview were running. Closed the
  task's preview/tab, then ran exactly the three failing files sequentially:
  `corepack pnpm test tests/integration/app/App.adminEntrance.test.tsx tests/integration/app/App.startup.test.tsx tests/integration/admin/AdminCrmPage.test.tsx --maxWorkers=1`:
  **18/18 passed**, 3 files, exit 0, duration 47.15 seconds. No source/assertion,
  timeout or gate changes between these runs. Log:
  `.cache/verification/AGRI-128/landing-auth-diagnostic.log`.
- This suggests environment/timing sensitivity, not a proven application defect;
  the two-worker full suite is still recorded as failed. Full-suite stability
  under constrained memory remains unverified. Typecheck, production build,
  changed-file checks and the final full lint all passed; `git diff --check`
  passed. No failures or earlier logs were discarded.

## Browser checks and limits

Production preview: `http://127.0.0.1:3128`, temporary Next production server.
Browser: Chromium-based in-app browser, no saved account session.
Visual inspection used the current light theme; dark-mode rendering was not
separately exercised. Existing semantic tokens are reused.

- Inspected the final build at 1280×900, 768×1024 and 375×900. Document widths
  were respectively 1265, 753 and 360 CSS pixels (scrollbar excluded), with no
  horizontal overflow. Desktop uses input/result columns; tablet/mobile stack.
- Confirmed the trial anchor reaches the section, existing photo sample creates
  a preview, and prediction waits for the explicit button. No browser console
  errors in the final preview. Closed the temporary tab/server and reset viewport.
- Browser inspection exposed hidden-input overflow in the first build; the
  final `size-px!` constraint fixes it. No redesign of the existing hero/map.
- Successful/error inference assertions use synthetic HTTP fixtures. No real
  AI checkpoint, R2, application database writes or end-to-end inference run.
  No coverage measurement or new GitHub Actions run for this uncommitted patch.

## Runtime fix: AI unavailable — 2026-11-03

- User reported predictions failing (initial screenshot 429, subsequent console
  response 503). API dependency health returned 503/Degraded; FastAPI health
  returned `MODEL_UNAVAILABLE`. Startup logs reported missing checkpoint at
  `/app/ai/models/checkpoints/plant/best_convnext_tiny.pth`.
- Existing artifacts were under `ai/checkpoints/{plant,disease}/`, while Compose
  mounts `ai/models/checkpoints/`. Verified both checkpoint hashes against the
  exact values committed in `.github/workflows/ci.yml`:
  plant `d071c13d14ef573430b38674647e5ebfce0b5d3f4bd7099d7e815549073178ea`;
  disease `d21d8d6efd3c66e36ce166bfdb03bf0f017a0452ee07508df82e49ca42d429b9`.
- Copied the verified checkpoints and accompanying `class_to_idx.json` files
  into the expected mount folders; verified copied hashes. Both source and target
  artifact locations are ignored by Git. No model/code/label/config changes.
- Recreated only AI with
  `docker compose up -d --no-deps --force-recreate --wait --wait-timeout 180 ai-service`:
  exit 0, healthy. Backend dependency health then returned 200/Healthy.
- A single anonymous multipart request using the same rice cutout as CI through
  `http://localhost:3000/api/predictions` returned **HTTP 200**. Actual result:
  `Lua___Khoe_manh`, confidence `0.8705999851226807`, 3 details;
  `imagePath=""`, `imagePublicId=null`, `hasHistoricalSnapshot=false`.
  Response and headers: `.cache/verification/AGRI-128/ai-runtime/` (ignored).
- This is fresh real-checkpoint execution evidence through frontend proxy → API
  → FastAPI, not dataset accuracy or full model acceptance. No training, migration,
  user-image upload, DB reset, rate-limit change, commit or push. Rate limits
  remain enforced; no claim is made that legitimate 429 responses are disabled.
