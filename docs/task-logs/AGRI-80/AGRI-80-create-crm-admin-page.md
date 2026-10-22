# AGRI-80 - Giao diện quản trị frontend mock

## Màn hình chào admin giống user — 2026-10-21

Theo yêu cầu, thêm AdminLoginSuccessScreen/CSSmodule và logo lá đã duyệt, AppProvider chọn
riêng Admin. Cây non/vòng tròn/hai sóng/progress/tên thật, chờ4giây kể cảreduced; pausehidden,
cleanup/error/retry/cancel; User/auth/API giữ luồng cũ. Thêm3motiontokens/DESIGN và tests.
RED thiếucomponent; initial11/13 vì startupadminwait1s, sửa expectations đúng4s. Final13/13,
4files10,98s11:42:23UTCexit0; coveragecomponent10/10branches100% (trước đổi riênglogopath),
Biome7files/detector[]/finalbuildcompile3,9sTS1021ms và browser5sizes/fresh-restored/gate/reduced/
hidden/dashboard đạt. [Paths/evidence/limits](../../reports/AGRI-80/admin_login_entrance_2026_10_15.md#follow-up--seedling-welcome-2026-10-21).
Không fullsuite/CI/backend thật, không commit/push/DB; stashAGRI-57 vẫn nguyên.

- Nhánh đã xác minh: `AGRI-80-create-crm-admin-page`.
- Ngày cập nhật: 2026-10-16.
- Người phụ trách/người duyệt: không suy đoán từ hội thoại.
- Pull request: chưa tạo cho đợt chỉnh sửa hiện tại.
- [Mục lục báo cáo](../../reports/AGRI-80/README.md).

## Bổ sung unit test và integration test — 2026-10-16

- Thêm 26 ca kiểm thử cho hành vi frontend hiện có: 22 unit test cho provider/danh sách/hộp thoại, 4 integration test render toàn trang admin và kiểm tra trạng thái giữa các mục. Chỉ giả lập HTTP xác minh tài khoản và router; giữ provider, component và hộp thoại thật.
- Đường dẫn: bốn tệp `AdminMockProvider.unit.test.tsx`, `AdminRecordList.unit.test.tsx`, `AdminActionDialog.unit.test.tsx`, `AdminCrmPage.integration.test.tsx` trong `frontend/src/features/admin/`. Cập nhật script unit/integration ở `frontend/package.json`; không thêm thư viện/đổi lockfile hay mã giao diện.
- Kiểm tra mới: unit 60/60 (7 tệp), integration 12/12 (2 tệp), bộ frontend kèm coverage 200/200 (32 tệp, 96.30s). Typecheck/lint/format đạt, 163 tệp.
- Coverage nhánh admin 80.79%; toàn frontend 898/1491 = 60.22%, vượt sàn 25% nhưng chưa đạt mục tiêu toàn frontend 80%. Nguồn: lần chạy V8 và `.cache/coverage/frontend/coverage-summary.json` bị Git bỏ qua.
- [Báo cáo chi tiết](../../reports/AGRI-80/admin_frontend_tests_2026_10_16.md). Không chạy lại build/trình duyệt, chưa xác nhận CI; chưa staging/commit/push đợt test này. Các mục trước đó bên dưới là lịch sử; DoD tổng thể chưa xác nhận.

## Chuẩn bị commit kiểm thử local — 2026-10-16

- Người dùng yêu cầu commit chuẩn project, không commit thư viện và chưa push. Chọn đúng 8 tệp: bốn test mới, ba tài liệu AGRI-80 và `frontend/package.json` chỉ đổi scripts.
- Kiểm tra mới trước commit: `corepack pnpm test --maxWorkers=2` đạt 200/200, 32 tệp trong 31.08s; typecheck/lint/format 163 tệp đạt. Không chạy lại coverage/build/trình duyệt trong bước commit này.
- Thông điệp `test(admin): AGRI-80 add frontend unit and integration tests`; commitlint đạt 0 lỗi/0 cảnh báo, `git diff --check` đạt. Không đưa thư viện/skill, dependency/lockfile, cache, đầu ra build hoặc dữ liệu cục bộ vào commit. Các dòng chưa commit ở mục bổ sung kiểm thử phía trên là trạng thái trước yêu cầu commit.

## Chuẩn bị commit local — 2026-10-15

- Người dùng yêu cầu commit chuẩn quy định, không đưa thư viện vào commit. Xác minh nhánh AGRI-80, đọc skill git-commit/quy tắc dự án và kiểm tra phần stage trước thao tác.
- Thông điệp: `refactor(admin): AGRI-80 use frontend mocks for administration`; commitlint đạt với 0 lỗi/0 cảnh báo. Mã và tài liệu được nhóm thành một thay đổi phạm vi quản trị mock.
- Kiểm tra mới: typecheck, lint/format 159 tệp đạt; toàn bộ frontend 174/174 trong 28 tệp đạt 69.84s với `--maxWorkers=2`. Không coi build/trình duyệt trước đó là lần chạy mới của bước commit.
- Chỉ stage đường dẫn đã duyệt; loại thư mục thư viện/skill, node_modules, đầu ra build/cache, dependency/lockfile, bí mật và bản nháp cục bộ. Giữ bằng chứng kiểm tra trong `.cache/agri80-mock-commit/` bị Git bỏ qua. Không push, sửa PR hay đổi Jira trong yêu cầu commit này. Các dòng chưa commit/push ở mục lịch sử bên dưới mô tả thời điểm ghi nhận tương ứng.

## 1. Phạm vi hiện tại

Task chỉ xây dựng giao diện mock tại `/admin`: tổng quan, người dùng, ảnh và phiên đăng nhập. Dữ liệu minh họa nằm trong bộ nhớ; tìm kiếm, phân trang và các hộp xác nhận dùng được trên mẫu. Khóa/khôi phục/cảnh báo/cưỡng chế đăng xuất/xóa ảnh chỉ mô phỏng; tải lại trang đặt lại trạng thái.

Giữ luồng đăng nhập Admin có sẵn, xác minh vai trò và hiệu ứng logo/lời chào trước khi vào trang. Đăng xuất xóa thông tin phiên trong trình duyệt và quay về `/`.

Giữ Manrope, bảng màu xanh/nền ấm, khung nổi, thanh biểu tượng mở theo rê chuột/tiêu điểm, Sheet di động, lịch và biểu đồ bảy ngày. Địa chỉ hiện tại: **http://localhost:3000**.

## 2. Đường dẫn frontend

- Điểm vào: `frontend/src/app/(admin)/admin/page.tsx`.
- Khung và kiểm tra truy cập: `frontend/src/features/admin/AdminCrmPage.tsx`, `AdminAccess.tsx`.
- Dữ liệu mẫu: `AdminMockProvider.tsx`, `adminTypes.ts`.
- Màn hình: `AdminOverview.tsx`, `AdminOverviewPanels.tsx`, `AdminUsers.tsx`, `AdminImages.tsx`, `AdminSessions.tsx`.
- Thành phần dùng lại: `AdminRecordList.tsx`, `AdminActionDialog.tsx`, `AdminCalendar.tsx`, `AdminMetricChart.tsx`, `AdminMotion.tsx`, `useAdminRail.ts`.
- Giao diện dùng chung: `frontend/src/index.css`, `frontend/src/providers/AppProvider.tsx` và luồng đăng nhập sẵn có.
- Kiểm thử: `AdminCrmPage.test.tsx`, `AdminCalendar.test.tsx`, `frontend/src/App.adminEntrance.test.tsx`, `frontend/src/App.startup.test.tsx` và bộ frontend hiện có.

Tên tệp ngắn phía trên nằm trong `frontend/src/features/admin/`.

## 3. Kết quả gần nhất đã ghi nhận

Các kết quả này thuộc lần triển khai trước khi dọn tài liệu, không phải kiểm thử mới trong đợt chỉnh văn bản:

- `corepack pnpm test --maxWorkers=2`: **174/174 kiểm thử**, 28 tệp, đạt trong 30.41s.
- Typecheck, lint và định dạng đạt; lint/format toàn bộ 159 tệp.
- Frontend production build đạt; biên dịch 5.4s, TypeScript 1129ms, 11 trang tĩnh/hai đường dẫn động. Không coi thời gian một lần dựng là chuẩn hiệu năng.
- Chromium tại 1280/768/375: đăng nhập Admin theo luồng có sẵn, hiển thị mock, tải lại và đăng xuất cục bộ đạt; không tràn ngang/lỗi JavaScript.
- Các ca giao diện mock bao phủ tìm kiếm/rỗng, khóa tài khoản trong bộ nhớ, xóa ảnh mẫu, đặt lại khi gắn lại trang, giữ điều hướng rê chuột/tiêu điểm và xóa thông tin phiên khi đăng xuất.
- Bằng chứng bị Git bỏ qua: `.cache/admin-original/browser-result.json`, `admin_{1280,768,375}.png`; kiểm tra thao tác mẫu ở đợt trước nằm trong `.cache/admin-mock/browser-result.json` và ảnh cùng thư mục.

Chi tiết: [báo cáo frontend mock](../../reports/AGRI-80/admin_mock_frontend_2026_10_15.md).

## 4. Nhật ký frontend theo từng mốc

### 2026-10-12 — Bản xem trước đầu tiên

Tạo giao diện CRM có tổng quan, người dùng và yêu cầu hỗ trợ; 8 người dùng/6 yêu cầu là dữ liệu giả. Tìm/lọc/phân trang, hồ sơ chỉ đọc, sửa trạng thái/ghi chú trong bộ nhớ và thông báo dữ liệu mẫu hoạt động. Dùng Button/Input/Label/Select/Badge/Dialog/Sheet/Textarea hiện có.

Sáu kiểm thử RED rồi 6/6 GREEN trong 81.95s sau bổ sung giả lập phương thức jsdom trong phạm vi kiểm thử. Sửa nhãn aria và tùy chọn exact không hỗ trợ. Dev kiểm tra timeout khi trang đang biên dịch, không tính là trình duyệt đạt. [Báo cáo tiến trình](../../reports/AGRI-80/admin_crm_ui.md).

### 2026-10-13 — Kiểm chứng đáp ứng và điều chỉnh phạm vi

- Xem ảnh 375/768/1280 phát hiện trạng thái/ngày yêu cầu bị ẩn trên di động; thêm hồi quy thứ bảy RED rồi GREEN, dùng fieldset ngữ nghĩa và huy hiệu ưu tiên trung tính.
- Toàn bộ 167/167 frontend, 26 tệp đạt 63.69s; nhóm CRM cuối 7/7 đạt 6.81s. Nhánh 703/1252=56.15% qua ngưỡng 25%. Typecheck/lint/format 148 tệp và build đạt. Đây là số đo lịch sử, không đại diện cho bản mock hiện tại.
- Người dùng từng yêu cầu trang sạch: bỏ dữ liệu sinh sẵn và mô phỏng lưu, chuyển số liệu chưa biết thành dấu gạch ngang. Bốn hồi quy trạng thái rỗng thay bảy ca mẫu cũ; toàn bộ 164/164, 26 tệp đạt 62.36s; nhánh 664/1205=55.10%; typecheck/lint/format 146 tệp và build đạt.
- Tiếp đó bỏ phần yêu cầu hỗ trợ, chỉ giữ người dùng/ảnh/phiên. Thêm AdminImages/AdminSessions, bỏ AdminRequests và các nhóm hỗ trợ/ưu tiên/cây trồng. Năm ca hành vi đạt sau RED; toàn bộ 165/165, 26 tệp đạt 55.88s; typecheck/lint/format 147 tệp và build đạt.
- Chromium xác nhận điều hướng/trạng thái rỗng/tải lại, không tràn ngang/lỗi trang. Các trạng thái rỗng ở mốc này đã được thay bằng dữ liệu mock theo yêu cầu hiện hành.

### 2026-10-14 — Điều hướng sau đăng nhập và nút đăng xuất

Thêm chuyển trang theo vai trò trong frontend: Admin tới `/admin`, User giữ `/home`, không chờ dữ liệu khởi động User khi vào admin. Hai ca Admin RED rồi GREEN; bộ đầy đủ 170/170, 26 tệp đạt 42.33s. Typecheck/lint 150 tệp và định dạng tệp sửa đạt.

Thay liên kết về ứng dụng bằng nút Đăng xuất trên máy tính/Sheet. Bộ frontend ở mốc giao diện đó 173/173, 26 tệp đạt 58.54s. Hành vi hiện hành là đăng xuất cục bộ như phần phạm vi phía trên. [Báo cáo luồng đăng nhập](../../reports/AGRI-80/admin_login_mapping_2026_10_14.md).

### 2026-10-15 — Các lần điều chỉnh giao diện

| Đợt | Thay đổi frontend | Kết quả lịch sử |
| --- | --- | --- |
| Tổng quan theo ảnh tham chiếu | Khung nổi, thanh 112px, nhóm số liệu/ảnh/phiên và hiệu ứng vào hữu hạn | 180/180, 26 tệp, 57.29s; nhóm admin cuối 14/14, 7.81s. |
| Lịch/biểu đồ | Lịch tháng, điều hướng/hôm nay UTC+7, biểu đồ và bảng bảy ngày | 184/184, 27 tệp, 59.19s. |
| Thanh tách riêng | Khoảng cách 20px, nút đóng/mở toàn thanh và thu hồi 132px | 185/185, 27 tệp, 51.19s. |
| Thanh biểu tượng | Mặc định 72px dùng được, mở rộng 224px hiện chữ; nội dung chênh 152px | 185/185, 27 tệp, 57.76s. |
| Rê chuột/tiêu điểm | Bỏ nút đầu trang, chỉ thu khi cả con trỏ và tiêu điểm rời thanh | 186/186, 27 tệp, 54.17s. |
| Mật độ gọn | Giảm đệm/cỡ chữ/lịch/biểu đồ, giữ nút 44px | Nhóm admin/lịch 20/20, 2 tệp, 12.37s; không chạy lại bộ đầy đủ cho đợt khoảng cách. |
| Hiệu ứng đăng nhập | Chờ entranceReady trước chuyển Admin, giữ giảm chuyển động | 188/188, 28 tệp, 66.49s; nhóm chọn 11/11, 13.58s. |

Các báo cáo tương ứng được liên kết trong [mục lục](../../reports/AGRI-80/README.md). Mốc mật độ đo tại 1280x900: thẻ 388→276px (-28.9%), lịch 441→297px (-32.7%), đầu trang 87→71px, tài khoản 240→192px. Đã kiểm tra đáp ứng, bàn phím, rê chuột và giảm chuyển động theo từng báo cáo; không gộp thành chứng nhận thiết bị thật.

### 2026-10-15 — Chốt bản mock và địa chỉ cục bộ

Người dùng chốt chỉ cần frontend mock, vẫn giữ đăng nhập Admin có sẵn. Tạo AdminMockProvider và kiểu cục bộ; dùng mẫu cho tổng quan/biểu đồ/danh sách và mô phỏng các thao tác quản lý. Giữ hình thức trang, thông báo dữ liệu minh họa và đặt lại khi tải lại.

Hồi quy đăng xuất cục bộ RED trước sửa; bộ cuối 174/174 đạt như phần kết quả gần nhất. Công cụ trình duyệt từng tải lại ngay khi URL vừa đổi nên chưa đạt; thêm chờ trang sẵn sàng rồi toàn bộ kiểm tra đạt, không sửa giao diện để né lỗi.

Tạm chạy ở 13090 khi 3000 bị chiếm, sau đó chuyển về 3000 theo yêu cầu và xác nhận HTTP 200. Bản đang dùng là http://localhost:3000.

### 2026-10-15 — Dọn tài liệu theo phạm vi frontend

Theo yêu cầu mới nhất, bỏ các báo cáo và nội dung ngoài phạm vi giao diện; giữ báo cáo frontend, các kết quả lịch sử liên quan và nhật ký này. Việc này thay yêu cầu giữ toàn bộ nội dung lịch sử trước đó. Cập nhật mục lục/liên kết, kiểm tra nội dung còn lại và diff; không sửa mã ứng dụng hay chạy lại kiểm thử/build trong đợt chỉ chỉnh tài liệu. Trước đó đã Việt hóa tài liệu và bỏ mục hướng dẫn admin khỏi DESIGN.md theo yêu cầu người dùng.

Kiểm tra thực tế của đợt dọn tài liệu đạt: còn 12 báo cáo và 1 nhật ký, xóa 5 tài liệu ngoài phạm vi; không còn nội dung ngoài frontend trong phần giữ lại, không lỗi liên kết nội bộ/mã hóa/khoảng trắng. So sánh diff mã ứng dụng và mã băm các tệp nguồn mới với trước khi dọn xác nhận không đổi; `git diff --check` đạt. Kết quả: `.cache/agri80-doc-cleanup/result.json` bị Git bỏ qua. Đây là kiểm tra tài liệu, không phải lần chạy mới của bộ kiểm thử ứng dụng.

## 5. Giới hạn và việc còn lại

### 2026-10-21 — Bỏ chức năng chọn 7/30 ngày

Xóa selector, state/callback đổi kỳ, tham số tổng hợp 30 ngày và CSS dense không còn dùng. Giữ biểu đồ/bảng cố định bảy ngày gần nhất, số tổng/hôm nay/phiên hiệu lực/Cần chú ý và nút làm mới; timestamp căn phải. Sửa component/helper/test và browser script, không chỉ ẩn nút.

RED một ca thất bại trước sửa; bộ frontend mới 212/212, 36 tệp đạt 26.66s, container exit 0. Biome sáu tệp và production build/TypeScript (4.6s compile/774ms TypeScript) đạt. [Báo cáo và log](../../reports/AGRI-80/admin_overview_statistics_2026_10_21.md). Đã cập nhật riêng frontend localhost:3000; không đo lại coverage, không đổi backend/stash hoặc commit/push.

Browser cuối 118 lượt/10 viewport đạt (`.cache/admin-period/results.json`): không còn selector, biểu đồ đúng bảy cột, lịch/làm mới/phân trang hoạt động, không tràn document. Đã xem ảnh 1280×720; desktop không thêm cuộn, màn hình nhỏ giữ vùng cuộn dự phòng.

### 2026-10-21 — Bỏ mô tả/thông báo theo ảnh

Bỏ note mock dưới tiêu đề ở bốn view, mô tả người dùng/ảnh/phiên và đoạn giải thích bổ sung ở danh sách phiên. Giữ tiêu đề, bộ chọn 7/30 ngày, dữ liệu và thao tác mock. Sửa `AdminCrmPage.tsx`, `AdminSessions.tsx`; hai tệp test đổi readiness sang heading và xác nhận note đã bỏ.

RED 1 thất bại/7 đạt trước sửa; frontend cuối 212/212, 36 tệp, 27.18s, container exit 0. Biome bốn tệp, build/TypeScript (4.6s compile/895ms TypeScript) đạt. Browser cả bốn view ở 1280×720 và 375×812 đạt: không còn các dòng trong ảnh, giữ heading/thống kê, không tràn document. [Báo cáo và log](../../reports/AGRI-80/admin_overview_statistics_2026_10_21.md). Đã cập nhật riêng frontend localhost:3000; không commit/push, đổi backend hoặc stash.

### 2026-10-21 — Cân khoảng trống tổng quan

Theo chấp thuận tiếp theo, tăng kích thước ảnh/biểu đồ và khoảng đệm riêng desktop cao ≥900px, rộng ≥1024px; mở lịch mặc định khi đủ chỗ, giữ compact bên dưới. Thêm `AdminOverviewCalendar.tsx` và test: manual override qua resize/đổi kỳ, cleanup listener, fallback thiếu matchMedia; không thêm panel hoặc dữ liệu lấp chỗ. Sửa `AdminOverview.tsx`, regression test, CSS và browser script.

RED 1 thất bại/2 đạt trước sửa. Bộ frontend mới 212/212, 36 tệp đạt 27.19s (container exit 0); coverage component lịch 3/3 đạt 1.24s, 87.5% branch/100% line. Biome 5 tệp và build/TypeScript đạt. Browser 128 lượt/10 viewport đạt, kiểm tra ngưỡng 899/900px và sidebar mở; desktop không thêm cuộn, màn hình nhỏ dùng vùng cuộn dự phòng. Đã xem ảnh 1920×1080 và cập nhật riêng frontend localhost:3000. [Báo cáo/log](../../reports/AGRI-80/admin_overview_statistics_2026_10_21.md). Không commit/push, không đổi backend hoặc stash.

### 2026-10-21 — Bổ sung số liệu ưu tiên, giữ tổng quan gọn

Thêm phát sinh hôm nay UTC+7, phiên chưa kết thúc/chưa hết hạn, tài khoản bị khóa và cảnh báo đã gửi với liên kết quản lý. Kỳ 7/30 ngày dùng cùng bản ghi mock cho biểu đồ/bảng; làm mới tính lại cục bộ với timestamp và thông báo trợ năng. Thu lịch, bỏ mô tả/footer trùng của tổng quan để giữ chiều cao; không thêm phân trang tổng quan hay số liệu AI/online giả.

Đường dẫn và bằng chứng tại [báo cáo thống kê](../../reports/AGRI-80/admin_overview_statistics_2026_10_21.md). RED được ghi trước sửa; frontend 209/209 (35 tệp, 28.75s) đạt; sau sửa lỗi type fixture/test, coverage tập trung 8/8 (2.80s) đạt, hai tệp mới/cập nhật 100% branch. Biome 9 tệp và production build/TypeScript đạt. Browser 92 lượt/bảy viewport đạt; desktop không cuộn ở 7/30 ngày khi lịch/bảng đóng, màn hình nhỏ có vùng cuộn bên trong. Đã cập nhật riêng frontend localhost:3000. Vẫn mock, chưa có thống kê backend/CI/thiết bị thật; chưa commit/push. Giữ các thay đổi và stash trước đó.

Xác nhận đầy đủ cuối sau sửa type/fixture: 209/209, 35 tệp, 22.80s, bắt đầu 13:02:36 UTC, container exit 0; log `.cache/admin-stats-green.log`. Build cuối compile 3.6s/TypeScript 762ms đạt. Đã xem thêm ảnh phone và desktop kỳ 30 ngày. Không đổi mã sau lượt xác nhận này.

### 2026-10-21 — Giữ tổng quan liên tục, bỏ khối lặp

Theo yêu cầu tiếp theo, bỏ phân trang tổng quan và hai tệp component/test do lượt trước tạo. Giữ ba số liệu/biểu đồ, ảnh, lịch theo cột chính/phụ; bỏ mục quản lý trùng sidebar, tài khoản trùng header, danh sách phiên gần đây đã có trang riêng. Không thay phân trang các danh sách. Chỉnh `AdminOverview.tsx`, `AdminOverviewPanels.tsx`, `AdminMetricChart.tsx`, `AdminCrmPage.tsx`, regression test và token CSS; cập nhật browser script.

RED xác nhận thiếu ảnh/lịch khi tổng quan còn phân trang trước sửa. Bộ mới 205/205, 33 tệp đạt 28.02s, container `agri80-overview-green` exit 0; sau đó chỉ tinh chỉnh khoảng cách cho laptop thấp. Biome sáu tệp và build/TypeScript đạt. Số test giảm hai do bỏ feature phân trang; không áp dụng coverage lịch sử của component đã xóa cho trạng thái mới. [Báo cáo và log](../../reports/AGRI-80/admin_viewport_layout_2026_10_21.md). Chưa commit/push hoặc xác nhận CI.

Browser cuối 85 lượt/bảy viewport đạt, `.cache/admin-overview/results.json`: tổng quan đầy đủ không cuộn nội dung ở bốn viewport desktop; tablet/phone xếp dọc cuộn bên trong, lịch và Xem ảnh vẫn dùng được; phân trang danh sách giữ đủ dữ liệu. Không cuộn document/tràn ngang/lỗi trang. Đã khắc phục Chromium truyền overflow của nội dung xếp dọc lên HTML bằng containment riêng tổng quan, xác nhận qua kích thước và cuộn tới lịch thực tế. Build cuối 3.7s compile/853ms TypeScript đạt, đã cập nhật localhost:3000. Đã xem ảnh desktop mở sidebar và phone.

### 2026-10-21 — Bố cục admin trong viewport

Giữ workspace trong chiều cao màn hình, phân trang tám mục tổng quan theo 3/2/1 panel và danh sách theo 2/1 bản ghi. Header/sidebar/phân trang luôn thuộc khung; ảnh thành thumbnail, hàng hành động/phiên gần đây gọn hơn. Giữ nội dung cuộn bên trong khi màn hình rất thấp hoặc chữ/nội dung dài để không mất thông tin. Không đổi dữ liệu mock hay API, sidebar vẫn chỉ mở bằng nút.

RED ba ca trước triển khai; toàn bộ frontend 207/207, 34 tệp đạt 22.75s, container exit 0 (sau đó chỉ sửa class hàng hành động). Coverage tập trung 17/17: hai tệp mới đạt 100% branch; Biome 14 tệp và production build/TypeScript đạt. Đã cập nhật riêng frontend localhost:3000. Nguồn, đường dẫn và giới hạn: [báo cáo viewport](../../reports/AGRI-80/admin_viewport_layout_2026_10_21.md). Chưa xác nhận CI, chưa commit/push.

Chromium cuối đạt 107 lượt qua bảy kích thước: 1440×900, 1366×768 sidebar mở, 1280×720, 1024×768, 768×900, 375×812, 844×390. Không cuộn document, không tràn ngang, đủ mọi panel/bản ghi qua phân trang. Sáu viewport thông thường không cần cuộn nội dung; landscape cao 390px dùng cuộn bên trong để giữ đủ dữ liệu. Đã sửa tình trạng footer chặn nút ở landscape được phát hiện trong lượt đầu. Bằng chứng `.cache/admin-viewport/results.json`, ảnh cùng thư mục, script `frontend/tests/browser/admin_viewport.py`; build cuối compile 3.8s/TypeScript 732ms đạt. Chưa kiểm tra thiết bị thật hoặc chế độ phóng to chữ bằng trình duyệt.

### 2026-10-21 — Bỏ tự mở sidebar

Theo yêu cầu tiếp theo, sidebar chỉ mở/thu bằng nút header. Bỏ pointer/focus handlers trong `useAdminRail.ts` và `AdminCrmPage.tsx`, cập nhật test hover/focus/touch và browser script. Test RED xác nhận trước sửa; lần cuối toàn bộ frontend 205/205, 33 tệp đạt trong 23.37s (`pnpm test --maxWorkers=2 --testTimeout=15000`, container exit 0). Biome 3 tệp, production build/TypeScript, Chromium 1280/768/375px và reduced-motion đạt; đã cập nhật localhost. Chi tiết lỗi fixture touch đã sửa và log tại [báo cáo sidebar](../../reports/AGRI-80/admin_hover_rail_2026_10_15.md). Chưa đo coverage/CI hoặc commit/push.

### 2026-10-21 — Bổ sung nút sidebar admin

Thêm nút mở/thu gọn tại header desktop bằng Button và icon có sẵn; ghim mở khi chuột/tiêu điểm rời thanh, giữ rê chuột/bàn phím và Sheet di động. Sửa `AdminCrmPage.tsx`, `useAdminRail.ts`, test cùng thư mục; thêm kiểm tra trình duyệt `frontend/tests/browser/admin_sidebar_toggle.py`. Không lưu trạng thái qua tải lại.

RED thiếu nút được xác nhận trước sửa. Kiểm chứng mới: 205/205 frontend, 33 tệp, 23.05s đạt trong container `agri80-sidebar-suite` (exit 0), với timeout 15s và bản sao root ignore-file. Lần đầu 5 ca lỗi do thiếu ignore-file trong Docker và timeout của luồng đăng nhập 4 giây; ghi đầy đủ trong [báo cáo](../../reports/AGRI-80/admin_hover_rail_2026_10_15.md). Biome 3 tệp, production build/TypeScript, Chromium 1280/768/375px và reduced-motion đạt. Đã cập nhật service frontend localhost:3000; chưa đo coverage/CI, chưa commit/push. Các thay đổi màn chào trước đó và stash được giữ nguyên.

DoD tổng thể chưa xác nhận. Chưa có kết quả CI hoặc số đo bao phủ mới cho trạng thái hiện tại; không dùng số đo lịch sử làm kết quả mới. Chưa chứng nhận thiết bị vật lý, nhiều bộ máy trình duyệt, trình đọc màn hình hay toàn bộ khả năng tiếp cận. Người phụ trách/người duyệt/PR chỉ được bổ sung khi có thông tin xác minh. Chưa staging/commit/push hay đổi Jira.

### 2026-10-21 — Lọc lịch theo ngày, tháng, năm

Yêu cầu tinh chỉnh sau đó: bỏ nút “Theo ngày/tháng/năm”, dùng tháng/năm trên tiêu đề mở picker; cột biểu đồ mảnh và nhãn cùng ô/căn tâm, khoảng mốc giãn đều. Thu gọn preview, padding, Cần chú ý và nút ngày desktop 32px (touch vẫn 44px), xử lý cuộn Tổng quan desktop. Tệp chính: `AdminCalendar.tsx`, `AdminMetricChart.tsx`, `AdminOverview.tsx`, `index.css`; thêm test chart, cập nhật test overview và hai browser script. RED ba ca xác nhận; GREEN cuối **226/226**, 38 tệp, 33.09s, exit 0. Coverage chín test: lịch **85.36%**, chart **100%**, tổng **87.62% branch**. Biome năm tệp, diff check, build/TypeScript và browser căn nhãn sáu viewport + hồi quy **118 lượt/10 viewport** đạt. Desktop không cuộn trong các trường hợp thử, giữ fallback di động. [Chi tiết và log mới nhất](../../reports/AGRI-80/admin_calendar_filter_2026_10_21.md#điều-chỉnh-tiếp-theo--tiêu-đề-lịch-biểu-đồ-và-chiều-cao). Localhost đã cập nhật, không commit/push hoặc thay backend. Các đoạn tiếp theo là lịch sử trước điều chỉnh.

Bổ sung kiểm chứng cuối: browser `admin_viewport.py` cập nhật giả định lịch lọc mở và chạy **118 lượt/10 viewport** đạt. Giữ document trong màn hình, có cuộn Tổng quan 122px tại desktop cao 900px khi mở lịch; không thu nhỏ nút hoặc cắt nội dung. Log `.cache/admin-date-viewport.log`, JSON/ảnh `.cache/admin-date-viewport/`.

Mở rộng lịch Tổng quan với chọn ngày/tháng/năm theo yêu cầu cuối, khóa kỳ tương lai và bỏ lọc. Tổng số phát sinh, biểu đồ và ảnh gần đây dùng cùng ranh giới UTC+7; giữ phiên còn hiệu lực và khối Cần chú ý là trạng thái hiện tại có nhãn rõ. Thêm `adminDateFilter.ts`, cập nhật lịch/overview/chart/panels/stats/CSS, test cùng thư mục và browser `admin_date_filter.py`.

RED ba ca đã xác nhận; GREEN cuối **224/224**, 37 tệp, 30.46s, exit 0. Coverage tập trung 12 test: lịch **91.46% branch**, hai helper **100%**, tổng **93.85%**. Biome chín tệp, diff check, build/TypeScript và browser sáu viewport đều đạt; localhost đã cập nhật. Giữ cuộn trong khung khi mở lịch có nút 44px trên màn hình không đủ cao. [Bằng chứng, phạm vi và giới hạn](../../reports/AGRI-80/admin_calendar_filter_2026_10_21.md). Chưa CI/thiết bị thật; dữ liệu mock, không sửa backend hay commit/push. Các phần tiếp theo là lịch sử.

### 2026-10-21 — Tìm kiếm onChange 0,5 giây (bằng chứng trước)

Thêm debounce 500ms trong `AdminRecordList.tsx` dùng chung ba trang Người dùng/Phiên đăng nhập/Ảnh đã tải lên. Hủy timer khi nhập tiếp/submit/unmount; giữ Enter/nút tìm kiếm ngay, bỏ dấu/hoa thường, xóa query và reset trang. Cập nhật test cùng thư mục và thêm `frontend/tests/browser/admin_search.py`. RED bốn ca thiếu tự lọc xác nhận; GREEN **221/221**, 37 tệp, 30.72s, container exit 0. Biome hai tệp, diff check, production build/TypeScript và browser ba trang tại 1280/768/375px đều đạt; localhost đã cập nhật. [Bằng chứng và giới hạn](../../reports/AGRI-80/admin_search_2026_10_21.md). Dữ liệu vẫn mock; không sửa backend, không đo coverage/CI mới, không commit/push. Phần tiếp theo là lịch sử các lượt trước.

### 2026-10-21 — Logo, tải lại và lời tạm biệt admin

Yêu cầu tiếp theo — sửa logo: link cũ đi `/` làm website provider khôi phục phiên và chạy lại lời chào. Đổi link `/admin` và click thường về Tổng quan trong workspace hiện tại, giữ phiên và hành vi mở link bằng phím bổ trợ. Thêm regression test cùng `AdminCrmPage`, cập nhật browser script. RED href sai đã xác nhận; GREEN **216/216**, 37 tệp, 24.73s, exit 0. Biome hai tệp, diff check, build/TypeScript và browser 1280/768/375px đạt; localhost đã cập nhật. Lỗi kiểu query test trong build đầu đã sửa và chạy lại đạt. [Chi tiết](../../reports/AGRI-80/admin_login_entrance_2026_10_15.md#2026-10-21--sửa-logo-quay-về-tổng-quan). Không đổi các hiệu ứng đăng nhập/reload/đăng xuất, không commit/push hoặc đo coverage/CI mới. Phần dưới ghi nhận lượt triển khai trước.

Đổi logo rail sang logo lá user; khôi phục chọn lọc hiệu ứng bốn khối `ReloadLoadingScreen` từ stash user cho `AdminAccess` và route loading admin. Giữ màn cây non chào sau đăng nhập. `AdminCrmPage` xóa phiên ngay khi đăng xuất, chuyển sang chế độ logout của `AdminLoginSuccessScreen`: tên thật, hai vòng sóng, “Tạm biệt”/“HẸN GẶP LẠI”, không progress, sau bốn giây về trang giới thiệu. Không pop/apply stash hay sửa backend.

Kiểm chứng mới: RED hai ca thiếu loading/farewell đã xác nhận; toàn bộ frontend **215/215**, 37 tệp, 23.76s, exit 0. Biome sáu tệp, diff check, build/TypeScript đạt. Browser tải/reload/logo/logout ở 1280/768/375px và bộ chào sau đăng nhập năm viewport đều đạt, bao gồm reduced motion, mobile logout, phiên xóa ngay và thời lượng bốn giây. Đã cập nhật localhost. Chi tiết tệp, log và hai lỗi fixture/mã hóa đã sửa ở [báo cáo màn chào](../../reports/AGRI-80/admin_login_entrance_2026_10_15.md#2026-10-21--đồng-bộ-logo-tải-lại-và-tạm-biệt-admin). Chưa đo coverage/CI hay commit/push; giữ nguyên dữ liệu mock và công việc trước đó.
