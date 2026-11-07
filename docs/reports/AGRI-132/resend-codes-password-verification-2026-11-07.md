# AGRI-132 resend codes and profile password verification — 2026-11-07

## Changes

- Added resend APIs for login 2FA, setup/disable 2FA and password-change verification.
- Added 60-second expiry and countdown/resend controls to every code-entry UI.
- Profile password changes now require an email challenge before the password update is accepted.

## Verification

- `dotnet build backend/AgriVision.sln --no-restore`: passed, 0 warnings and 0 errors.
- `dotnet test backend/tests/AgriVision.UnitTests/AgriVision.UnitTests.csproj --no-build`: 182 passed.
- Changed frontend files: Biome format and lint passed.
- Docker/API integration and frontend runtime checks remain blocked by local Docker daemon access and the older local Node runtime.
