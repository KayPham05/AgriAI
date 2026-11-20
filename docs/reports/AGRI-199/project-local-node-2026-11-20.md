# AGRI-199 — Project-local Node 24

## Change

On 2026-11-20 the user required Node24 only for this mobile project, preserving the existing runtime used by other projects. Work remains on `AGRI-199-initial-mobile-app`.

[reactNative/pnpm.ps1](../../../reactNative/pnpm.ps1) downloads the official Windows x64 Node24.22.3 archive, verifies its SHA256 against the release manifest, and installs pnpm10.34.5 locally. Versions come from `.nvmrc` and `packageManager`. Runtime binaries, npm download cache and package-manager installation live under ignored `reactNative/.tools/`.

The launcher temporarily prepends its Node directory to process PATH and points npm cache at the project. It runs the requested pnpm command from reactNative, preserves the child exit code and restores PATH/cache/cwd in finally. It does not run global installs, corepack enable, nvm use, or change shell profiles or User/Machine PATH. Root/frontend packages were not changed. Mobile engines now specify24.x; ESLint excludes portable tools. README, development instructions and mobile AGENTS now require the launcher for Windows mobile commands.

## Actual verification

[LocalRuntime.Tests.ps1](../../../reactNative/tests/tooling/LocalRuntime.Tests.ps1) was written first and failed because the launcher did not exist. After implementation it passed using real child processes. It checks invocation from outside the mobile folder, the exact pinned Node, modern local npm, propagation of exit7, and restoration of process PATH/npm-cache/cwd plus unchanged default Node/npm and User/Machine PATH.

Executed on 2026-11-20 from the current worktree:

| Command | Result |
|---|---|
| `reactNative/tests/tooling/LocalRuntime.Tests.ps1` | Pass; isolation and exit-code checks |
| `reactNative/pnpm.ps1 install --frozen-lockfile` | Exit0, lockfile up to date; pnpm10.34.5 |
| `reactNative/pnpm.ps1 run typecheck` | Exit0 |
| `reactNative/pnpm.ps1 run lint` | Exit0, max-warnings0 |
| `reactNative/pnpm.ps1 exec expo install --check` | Exit0, dependencies up to date |
| `reactNative/pnpm.ps1 dlx expo-doctor` | Exit0,20/20 checks passed with local npm; no npm11 injection needed |
| `reactNative/pnpm.ps1 exec expo export --platform all --output-dir dist/local-runtime-verification` | Exit0; Android and iOS bundles emitted to ignored output |
| Default `node --version` / `npm --version` | Remain v14.21.3 /6.14.18 |
| Launcher `exec node --version` / `exec npm --version` | v24.22.3 /11.19.1 |
| `git check-ignore reactNative/.tools/node-v24.22.3-win-x64/node.exe` | Runtime excluded from Git |
| `git diff --check` | Pass |

No mobile product code or dependency versions were changed. No device/API/model/coverage acceptance, global runtime upgrade, commit or push. The launcher currently targets64-bit Windows; native iOS build still needs a Mac toolchain. First bootstrap needs network access; later runs reuse the downloaded runtime.
