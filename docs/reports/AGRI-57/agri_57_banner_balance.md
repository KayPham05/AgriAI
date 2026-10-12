# AGRI-57 - Cân đối banner với khung điều hướng

- Ngày 2026-10-10; nhánh xác minh `AGRI-57-frontend-summary`.
- User duyệt thiết kế banner có lề hai bên theo menu, ảnh hòa nhẹ vào nền thay vì khung ảnh cứng. Đây là cập nhật bố cục, không phải redesign toàn trang.

## Thay đổi

- `frontend/src/components/common/BotanicalBanner.tsx`: desktop stage căn giữa max-w-7xl, outer gutter px-12 như navigation; cập nhật Next image sizes. Giữ copy, Button, alt, 13 ảnh thật, active/next và toàn bộ logic GSAP.
- `frontend/src/index.css`: ảnh chiếm 60% stage; chiều cao `clamp(28rem,32vw,32rem)` phù hợp khung inset. Alpha mask chỉ hòa hai mép bên, opaque từ 24% tới 92%. Không thêm bo góc, border, bóng, blur hay lớp phủ toàn ảnh. Dưới 1024px giữ ảnh full-width 3:2 phía dưới chữ. Crossfade 1.2s và các motion token khác không đổi.
- `DESIGN.md`: ghi override đã được user duyệt, giữ lịch sử các iteration trước. Taste/React hướng dẫn triển khai, coding-standards giữ thay đổi nhỏ, Impeccable chỉ kiểm tra. Không đổi map/logo/phim/source JPEG/routes/auth/API/dependencies và không sửa WIP ngoài scope.

## Kiểm chứng mới trong lượt này

- Browser RED trước code: ở 1920px navigation có lề trái/phải 320px nhưng media có lề phải 0px; assertion lề cân đối thất bại đúng lỗi.
- Browser GREEN production Chromium, API/session fixtures: 5/5 viewport 1920/1280/1024/768/375 PASS. Desktop media right gutter bằng navigation left/right gutter: 320px tại1920, 48px tại1280/1024. Không overflow. Mobile giữ ảnh full-width theo thiết kế đã duyệt, không áp assertion gutter desktop. Script local ignored `tmp/ui-review/banner_balance_check.py`; screenshots `banner-balanced-*.png`. Đã xem screenshot desktop1280 và mobile375 trong một batch; không có vòng polish bổ sung.
- Kiểm tra hồi quy `tmp/ui-review/banner_consistent_frame_check.py`: 5/5 ca1920/1280 normal,768/375 reduced và375 normal PASS. Hai scene giữ chung bounds; 1920 là768x512, 1280 là710x448,375 là375x250. Blend opacity10%-90% tại1920/1280/375 là711/718.2/717ms; reduced giữ ảnh tĩnh, không overflow/page error. Không suy ra FPS từ phép đo này.
- Fresh full Vitest rerun PASS 115/115 tests,21/21 files,17.63s. Lượt đầu chạy cùng build có19 files/105 tests pass nhưng2 lỗi timeout khởi tạo forks worker ở LoginModal/CropMap, exit1; không coi lượt đó là pass. Không thay test/config để che lỗi; rerun sau build hoàn tất mới pass.
- Production build PASS,10/10 static pages và2 dynamic routes; restore hai Next dev type imports như trước build, rồi `corepack pnpm typecheck` PASS.
- Scoped Biome check component PASS; format component/CSS PASS. Impeccable detector hai target trả `[]`; Git diff whitespace hai tracked source PASS với notice LF/CRLF. Không claim lint toàn repo.

## Giới hạn và bàn giao

- Chỉ QA Chromium với dữ liệu thử; không phải backend/model E2E. Chưa nghiệm thu visually cả13 scene, browser/device thật, screen reader, FPS, Lighthouse, coverage hoặc GitHub Actions. Ảnh nguồn nhỏ/licensing và thiếu manual pause theo user override vẫn là giới hạn trước đó.
- Cover vẫn có thể cắt rìa theo focal/aspect; không stretch hoặc ghi đè ảnh gốc. Giữ warm-canvas/Manrope/forest-green, không mở rộng scope sửa UI khác.
- Không rebuild/restart Docker của user, migration, volume changes, stage/commit/push/PR/Jira/stash. Server kiểm thử riêng3100 được dừng khi bàn giao.
