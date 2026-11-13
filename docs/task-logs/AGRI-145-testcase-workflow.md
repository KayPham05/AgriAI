# AGRI-145 - testcase workflow

- **Owner:**
- **Completion date:** 2026-11-13
- **Branch:** AGRI-145-testcase-design-demo
- **Pull request:** https://github.com/KayPham05/AgriAI/pull/new/AGRI-145-testcase-design-demo

## 1. Completed Work

Implemented the shared testcase registry, three-kind routing, Service Account Sheets client, dashboard-safe summary updates, run-level evidence, redaction, and protected GitHub Actions sync job.

## 2. Main Changes

- Added `google-auth` dependency and Base64 Service Account handling.
- Preserved summary/template/legacy tabs and duplicated templates for missing detail tabs.
- Added atomic ignored local state and explicit dry-run/write gates.
- Added API health and guest prediction live probes.

## 3. Results and Verification

See [AGRI-145 technical report](../reports/AGRI-145/README.md). Local API suite reported 294 passed; health and guest probes returned HTTP 200.

## 4. Issues or Blockers

Live Service Account sync was not run locally because the sandbox could not install `google-auth`; CI must install the pinned dependency and the Service Account must be Editor on all three spreadsheets.

## 5. Remaining Work or Follow-up

Run-level API/Playwright evidence is intentionally kept as `RUN-*`; explicit health, guest, .NET filter and Vitest selector adapters update individual cases. Add native TRX/Playwright artifact parsers and a viewpoint runner when those result contracts are agreed, then run the protected Sheets sync on the target branch.
