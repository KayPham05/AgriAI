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
