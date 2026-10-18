# AGRI-80 - Giao diện quản trị frontend mock

Ngày cập nhật: 2026-10-15. Nhánh: `AGRI-80-create-crm-admin-page`.

## Hành vi hiện tại

- `/admin` giữ giao diện tổng quan, danh sách người dùng, ảnh và phiên đăng nhập. Dữ liệu quản trị đều là mẫu trong bộ nhớ React, có thông báo minh họa rõ ràng và đặt lại khi tải lại trang.
- Luồng đăng nhập Admin có sẵn được giữ; trang chỉ hiển thị khi tài khoản có vai trò phù hợp. Logo/lời chào hoàn tất rồi mới chuyển trang. Thẻ tài khoản dùng danh tính đang đăng nhập.
- Đăng xuất trên thanh máy tính hoặc Sheet di động xóa localStorage/sessionStorage và trở về `/`.
- Tìm kiếm theo tên/email không phân biệt dấu, phân trang và các hộp xác nhận dùng được trên dữ liệu mẫu. Khóa/khôi phục/cảnh báo/cưỡng chế đăng xuất/xóa ảnh chỉ thay đổi trạng thái mock. Không gửi thông báo hay xóa ảnh thật.
- Giữ màu, Manrope, bố cục gọn, lịch tháng, biểu đồ bảy ngày, hiệu ứng vào và thanh điều hướng mở rộng khi rê chuột/nhận tiêu điểm. Chế độ giảm chuyển động giữ điều khiển hoạt động mà không chạy hiệu ứng.

## Đường dẫn frontend

- `frontend/src/features/admin/AdminMockProvider.tsx`: tạo dữ liệu mẫu và cập nhật trạng thái trong bộ nhớ, biệt lập theo lần mở trang.
- `frontend/src/features/admin/adminTypes.ts`: kiểu dữ liệu cho tổng quan, biểu đồ, người dùng, ảnh và phiên mẫu.
- `AdminCrmPage.tsx`, `AdminAccess.tsx`: khung, điều hướng, kiểm tra phiên đăng nhập có sẵn và đăng xuất cục bộ.
- `AdminRecordList.tsx`, `AdminUsers.tsx`, `AdminImages.tsx`, `AdminSessions.tsx`: tìm kiếm/phân trang và các danh sách mẫu.
- `AdminOverview.tsx`, `AdminOverviewPanels.tsx`, `AdminMetricChart.tsx`, `AdminCalendar.tsx`: tổng quan, ảnh/phiên gần đây, biểu đồ và lịch.
- `AdminActionDialog.tsx`, `AdminMotion.tsx`, `useAdminRail.ts`: xác nhận thao tác và chuyển động giao diện.
- `frontend/src/app/(admin)/admin/page.tsx`: điểm vào trang, metadata và noindex/nofollow.
- `frontend/src/providers/AppProvider.tsx`, `frontend/src/services/authApi.ts`: sử dụng luồng đăng nhập có sẵn và chuyển trang theo vai trò.
- Kiểm thử: `AdminCrmPage.test.tsx`, `AdminCalendar.test.tsx`, `frontend/src/App.adminEntrance.test.tsx`, `frontend/src/App.startup.test.tsx` và các kiểm thử frontend liên quan.

Các tên tệp không có đường dẫn đầy đủ phía trên nằm trong `frontend/src/features/admin/`.

## Kiểm chứng gần nhất đã ghi nhận

| Kiểm tra | Kết quả |
| --- | --- |
| Toàn bộ frontend | 174/174 kiểm thử, 28 tệp, đạt trong 30.41s với `corepack pnpm test --maxWorkers=2`. |
| Typecheck | `corepack pnpm typecheck` đạt. |
| Lint và định dạng | `corepack pnpm lint` và `corepack pnpm format:check` đạt, 159 tệp. |
| Bản dựng production | Đạt; biên dịch 5.4s, TypeScript 1129ms, 11 trang tĩnh/hai đường dẫn động. Thời gian chỉ là quan sát lần dựng đó. |
| Chromium 1280/768/375 | Đăng nhập Admin theo luồng có sẵn, hiển thị mock, khôi phục khi tải lại, đăng xuất cục bộ và không tràn ngang/lỗi JavaScript. |
| Tương tác mock ở đợt chuyển giao diện | Đã kiểm chứng tìm kiếm/rỗng, khóa tài khoản mẫu trong bộ nhớ, xóa ảnh mẫu, đặt lại khi gắn lại trang và giữ điều hướng rê chuột/tiêu điểm. |

Các kết quả này thuộc lần triển khai trước, không phải kiểm thử mới trong đợt dọn tài liệu. Bằng chứng cục bộ bị Git bỏ qua: `.cache/admin-original/browser-result.json`, `admin_{1280,768,375}.png`, `browser_review.py`; lần kiểm tra thao tác mẫu trước đó: `.cache/admin-mock/browser-result.json` và `mock_{1280,768,375}.png`. Chỉ sử dụng phần bằng chứng liên quan giao diện và luồng người dùng.

Công cụ trình duyệt ban đầu tải lại quá sớm khi URL vừa đổi; đã thêm chờ trang mock hiển thị rồi chạy lại đạt. Không sửa giao diện hay tăng timeout để né lỗi.

## Chạy cục bộ và giới hạn

Địa chỉ hiện tại: **http://localhost:3000**. Trước đó đã tạm dùng 13090 do 3000 bị chiếm; sau khi cổng trống, chuyển lại 3000 và kiểm tra HTTP 200.

Đây là bản mock để xem và tương tác giao diện. Chưa chứng nhận thiết bị vật lý, nhiều bộ máy trình duyệt hay khả năng tiếp cận đầy đủ; chưa có số đo bao phủ hay kết quả CI mới. Không chạy lại kiểm thử/build cho đợt chỉ dọn tài liệu này. Chưa staging, commit, push hay đổi Jira.

[Nhật ký AGRI-80](../../task-logs/AGRI-80/AGRI-80-create-crm-admin-page.md).
