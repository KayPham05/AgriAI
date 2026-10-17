# AGRI-80 - Thanh biểu tượng thu gọn và mở rộng hiện chữ (2026-10-15)

Nhánh: `AGRI-80-create-crm-admin-page`. Người dùng xác nhận thu gọn vẫn phải có biểu tượng dùng được, mở rộng hiện biểu tượng kèm chữ; thay hành vi ẩn cả thanh trước đó.

## Thay đổi giao diện

- Máy tính mặc định thanh rộng 72px chỉ có biểu tượng; mở rộng 224px với nhãn tiếng Việt đầy đủ cạnh biểu tượng, gồm thương hiệu/đăng xuất. Cả hai trạng thái đều dùng được.
- Bỏ aria-hidden/inert của toàn thanh; khi thu gọn chỉ ẩn nhãn hiển thị, giữ aria-label đầy đủ, gợi ý title và vùng bấm 44px.
- Giữ bề mặt tách riêng, khoảng cách 20px, vị trí bám khi cuộn, Sheet di động, màn hình/bộ lọc, lịch và biểu đồ.
- GSAP có phạm vi chuyển động nội dung và co giãn bề mặt nền riêng; nhãn dịch/đổi độ mờ. Không co giãn chữ/biểu tượng, chỉ tính lại bố cục một lần. Hiệu ứng hữu hạn 320ms, có dọn/hoàn nguyên; giảm chuyển động tĩnh.
- Token tại mốc này: mở rộng 14rem, thu gọn 4.5rem, chiều cao điều khiển 2.75rem, độ lệch nhãn -8px; giữ khoảng cách/thời lượng.

Đường dẫn: `frontend/src/features/admin/AdminCrmPage.tsx`, `AdminCrmPage.test.tsx`, `useAdminRail.ts`; `frontend/src/index.css`.

## Bằng chứng giao diện ở mốc này

- Kiểm thử hành vi mới RED; 16 ca cũ đạt. Sau sửa 17/17 admin đạt trong 9.67s.
- Toàn bộ frontend 185/185 kiểm thử, 27 tệp đạt trong 57.76s. Typecheck/lint 159 tệp, định dạng tệp sửa, diff và frontend production build đạt.
- Chromium 1280/1024/768/375 đo 72/224px, khoảng cách 20px, chênh lệch không gian nội dung 152px; chuyển động nhãn/transform, điều hướng biểu tượng/đăng xuất khi thu gọn, bàn phím, 8 lần bật/tắt nhanh, giảm chuyển động và Sheet di động đạt. Không tràn ngang/lỗi trang; đã xem ảnh thu gọn/mở rộng.
- Công cụ ép nhấp ban đầu bỏ lỡ mục tiêu đang chuyển động; đổi sang kích hoạt bàn phím để kiểm tra trạng thái lặp mà không bỏ qua độ ổn định vị trí bấm. Không coi là đo hiệu năng hay nhấp chuột nhanh.
- Bằng chứng bị Git bỏ qua: `.cache/admin-verification/icon_rail_review.py`, `icon_rail_*.png`.

Nút bật/tắt ở mốc này đã được thay bằng [tương tác rê chuột/tiêu điểm](admin_hover_rail_2026_10_15.md). Không chạy lại các kiểm tra lịch sử khi chỉnh báo cáo. Chưa có số đo bao phủ/CI mới hay chứng nhận thiết bị thật/nhiều trình duyệt. Chưa commit/push.
