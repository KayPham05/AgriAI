# AGRI-164 local delivery verification

2026-11-28. Branch: `AGRI-164-mobile-forgot-password`. PR target: `AGRI-199-initial-mobile-app`.

The user authorized local commits and an English PR description, without a push. Scope includes AGRI-165/166 on this branch as previously requested. Two logical commits separate Expo compatibility from the complete mobile recovery flow; dependency commit: `f57a0d8`. Existing AGRI-163 dependency commits are retained.

## Fresh pre-commit checks

| Check | Actual result |
| --- | --- |
| Mobile typecheck and lint | Passed |
| Expo dependency check and frozen/offline install | Passed |
| Combined login/OTP/startup/recovery Node tests | 58 passed, zero failed/skipped |
| Auth/session adapter branch coverage | 86.47% / 87.76% |
| Full native component suite | 42 passed in 8 suites, zero failures |
| Request/recovery-step branch coverage | 89.79% / 84.21% |
| Whole Jest branch coverage | 71.69%; separate Node coverage is not merged |
| Real API/PostgreSQL/STARTTLS recovery regression | 1 passed, zero failed/skipped, with fresh disposable fixtures |
| Android and iOS Hermes exports | Passed; ignored `reactNative/dist/agri164-precommit` |
| Proposed commit messages | Both passed commitlint with zero warnings |
| CI commit-range lint regression | 1 passed |
| Gitleaks v8.24.2 candidate scan | No leaks |
| Gitleaks v8.24.2 full-history scan | No leaks; final mirror scan covered 253 commits across all available refs with the existing ignore file |

Integration uses only disposable databases and a controlled SMTP inbox. It verifies password replacement, single-use codes, revoked old sessions and explicit new-password login. No project migration, real-user password reset or external mailbox operation was performed by these tests. The final history scan used a mirror clone to retain remote refs; the preliminary bare-clone scan covered only 229 commits and is superseded by that result. Raw scanner/bundle evidence remains ignored under `.cache/agri164-precommit/`; test fixture output remains ignored under `reactNative/dist/recovery-qa/`.

The fresh frozen/offline install and Expo dependency check passed after aligning Expo 58.1.0, Expo Router 58.0.33 and Jest Expo 58.0.16. Android request/code screens were checked at font 1.3 and 2.0 and the original 1.0 setting restored; the user separately confirmed the normal-font full flow. These are earlier acceptance records, not new device checks for this commit request. Earlier failures and fixes remain in the [ongoing report](README.md).

## Limits

- GitHub Actions has not run for these local commits. Existing CI has no mobile job; mobile checks ran locally. Unchanged backend/web/Python suites and Compose/checkpoint smoke were not rerun for this mobile-only delivery.
- Actual iOS runtime, spoken TalkBack/VoiceOver and large-font new-password entry remain unrun.
- No push, PR creation, merge or self-approval is included. UI review remains required under the repository ownership rules.
