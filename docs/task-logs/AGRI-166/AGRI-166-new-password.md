# AGRI-166 - New password

2026-11-28, implemented on AGRI-164 branch as requested. Added password/confirmation, visibility controls, UTF-8 validation, real reset API and success-to-Login flow. Fresh checks: 58 Node tests, 42 component tests, isolated real API/DB/SMTP recovery test, typecheck/lint and Android/iOS exports passed; integration proved password replacement and session revocation. Real Gmail/full-device and iOS acceptance remain; existing Expo drift persists. No commit/push. [Evidence](../../reports/AGRI-166/README.md).

- 2026-11-28 user acceptance: user confirmed the recovery flow works after the current Android preview was reloaded. This is user-reported acceptance, not a new automated test or independent mailbox observation. iOS/large-font checks and existing Expo drift remain; no commit/push.

- 2026-11-28 fixes: aligned Expo packages/lockfile, added native error alerts and fixed the Windows SMTP capture race. Fresh static/compatibility/build checks, 58 Node tests, 42 component tests and three isolated integration runs passed. Initial failures and remaining limits: [AGRI-164 evidence](../../reports/AGRI-164/README.md). No commit/push.

- Android request/code checks passed at font 1.3 and 2.0; restored original 1.0. Large-font password entry and spoken screen-reader/iOS acceptance remain unrun.

- Prepared requested local commit delivery: fresh checks and secret/message scans passed; [delivery evidence](../../reports/AGRI-164/precommit_verification.md). PR scope includes AGRI-164/165/166, target AGRI-199. No push authorized.
