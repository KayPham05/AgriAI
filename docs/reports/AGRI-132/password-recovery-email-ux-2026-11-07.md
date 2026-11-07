# AGRI-132 password recovery and security email UX — 2026-11-07

## Changes

- Password reset codes are generated and validated as eight decimal digits.
- `POST /api/auth/reset-password/verify` validates a live code without consuming it; reset still consumes the code atomically.
- Recovery UI progresses through email, code, new password plus confirmation, and success states.
- Reset, two-factor code, two-factor enable-success and password-change emails use the AgriAI HTML template.

## Verification

- `dotnet build backend/AgriVision.sln --no-restore`: passed, 0 warnings and 0 errors.
- `git diff --check`: passed.
- API Testcontainers tests: blocked because Docker daemon access was unavailable.
- `docker compose build backend frontend`: blocked before build by local Docker credential/daemon access.
- Frontend typecheck/tests: local Node runtime is older than the required Node 24 runtime; Docker build could not be started to use the pinned runtime.
