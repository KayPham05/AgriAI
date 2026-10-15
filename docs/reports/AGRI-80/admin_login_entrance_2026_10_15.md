# AGRI-80 - Restore Admin login success entrance (2026-10-15)

Branch: AGRI-80-create-crm-admin-page. User reported the Admin success animation was missing. Root cause: AppProvider's role shortcut called router.replace('/admin') as soon as a pending Admin session existed, bypassing the existing entrance-completion gate.

## Fix

The startup-data effect still skips catalog/history for Admin at /. A separate effect redirects that Admin only after LoginSuccessScreen reports entranceReady. The existing scoped GSAP logo/brand/account greeting is reused; no timeout, new animation, dependency or token. Applies to fresh login and restored Admin sessions at /; direct admin route auth remains separate. User startup/return routes/error retry unchanged. Reduced-motion retains immediate completion.

Paths: frontend/src/providers/AppProvider.tsx; frontend/src/App.adminEntrance.test.tsx; DESIGN.md; report index/task log.

## Fresh evidence

- Two controllable-entrance tests initially RED: fresh/restored Admin redirected before completion. After fix both pass, explicitly proving no user catalog/disease/history calls and redirect only after the completion callback.
- Selected entrance/startup/screen tests11/11 PASS13.58s. Full frontend188/18828files PASS66.49s. Typecheck/lint160files PASS; changed format2files and diff-check PASS. Existing unrelated whole-project format findings not claimed fixed.
- Docker frontend production build and local recreation PASS.
- Live Chromium fresh real web login at1280: CAPTCHA/password authentication succeeds, brand/greeting visibly renders at /, then /admin loads. Restored session at375 follows the same sequence. Reduced-motion768 completes and enters admin without waiting for motion. No page errors.
- Ignored evidence: .cache/admin-verification/admin_entrance_review.py and admin_entrance_{1280,375}.png. Desktop greeting capture viewed. Secret read only in process memory; harness creates/ends its own login session, no account/moderation mutation.

No backend/schema/model/storage change or new backend/coverage/CI/physical-device/cross-browser acceptance. No staging, commit or push.
