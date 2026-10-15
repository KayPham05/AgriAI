# AGRI-80 - Bố cục và chuyển động trang tổng quan (2026-10-15)

Nhánh: `AGRI-80-create-crm-admin-page`. Người dùng yêu cầu bố cục theo ảnh tham chiếu, giữ màu và Manrope. Tham chiếu là ảnh tĩnh; chuyển động là cách diễn giải, không phải bản sao đã đối chiếu với video.

## Triển khai giao diện

- Khung nổi bo góc, thanh điều hướng máy tính gọn, ô tìm tài khoản và Sheet di động. Mốc đầu dùng thanh 112px; các điều chỉnh thanh hiện hành được ghi ở báo cáo riêng.
- Tổng quan ghép Card/Button/Badge có sẵn: ba thẻ số liệu, lối tắt quản lý, ảnh gần đây, danh tính tài khoản và phiên gần đây. Trong bản hiện tại, số liệu quản trị và các danh sách đều là mock.
- Tìm kiếm ở đầu trang mở màn người dùng, giữ truy vấn trong ô tìm kiếm; danh sách vẫn có phân trang và hộp xác nhận thao tác mẫu.
- AdminMotion dùng GSAP/useGSAP hiện có: hiệu ứng vào hữu hạn transform/opacity khi đổi màn hình, tối đa tám nhóm lệch nhịp, dọn context và xóa kiểu nội tuyến khi hoàn tất.
- CSS tạo độ nâng 4px khi rê chuột lên thẻ số liệu, dịch mũi tên thao tác 2px và phản hồi tiêu điểm. Giảm chuyển động bỏ hiệu ứng nhưng giữ điều hướng.
- Không thêm font/thư viện hay đổi màu/thành phần dùng chung.

## Đường dẫn frontend

`frontend/src/features/admin/{AdminCrmPage,AdminOverview,AdminOverviewPanels,AdminMotion,AdminUsers,AdminRecordList,AdminCrmPage.test}.tsx`, `frontend/src/index.css`.

## Kiểm chứng ở mốc triển khai

- Hai kiểm thử hành vi mới ban đầu thất bại vì thiếu vùng gần đây/tìm kiếm tổng quan; 12 ca cũ đạt. Sau triển khai 14/14 đạt; nhóm chọn cuối sau chỉnh di động đạt 14/14 trong 7.81s.
- Toàn bộ frontend 180/180 kiểm thử, 26 tệp đạt trong 57.29s. Lần này trước chỉnh lớp CSS-grid/dấu gạch ngang cuối; nhóm chọn và build cuối bao phủ hai sửa đó.
- Typecheck, lint nghiêm ngặt 155 tệp và định dạng admin/CSS 12 tệp đạt. Định dạng toàn dự án ở mốc này còn hai tệp WIP ngoài phạm vi; không ghi chúng đã được sửa trong đợt này.
- Frontend production build đạt. Chromium 1280/768/375 kiểm tra không tràn ngang/lỗi trang, tìm kiếm, điều hướng máy tính/Sheet, độ nâng 4px và giảm chuyển động không transform.
- Đã xem ảnh máy tính/di động trong `.cache/admin-verification/dashboard_*.png` bị Git bỏ qua.

Các kết quả là lịch sử giao diện, không phải chạy lại khi chỉnh báo cáo. Xem [trạng thái mock hiện tại](admin_mock_frontend_2026_10_15.md). Chưa có số đo bao phủ/CI mới hay chứng nhận thiết bị thật/nhiều trình duyệt. Chưa commit/push.
