# AGRI-158 startup and session restoration

- Added native startup and retry states, SecureStore token reading and cleanup, and Bearer validation against the existing backend profile endpoint on `AGRI-158-mobile-session-startup`.
- Passed 12 session unit tests, Android Guest smoke, typecheck, lint and Android/iOS bundle export. The real Home handoff and device tests with live backend tokens remain pending.
- [Implementation, checks and remaining dependencies](../../reports/AGRI-158/README.md).

## 2026-11-25 Figma startup UI

- Adapted Figma Loading, Error and Success components for S01 using local icons and native controls. The retry action keeps its label and locks while the request is pending.
- Passed 12 session unit tests, typecheck, lint, Android/iOS export, 16 controlled UI preview scenarios and a fresh Android Guest launch. Live backend token and User Home handoff acceptance remain pending.
- [Design references and current evidence](../../reports/AGRI-158/figma-startup.md).

## 2026-11-25 Home handoff and live acceptance

- Updated the task to mobile base `87006f1` after AGRI-159 merged. Connected verified User sessions to protected Home and Guest to the merged Welcome.
- Passed 13 session unit tests, 9 component tests, the live ASP.NET/PostgreSQL integration test, all seven Android startup scenarios and both platform bundle exports. iOS runtime was not executed.
- [Integration scope and detailed checks](../../reports/AGRI-158/startup-integration.md).
- Pre-commit rerun passed typecheck, lint, 13 unit tests, 9 component tests and the real backend integration test on a fresh QA database.
