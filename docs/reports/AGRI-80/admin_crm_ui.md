# AGRI-80 - Tiến trình giao diện CRM

Nhánh: `AGRI-80-create-crm-admin-page`. Tác vụ: Create CRM Admin Page. Nội dung dưới đây chỉ ghi tiến trình frontend; các trạng thái cũ được đánh dấu theo thời điểm, không mô tả đồng thời giao diện hiện tại.

## Trạng thái hiện tại — 2026-10-15

`/admin` là trang quản trị mock có tổng quan, người dùng, ảnh và phiên đăng nhập. Dữ liệu mẫu nằm trong bộ nhớ, thao tác mô phỏng đặt lại khi tải lại. Giữ luồng đăng nhập Admin có sẵn và đăng xuất cục bộ. Chi tiết hiện hành và kiểm chứng 174/174 frontend nằm ở [báo cáo frontend mock](admin_mock_frontend_2026_10_15.md).

## Thiết kế ban đầu — 2026-10-12

Bản xem trước đầu tiên dùng Manrope, bảng màu xanh/nền ấm, thanh bên máy tính, đầu trang gọn, bảng người dùng có tìm kiếm, hàng xếp dọc trên di động và Sheet điều hướng. Có tổng quan, người dùng và yêu cầu hỗ trợ; 8 người dùng cùng 6 yêu cầu là dữ liệu mẫu. Trình sửa trạng thái/ghi chú chỉ lưu trong bộ nhớ, hủy bỏ bản nháp và tải lại đặt về trạng thái đầu.

Tái sử dụng Button, Input, Label, Select, Badge, Dialog, Sheet và Textarea đã có. Không thêm font/thư viện hay viết lại thành phần dùng chung. Các thành phần ban đầu gồm AdminOverview, AdminUsers, AdminRequests, CrmControls và adminDemoData; các mục chỉ phục vụ hỗ trợ sau đó được bỏ khi người dùng chốt phạm vi mới.

Sáu kiểm thử hành vi thất bại trước triển khai; sau bổ sung giả lập phương thức trình duyệt trong phạm vi kiểm thử, 6/6 đạt trong 81.95s. Giả lập được dọn sau kiểm thử, không đưa vào mã giao diện. Đã sửa lỗi nhãn aria và tùy chọn exact không hỗ trợ của Testing Library. Kiểm tra dev ban đầu timeout 120s khi trang còn biên dịch, không tính là đạt.

## Rà soát đáp ứng — 2026-10-13

Ảnh chụp 375/768/1280px phát hiện trạng thái/ngày yêu cầu bị ẩn trên di động. Thêm hồi quy thứ bảy, quan sát RED rồi GREEN; đưa nội dung vào fieldset đúng ngữ nghĩa và đổi huy hiệu ưu tiên sang viền trung tính.

- Toàn bộ frontend sau sửa: 167/167 kiểm thử, 26 tệp, đạt trong 63.69s; nhóm CRM cuối 7/7 đạt trong 6.81s.
- Độ bao phủ nhánh tại mốc này: 703/1252=56.15%, qua ngưỡng 25%; đây là số đo lịch sử.
- Typecheck, lint nghiêm ngặt và định dạng 148 tệp đạt; production build đạt.
- Chromium 375/768/1280 đạt tìm không dấu, hồ sơ/Escape, điều hướng máy tính/Sheet, lưu ghi chú-trạng thái mẫu và tải lại đặt về cũ; không tràn ngang/lỗi trang. Vùng bấm tổng quan tối thiểu 44x44px; noindex/nofollow được kiểm tra trong trang đã hiển thị.
- Ảnh/script kiểm tra bị Git bỏ qua trong `tmp/ui-review/`. Công cụ phát hiện Impeccable thoát 0 không đầu ra, không được coi là chứng nhận khả năng tiếp cận hay hiệu năng.

Lần hai worker chạy cùng biên dịch chậm trước đó có hai timeout kiểm thử ranh giới lint và 4 lỗi chưa xử lý; không tính đạt. Không tăng timeout để lấy kết quả cuối.

## Bỏ dữ liệu tạo sẵn và thu hẹp màn hình — 2026-10-13

Người dùng từng yêu cầu trang sạch, nên đã bỏ adminDemoData, dữ liệu mẫu, số đếm điều hướng, ngày cố định và mô phỏng lưu. Thống kê chưa biết hiển thị gạch ngang có nhãn trợ năng thay vì số 0. Thay bảy kiểm thử mẫu cũ bằng bốn hồi quy trạng thái rỗng: toàn bộ 164/164, 26 tệp đạt 62.36s; nhánh 664/1205=55.10%; lint/format 146 tệp, typecheck và build đạt. Chromium 1280/768/375 xác nhận trạng thái rỗng và điều hướng/tải lại hoạt động.

Sau đó người dùng bỏ phần yêu cầu hỗ trợ, chỉ giữ tài khoản, ảnh tải lên và phiên đăng nhập. Bỏ AdminRequests và tổng quan hỗ trợ/ưu tiên/cây trồng; thêm AdminImages và AdminSessions. Năm kiểm thử hành vi đạt sau RED; toàn bộ frontend 165/165, 26 tệp đạt 55.88s, typecheck/lint/format 147 tệp và production build đạt. Các trạng thái rỗng ở mốc này được thay bằng mock theo yêu cầu hiện tại.

## Các lần điều chỉnh giao diện — 2026-10-15

Giữ trình tự thay đổi để hiểu các hành vi đã được thay thế:

1. [Khung nổi và tổng quan](admin_dashboard_2026_10_15.md): thanh 112px, các nhóm số liệu/ảnh/phiên và chuyển động hữu hạn.
2. [Lịch và biểu đồ](admin_calendar_charts_2026_10_15.md): lịch tháng và bảng số liệu bảy ngày.
3. [Thanh tách riêng](admin_detached_rail_2026_10_15.md): khoảng cách 20px, nút đóng/mở toàn thanh ở giai đoạn này.
4. [Thanh biểu tượng](admin_icon_rail_2026_10_15.md): mặc định 72px dùng được, mở rộng 224px hiện chữ.
5. [Rê chuột/tiêu điểm](admin_hover_rail_2026_10_15.md): bỏ nút đầu trang, tự mở rộng theo tương tác.
6. [Mật độ gọn](admin_compact_density_2026_10_15.md): thu khoảng cách, cỡ chữ, thẻ số liệu và lịch.
7. [Hiệu ứng đăng nhập](admin_login_entrance_2026_10_15.md): chờ logo/lời chào hoàn tất trước khi chuyển trang.

Các đường dẫn hiện tại: `frontend/src/app/(admin)/admin/page.tsx`, `frontend/src/features/admin/`, `frontend/src/providers/AppProvider.tsx`, `frontend/src/index.css`.

## Giới hạn và ghi chú tài liệu

Các số kiểm thử/bao phủ phía trên thuộc từng mốc lịch sử, không phải kiểm tra chạy lại khi chỉnh báo cáo. Chưa chứng nhận thiết bị thật, trình đọc màn hình, toàn bộ tương phản, giao diện tối hay Lighthouse. Người dùng đã yêu cầu bỏ mục hướng dẫn admin khỏi DESIGN.md và chỉ giữ tài liệu thuộc phạm vi frontend; đợt này thực hiện yêu cầu đó, không sửa mã ứng dụng. Chưa commit/push.

[Nhật ký thực hiện](../../task-logs/AGRI-80/AGRI-80-create-crm-admin-page.md).
