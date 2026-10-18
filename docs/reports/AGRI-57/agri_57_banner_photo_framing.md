# AGRI-57 - Hiển thị đầy đủ ảnh banner

- Ngày: 2026-10-10.
- Nhánh xác minh: `AGRI-57-frontend-summary`.
- Yêu cầu: giảm phóng/cắt ảnh và phần ảnh bị lớp nền sáng che trong banner trang chủ. Giữ ảnh thật, nội dung, điều hướng và chuyển động hiện có.

## Thay đổi

- `frontend/src/components/common/BotanicalBanner.tsx`: desktop từ 1024px đặt ảnh trong nửa phải, chữ/nút ở nửa trái; dưới breakpoint giữ chữ trên ảnh. Next Image dùng `object-contain`, căn giữa và `sizes` đúng vùng hiển thị thay vì phủ kín toàn banner. Bỏ lớp phủ sáng vì chữ không còn nằm trên ảnh.
- `frontend/src/index.css`: thay token scrim bằng `--banner-photo-inset: 2%`, chừa mép cho zoom 1.03. Không đổi chiều cao tối thiểu, chu kỳ 6.5s, fade 0.65s hoặc duration zoom 12s.
- `DESIGN.md`: ghi override về framing theo yêu cầu mới, giữ palette/dials 5/3/5. Taste/React triển khai, Impeccable review-only; giữ các shadcn Button sẵn có. GSAP giữ scoped cleanup, readiness, reduced-motion và visibility pause.
- Không thay nguồn/thứ tự 13 ảnh, logo, bản đồ, cuộn phim, API, auth, dependency hay dữ liệu.

## Bằng chứng mới của lượt này

- Browser regression trước sửa: ảnh lúa tại 1920px dùng cover, khung ảnh render 1920x1198 trong media 1920x630; chỉ khoảng 52.6% diện tích khung nguồn nằm trong media, chưa tính scrim. Assertion ảnh phải còn ít nhất 98% thất bại đúng lỗi được báo.
- Sau sửa: Chromium production `/home` với API/session fixtures, 375/768/1280/1920px reduced-motion và 1920px normal-motion, **5/5 PASS**. Ảnh vừa đủ nguyên khung; desktop không chồng vùng chữ lên media; không overflow/page error. Normal-motion chuyển từ lúa sang cà chua thật, chỉ hai scene, ảnh đang chuyển vẫn nằm đủ trong vùng media. Xem screenshots desktop/mobile trong một lượt inspection và confirmation; không sửa thêm sau inspection.
- Script/screenshot QA: ignored `tmp/ui-review/banner_photo_framing_check.py` và `banner-framing-*.png`. Server kiểm tra riêng cổng 3100, không khởi động lại Docker frontend của user.
- `corepack pnpm exec vitest run --maxWorkers=2 --testTimeout=20000`: **115/115 tests, 21/21 files PASS**. Lượt trong sandbox không tiến triển, dừng riêng session đó; rerun ngoài sandbox hoàn tất 17.29s. Không kết luận nguyên nhân stall là lỗi ứng dụng.
- `corepack pnpm build`: **PASS**, TypeScript và 10/10 static pages; hai route chi tiết dynamic. Khôi phục imports dev type trong `next-env.d.ts` về trạng thái trước build; `corepack pnpm typecheck` **PASS** sau khôi phục.
- Biome strict lint riêng `BotanicalBanner.tsx` và format hai file UI **PASS**. Detector đọc component/CSS trả `[]`; một lần dùng sai flag detector đã chạy lại với `--json` đúng. Không lint toàn repo.
- Scoped Git whitespace check **PASS**; Windows có thông báo LF/CRLF, không whitespace error.

## Giới hạn

- Các tỷ lệ ảnh khác nhau có khoảng nền quanh ảnh; ưu tiên nhìn đủ nguồn thay vì lấp kín khung. Ba ảnh gốc nhỏ vẫn có thể thiếu sắc nét, không tạo thêm chi tiết hay ảnh AI.
- Kiểm tra visual là Chromium emulated viewport với fixture, không backend/AI end-to-end hoặc thiết bị thật. Chưa chạy CI, coverage, Lighthouse, screen reader, FPS hay kiểm tra riêng toàn bộ 13 scene trong browser; layout contain dùng chung cho mọi scene.
- Giữ đánh đổi accessibility của việc user đã bỏ nút dừng autoplay. Nguồn/licensing ảnh vẫn cần xác minh như báo cáo trước.
- Không stage/commit/push/PR/Jira, thay stash, migration hoặc thay volume.
