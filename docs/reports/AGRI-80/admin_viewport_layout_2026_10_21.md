# AGRI-80 — Bố cục admin trong viewport

Ngày kiểm chứng: 2026-10-21. Nhánh: `AGRI-80-create-crm-admin-page`. Phạm vi: giao diện admin mock hiện có; không đổi backend, API, dữ liệu hoặc đăng nhập.

## Thay đổi

- `AdminCrmPage.tsx` giữ workspace trong `100dvh`; header, footer và phân trang thuộc khung cố định. `AdminMotion.tsx`, `AdminUsers.tsx`, `AdminImages.tsx`, `AdminSessions.tsx` truyền đúng giới hạn chiều cao qua flex/min-height.
- `AdminOverviewPages.tsx` chia tám mục tổng quan thành nhóm 3/2/1 theo desktop/tablet/phone. Tất cả biểu đồ, quản lý, ảnh, lịch, tài khoản và phiên gần đây vẫn truy cập được bằng nút trước/sau. `useAdminPageSize.ts` theo dõi resize và dọn listener khi unmount.
- `AdminRecordList.tsx` chia danh sách thành hai bản ghi cạnh nhau, một bản ghi dưới 768px; giữ tìm kiếm không dấu, đếm kết quả, giới hạn trang và trạng thái rỗng.
- `AdminOverview.tsx` và `AdminOverviewPanels.tsx` làm gọn hành động quản lý và trạng thái phiên; `AdminImages.tsx` dùng thumbnail bên cạnh thông tin. `index.css` giữ vùng xem trước trong token kích thước và rút phần lặp lại ở màn hình thấp dưới 600px.
- Không khóa cuộn toàn ứng dụng. Vùng nội dung có cuộn dự phòng cho màn hình rất thấp, nội dung dài/phóng to chữ hoặc mở bảng dữ liệu biểu đồ; không ẩn dữ liệu để ép vừa màn hình. Sidebar giữ điều khiển bằng nút.

## Kiểm chứng mới

- RED trước sửa: ba ca thất bại vì chưa có phân trang tổng quan và danh sách vẫn hiển thị 10 bản ghi. Container `agri80-viewport-red` exit 1, log `.cache/admin-viewport-red.log`.
- Toàn bộ frontend: **207/207**, 34 tệp, **22.75s**, container `agri80-viewport-green` exit 0. Lệnh `pnpm test --maxWorkers=2 --testTimeout=15000`; môi trường Docker có bản sao root `.gitignore`. Log `.cache/admin-viewport-green.log`. Sau lần này chỉ đổi class để tránh hàng hành động tự xuống dòng.
- Kiểm thử tập trung cùng coverage: **17/17**, ba tệp, **3.07s**, container `agri80-viewport-coverage` exit 0. Hai tệp mới `AdminOverviewPages.tsx` và `useAdminPageSize.ts` đạt **100% branch/statement/function/line**, không phải coverage toàn frontend. Log `.cache/admin-viewport-coverage.log`.
- Biome check/format **14 tệp** đạt. Production build/TypeScript đạt; log `.cache/admin-viewport-build.log`. Chỉ cập nhật service frontend localhost:3000.
- Test mới `AdminOverviewPages.test.tsx` kiểm tra mọi mục truy cập được, nút biên và giữ mục đang xem khi resize từ phone sang desktop. `AdminRecordList.unit.test.tsx` kiểm tra đủ 12 bản ghi qua sáu trang, tìm kiếm và giới hạn trang khi dữ liệu giảm. `AdminCrmPage.test.tsx` kiểm tra chuyển nhóm để tới ảnh gần đây.
- Chromium qua `frontend/tests/browser/admin_viewport.py`: **107 lượt đo/phân trang**, bảy viewport 1440×900, 1366×768 (sidebar mở), 1280×720, 1024×768, 768×900, 375×812, 844×390. Mọi lần document không tràn ngang/dọc, scrollY bằng 0, phân trang nằm trong viewport; đủ tám mục tổng quan và 12/3/3 bản ghi người dùng/ảnh/phiên, không mất hoặc trùng. Ở sáu viewport cao từ 600px trở lên, vùng nội dung cũng không cần cuộn (overflow ≤1px). 844×390 dùng cuộn nội dung dự phòng, các nút phân trang vẫn bấm được. Không lỗi trang; đã xem ảnh desktop mở sidebar và phone. Dữ liệu đo: `.cache/admin-viewport/results.json`, ảnh cùng thư mục; tài khoản/API dùng fixture cục bộ.
- Lượt kiểm tra trình duyệt đầu phát hiện ảnh chiếm chiều cao và footer chặn nút phân trang ở landscape; sau khi thu thumbnail, rút nội dung lặp lại ở chiều cao thấp và làm gọn mục quản lý/phiên gần đây, script cuối đạt. Build cuối compile 3.8s, TypeScript 732ms, exit 0. Không dùng overflow-hidden để che phần dữ liệu chưa xem được.

## Điều chỉnh tiếp theo — Giữ tổng quan liền mạch

Theo yêu cầu tiếp theo cùng ngày, bỏ phân trang riêng của tổng quan, đưa ba thẻ số liệu/biểu đồ và ảnh gần đây về cột chính, lịch ở bên cạnh. Bỏ mục quản lý trùng sidebar, thẻ tài khoản trùng header và danh sách phiên gần đây đã có trang riêng. Giữ số liệu phiên/biểu đồ, bảng đối chiếu số liệu và toàn bộ chức năng trang danh sách. Bỏ dòng nhãn tổng bản ghi/giá trị đỉnh lặp lại; giá trị đỉnh và thang biểu đồ vẫn đọc được qua mô tả trợ năng và bảng dữ liệu. Dùng nút Xem ảnh ở header panel thay cho footer riêng; spacing/preview dùng token.

Đã xóa hai tệp phân trang tổng quan do lần triển khai trước tạo (`AdminOverviewPages.tsx`, test tương ứng); giữ `useAdminPageSize.ts` cho danh sách. Regression trong `AdminCrmPage.test.tsx` kiểm tra ảnh/lịch/số liệu có sẵn cùng lúc, không có phân trang tổng quan và không còn ba khối lặp. RED trước sửa được xác nhận tại mục Ảnh gần đây chưa được render: `.cache/admin-overview-red.log`, container exit 1.

Kiểm chứng mới: toàn bộ frontend **205/205**, 33 tệp, **28.02s**, container `agri80-overview-green` exit 0, lệnh `pnpm test --maxWorkers=2 --testTimeout=15000`, log `.cache/admin-overview-green.log`. Số test giảm hai do bỏ feature phân trang tổng quan. Sau lượt này chỉ giảm padding/khoảng cách bằng token cho màn hình 1280×720 (lượt trình duyệt đầu ghi nhận overflow 19px). Biome sáu tệp và production build/TypeScript đạt, log `.cache/admin-overview-build.log`. Không đo lại coverage; số 100% phía trên là lịch sử của tính năng trước, bao gồm component phân trang đã bỏ.

Các kết quả và mô tả tám panel/phân trang phía trên là lịch sử của lần triển khai trước yêu cầu điều chỉnh này, không phải giao diện hiện tại.

Trình duyệt cuối sau điều chỉnh: **85 lượt kiểm tra**, bảy viewport như lượt trước, script `frontend/tests/browser/admin_viewport.py` exit 0; kết quả mới ở `.cache/admin-overview/results.json` và ảnh cùng thư mục. Bốn viewport desktop từ 1024px hiển thị toàn bộ tổng quan không cần cuộn nội dung, bao gồm sidebar mở tại 1366×768; tablet/phone và landscape thấp giữ bố cục xếp dọc với cuộn bên trong. Document không tràn ngang/dọc, scrollY=0; lịch vẫn truy cập được, nút Xem ảnh tới đúng danh sách; mọi bản ghi vẫn duyệt được qua phân trang. Đã xem ảnh desktop và phone. Trong kiểm tra đã phát hiện overflow từ nội dung xếp dọc lan tới scrollHeight của HTML trên Chromium dù các khung đã giới hạn; xác nhận thêm `contain: layout paint` riêng `.admin-overview` đưa scrollHeight 869→812px tại 375×812 và vẫn cuộn tới lịch được. Không khóa cuộn body toàn ứng dụng. Build cuối compile 3.7s/TypeScript 853ms đạt; Biome sáu tệp và diff check đạt. Đã cập nhật riêng frontend localhost:3000.

## Giới hạn

Không có kết quả GitHub Actions hay chứng nhận thiết bị thật/trình đọc màn hình. Không commit/push. Các thay đổi màn chào và sidebar trước đó được giữ nguyên; stash không bị áp dụng hoặc xóa.
