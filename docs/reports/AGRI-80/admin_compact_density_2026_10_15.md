# AGRI-80 - Thu gọn mật độ bố cục tổng quan (2026-10-15)

Nhánh: `AGRI-80-create-crm-admin-page`. Người dùng thấy trang quá lớn/cao; điều chỉnh trong phạm vi giao diện admin, giữ chức năng, bảng màu, Manrope, thanh rê chuột và giảm chuyển động.

## Thay đổi giao diện

- Đệm dọc đầu trang 20→12px; tiêu đề chính 30→24px; khoảng cách tiêu đề 32→20px; lề nội dung 32→24px; khoảng nhóm 24→16px; đệm bảng 20→16px.
- Tổng số 36→30px, khoảng cách sát hơn và chú thích ngắn hơn. Biểu đồ 80→40px, giữ nhãn bảy ngày/bảng chi tiết và vùng bấm 44px.
- Lịch gộp tháng/biểu tượng một hàng, giữ nút trước/sau/hôm nay 44px; ô ngày không tương tác 28px, bỏ đệm hàng dư và thu chân lịch. Giữ đầy đủ tháng/UTC+7.
- Ảnh đại diện 56→40px; tiêu đề tài khoản 20→18px; đệm hàng quản lý/phiên 16→12px. Không zoom hay đổi font toàn cục/thành phần dùng chung/thư viện.
- Token --admin-panel-inset đổi thành 1rem; --admin-chart-height thành 2.5rem. Các kích thước cũ trong báo cáo trước là lịch sử.

Đường dẫn: `frontend/src/features/admin/AdminCrmPage.tsx`, `AdminOverview.tsx`, `AdminOverviewPanels.tsx`, `AdminCalendar.tsx`, `AdminMetricChart.tsx`; `frontend/src/index.css`.

## Bằng chứng ở mốc thu gọn

- Chromium trước/sau tại 1280x900, lịch tháng 10/2026: thẻ 388→276px (giảm 112px/28.9%); lịch 441→297px (144px/32.7%); đầu trang 87→71px; thẻ tài khoản 240→192px. Đây là chiều cao đo tại cửa sổ/nội dung cụ thể, không phải tỉ lệ chung.
- Bộ admin/lịch 20/20 kiểm thử trong 2 tệp đạt 12.37s. Không thêm kiểm thử cho đổi thuần khoảng cách. Typecheck/lint 159 tệp/định dạng 6 tệp sửa/diff và frontend production build đạt.
- Chromium 1280/768/375 đạt: không tràn ngang/lỗi trang; lịch/tháng/hôm nay, bảng bảy hàng, nút tối thiểu 44px và thanh rê chuột dùng được. Đã xem ảnh máy tính/di động.
- Bằng chứng bị Git bỏ qua: `.cache/admin-verification/density_before.json`, `density_review.py`, `compact_dashboard_{1280,768,375}.png`.

Không chạy lại toàn bộ frontend/bao phủ/CI cho lần sửa khoảng cách này. Các kết quả trên cũng không được chạy lại khi dọn tài liệu. Chưa chứng nhận thiết bị thật/nhiều trình duyệt. Xem [trạng thái mock hiện tại](admin_mock_frontend_2026_10_15.md). Chưa commit/push.
