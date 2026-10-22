# AGRI-57 — Co giãn khối giới thiệu và bản đồ (2026-10-19)

Nhánh xác minh: `AGRI-57-frontend-summary`. Đây là lượt tiếp theo sau [rà soát responsive toàn frontend](agri_57_responsive_audit_2026_10_19.md); các kết quả trước được giữ theo thời điểm kiểm tra.

## Yêu cầu và thay đổi

Người dùng chỉ ra bản đồ bị đẩy xuống dưới ở màn hình thu hẹp và xác nhận muốn cả phần giới thiệu co theo kích thước khung. Bố cục cuối giữ hai cột ở mọi độ rộng: chữ/CTA/dải ảnh bên trái, một bản đồ gốc bên phải. Thay đổi này thay thế quyết định xếp chồng dưới 1280px trước đây, đã ghi trong `DESIGN.md`.

- `frontend/src/components/common/CropMap.tsx`: hai cột có thể thu hẹp; panel thông tin ẩn không chiếm chiều cao; khi chọn điểm, thông tin thay phần chữ trong cột trái. Bỏ tự cuộn trang khi mở; giữ Escape và trả focus về điểm mở ban đầu.
- `frontend/src/components/common/CropMapCanvas.tsx`: bản đồ hero vừa chiều rộng cột, giữ tỷ lệ và giới hạn chiều cao theo viewport. Không cần kéo ngang hero; bản đồ details độc lập giữ kích thước/cuộn ngang cũ.
- `frontend/src/views/IntroPage.tsx`, `frontend/src/index.css`: token `clamp()` điều chỉnh chữ, khoảng cách, nút, dải ảnh, ghim và nhãn. Không đổi dữ liệu địa lý, hình học đảo, lớp trình bày, ảnh hoặc GSAP timeline.
- Giữ các sửa header/CTA/Dialog/AlertDialog của lượt rà soát trước. Không sửa backend, thư viện hoặc lockfile; không ghi dữ liệu API thật.

Ở điện thoại, ghim hero thu từ 44px xuống tối thiểu 24px và nhãn đảo từ 12px xuống tối thiểu 8px để đáp ứng yêu cầu giữ hai cột. Đây là đánh đổi về độ lớn chữ/vùng chạm, không khẳng định toàn bộ ghim đạt mục tiêu 44px trước đây. Các marker/leader lân cận cũng co theo để tránh che nhau khi màn hình ngang thấp; ca 667×375 từng phát hiện chồng vùng bấm khi giữ ghim 44px và đã đạt sau sửa. Bản đồ details không áp dụng ngoại lệ này.

## Kiểm chứng mới trên bản cuối

Frontend production đã build lại và chỉ recreate service `frontend` tại `http://localhost:3000`.

| Kiểm tra | Kết quả |
|---|---|
| `corepack pnpm test --maxWorkers=2` | 215/215 test, 34 tệp, 37.51s |
| Typecheck và Biome lint | Đạt; lint 165 tệp |
| Biome format các tệp nguồn sửa | Đạt; toàn checkout vẫn có lỗi CRLF ở tệp nguyên trạng như báo cáo trước |
| `docker compose build frontend` | Đạt, Next.js compile 3.9s, TypeScript 880ms, 11 trang static và 2 route dynamic |
| Layout Chromium | 7/7 độ rộng 320/375/390/768/1024/1280/1440px: chữ và map cạnh nhau, canvas vừa cột, không tràn ngang document |
| Thao tác bản đồ | 42 lượt chọn điểm ở 320×568, 375×667, 667×375, 768×800, 1024×945, 1280×900; cả 7 điểm bấm được, thông tin inline, Escape/đóng/trả focus đạt |
| Chuyển động bình thường | Mở/đóng bản đồ 1024px đạt; các ca ma trận còn lại dùng reduced motion; không ghi nhận page error |
| Chữ 200% | Chạy lại 33 trạng thái của 11 trang ở 375/768/1280px, không tràn ngang document |

Ví dụ đo bản cuối: ở 375px, mỗi cột rộng 165.5px, bản đồ bắt đầu tại y=120px và cao 250.39px; ở 1024px, cột map rộng 440px, bắt đầu tại y=128px và cao 665.70px. Panel thông tin ẩn không còn đẩy map xuống khoảng y=940px như trước sửa.

Bằng chứng cục bộ bị Git bỏ qua: `.cache/responsive-2026-10-19/map-layout.json`, `map-interactions.json`, `text-scale.json`, ảnh `map-review-*.png`, cùng các script Python Playwright tương ứng. Bản trước sửa lưu tại `map-layout-before.json`. Không thêm framework kiểm thử hay dependency vào project.

## Giới hạn và bàn giao

Các kết quả là Chromium local, viewport/cảm ứng giả lập và fixture API cô lập; không thay thế Safari, điện thoại vật lý hoặc review trực quan của người dùng. Chưa chạy coverage mới hoặc GitHub Actions; không xác nhận backend/inference ở lượt này. Màn hình có chữ lớn vẫn được phép cuộn dọc để đọc đủ nội dung. Không staging, commit, push hay cập nhật PR/Jira trong lượt sửa này.

## Bổ sung: dải phim chưa co theo khung

Người dùng tiếp tục chỉ ra ảnh trong dải phim vẫn lớn và bị cắt. Đo trước sửa cho thấy breakpoint dưới 768px giữ hai cell, viền/lỗ phim cố định; ở viewport600px mỗi frame cao118.25px trong viewport phim96px, gây cắt dọc. Ca Chromium yêu cầu bốn cell tỷ lệ với cột đã thất bại trước sửa.

Chỉ bổ sung CSS trong `frontend/src/index.css`: container inline-size ở wrapper phim, bốn cell ở mọi độ rộng và token `cqw` có giới hạn cho chiều cao/padding/gutter/rail/hole. Không sửa logic GSAP, ảnh hoặc dependency. `DESIGN.md` ghi ngoại lệ thay quy tắc hai cell trên mobile trước đây.

Kiểm tra mới sau sửa và build lại frontend localhost3000:

- Chromium320/375/600/768/1024/1280/1440px: bốn cell co theo cột, rail từ3px lên10px; viewport600px có frame58.98px trong khung96px. Cuộn bằng ArrowRight đạt. Lấy mẫu normal motion ở sáu độ rộng320–1280px không có frame nằm trọn bề ngang bị cắt dọc; đã xem ảnh600px. Mép trái/phải vẫn cắt ảnh đang chạy qua như dải phim liên tục.
- Lint165 tệp và format CSS đạt; production build đạt (compile4.0s, TypeScript790ms). Full Vitest215/215,34 tệp,38.82s. `git diff --check` đạt.
- Bằng chứng local bị bỏ qua: `film_scale.py`, `film-scale.json`, `film-scale-*.png`, `film-motion-*.png` trong `.cache/responsive-2026-10-19/`. Chưa kiểm tra thiết bị vật lý hoặc CI; không commit/push.
