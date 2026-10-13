# AGRI-57 — Cụm cây neo góc và bông lúa

Ngày: 2026-10-10. Nhánh xác minh: `AGRI-57-frontend-summary`.

## Phạm vi và thay đổi

User không chấp nhận ba cụm cây nhỏ bay riêng của lượt trước và yêu cầu phục hồi kiểu chuyển động cũ, gồm thân/bông lúa. Đối chiếu HomePage/CSS trong Git HEAD: cụm cây lớn ở góc phải dưới đung đưa quanh gốc; chỉ cảnh lúa có lá nhỏ trôi. Lượt này thay treatment decoration của mục 50, không phục hồi toàn bộ giao diện cũ.

- Khôi phục thêm `rice-stalk-cutout.png` từ Git HEAD vào `frontend/src/assets/banner-leaves/`, tổng cộng 14 PNG trang trí. Hash bản sao và blob nguồn đều là `f2f6cffdaab49a14a9ca13e9b2f3134868f60cb0`. Không phục hồi đường dẫn public đã xóa hoặc ảnh nền crop AI. Script binary-copy dùng process-only execution-policy override, không đổi policy lâu dài, index hoặc lịch sử Git.
- `frontend/src/data/bannerLeaves.ts`: registry `BANNER_FOLIAGE` chứa một cụm cây tương ứng mỗi cảnh; rice dùng stalk. `RICE_LEAF` chỉ dùng cho decoration nhỏ của lúa. Registry không thay ảnh thật dùng chung.
- `frontend/src/components/common/BotanicalBanner.tsx`: đúng một cụm cây lớn mỗi cảnh, khung cố định 4:3 với Next Image fill/object-contain. Khung neo góc phải dưới; GSAP chỉ xoay quanh gốc, không tween x/y cho cụm cây. Chỉ lúa có ba lá nhỏ, hai dưới 768px. Decoration aria-hidden, alt rỗng, không nhận pointer.
- `frontend/src/index.css`, `DESIGN.md`: token chiều rộng min(90%,36rem), right -1.5%, bottom -13%, pivot 94%/95%; xoay -2.5 đến 3 độ trong 7s, sine/yoyo. Lá lúa nhỏ rộng 90/64/70px, opacity .72/.55/.65; drift 20px/5 độ trong 13s. Không thêm bóng, glow, haze hoặc scanner cũ.
- Giữ khung cân đối với menu, 13 ảnh nền thật/thứ tự/focal, crossfade 1.2s, zoom nền, next-image readiness, pause khi tab ẩn/offscreen, reduced-motion và scoped cleanup. Decoration tải lỗi được ẩn riêng, không chặn slideshow; ảnh nền lỗi vẫn giữ cảnh. Không đổi copy/Button/map/logo/phim/auth/routes/API/dependencies hoặc WIP khác.
- `BotanicalBanner.test.tsx`: kiểm tra đúng một cụm cây không dịch x/y, stalk lúa, chỉ lúa có lá nhỏ, registry qua 13 cảnh, fallback/readiness/pause/reduced/cleanup. Coding-standards/Taste/React/GSAP hướng dẫn triển khai; Impeccable chỉ review theo giới hạn repo.

## Kiểm chứng mới

- TDD RED trước implementation: 9/23 tests fail, 14 pass; focused GREEN 23/23.
- Full suite đầu: 113/118 pass, 5 fail và 3 unhandled exceptions vì Vitest trả PNG path không có metadata kích thước mà Next Image cần. Sửa implementation sang khung 4:3 cố định và Image fill, không nới test. Final full `corepack pnpm exec vitest run --maxWorkers=2 --testTimeout=20000` PASS **118/118 tests, 21/21 files, 18.60s**.
- Typecheck chạy đồng thời lượt test đầu gặp TS6053 ở file Probe tạm do lint-rules test tạo/xóa. Chạy tuần tự sau tests PASS; không sửa config/test probe. Build trước sửa Image đã được chủ động dừng, không tính là evidence thành công. Final `corepack pnpm build` PASS 10/10 static pages và 2 dynamic routes. Khôi phục Next dev type imports về trạng thái trước build; typecheck sau build PASS.
- Scoped Biome check ba TS/TSX files, format CSS PASS; detector ba targets trả `[]`. Scoped whitespace check PASS với LF/CRLF notice. Không tuyên bố full-repo lint hoặc GitHub Actions pass.
- Production Chromium/API-session fixtures PASS **6/6**: 1920/1280/768/375 normal, 1280/375 reduced. Kiểm tra stalk/cụm cây load, một foliage mỗi cảnh, số lá lúa đúng breakpoint, chuyển động quanh pivot, reduced-motion tĩnh, accessibility, không overflow/page error; desktop media right edge khớp menu. Lúa chuyển sang cà chua có một cụm cây và không còn lá nhỏ; offscreen pause PASS.
- Browser script đầu dùng viewport bounding box làm assertion neo, thất bại ở 1280 sau khi 1920 pass. Đổi phép đo sang offset vị trí/kích thước trong chính media frame để kiểm tra đúng hợp đồng neo; chạy lại toàn bộ sáu ca PASS. Không sửa UI để đáp ứng assertion này và không kết luận nguyên nhân dịch viewport chưa đo được.
- Xem screenshots 1920 lúa, 1280 cà chua và 375 lúa trong batch inspection. Scripts/screenshots nằm trong ignored `tmp/ui-review/`; server riêng port 3100 đã dừng. Warning next start/standalone có sẵn, không thay deployment.

## Giới hạn và việc chưa chạy

Artwork decoration là generated asset cũ được user yêu cầu phục hồi, không phải ảnh thật hay bằng chứng bệnh. 13 JPEG nền/catalog/map info vẫn giữ nguyên. Chưa xác minh licensing/provenance/botanical accuracy; không tạo ảnh AI mới.

Unit loop 13 cảnh không thay kiểm tra trực quan đủ 13 cảnh. Chưa kiểm FPS, device thật, screen reader, Safari/Firefox, coverage, Lighthouse, CI hoặc backend/model E2E. Manual pause vẫn bị bỏ theo user override trước đó. Không Docker rebuild/restart, migration/volume changes, stage/commit/push/PR/Jira/stash; giữ unrelated worktree. Kết quả local không xác nhận toàn bộ Definition of Done.

## Follow-up: thu nhỏ riêng cụm ngô ngày 2026-10-10

User yêu cầu lá ngô nhỏ hơn vì che người. `BotanicalBanner.tsx` gắn modifier riêng cho corn; `index.css` dùng token `--banner-corn-foliage-width: min(63%, 25.2rem)`, bằng 70% chiều rộng cũ. Giữ right/bottom/pivot/aspect và toàn bộ motion, ảnh nền/crop khác unchanged. DESIGN ghi ngoại lệ. Không đổi hoặc tạo asset, dependency, map/phim/auth/API.

Regression loop 13 cảnh kiểm tra modifier chỉ áp dụng corn: RED 1/23 fail trước implementation, 22 pass. Fresh full Vitest sau implementation PASS118/118 tests/21 files,19.30s. Scoped Biome check2 files/format CSS và typecheck PASS. Ban đầu giảm20%, build10/10 PASS và Chromium375/768/1280 đo đúng80%/không overflow/page errors; xem desktop/mobile thấy một lá còn chạm mặt nên batch correction giảm30%. Full unit run nêu trên trước batch cuối chỉ đổi token CSS.

Final build PASS10/10 static/two dynamic routes; restore dev type imports rồi typecheck và CSS format PASS. Final Chromium375/768/1280 PASS3/3: frame width236.25/403.1875/403.1875px, tỷ lệ70% so với khung cũ, ảnh load và không overflow/page error. Xem desktop/mobile confirmation, mặt người thoáng hơn; không cam kết toàn thân không có decoration hoặc mọi pha sway không chồng hình. Script/screenshots ignored `tmp/ui-review/banner_corn_size_check.py` và `banner-corn-smaller-*.png`. Server3100 riêng dừng sau QA; standalone warning cũ không sửa deployment. Không Docker rebuild/CI/coverage/Lighthouse/backend/model E2E/commit/push; giới hạn của báo cáo vẫn áp dụng.
