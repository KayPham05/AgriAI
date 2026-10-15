# AGRI-80 - Luồng đăng nhập và đăng xuất trên giao diện

Nhánh: `AGRI-80-create-crm-admin-page`. Khởi đầu: 2026-10-14; trạng thái hiện hành cập nhật 2026-10-15.

## Hành vi hiện tại

- Dùng biểu mẫu đăng nhập có sẵn, gồm email, mật khẩu, CAPTCHA và lựa chọn ghi nhớ.
- Admin đăng nhập hoặc khôi phục phiên tại `/` hoàn tất màn hình logo/lời chào rồi tới `/admin`. User giữ luồng tới `/home` và các đường dẫn quay lại hiện có.
- AdminAccess dùng cơ chế xác minh tài khoản có sẵn; tài khoản không đúng vai trò thấy thông báo không có quyền, chưa đăng nhập thấy liên kết về ứng dụng để đăng nhập.
- Không chờ danh mục/lịch sử dành cho User khi Admin vào trang quản trị.
- Nút Đăng xuất trên máy tính và Sheet di động xóa localStorage/sessionStorage rồi trở về `/`. Trang quản trị sau đăng nhập vẫn chỉ dùng dữ liệu mock.

## Đường dẫn frontend

`frontend/src/providers/AppProvider.tsx`, `frontend/src/features/admin/AdminAccess.tsx`, `AdminCrmPage.tsx`, `frontend/src/services/authApi.ts`, `frontend/src/App.startup.test.tsx`, `frontend/src/App.adminEntrance.test.tsx` và `frontend/src/features/admin/AdminCrmPage.test.tsx`.

## Bằng chứng frontend theo thời điểm

- Ngày 2026-10-14: hai ca Admin thất bại trước khi thêm chuyển trang theo vai trò; ca User và các ca khởi động cũ đạt. Lần toàn bộ tuần tự sau sửa: 170/170 kiểm thử, 26 tệp, 42.33s; typecheck, lint 150 tệp, định dạng hai tệp sửa và frontend production build đạt.
- Một lần kiểm thử ranh giới lint cũ vượt 5000ms khi chạy đồng thời lint; chạy lại tuần tự đạt, không tăng timeout hay tắt quy tắc. Các phát hiện định dạng WIP ở thời điểm đó không được coi là kiểm thử thất bại.
- Bổ sung nút đăng xuất ngày 2026-10-14: ba ca giao diện máy tính/di động/thử lại thất bại trước khi có điều khiển; toàn bộ frontend sau đó 173/173, 26 tệp, 58.54s đạt. Đây là bằng chứng giao diện ở mốc cũ; hành vi đăng xuất hiện tại chỉ là xóa phiên trình duyệt.
- Ngày 2026-10-15: hồi quy cho đăng xuất cục bộ thất bại trước sửa rồi đạt trong toàn bộ bộ kiểm thử frontend 174/174, 28 tệp, 30.41s.
- Chromium tại `http://localhost:3000`, 1280/768/375: đăng nhập Admin theo biểu mẫu có sẵn, trang mock, tải lại và đăng xuất cục bộ đạt; không tràn ngang/lỗi trang. Bằng chứng: `.cache/admin-original/browser-result.json`, `admin_{1280,768,375}.png` bị Git bỏ qua.

Các kết quả là lần chạy đã ghi nhận, không chạy lại trong đợt dọn tài liệu. Chưa có số đo bao phủ/CI mới; chưa chứng nhận thiết bị thật hay khả năng tiếp cận đầy đủ. Chưa commit/push. Xem [hiệu ứng đăng nhập](admin_login_entrance_2026_10_15.md) và [trạng thái mock](admin_mock_frontend_2026_10_15.md).
