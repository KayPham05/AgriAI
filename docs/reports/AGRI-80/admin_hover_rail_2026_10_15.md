# AGRI-80 - Hover/focus navigation expansion (2026-10-15)

User requested removal of the header toggle icon and automatic rail expansion on hover. Branch: AGRI-80-create-crm-admin-page. Implemented and deployed locally.

- Removed the desktop toggle Button and PanelLeft icon imports. Default72px icons remain usable; mouse/pen pointer entry expands to224px with text. Pointer exit compacts unless focus remains inside. Focus entry opens labels, internal focus moves retain them, and exit compacts once pointer also leaves. Touch pointer entry is ignored; existing mobile Sheet remains.
- useAdminRail coordinates pointer/focus refs and avoids same-state animation restarts. Captures the current background surface width for interrupted motion. Existing scoped transform/opacity, reduced-motion, data/view/filter preservation and detached20px gap retained. DESIGN.md updated; no token/dependency/backend/schema/palette change.
- Paths: frontend/src/features/admin/AdminCrmPage.tsx, useAdminRail.ts, AdminCrmPage.test.tsx; DESIGN.md; AGRI-80 report index/task log.

Fresh verification: two new hover/focus behavior tests RED first,16existing PASS; then18/18admin PASS5.53s. Full frontend186/18627files PASS54.17s; typecheck/lint159files/changed format3files/diff-check PASS. Production Docker frontend build/recreation PASS.

Live Chromium1280/1024/768/375 PASS: header toggle absent, pointer entry/exit224/72px, animated surface observed, focus preserves labels after pointer leaves, outside focus compacts,8rapid pointer cycles settle, navigation/filter retained, reduced-motion static, mobile Sheet navigation, no overflow/page errors. Desktop compact/hover screenshots visually reviewed. Ignored evidence: .cache/admin-verification/hover_rail_review.py and hover_rail_*.png. Harness only creates/ends its own admin session.

No backend tests/coverage/CI/physical-device/cross-browser certification rerun; earlier unrelated whole-project format findings not claimed fixed. No moderation mutation, migration, staging, commit or push.
