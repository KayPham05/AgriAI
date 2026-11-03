# AGRI-57 - Shared public authentication media

Date: 2026-10-31. Branch: AGRI-57-frontend-summary.
Status: user uploaded both public objects; live HTTP delivery and browser playback verified. Code remains uncommitted.

## Scope

User approved optimizing the original login background video and using a shared public storage URL instead of committing the 76 MB source. User created the separate agriai-public-assets bucket and supplied https://pub-5b7b85dc2aa84f1ca62aa18308983f37.r2.dev. No private-image bucket, R2 credentials, API or DB configuration was changed. No credentials were requested or exposed.

## Source changes

- frontend/src/components/modals/AuthPanelVideo.tsx uses /auth/field-v1.mp4 and /auth/field-poster-v1.webp on the supplied public host. Direct unoptimized poster delivery avoids routing public assets through the Next image optimizer or requiring a broad remote image allowlist.
- Preserve muted/loop/playsInline, desktop/reduced-motion gating, visibility pause/cleanup and a shared video across auth modes. Video errors retain the poster; poster errors remove the broken image and retain the existing green surface.
- frontend/tests/component/modals/LoginModal.test.tsx checks the public URLs, same DOM video across modes and video/poster fallback. Existing reduced-motion/mobile and auth validations remain.
- frontend/tests/browser/auth/auth_panel_video.py now expects the public 720p video and checks direct Range delivery; AUTH_APP_URL optionally selects a local app URL. This live delivery check was updated but not run because public objects are missing.
- frontend/README.md documents shared media provisioning and the development-only r2.dev endpoint. Use a custom domain for production rather than treating r2.dev as a production CDN.

## Prepared media

Original retained unchanged at ignored frontend/public/media/auth/field-original.mp4 (75923556 bytes). FFmpeg was installed from PyPI imageio-ffmpeg 0.7.0 into ignored local .cache/media-tools only; no package or lockfile change.

Generated ignored upload files:

- .cache/auth-public-assets/auth/field-v1.mp4: 8845615 bytes, H.264/yuv420p, 1280x720, 30 fps, 24.666667 seconds, no audio, MP4 fast-start. Approximately 88.3% smaller than the source.
- .cache/auth-public-assets/auth/field-poster-v1.webp: 239408 bytes, copied from the existing poster.
- Video SHA-256: 97226a610a34518fd462a5839c51c3a298e8f3b60bc2a4b4a9bb3fa47a1ce0a4.

Encode: FFmpeg scale=1280:-2:flags=lanczos,fps=30; libx264 medium/CRF24; remove audio and metadata; +faststart. Generated media and tool binaries remain ignored and must not be staged. Upload only the two files inside auth/ to the same prefix in the new public bucket. Local instructions: .cache/auth-public-assets/UPLOAD.txt.

## Actual verification

- Frozen dependency installation passed, aligning local Next with the incoming main lockfile at 16.4.1; manifests/lockfile unchanged.
- Initial test attempt was blocked by missing next/image while local dependencies were being synchronized; not counted as a behavioral RED.
- Verified behavioral regression against the original component: 1 failed / 5 passed, expected public URL but received local original source. Restored the new source afterward.
- Final relevant Vitest: 13/13 passed in 3 files, 5.87 seconds (LoginModal, auth timing and logout).
- Scoped Biome check: 2 files passed. git diff --check passed.
- Production Next 16.4.1 build and subsequent tsc --noEmit passed. Built client chunk contains the supplied public host.
- Entire encoded video decoded without errors in FFmpeg; metadata precedes MP4 payload (fast-start). Sample frame inspected.
- Chromium local-file playback passed: 1280x720, 24.666667 seconds, muted; 1.210194 seconds advanced with 36 frames and 0 dropped frames in a 1.2-second sample. This is a bounded local sample, not a universal performance guarantee or live CDN acceptance.
- Public HEAD requests with a browser User-Agent returned 404 for both required objects. Default Python User-Agent received Cloudflare 1010/403, so object existence was checked using a browser User-Agent instead. Evidence: ignored .cache/auth-public-assets/remote-status.json.

## Initial provisioning state (before user upload)

No Cloudflare browser tab or authenticated storage connector is exposed to this session. Public URL grants reads only. User must upload auth/field-v1.mp4 and auth/field-poster-v1.webp through the dashboard, then verify video/mp4 and image/webp content types and rerun the browser delivery check. Until then new clients fall back to the green panel; the shared video is not live yet.

No new full-suite/coverage/backend/Python/CI claim, no production deployment or changes to bucket access, no commit/push. Preserve existing unrelated main-sync documentation and generated dev declarations.


## Follow-up: user upload and live delivery verification

User uploaded both files to the auth/ prefix in agriai-public-assets and supplied the dashboard screenshot. Fresh public HTTP checks now return:

- field-v1.mp4: 200, video/mp4, 8845615 bytes.
- field-poster-v1.webp: 200, image/webp, 239408 bytes.
- Video Range bytes=0-1023: 206, exactly 1024 bytes, Content-Range bytes 0-1023/8845615.

Ran the updated auth_panel_video.py against an isolated local production frontend on 127.0.0.1:3107 with real R2 media (only application API requests mocked). Passed public 720p playback, muted/loop/inline, shared video node across login/register, visibility pause/resume, unmount and desktop/mobile/reduced-motion checks at 1280/768/375/320px. The one-second live playback sample advanced 1.001647 seconds with 30 frames and zero dropped frames. Inspected fresh 1280px registration and 320px login screenshots. This is UI-media acceptance with mocked auth, not a real login/backend E2E test.

Evidence: .cache/auth-public-assets/remote-status.json, live-browser.log, .cache/auth-video/public-playback.json and fresh screenshots. Temporary local QA server stopped; existing service on port 3000 unchanged. No Cloudflare settings, private storage, credentials, database, dependency manifest or lockfile changes. No commit/push/container deployment. The development public URL is ready for teammates once the code change is shared; production custom-domain configuration remains separate.


## Requested local commit preflight

User authorized commit only, no push. Read project Git rules and git-commit skill; split previously pending main-sync documentation from the auth R2 change. Fresh relevant tests: 13/13 in 3 files, 39.40 seconds; scoped Biome 2 files and tsc --noEmit passed. Earlier production build and real-R2 browser evidence above apply to the same unchanged source and were not rerun in this commit-only turn. Existing local generated next-env.d.ts, original/encoded media, tool packages, cache, secrets and dependency manifests/lockfiles remain excluded. Staged paths and whitespace checked before each commit. Actual hashes are confirmed at handoff; no push, amendment, hook bypass, container deployment or private storage changes.
