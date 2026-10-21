# AGRI-80 — Số liệu ưu tiên trên tổng quan admin

Ngày: 2026-10-21. Nhánh xác nhận: `AGRI-80-create-crm-admin-page`. Phạm vi: frontend mock có sẵn; không đổi backend/API, dữ liệu lưu bền hoặc AI.

## Hành vi

- Giữ ba tổng tích lũy người dùng/ảnh/phiên, thêm phát sinh hôm nay theo UTC+7. Tổng tích lũy không đổi khi chọn khoảng thời gian biểu đồ.
- Phân biệt số phiên còn hiệu lực với tổng phiên: chỉ tính trạng thái Active, chưa có endedAt, đã bắt đầu và expiresAt lớn hơn thời điểm cập nhật. Không gọi đây là số người online.
- Thêm Cần chú ý: số tài khoản đang bị khóa và tổng cảnh báo đã gửi, trạng thái không có dữ liệu cần chú ý và liên kết tới trang tài khoản/phiên. Không giả định cảnh báo đã gửi là cảnh báo chưa xử lý.
- Chọn 7/30 ngày cho cả ba biểu đồ và bảng dữ liệu; tính từ bản ghi mock hiện có, không sinh thêm lịch sử. Bỏ qua timestamp không hợp lệ hoặc tương lai trong phát sinh theo ngày. Biểu đồ 30 ngày dùng khoảng cách cột nhỏ hơn theo token.
- Hiển thị thời điểm cập nhật giờ Việt Nam. Nút làm mới tính lại từ dữ liệu mock hiện có và thời điểm hiện tại; có thông báo trợ năng, không gọi API hay đặt lại dữ liệu để mô phỏng đồng bộ backend.
- Thu lịch vào details, bỏ mô tả/footer lặp ở riêng tổng quan, giữ thông báo mock. Không phân trang tổng quan. Các trang danh sách và nút sidebar giữ hành vi hiện tại; vùng cuộn dự phòng giữ nội dung trên màn hình nhỏ, lịch/bảng mở rộng.

## Đường dẫn

- Tính số liệu: `frontend/src/features/admin/adminOverviewStats.ts`, test cùng tên `.test.ts`.
- UI: `AdminOverview.tsx`, `AdminOverview.test.tsx`, `AdminMetricChart.tsx`, `AdminCrmPage.tsx`, `frontend/src/index.css`.
- Hồi quy: `AdminCrmPage.test.tsx`, `AdminCrmPage.integration.test.tsx`, browser script `frontend/tests/browser/admin_viewport.py`.

## Kiểm chứng thực tế

- RED: component test không tìm thấy số hôm nay; suite helper chưa resolve được module mới. Container `agri80-stats-red` exit 1; log `.cache/admin-stats-red.log`. Đây là trạng thái trước triển khai, không phải kết quả đạt.
- Toàn bộ frontend: **209/209**, 35 tệp, **28.75s**, container `agri80-stats-green` exit 0; `pnpm test --maxWorkers=2 --testTimeout=15000`, log `.cache/admin-stats-green.log`. Docker có bản sao root ignore-file như các lượt trước.
- Sau sửa type trong fixture/test và reducer theo kiểu dữ liệu: **8/8** test tập trung, ba tệp, **2.80s**, container `agri80-stats-coverage` exit 0. `AdminOverview.tsx` và `adminOverviewStats.ts` đạt **100% branch/statement/function/line**, không phải coverage toàn frontend. Log `.cache/admin-stats-coverage.log`.
- Unit kiểm tra mốc nửa đêm Việt Nam, loại thời điểm tương lai/không hợp lệ, 7/30 ngày, số 0, ended/expired/future sessions; component test kiểm tra đổi kỳ, refresh sang ngày mới và điều hướng callback. Integration dùng provider thật kiểm tra khóa tài khoản làm số khóa tăng và phiên hiệu lực giảm; gửi hai cảnh báo làm tổng cảnh báo tăng, không còn trạng thái zero.
- Biome check/format **9 tệp** đạt. Production build/TypeScript đạt sau sửa hai lỗi type của test (`exact` không thuộc ByRoleOptions, fixture thiếu warningCount); log lần đầu `.cache/admin-stats-build-first.log`, log cuối `.cache/admin-stats-build.log`. Không nới type/lint để bỏ qua lỗi.
- Chromium: **92 lượt kiểm tra**, bảy viewport 1440×900, 1366×768 sidebar mở, 1280×720, 1024×768, 768×900, 375×812, 844×390. Bốn viewport desktop không cần cuộn tổng quan với cả kỳ 7/30 ngày khi lịch/bảng đóng; document không cuộn/tràn ngang. Tablet/phone xếp dọc và landscape thấp cuộn bên trong. Lịch mở/đóng, làm mới, Xem ảnh và mọi phân trang 12/3/3 bản ghi dùng được; không lỗi trang. Kết quả `.cache/admin-stats/results.json`, ảnh cùng thư mục; đã xem ảnh 1280×720. API/tài khoản trong browser dùng fixture.

Lần xác nhận đầy đủ cuối cùng của đợt số liệu sau các sửa type/fixture: **209/209**, 35 tệp, **22.80s**, bắt đầu 13:02:36 UTC, `agri80-stats-green` exit 0; `.cache/admin-stats-green.log`. Bản dựng ở mốc đó compile 3.6s/TypeScript 762ms đạt. Đã xem thêm ảnh 375×812 và 1366×768 kỳ 30 ngày; tại thời điểm ghi mốc chưa có thay đổi mã sau kiểm tra.

## Điều chỉnh cân bố cục sau khi người dùng chấp thuận

Ngày 2026-10-21: giữ nguyên số liệu/chức năng, giảm cảm giác trống bằng ảnh xem trước và cột biểu đồ lớn hơn, khoảng đệm tiêu chuẩn trên màn hình desktop cao. CSS chỉ áp dụng từ 1024px rộng và 900px cao; màn hình thấp giữ các kích thước gọn trước đó. Token mới trong `frontend/src/index.css`: `--admin-overview-tall-preview-height`, `--admin-overview-tall-chart-height`.

`AdminOverviewCalendar.tsx` tách lịch responsive bằng `useSyncExternalStore`: tự mở khi đủ chỗ, tự thu khi không đủ nếu chưa có lựa chọn thủ công. Lựa chọn đóng/mở của người dùng được giữ qua resize và render lại; listener được dọn khi unmount. Nhãn summary là Lịch tháng, biểu tượng phản ánh trạng thái. Không thêm dữ liệu hoặc panel để lấp khoảng trống.

Kiểm chứng mới của đợt cân bố cục:

- RED hợp lệ với lịch cũ luôn đóng: 1 ca tự mở thất bại, 2 ca còn lại đạt; `.cache/admin-balance-red.log`, container `agri80-balance-red` exit 1. Trước đó đã sửa assertion dùng visibility thay cho role presence vì jsdom vẫn tìm thấy region trong details đóng.
- Frontend **212/212**, 36 tệp, **27.19s**, container `agri80-balance-green` exit 0; `.cache/admin-balance-green.log`, lệnh `pnpm test --maxWorkers=2 --testTimeout=15000`.
- Component lịch: **3/3**, **1.24s**, coverage **87.5% branch**, 100% line, 93.33% statement, 85.71% function; `agri80-balance-coverage` exit 0, `.cache/admin-balance-coverage.log`. Đây là coverage riêng component mới, không phải toàn frontend. Kiểm tra tự mở/thu, manual override, cleanup và fallback khi thiếu matchMedia.
- Biome check/format **5 tệp** đạt; production build/TypeScript đạt, `.cache/admin-balance-build.log`. Thay đổi cuối trước kiểm chứng chỉ sửa callback test để đạt lint, không đổi logic ứng dụng.
- Browser **128 lượt**, **10 viewport**: 1920×1080, 1440×900, 1280×900, 1440×899, 1366×768 sidebar mở, 1280×720, 1024×768, 768×900, 375×812, 844×390. Kiểm tra default open theo đúng ngưỡng 899/900px, ảnh lớn hơn trên màn hình cao, cả kỳ 7/30 ngày, đóng thủ công rồi đổi kỳ vẫn đóng, làm mới, lịch và phân trang. Bảy viewport desktop không cuộn tổng quan ở trạng thái mặc định; màn hình nhỏ giữ fallback cuộn bên trong. Không tràn document/ngang hoặc lỗi trang. Nguồn `.cache/admin-balance/results.json`, ảnh cùng thư mục; đã xem ảnh 1920×1080.

Chỉ cập nhật service frontend localhost:3000; không đổi backend, dữ liệu, stash hay commit/push. Những số 209 test và các chế độ lịch luôn thu gọn phía trên thuộc lượt triển khai trước điều chỉnh này.

Build cân bố cục compile 5.1s/TypeScript 1672ms đạt. Đã xem thêm ảnh 1280×900 lịch tự mở và 1440×899 lịch mặc định thu gọn; các số đo kích thước và thao tác tay đều đạt trong script cuối.

## Giới hạn

## Bỏ chức năng chọn kỳ thống kê

Theo yêu cầu tiếp theo ngày 2026-10-21, xóa nút 7/30 ngày, state/callback chọn kỳ trong `AdminOverview.tsx`, tham số kỳ của `buildAdminOverviewStats` và nhánh hỗ trợ 30 ngày. Biểu đồ và bảng luôn lấy bảy ngày gần nhất; tổng tích lũy, phát sinh hôm nay, phiên hiệu lực, Cần chú ý và cập nhật cục bộ giữ nguyên. Đồng thời bỏ data-dense/CSS chỉ dùng cho biểu đồ 30 ngày; không chỉ ẩn các nút. Hàng timestamp/làm mới căn phải.

Sửa `AdminOverview.test.tsx`, `adminOverviewStats.test.ts`, `frontend/tests/browser/admin_viewport.py`: kiểm tra không còn bộ chọn, bảng vẫn bảy ngày, dữ liệu cũ vẫn nằm trong tổng tích lũy nhưng không vào biểu đồ gần đây. RED một test thất bại đúng vì bộ chọn còn tồn tại, `.cache/admin-period-red.log`. Sau sửa, toàn bộ frontend **212/212**, 36 tệp, **26.66s**, `agri80-period-green` exit 0; `.cache/admin-period-green.log`. Biome sáu tệp đạt. Production build/TypeScript đạt (4.6s compile/774ms TypeScript), `.cache/admin-period-build.log`; đã cập nhật riêng frontend localhost:3000. Không đo coverage mới; các số coverage phía trên thuộc các lượt trước.

Nội dung giữ/chuyển 7/30 ngày ở các mục trước là lịch sử đã bị yêu cầu mới thay thế. Không đổi backend, dữ liệu hoặc stash; không commit/push.

Browser cuối **118 lượt/10 viewport** đạt, `.cache/admin-period/results.json`, script `frontend/tests/browser/admin_viewport.py` exit 0: không còn nút chọn kỳ, mỗi biểu đồ có đúng bảy cột, làm mới và lịch vẫn dùng được; đóng lịch thủ công rồi làm mới không mở lại. Không tràn/cuộn document hoặc lỗi trang; desktop không cần cuộn nội dung mặc định, màn hình nhỏ giữ fallback. Đã xem ảnh 1280×720 trong `.cache/admin-period/`.

## Bỏ mô tả và thông báo lặp theo ảnh tham chiếu

Yêu cầu tiếp theo ngày 2026-10-21: bỏ thông báo mock dưới tiêu đề ở cả bốn view, mô tả trang người dùng/ảnh/phiên và đoạn giải thích bổ sung của danh sách phiên. Sửa `AdminCrmPage.tsx`, `AdminSessions.tsx`; bỏ trường description không còn dùng. Giữ tiêu đề, bộ chọn 7/30 ngày, chức năng thống kê và dữ liệu mock. Các nội dung thao tác/nguồn dữ liệu ở phần khác không nằm trong ảnh không bị xóa hàng loạt.

Hai tệp test `AdminCrmPage.test.tsx` và `AdminCrmPage.integration.test.tsx` chờ tiêu đề để xác định workspace sẵn sàng thay cho đoạn thông báo đã bỏ. Regression hiện có xác nhận không còn note: RED 1 ca thất bại/7 đạt trước sửa, `.cache/admin-copy-red.log`. Toàn bộ frontend cuối **212/212**, 36 tệp, **27.18s**, container `agri80-copy-green` exit 0; `.cache/admin-copy-green.log`. Biome bốn tệp đạt. Production build/TypeScript đạt (compile 4.6s, TypeScript 895ms), `.cache/admin-copy-build.log`; đã cập nhật riêng service frontend localhost:3000.

Browser kiểm tra cả bốn view tại 1280×720 và 375×812: các dòng được yêu cầu không còn, tiêu đề/bộ chọn 7/30 ngày vẫn hoạt động, không tràn document; `.cache/admin_copy_check.py` exit 0, ảnh `.cache/admin-copy-1280.png`, `.cache/admin-copy-375.png`. Không đo coverage mới cho thay đổi copy. Không commit/push hoặc thay backend/stash. Các mô tả giữ thông báo ở những mục trước là lịch sử đã được yêu cầu mới thay thế.

Chỉ cập nhật service frontend localhost:3000. Số liệu vẫn là mock; chưa có API thống kê, đồng bộ server, tỷ lệ AI hoặc online presence. Không đo backend, không xác nhận CI/thiết bị thật. Chưa commit/push; giữ nguyên stash và các thay đổi trước đó.
