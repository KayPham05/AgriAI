# AGRI-163 · Login OTP

2026-11-26 · `AGRI-163-mobile-login-otp`

- Added the Figma F02 OTP input and wired real login verification and resend to protected Home.
- Kept the code and latest challenge in memory and guarded duplicate requests and cancellation.
- Passed 28 unit tests, 21 component tests, two backend OTP tests and live adapter integration with local SMTP/TLS.
- The initial Android emulator smoke was blocked because Expo Go stalled before rendering.
- 2026-11-27 follow-up: Physical Android over USB passed login, OTP receipt, resend, and verification into protected Home with a separate QA database and mailbox.
- Final local review passed 31 adapter tests, 21 component tests, typecheck, lint and Android/iOS exports. Expanded integration verified actual expiry, purpose isolation, resend and replay prevention.
- Project Gmail delivery, iOS runtime and GitHub Actions remain unverified.
- Added the user-requested web-style login CAPTCHA in this worktree. Passed 23 component tests, typecheck, lint and both platform exports.

[Technical report](../../reports/AGRI-163/README.md)

- 2026-11-27 follow-up: returned the physical Android to Login and confirmed CAPTCHA controls are visible using UIAutomator. Cleared the saved app session; restored the temporary provider override. Device CAPTCHA submission remains unverified.

- Replaced CAPTCHA refresh text with a reload icon; preserved its accessible label and action. Fresh: 23 component tests, typecheck and lint passed; icon visibility confirmed on physical Android.

- Added the requested persistent five-failure login lockout (5/10/20-minute doubling) and mobile wait message. Fresh: 233 backend unit, 296 API, 82 database integration, 33 mobile adapter and 24 component tests passed; mobile static checks and both exports passed. Backed up/migrated the project DB and verified a live temporary-account lockout. [Detailed evidence and limits](../../reports/AGRI-163/login_lockout.md).

- Added requested registration password confirmation and explicit terms consent, with existing web terms available inline. Fresh: 27 component tests, typecheck, lint and Android/iOS exports passed; Expo compatibility check reports existing version drift in 3 packages, left unchanged. No Android device connected for rendering checks. Details in the [report](../../reports/AGRI-163/README.md). User confirmed real Gmail OTP receipt.

- After USB reconnection, visually checked the new registration controls on physical Android and confirmed Create account is reachable by scrolling. Left Registration open for the user; no account created.

- Moved terms disclosure into the clickable terms text in the consent sentence; checkbox toggles separately. Fresh: 27 tests, typecheck, lint and both platform exports passed. Device disconnected during the follow-up; inline native interaction remains unverified.

- Required opening and reaching the end of terms before enabling consent; registration checks reading completion plus an explicit tick. Fresh default suite: 30 tests passed after resolving lazy native exports before timers; typecheck/lint passed. Device reading flow remains unverified because ADB disconnected. Details in the ongoing report.
- Android/iOS exports for the mandatory-reading flow also passed; outputs remain ignored.

- Pre-commit delivery: fresh 233 backend unit / 82 integration / 296 API, 33 login adapter / 13 startup adapter / 31 component tests passed. Backend branch gate: 79.95% >= 70%. Typecheck, lint, both exports, commitlint and secret scans passed. Fixed test-only concurrency hash cost; no production policy/dependency change. [Current evidence and remaining device/CI limits](../../reports/AGRI-163/precommit_verification.md). Two local commits planned; no push/merge.
