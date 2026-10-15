# AGRI-80 - Thanh điều hướng tách riêng và đóng/mở (2026-10-15)

Nhánh: `AGRI-80-create-crm-admin-page`. Đây là mốc giao diện cũ trước khi chuyển sang thanh biểu tượng và mở rộng bằng rê chuột/tiêu điểm.

## Thay đổi giao diện ở mốc này

- Tách thanh rộng 112px khỏi khung nội dung chính 20px, có bề mặt bo góc/bóng riêng theo màu hiện có. Giữ logo, mục đang chọn và nút đăng xuất. Thanh bám cách đỉnh 24px và cuộn nội bộ khi cửa sổ thấp.
- Nút ở đầu trang đóng/mở toàn bộ thanh, có tên trợ năng, aria-expanded và aria-controls. Khi đóng, đặt inert/aria-hidden ngay; nút mở lại nằm ngoài thanh. Giữ màn hình, bộ lọc, lịch và biểu đồ.
- CSS tạo dịch chuyển/độ mờ; useAdminRail dùng useGSAP có phạm vi, đo/tính lại bố cục một lần rồi dùng transform đổi vị trí nội dung. Đóng thu hồi 132px. Dọn khi bật/tắt liên tục/tháo thành phần/đổi điểm ngắt; giảm chuyển động đổi tức thời.
- Không nội suy chiều rộng/lề/lưới, không hoạt ảnh lặp. Giữ Sheet di động dưới 1024px, không đổi bảng màu/font/thư viện.

Đường dẫn: `frontend/src/features/admin/AdminCrmPage.tsx`, `AdminCrmPage.test.tsx`, `useAdminRail.ts`; `frontend/src/index.css`.

## Bằng chứng giao diện ở mốc này

- Kiểm thử mới RED do thiếu nút đóng; 16 ca cũ đạt. Sau triển khai 17/17 admin đạt trong 5.53s.
- Toàn bộ frontend 185/185 kiểm thử, 27 tệp đạt trong 51.19s; typecheck, lint 159 tệp, định dạng 4 tệp sửa và diff đạt. Frontend production build đạt.
- Chromium 1280/1024/768/375: đo khoảng cách 20px, nội dung mở thêm 132px; chuyển tiếp hữu hạn, bàn phím, inert, 8 lần bật/tắt nhanh giữ bộ lọc/màn hình, vị trí bám 24px, Sheet di động và giảm chuyển động đạt. Không tràn ngang/lỗi trang.
- Đã xem ảnh mở/đóng máy tính và đáp ứng. Bằng chứng bị Git bỏ qua: `.cache/admin-verification/detached_rail_review.py`, `detached_rail_*.png`.

Hành vi ẩn cả thanh đã được thay bởi [thanh biểu tượng](admin_icon_rail_2026_10_15.md), sau đó [rê chuột/tiêu điểm](admin_hover_rail_2026_10_15.md). Các kết quả trên là lịch sử, không chạy lại khi dọn báo cáo. Chưa chứng nhận thiết bị thật/nhiều trình duyệt/hiệu năng hay có số đo bao phủ/CI mới. Chưa commit/push.
