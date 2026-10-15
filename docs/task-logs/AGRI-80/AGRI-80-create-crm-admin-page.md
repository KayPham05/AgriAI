# AGRI-80 - Giao diện quản trị frontend mock

- Nhánh đã xác minh: `AGRI-80-create-crm-admin-page`.
- Ngày cập nhật: 2026-10-15.
- Người phụ trách/người duyệt: không suy đoán từ hội thoại.
- Pull request: chưa tạo cho đợt chỉnh sửa hiện tại.
- [Mục lục báo cáo](../../reports/AGRI-80/README.md).

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

DoD tổng thể chưa xác nhận. Chưa có kết quả CI hoặc số đo bao phủ mới cho trạng thái hiện tại; không dùng số đo lịch sử làm kết quả mới. Chưa chứng nhận thiết bị vật lý, nhiều bộ máy trình duyệt, trình đọc màn hình hay toàn bộ khả năng tiếp cận. Người phụ trách/người duyệt/PR chỉ được bổ sung khi có thông tin xác minh. Chưa staging/commit/push hay đổi Jira.
