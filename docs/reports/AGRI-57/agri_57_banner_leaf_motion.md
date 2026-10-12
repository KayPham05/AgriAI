# AGRI-57 - Khôi phục lớp lá chuyển động trong banner

- Ngày 2026-10-10. Nhánh xác minh `AGRI-57-frontend-summary`.
- User muốn dùng lại các ảnh lá chuyển động trước đây và lưu trong src/assets. Phạm vi được hiểu và thông báo trước khi làm: chỉ khôi phục artwork trang trí cũ; ảnh nền banner/catalog/map info vẫn dùng ảnh thật. Không tạo ảnh AI mới.

## Thay đổi và nguồn asset

- `frontend/src/assets/banner-leaves/`: khôi phục 13 PNG cutout từ các Git blob tại HEAD của `frontend/public/images/`. Không khôi phục các đường dẫn public cũ, rice-stalk hay ảnh crop AI đã xóa. Kiểm tra Git hash-object so với rev-parse HEAD: 13/13 bản sao khớp byte. Không reset/checkout, thay index hoặc lịch sử Git.
- Artwork này là lớp trang trí generated cũ, không phải ảnh lá thật hay bằng chứng bệnh; một số cutout có cả cành/quả. Không tái sử dụng trong ảnh tham chiếu tình trạng lá. Giữ nguyên 13 JPEG thật, logo/map/film và các asset khác.
- `frontend/src/data/bannerLeaves.ts`: registry import tĩnh riêng chỉ được component banner sử dụng; không ghép vào registry ảnh thật dùng chung cho danh mục/phim.
- `frontend/src/components/common/BotanicalBanner.tsx`: ba lớp trang trí trong media, hai dưới768px; aria-hidden/alt rỗng/pointer-events-none. GSAP chỉ animate active scene, x/y/rotation20px/5 độ/6s, sine.inOut yoyo. Giữ crop/photo/order/zoom, bounds và crossfade1.2s. Leaf/photo cùng scene nên chuyển cảnh đồng bộ, không dùng React state mỗi frame.
- Incoming scene chờ tải ảnh; nếu leaf lỗi thì ẩn riêng decoration và vẫn cho ảnh thật chuyển. Nếu photo lỗi vẫn giữ scene đang hoạt động. Load/error listeners và tweens theo scoped cleanup; shared visibility/offscreen pause và reduced-motion vẫn áp dụng.
- `frontend/src/index.css`, `DESIGN.md`: thêm token vị trí/kích thước/drift và ghi ngoại lệ hẹp với removal trước đó. Không thêm shadow/blur/border, thay copy/Button/navigation/API/dependencies hay WIP khác.

## Kiểm chứng mới

- TDD RED component trước implementation: 8/22 tests fail do chưa render/animate lá;14 pass. GREEN đầu có21/22 pass, một lỗi fixture spy getter tác động mọi ảnh; đổi fixture một leaf sang own-property getter, không che lỗi bằng sửa expectation. Bổ sung assertion loop13 cảnh dùng đúng PNG tương ứng.
- Final full Vitest PASS117/117 tests,21/21 files,17.55s. Focused banner PASS22/22. Các test bao gồm decoration/accessibility, mobile limit,13-scene loop, next-image readiness, failed leaf/photo, reduced-motion, tab/offscreen pause, timer/listener cleanup.
- Production build PASS10/10 static pages,2 dynamic routes; restore Next dev type imports về trạng thái trước build rồi typecheck PASS. Scoped Biome check3 TS/TSX files và format CSS PASS; detector3 targets trả `[]`. Không claim full-repo lint hoặc CI.
- Browser production Chromium với API/session fixtures PASS6/6 ca:1920/1280/768/375 normal và1280/375 reduced. Các PNG load bằng Next optimization, decoration hidden khỏi accessibility tree,3/2 leaf visible đúng breakpoint, transform thay đổi ở normal và đứng yên ở reduced, không overflow/page error, desktop media right edge vẫn khớp menu. Lúa→cà chua đổi cả photo và artwork; offscreen pause đã quan sát.
- Lượt browser đầu có lỗi test offscreen: viewport900px không thể scroll đủ để banner biến mất nên assertion pause thất bại. Rerun giảm viewport thử xuống500px và xác nhận banner bottom<0 trước assertion; PASS. Không sửa production để chiều test. Xem screenshots desktop1920/1280 và mobile768/375 trong batch inspection; không polish thêm.
- Script/evidence generated trong ignored `tmp/ui-review/restore_banner_leaves.ps1`, `banner_leaf_motion_check.py`, `banner-leaves-*.png`. PowerShell script ban đầu bị execution policy chặn; chạy process-only Bypass sau escalation, không đổi policy lâu dài. Server3100 riêng đã dừng; warning next start/standalone có sẵn, không sửa deployment.

## Giới hạn

- Không kiểm chứng botanical accuracy/licensing của artwork cũ hoặc nguồn JPEG. Không tuyên bố các PNG là ảnh thật; animation không xác thực inference.
- Chỉ trực quan hai cảnh đầu, unit loop13 không thay nghiệm thu từng hình. Chưa FPS/60fps, Lighthouse, coverage, Safari/Firefox, device thật, screen reader, CI hoặc backend/model E2E. Manual pause vẫn bị bỏ theo user override trước đó.
- Không Docker rebuild/restart, migration, volume changes, stage/commit/push/PR/Jira/stash. Giữ unrelated dirty worktree.
