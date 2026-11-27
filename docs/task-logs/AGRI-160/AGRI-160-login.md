# AGRI-160 · Native login

2026-11-25 · `AGRI-160-mobile-login`

- Added Welcome → Login, using Figma F02 form components and the existing web interaction patterns.
- Connected email/password to `POST /api/auth/login`. User 200 saves the token in SecureStore. 202 exposes the OTP handoff without starting a session.
- Passed 20 unit tests, 12 component tests, one live API integration check, typecheck, lint and Android/iOS Hermes exports. Android emulator smoke passed with the live backend.
- Home integration awaits AGRI-158. OTP entry and verification belong to AGRI-163.
- Follow-up: matched the web form header and tabs, and added registration to this branch at the user's request. The fresh shared-form checks are in the [AGRI-161 report](../../reports/AGRI-161/README.md).
- Added native panel entry and tab motion with Reduce Motion support. The follow-up passed 16 component tests and both tab changes over Android USB.
- Connected successful authentication to protected Home and reused AGRI-158 startup restore in this worktree. Passed 18 component tests, 36 unit tests and live API validation including revoked-token cleanup.
- Android emulator passed login-to-Home, cold restore, Guest Home redirect and signed-in Login redirect.

[Technical report and test evidence](../../reports/AGRI-160/README.md)
