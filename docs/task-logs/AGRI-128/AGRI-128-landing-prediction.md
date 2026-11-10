# AGRI-128 — Landing prediction

- 2026-11-03, `AGRI-128-backend-improvement`: added anonymous prediction directly
  below the landing hero; trial links navigate to the section.
- Reused image validation, inference, result and retry UI. No token, history
  callback or profile is supplied; no browser history writes or backend changes.
- Added regression coverage; related suites 23/23 and startup-related suites
  11/11 passed. Typecheck, lint and production build passed. Full suite had
  481 pass/5 timeouts; all three affected files passed 18/18 sequentially after
  closing preview, without code/assertion/timeout changes. Full-suite stability
  under low memory remains unverified. Full-suite evidence,
  failed attempts and final status are in the
  [technical report](../../reports/AGRI-128/landing_prediction_2026_11_03.md).
- Verified responsive layout at 375/768/1280px in production preview. Real model,
  database/storage E2E and coverage remain unverified. No commit or push.

## Runtime follow-up — 2026-11-03

- Diagnosed 503: model files existed in `ai/checkpoints/`, outside the Compose
  mount `ai/models/checkpoints/`. Verified SHA-256 against CI, copied four ignored
  artifacts and restarted only AI; container and API dependency checks healthy.
- One real anonymous request through port 3000 returned HTTP 200 with 3 predictions,
  no image storage path and `hasHistoricalSnapshot=false`. This supplements the
  earlier fixture-only checks; it is not an accuracy evaluation or full E2E suite.
- No application/configuration edits, rate-limit bypass, migration or commit/push.
  Exact hashes, response summary and artifacts are in the linked technical report.
