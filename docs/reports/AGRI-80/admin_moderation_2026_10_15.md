# AGRI-80 - Các thao tác quản lý mô phỏng trên giao diện

Nhánh: `AGRI-80-create-crm-admin-page`. Cập nhật: 2026-10-15. Các hành vi dưới đây chỉ áp dụng cho dữ liệu mẫu trong bộ nhớ của trang quản trị.

## Tài khoản mẫu

- Danh sách có tên, email mẫu, ngày tạo, vai trò, trạng thái hoạt động/đã khóa, lý do khóa và số cảnh báo.
- Khóa mở hộp xác nhận, yêu cầu lý do, đổi nhãn trạng thái và kết thúc các phiên mẫu tương ứng. Khôi phục đổi lại trạng thái hoạt động của tài khoản mẫu.
- Cảnh báo yêu cầu nội dung rồi tăng số cảnh báo của tài khoản mẫu; không gửi thông báo thật.
- Cưỡng chế đăng xuất chỉ chuyển phiên mẫu từ còn hiệu lực sang đã kết thúc. Không ảnh hưởng tài khoản Admin đang dùng giao diện.
- Giữ giới hạn nhập lý do 500 ký tự và cảnh báo 1000 ký tự; có nút hủy, xác nhận và tên đối tượng rõ ràng.

## Ảnh mẫu

- Có ảnh minh họa và các trạng thái còn hiển thị/hết hạn/đã xóa. Tái sử dụng ảnh đã có trong tài sản giao diện.
- Xác nhận xóa chỉ đổi trạng thái mock và bỏ ảnh khỏi hiển thị; không xóa tệp thật. Nút xóa bị vô hiệu hóa khi ảnh mẫu đã xóa.
- Cảnh báo ảnh tăng số cảnh báo của chủ ảnh mẫu, không gửi thông báo thật.
- Sau thao tác hiển thị thông báo mô phỏng rõ ràng. Dữ liệu giữ khi đổi màn hình trong cùng lần mở trang; tải lại đặt về mẫu ban đầu.

## Đường dẫn frontend

`frontend/src/features/admin/AdminMockProvider.tsx`, `AdminUsers.tsx`, `AdminImages.tsx`, `AdminSessions.tsx`, `AdminRecordList.tsx`, `AdminActionDialog.tsx`, `AdminCrmPage.test.tsx`.

## Kiểm chứng đã ghi nhận

- Ở đợt xây dựng điều khiển trước đây: ba ca UI quản lý thất bại trước triển khai; toàn bộ frontend sau đó 178/178, 26 tệp đạt trong 49.11s; typecheck/lint 153 tệp đạt. Đây là mốc lịch sử của giao diện, không phải bộ kiểm thử hiện tại.
- Đợt chuyển sang mock đã kiểm chứng khóa tài khoản trong bộ nhớ, đặt lại khi gắn lại trang, xóa ảnh mẫu và giữ phiên đăng nhập của người dùng giao diện. Các kiểm thử dùng thành phần thật, không thay bằng mock thành phần.
- Kết quả frontend gần nhất: 174/174 kiểm thử, 28 tệp đạt trong 30.41s; typecheck/lint/format đạt. Bằng chứng tổng hợp: [báo cáo frontend mock](admin_mock_frontend_2026_10_15.md).
- Chromium ở 1280/768/375 đã kiểm tra thao tác khóa mẫu, tải lại, điều hướng và không tràn ngang/lỗi trang trong đợt chuyển mock. Ảnh/kết quả ở `.cache/admin-mock/` bị Git bỏ qua. Kiểm chứng giao diện hiện tại tại cổng 3000 nằm trong `.cache/admin-original/`.

Không chạy lại kiểm thử cho đợt dọn tài liệu này. Chưa chứng nhận thiết bị thật, nhiều trình duyệt hay toàn bộ khả năng tiếp cận. Chưa staging/commit/push.
