# AgriVision React Native

- Mobile base branch: `AGRI-199-initial-mobile-app`. Create future mobile task branches from this branch, not main: `git switch -c AGRI-XXX-mobile-description AGRI-199-initial-mobile-app`, using the actual Jira key.
- Target mobile integration PRs here unless the user directs otherwise. Do not change/merge main for routine mobile work. Preserve dirty changes; no auto-commit/push/stash.
- All mobile source, assets, dependencies, config, tests and developer docs belong in `reactNative/`. Mandatory Jira reports/task logs remain in root docs/reports and docs/task-logs per repository rules.
- Expo + React Native + TypeScript; pnpm with this folder's lockfile. Run mobile commands here, never frontend/root installs for mobile packages.
- src/app contains Expo Router routes/layouts only. Screens/domain code in src/features; shared native UI in src/components; transports in src/lib; native token definitions in src/theme/tokens.ts.
- Inherit root DESIGN.md brand, using native layout/a11y. No DOM/shadcn/CSS/next/font. System font is the scaffold fallback; bundle Manrope after license/glyph checks.
- Scope: Guest/User only, one image per diagnosis, replacing the prior selected image. No mobile admin, multi-image diagnosis, fake API success or on-device model inference.
- Preserve backend contracts. Auth/API/camera/secure storage/history/notifications are not implemented by this scaffold.
- Tests belong in tests/{unit,component,integration,e2e}. Follow root TESTING.md; no claims of runner/coverage/native acceptance before configuration and execution.
- Before handoff run typecheck, lint, Expo dependency check and relevant bundle/native verification; record actual evidence under the verified Jira key.

- Windows mobile commands must use `reactNative/pnpm.ps1` (or `./pnpm.ps1` from this folder). It bootstraps portable Node24 and pnpm in ignored .tools and restores process PATH/cache afterward. Do not use nvm use, corepack enable, global installs, user/machine PATH or shell-profile edits to configure mobile runtime; other projects must retain their existing Node.
