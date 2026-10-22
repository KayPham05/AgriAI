# AGRI-80 - Giao diện quản trị frontend mock

Nhánh: `AGRI-80-create-crm-admin-page`. Cập nhật: 2026-10-16.

## Hiệu ứng cây non sau đăng nhập — 2026-10-21

Admin dùng màn hình cây non/vòng sóng và tên tài khoản giống user, chờ4giây trước dashboard;
giữ riêng luồng User và API. Fresh13/13focused, component10/10branches100%, Biome/build và
browser5viewports/fresh-restored/reduced/hidden đạt. Không fullsuite/CI mới, chưa commit/push.
[Phạm vi và bằng chứng](admin_login_entrance_2026_10_15.md#follow-up--seedling-welcome-2026-10-21).

## Bổ sung kiểm thử — 2026-10-16

Thêm 22 unit test và 4 integration test cho frontend admin; không đổi hành vi ứng dụng hay thêm thư viện. Bộ frontend hiện đạt **200/200 kiểm thử**, 32 tệp; coverage nhánh nhóm admin **80.79%**, toàn frontend **60.22%**. Typecheck, lint và định dạng đạt. Hai script unit/integration đã chọn cả test admin. [Phạm vi và bằng chứng kiểm thử mới](admin_frontend_tests_2026_10_16.md).

Chưa chạy lại build/trình duyệt hoặc xác nhận CI cho đợt này. Chưa staging/commit/push. Các mục ngày 2026-10-15 bên dưới là lịch sử.

Sau đó người dùng yêu cầu commit local, chưa push: kiểm tra lại 200/200 test (32 tệp, 31.08s), typecheck/lint/format và commitlint đều đạt. Chỉ đưa test, script chạy test và tài liệu vào commit `test(admin): AGRI-80 add frontend unit and integration tests`; không đưa thư viện, dependency/lockfile hoặc đầu ra sinh tự động vào commit. Chi tiết trong mục kiểm tra trước commit của báo cáo mới.

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
| Điều hướng | Thanh biểu tượng trên máy tính chỉ mở/thu gọn bằng nút ở header; di động dùng Sheet. |
| Khả năng tiếp cận | Tên điều khiển rõ ràng, tiêu điểm bàn phím, bảng số liệu chi tiết, vùng bấm tối thiểu 44px và chế độ giảm chuyển động. |

## Báo cáo chi tiết

- [Số liệu ưu tiên và hành động trên tổng quan](admin_overview_statistics_2026_10_21.md).

- [Bố cục admin trong viewport, 2026-10-21](admin_viewport_layout_2026_10_21.md).

- [Unit test và integration test frontend admin](admin_frontend_tests_2026_10_16.md).
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

Tinh chỉnh lịch/biểu đồ Tổng quan (2026-10-21): bỏ hàng nút chế độ, chọn tháng/năm bằng tiêu đề; cột mảnh và nhãn cùng ô, thu gọn bố cục để desktop không cuộn. **226/226** frontend (38 tệp, 33.09s), Biome năm tệp, build/TypeScript, đo căn nhãn sáu viewport và **118 lượt/10 viewport** đạt. Coverage tập trung lịch/biểu đồ **87.62% branch** qua chín test. [Chi tiết mới nhất](admin_calendar_filter_2026_10_21.md#điều-chỉnh-tiếp-theo--tiêu-đề-lịch-biểu-đồ-và-chiều-cao).

Lịch lọc ngày/tháng/năm (2026-10-21): lọc số phát sinh và ảnh gần đây theo UTC+7, có bỏ lọc, giữ trạng thái hiện tại tách rõ. **224/224** frontend (37 tệp, 30.46s), Biome chín tệp, build/TypeScript, browser lọc sáu viewport và hồi quy **118 lượt/10 viewport** đạt. Coverage tập trung lịch/logic thời gian **93.85% branch** qua 12 test; [chi tiết và giới hạn cuộn khi mở lịch](admin_calendar_filter_2026_10_21.md).

Tìm kiếm onChange 500ms (2026-10-21): áp dụng chung cho Người dùng, Phiên đăng nhập và Ảnh đã tải lên; giữ submit ngay, hủy timer cũ và reset trang khi query đổi. **221/221** frontend (37 tệp, 30.72s), Biome hai tệp, build/TypeScript và browser cả ba trang tại 1280/768/375px đạt. [Chi tiết](admin_search_2026_10_21.md).

Sửa điều hướng logo admin (2026-10-21): logo về Tổng quan trong workspace (`/admin`), không qua trang giới thiệu nên không khởi động lại xác thực/màn chào. **216/216** frontend (37 tệp, 24.73s), Biome hai tệp, build/TypeScript và browser 1280/768/375px đạt. [Chi tiết](admin_login_entrance_2026_10_15.md#2026-10-21--sửa-logo-quay-về-tổng-quan).

Đồng bộ logo/tải lại/tạm biệt admin (2026-10-21): dùng logo lá và hiệu ứng tải lại bên user, giữ màn chào sau đăng nhập; đăng xuất xóa phiên ngay, hiện lời tạm biệt bốn giây không có thanh tiến trình. **215/215** frontend (37 tệp, 23.76s), Biome sáu tệp và build/TypeScript đạt. Chi tiết, kiểm tra trình duyệt và giới hạn ở [báo cáo màn chào](admin_login_entrance_2026_10_15.md#2026-10-21--đồng-bộ-logo-tải-lại-và-tạm-biệt-admin).

Yêu cầu tiếp theo 2026-10-21: bỏ hẳn bộ chọn và logic 7/30 ngày, giữ biểu đồ cố định bảy ngày gần nhất. **212/212** frontend (36 tệp, 26.66s), Biome sáu tệp và build/TypeScript đạt. [Chi tiết](admin_overview_statistics_2026_10_21.md). Các yêu cầu giữ bộ chọn và kiểm tra chuyển kỳ bên dưới là lịch sử.

Theo ảnh yêu cầu tiếp theo 2026-10-21, đã bỏ mô tả/thông báo lặp ở bốn trang admin; giữ tiêu đề và điều khiển thống kê. **212/212** frontend (36 tệp, 27.18s), Biome bốn tệp, build/TypeScript và kiểm tra bốn view ở desktop/phone đạt. [Chi tiết](admin_overview_statistics_2026_10_21.md). Dữ liệu vẫn là mock; chưa commit/push.

Cân bố cục tổng quan 2026-10-21: màn hình desktop cao từ 900px mở lịch mặc định, ảnh/biểu đồ/đệm lớn hơn; màn hình thấp giữ gọn, lựa chọn lịch thủ công được giữ. **212/212** frontend, build/TypeScript, Biome 5 tệp và **128 lượt browser/10 viewport** đạt. Component lịch mới đạt 87.5% branch coverage trong lượt 3 test. [Bằng chứng](admin_overview_statistics_2026_10_21.md). Số liệu bên dưới là các lượt trước.

Bổ sung ưu tiên tổng quan 2026-10-21: hôm nay, phiên còn hiệu lực, Cần chú ý, kỳ 7/30 ngày và cập nhật cục bộ; lịch thu gọn. **209/209** frontend đạt; coverage tập trung **8/8**, hai tệp UI/tính toán đạt 100% branch; Biome 9 tệp, build/TypeScript và 92 lượt browser qua 7 viewport đạt. [Chi tiết và giới hạn mock](admin_overview_statistics_2026_10_21.md). Các số liệu dưới đây thuộc các lượt trước.

Điều chỉnh tiếp theo 2026-10-21: tổng quan trở lại bố cục liên tục, không phân trang; bỏ khối quản lý/tài khoản/phiên gần đây trùng nội dung, giữ ba số liệu/biểu đồ, ảnh và lịch. Phân trang danh sách giữ nguyên. Frontend mới **205/205**, 33 tệp, 28.02s đạt; Biome sáu tệp và build/TypeScript đạt. Xem [phần điều chỉnh tổng quan](admin_viewport_layout_2026_10_21.md). Các số 207 test và coverage phân trang tổng quan dưới đây thuộc lượt triển khai trước.

Bổ sung bố cục viewport 2026-10-21: frontend 207/207 đạt (34 tệp, 22.75s), hai component/hook mới đạt 100% branch coverage trong lượt đo tập trung 17 test; Biome 14 tệp và build/TypeScript đạt. [Chi tiết và giới hạn](admin_viewport_layout_2026_10_21.md). Các lượt sidebar/màn chào dưới đây là bằng chứng riêng của các thay đổi trước đó.

Bổ sung 2026-10-21: nút sidebar đã kiểm tra RED/GREEN, toàn bộ frontend **205/205** đạt (33 tệp, 23.05s, timeout 15s và môi trường Docker đủ ignore-file); Biome 3 tệp, build/TypeScript và Chromium 1280/768/375px đạt. Xem [báo cáo sidebar cập nhật](admin_hover_rail_2026_10_15.md). Chưa đo coverage mới hay xác nhận CI; các số liệu tiếp theo là lịch sử.

Kết quả dưới đây thuộc lần triển khai trước khi dọn tài liệu, không phải kiểm thử chạy lại trong đợt chỉnh văn bản này:

- Toàn bộ frontend: **174/174 kiểm thử**, 28 tệp, đạt trong 30.41s với `corepack pnpm test --maxWorkers=2`.
- Typecheck, lint và định dạng đạt; lint/format toàn bộ 159 tệp.
- Bản dựng frontend production đạt; 11 trang tĩnh và hai đường dẫn động.
- Chromium tại 1280/768/375px: đăng nhập Admin, trang mock, tải lại và đăng xuất cục bộ đạt; không tràn ngang hay lỗi trang.
- Nguồn: [báo cáo frontend mock](admin_mock_frontend_2026_10_15.md), kết quả trình duyệt `.cache/admin-original/browser-result.json` và ảnh cùng thư mục bị Git bỏ qua.

DoD tổng thể chưa được xác nhận; chưa có kết quả CI hay số đo bao phủ mới cho trạng thái hiện tại. Đợt này chỉ dọn nội dung tài liệu theo phạm vi frontend, không sửa mã ứng dụng và không chạy lại kiểm thử/build. Chưa commit/push.

Kiểm tra tài liệu ngày 2026-10-15 đạt: còn 12 báo cáo và 1 nhật ký, đã bỏ 5 tài liệu ngoài phạm vi; quét nội dung không còn mục ngoài frontend, liên kết nội bộ hợp lệ, mã hóa và `git diff --check` đạt. Đối chiếu xác nhận mã ứng dụng/thiết kế không đổi trong đợt này. Bằng chứng cục bộ bị Git bỏ qua: `.cache/agri80-doc-cleanup/result.json`.
