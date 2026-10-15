# AGRI-80 - Giao diện quản trị frontend mock

Nhánh: `AGRI-80-create-crm-admin-page`. Cập nhật: 2026-10-15.

## Chuẩn bị commit theo yêu cầu — 2026-10-15

Người dùng yêu cầu commit đúng quy định và loại thư viện khỏi commit. Phạm vi là mã giao diện mock và tài liệu đi kèm, dùng thông điệp `refactor(admin): AGRI-80 use frontend mocks for administration`. Không stage thư mục thư viện/skill, dependency, lockfile, bộ nhớ đệm, đầu ra kiểm tra hay dữ liệu cục bộ. Chỉ tạo commit local; chưa yêu cầu push.

Kiểm tra mới trước commit: frontend 174/174 kiểm thử, 28 tệp, đạt trong 69.84s; typecheck/lint/format toàn bộ 159 tệp đạt. Commitlint thông điệp đạt, không lỗi/cảnh báo. Kiểm tra tài liệu/liên kết/diff đạt. Bằng chứng kiểm tra commit cục bộ nằm trong `.cache/agri80-mock-commit/` bị Git bỏ qua. Build và trình duyệt không chạy lại trong đợt chuẩn bị commit; các kết quả tương ứng bên dưới là lịch sử.

## Phạm vi hiện tại

Trang `/admin` là giao diện quản trị dùng dữ liệu minh họa trong bộ nhớ. Gồm tổng quan, người dùng, ảnh và phiên đăng nhập; tìm kiếm, phân trang và các hộp xác nhận thao tác đều phục vụ bản mock. Tải lại trang đặt lại dữ liệu minh họa.

Giữ luồng đăng nhập Admin có sẵn, kiểm tra vai trò trước khi hiện trang và hiệu ứng logo/lời chào. Đăng xuất xóa thông tin đăng nhập trong trình duyệt rồi quay về `/`.

Địa chỉ cục bộ: **http://localhost:3000**. Người dùng đã yêu cầu bỏ các hướng dẫn admin khỏi DESIGN.md; quy tắc chung của [DESIGN.md](../../../DESIGN.md) vẫn được giữ.

## Chức năng giao diện

| Hạng mục | Hành vi |
| --- | --- |
| Tổng quan | Ba tổng số minh họa, biểu đồ bảy ngày, lịch tháng, ảnh và phiên mẫu gần đây. |
| Người dùng | Tìm không dấu theo tên/email, phân trang, mô phỏng khóa/khôi phục/cảnh báo/cưỡng chế đăng xuất. |
| Ảnh | Xem ảnh minh họa, trạng thái còn hiển thị/hết hạn/đã xóa và mô phỏng cảnh báo/xóa. |
| Phiên đăng nhập | Danh sách phiên mẫu, tìm kiếm và nhãn trạng thái. |
| Điều hướng | Thanh biểu tượng trên máy tính mở rộng khi rê chuột/nhận tiêu điểm; di động dùng Sheet. |
| Khả năng tiếp cận | Tên điều khiển rõ ràng, tiêu điểm bàn phím, bảng số liệu chi tiết, vùng bấm tối thiểu 44px và chế độ giảm chuyển động. |

## Báo cáo chi tiết

- [Trạng thái frontend mock và bằng chứng gần nhất](admin_mock_frontend_2026_10_15.md).
- [Tiến trình giao diện CRM](admin_crm_ui.md).
- [Luồng đăng nhập và đăng xuất trên giao diện](admin_login_mapping_2026_10_14.md).
- [Hiệu ứng đăng nhập thành công](admin_login_entrance_2026_10_15.md).
- [Các thao tác quản lý mô phỏng](admin_moderation_2026_10_15.md).
- [Bố cục và chuyển động tổng quan](admin_dashboard_2026_10_15.md).
- [Lịch và biểu đồ](admin_calendar_charts_2026_10_15.md).
- [Thanh điều hướng tách riêng](admin_detached_rail_2026_10_15.md).
- [Thanh biểu tượng thu gọn/mở rộng](admin_icon_rail_2026_10_15.md).
- [Mở rộng bằng rê chuột/tiêu điểm](admin_hover_rail_2026_10_15.md).
- [Thu gọn mật độ giao diện](admin_compact_density_2026_10_15.md).
- [Nhật ký AGRI-80](../../task-logs/AGRI-80/AGRI-80-create-crm-admin-page.md).

## Kiểm chứng đã ghi nhận

Kết quả dưới đây thuộc lần triển khai trước khi dọn tài liệu, không phải kiểm thử chạy lại trong đợt chỉnh văn bản này:

- Toàn bộ frontend: **174/174 kiểm thử**, 28 tệp, đạt trong 30.41s với `corepack pnpm test --maxWorkers=2`.
- Typecheck, lint và định dạng đạt; lint/format toàn bộ 159 tệp.
- Bản dựng frontend production đạt; 11 trang tĩnh và hai đường dẫn động.
- Chromium tại 1280/768/375px: đăng nhập Admin, trang mock, tải lại và đăng xuất cục bộ đạt; không tràn ngang hay lỗi trang.
- Nguồn: [báo cáo frontend mock](admin_mock_frontend_2026_10_15.md), kết quả trình duyệt `.cache/admin-original/browser-result.json` và ảnh cùng thư mục bị Git bỏ qua.

DoD tổng thể chưa được xác nhận; chưa có kết quả CI hay số đo bao phủ mới cho trạng thái hiện tại. Đợt này chỉ dọn nội dung tài liệu theo phạm vi frontend, không sửa mã ứng dụng và không chạy lại kiểm thử/build. Chưa commit/push.

Kiểm tra tài liệu ngày 2026-10-15 đạt: còn 12 báo cáo và 1 nhật ký, đã bỏ 5 tài liệu ngoài phạm vi; quét nội dung không còn mục ngoài frontend, liên kết nội bộ hợp lệ, mã hóa và `git diff --check` đạt. Đối chiếu xác nhận mã ứng dụng/thiết kế không đổi trong đợt này. Bằng chứng cục bộ bị Git bỏ qua: `.cache/agri80-doc-cleanup/result.json`.
