# AGRI-57 - Bóng nổi bản đồ ngày 2026-10-09

Nhánh xác minh: `AGRI-57-frontend-summary`. Phạm vi: tăng độ nổi của bản đồ theo ảnh/yêu cầu người dùng, không thay bố cục, địa lý, ảnh, ghim hoặc chuyển động.

## Thay đổi

- `frontend/src/index.css`: bóng sát mép xanh 2/4/2px ở 28% primary-hover và bóng mềm xuống phải 6/12/10px ở 20% foreground. Hai token được dùng bởi `.crop-map-outline`, không đổ bóng hình chữ nhật quanh SVG, không áp dụng cho nút/nhãn/đảo/reef.
- `DESIGN.md`: ghi treatment và giá trị token. Giữ quy định đảo nhỏ không đổ bóng để đường bờ rõ; không mở rộng ngoại lệ sang hiệu ứng bay, glow hoặc đổi hình dáng.
- Taste chỉ đạo refinement giữ diện mạo/palette/dials5/3/5. React Best Practices giữ thay đổi CSS-only, không thêm state/render/dependency. Button, Badge, Card shadcn hiện có giữ nguyên. Impeccable chỉ đọc context/review/detect, không chỉnh UI.

## Kiểm chứng mới

- Browser regression `tmp/ui-review/crop_map_shadow_check.py` đỏ trước sửa: computed filter chỉ có một drop-shadow cũ2/5/3px. Sau sửa đủ bốn ca375/768/1280 normal và1280 reduced PASS: hai lớp bóng trên mainland, đảo không filter, đủ nhãn Hoàng Sa/Trường Sa/Côn Đảo, không overflow ngang/page error, mở/đóng thông tin và ghim chọn hoạt động. Đã xem screenshot mobile375 và desktop1280. Script/ảnh QA trong tmp bị Git ignore.
- Focused CropMap/IntroPage9/9 PASS; full `corepack pnpm exec vitest run --maxWorkers=2 --testTimeout=20000`:101/101 tests,18/18 files PASS.
- `corepack pnpm typecheck`: PASS; `corepack pnpm build`:PASS,3/3 static pages. Khôi phục Next dev imports sau build.
- Biome check lần đầu exit1 vì formatting/line endings, kèm11 warning cũ ở print !important. Sau `biome format --write src/index.css`, targeted check exit0 với11 warning cũ, không tự sửa ngoài scope.
- Impeccable read-only detector cho CSS: `[]`. `git diff --check` DESIGN/CSS:PASS trước handoff. Không stage/commit/push hay thay stash.

## Giới hạn

Không nghiệm thu lại toàn bộ website, backend/E2E/coverage/CI, thiết bị thật, screen reader hoặc FPS thiết bị yếu. Bóng là tĩnh; reduced-motion và interaction cũ giữ nguyên. Không bổ sung bóng đảo vì DESIGN.md hiện cấm treatment đó.

## Island-label background correction, 2026-10-12

- Verified branch AGRI-57-frontend-summary. User requested removal of contrasting label backgrounds. CropMapCanvas replaces bg-surface/bg-background with bg-transparent for all three island labels, preserving typography, color and geographic anchors. Visual review found Trường Sa text overlapping canopy after removal; extended existing standard -translate-y-12 details offset to hero labels. DESIGN records this label-only correction; map geometry, pins, sources, motion and unrelated WIP unchanged. Taste/React/coding-standards guided the small change; Impeccable review-only.
- Browser TDD before edit failed on computed background rgb(244,242,234) rather than transparent. Final production Chromium375/768/1280 reduced3/3 PASS: all labels computed rgba(0,0,0,0), no horizontal overflow. Viewed mobile/desktop batch, then one confirmation after Trường Sa offset: all labels readable without opaque blocks. Ignored script/screenshots in tmp/ui-review/map_label_background_check.py and map-labels-*.png.
- Final full Vitest157/157,24files PASS41.13s with maxWorkers1; initial concurrent build/test run had147passes and worker startup timeouts in CatalogPagination/LoginModal, not counted as success. Separate retry passed, then final post-offset rerun passed. Final build PASS38.7s compile,10static/two dynamic; restored Next dev imports then fresh tsc PASS. Scoped Biome1file exit0; first command from repo root could not resolve Biome, reran correctly in frontend. Whitespace exit0. Own QA3100 server stopped; existing standalone startup advisory unchanged.
- Not Docker rebuild, real backend/model E2E, CI, coverage, normal-motion/FPS measurement, screen-reader or physical-device certification. No staging/commit/push/migration/volume/asset deletion.
