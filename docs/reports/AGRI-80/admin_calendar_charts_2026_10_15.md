# AGRI-80 - Lịch tháng và biểu đồ số liệu minh họa (2026-10-15)

Nhánh: `AGRI-80-create-crm-admin-page`. Lịch và biểu đồ là thành phần của trang tổng quan mock hiện tại.

## Hành vi giao diện

- Lịch tháng luôn hiển thị ở cột ngữ cảnh. Tuần bắt đầu Thứ Hai, đầy đủ ngày trong tháng, có nút tháng trước/sau và hôm nay, xử lý năm nhuận/chuyển năm.
- Hôm nay theo UTC+7, không phụ thuộc múi giờ trình duyệt; đánh dấu bằng màu hiện có và aria-current=date. Tiêu đề tháng thay đổi được thông báo nhẹ cho trợ năng.
- Ô ngày chỉ đọc, không phải nút; điều khiển tháng giữ vùng bấm 44px. Đây là lịch tham khảo, không trình sửa lịch hẹn hay bộ lọc biểu đồ.
- Ba thẻ có tổng số mẫu và biểu đồ cột bảy ngày cho tài khoản, ảnh và phiên. Dữ liệu ngày được suy ra từ cùng tập bản ghi minh họa trong AdminMockProvider.
- Mỗi biểu đồ dùng thang riêng bắt đầu 0, ghi mức tối đa/ngày và hai ngày đầu/cuối. Cột 0 có chiều cao 0; chuỗi toàn 0 có thông báo không phát sinh.
- Có vùng biểu đồ đặt tên và bảng mở rộng bằng details/summary với đủ bảy số đếm chính xác, dùng được bằng bàn phím/cảm ứng. Giữ vòng tiêu điểm rõ ràng cả trên thẻ xanh.
- Biểu đồ tĩnh, không thêm thư viện hay hoạt ảnh biểu đồ. Giữ Manrope, bảng màu và chế độ giảm chuyển động.

## Đường dẫn frontend

`frontend/src/features/admin/AdminCalendar.tsx`, `AdminCalendar.test.tsx`, `AdminMetricChart.tsx`, `AdminOverview.tsx`, `AdminOverviewPanels.tsx`, `AdminCrmPage.test.tsx`, `AdminMockProvider.tsx`; `frontend/src/index.css`.

## Kiểm chứng giao diện đã ghi nhận

- Kiểm thử ban đầu RED trước khi có lịch/biểu đồ; sau đó GREEN. Ca mới bao phủ tháng nhuận đầy đủ, trước/sau/chuyển năm/hôm nay và bảng số liệu.
- Mốc triển khai lịch/biểu đồ: toàn bộ frontend 184/184 kiểm thử, 27 tệp đạt trong 59.19s. Typecheck, lint 158 tệp, định dạng 16 tệp đã sửa và kiểm tra diff đạt.
- Một lần chạy đồng thời trước có ca chờ thông báo cũ timeout (183 đạt/1 lỗi); startup không đổi sau đó đạt riêng 7/7, toàn bộ lần cuối đạt mà không tăng timeout hay sửa ca ngoài phạm vi.
- Chromium 1280/768/375 kiểm tra đầy đủ tháng, điều hướng bàn phím/hôm nay, bảng bảy ngày, cột 0px, giảm chuyển động, không tràn ngang/lỗi trang. Cố ý dùng múi giờ America/Los_Angeles trong khi lịch vẫn theo Việt Nam. Ảnh/công cụ: `.cache/admin-verification/calendar_charts_review.py`, `calendar_charts_{1280,768,375}.png` bị Git bỏ qua.
- Các kích thước biểu đồ được thu gọn sau đó theo [báo cáo mật độ](admin_compact_density_2026_10_15.md). Độ cao cũ 5rem chỉ là lịch sử; giá trị mới 2.5rem.

Các kết quả thuộc mốc triển khai trước, không phải lần chạy mới khi chỉnh báo cáo. Trạng thái mock và kiểm chứng frontend gần nhất ở [báo cáo hiện hành](admin_mock_frontend_2026_10_15.md). Không có số đo bao phủ hay CI mới; chưa chứng nhận thiết bị thật/nhiều trình duyệt. Chưa commit/push.
