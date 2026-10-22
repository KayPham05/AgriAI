# AGRI-80 - Mở rộng thanh khi rê chuột hoặc nhận tiêu điểm (2026-10-15)

Nhánh: `AGRI-80-create-crm-admin-page`. Người dùng yêu cầu bỏ nút bật/tắt ở đầu trang, tự mở rộng thanh điều hướng theo tương tác. Đây là hành vi thanh hiện hành trong bản mock.

## Hành vi giao diện

- Bỏ Button bật/tắt và biểu tượng PanelLeft. Mặc định thanh 72px có biểu tượng dùng được; chuột/bút rê vào mở 224px kèm chữ. Khi rời con trỏ, thanh chỉ thu gọn nếu tiêu điểm không còn bên trong.
- Nhận tiêu điểm bàn phím mở nhãn; chuyển giữa phần tử con không thu gọn. Chỉ thu khi cả con trỏ và tiêu điểm đều rời. Bỏ qua sự kiện cảm ứng đi vào; giữ Sheet di động.
- useAdminRail phối hợp ref con trỏ/tiêu điểm, tránh khởi động lại hoạt ảnh khi trạng thái không đổi và lấy chiều rộng nền hiện tại khi chuyển tiếp bị ngắt.
- Giữ transform/opacity có phạm vi, giảm chuyển động, màn hình/bộ lọc, khoảng cách tách 20px, màu và font; không thêm thư viện/token.

Đường dẫn: `frontend/src/features/admin/AdminCrmPage.tsx`, `useAdminRail.ts`, `AdminCrmPage.test.tsx`.

## Bằng chứng giao diện đã ghi nhận

- Hai ca rê chuột/tiêu điểm RED trước sửa, 16 ca cũ đạt; sau đó 18/18 admin đạt trong 5.53s.
- Toàn bộ frontend ở mốc này 186/186, 27 tệp đạt trong 54.17s; typecheck/lint 159 tệp/định dạng 3 tệp sửa/diff và frontend production build đạt.
- Chromium 1280/1024/768/375: không nút đầu trang, con trỏ vào/ra 224/72px, hoạt ảnh nền, giữ nhãn khi tiêu điểm ở lại, thu khi tiêu điểm ra ngoài, 8 chu kỳ nhanh ổn định, giữ điều hướng/bộ lọc, giảm chuyển động, Sheet và không tràn ngang/lỗi trang. Đã xem ảnh máy tính.
- Bằng chứng bị Git bỏ qua: `.cache/admin-verification/hover_rail_review.py`, `hover_rail_*.png`.
- Hành vi rê chuột/tiêu điểm vẫn được kiểm tra trong bộ frontend hiện hành 174/174; xem [trạng thái mock](admin_mock_frontend_2026_10_15.md).

Các kết quả thuộc lần triển khai đã ghi, không chạy mới trong đợt sửa tài liệu. Chưa có số đo bao phủ/CI mới hay chứng nhận thiết bị thật/nhiều trình duyệt. Chưa commit/push.

## 2026-10-21 — Nút mở/thu gọn theo yêu cầu mới

Thêm Button ở header desktop với icon PanelLeftOpen/PanelLeftClose, tên tiếng Việt, `aria-expanded` và `aria-controls`. Nút ghim sidebar mở sau khi con trỏ/tiêu điểm rời thanh; bấm lại thu gọn. Giữ hành vi mở tạm bằng rê chuột/tiêu điểm, hiệu ứng GSAP và Sheet trên di động. Trạng thái chỉ tồn tại trong lần gắn workspace, không lưu vào tài khoản. Yêu cầu mới này thay thế quyết định bỏ nút đầu trang trước đây.

Nguồn: `frontend/src/features/admin/AdminCrmPage.tsx`, `useAdminRail.ts`, `AdminCrmPage.test.tsx`; kiểm tra trình duyệt: `frontend/tests/browser/admin_sidebar_toggle.py`.

Kiểm chứng mới ngày 2026-10-21:

- RED: 2 ca thiếu nút thất bại trước triển khai, container `agri80-sidebar-red` exit 1; log `.cache/admin-sidebar-red.log`.
- Nhóm AdminCrmPage 8/8 đạt, integration 4/4 đạt. Toàn bộ frontend 205/205, 33 tệp đạt trong 23.05s, container `agri80-sidebar-suite` exit 0; log `.cache/admin-sidebar-suite.log`.
- Lần chạy đầy đủ đầu tiên 200 đạt/5 lỗi: 4 ca lint-boundary thiếu `/.gitignore` trong môi trường Docker và ca fresh Admin login vượt timeout mặc định 5 giây (màn chào vốn chờ 4 giây). Chạy lại với bản sao `.gitignore` và `pnpm test --maxWorkers=2 --testTimeout=15000` đạt; không sửa logic ứng dụng để né lỗi.
- Biome check/format 3 tệp đạt. Production build và TypeScript đạt, log `.cache/admin-sidebar-build.log`; đã cập nhật riêng service frontend tại localhost:3000.
- Chromium 1280px thường/giảm chuyển động, 768px và 375px: ghim mở, thu gọn, Enter/Space, điều hướng và Sheet đạt; không lỗi trang/tràn ngang. Đã xem ảnh `.cache/admin-sidebar/expanded-1280-False.png`.

Chưa đo coverage mới, chưa kiểm tra CI hay thiết bị thật. Không commit/push, không thay backend hoặc dữ liệu.

### 2026-10-21 — Chỉ mở bằng nút theo yêu cầu tiếp theo

Bỏ toàn bộ pointer/focus handlers và trạng thái ghim trong `useAdminRail.ts`; bỏ gắn handlers lên aside trong `AdminCrmPage.tsx`. Rê chuột, chạm và nhận tiêu điểm không còn mở sidebar; nút header vẫn hoạt động bằng chuột, Enter/Space. Giữ hoạt ảnh và Sheet. Quyết định này thay thế cơ chế tự mở được mô tả trước đây.

Test hồi quy trong `AdminCrmPage.test.tsx` thất bại tại hover trước sửa (7 đạt/1 thất bại, `.cache/admin-manual-sidebar-red.log`). Kiểm tra Chromium với `frontend/tests/browser/admin_sidebar_toggle.py` đạt ở 1280px thường/giảm chuyển động, 768px, 375px: không mở khi hover/focus, nút và Sheet điều hướng đúng, không tràn ngang/lỗi trang. Biome 3 tệp và production build/TypeScript đạt (`.cache/admin-manual-sidebar-build.log`); localhost đã cập nhật. Lần chạy test đầu sau sửa có lỗi thao tác touch trong test (thiếu vị trí khi thả pointer); đã sửa fixture để press/release trong cùng chuỗi, không đổi mã ứng dụng.

Lần cuối toàn bộ frontend **205/205**, 33 tệp đạt trong **23.37s**, `pnpm test --maxWorkers=2 --testTimeout=15000`, container `agri80-manual-green` exit 0; `.cache/admin-manual-sidebar-green.log`. Chưa đo coverage mới hoặc xác nhận CI; chưa commit/push.
