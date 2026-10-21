# AGRI-80 — Lọc Tổng quan bằng lịch ngày, tháng, năm

## Điều chỉnh tiếp theo — Tiêu đề lịch, biểu đồ và chiều cao

Yêu cầu tiếp theo của người dùng thay thế hàng nút chọn chế độ: bỏ cả “Theo ngày/tháng/năm”, bấm trực tiếp `Tháng 10` hoặc `2026` trong tiêu đề để mở danh sách tháng/năm. Chọn tháng áp dụng lọc và về lưới ngày; chọn năm áp dụng lọc và mở tháng để đi sâu tiếp. Giữ thông báo bộ lọc, bỏ lọc, điều hướng và khóa tương lai. `AdminCalendar.tsx` dùng Button có sẵn với aria-label “Chọn tháng”/“Chọn năm” và aria-expanded, không thêm dropdown thư viện.

Làm lại `AdminMetricChart.tsx`: mỗi bucket giữ một ô grid, chứa cả cột và nhãn ngày/tháng. Cột có bề rộng tối đa 0.65rem, bo nhẹ, trường hợp một ngày được căn giữa, không kéo đầy card. Các mốc trục được giãn đều (tối đa bốn mốc khi xem tháng), đặt ở đúng tâm cột; tháng của biểu đồ năm dùng T1/T7/T12, còn bảng truy cập/tooltip giữ ngày tháng đầy đủ. Tất cả bucket, giá trị bằng 0, tổng và thang riêng được giữ. Trong lượt xem ảnh đầu, hai mốc cuối tháng còn sát nhau ở card hẹp; đã đổi thành các mốc giãn đều và đo lại cả vị trí lẫn chồng chữ.

`AdminOverview.tsx` thu gọn Cần chú ý thành hai số liệu cạnh nhau, giảm đệm footer và khoảng trống; `index.css` giảm preview/chiều cao chart lớn và giữ đệm overview 12px. Ngày lịch desktop ≥1024px với con trỏ chính xác dùng nút cao 32px theo yêu cầu thu nhỏ, touch vẫn 44px. Không cắt dữ liệu hoặc khóa cuộn cho mọi màn hình. Các con số 122px cuộn desktop bên dưới thuộc bản trước, đã được xử lý trong lượt này.

Kiểm chứng mới nhất:

- RED ba ca lỗi/một ca đạt: bắt hàng nút cũ và nhãn nằm ngoài cột. `.cache/admin-polish-red.log`.
- Toàn bộ frontend **226/226 test, 38 tệp, 33.09s**, container exit 0; `pnpm test --maxWorkers=2 --testTimeout=15000`, `.cache/admin-polish-green.log`.
- Coverage tập trung **9/9**: `AdminCalendar.tsx` **85.36% branch**, `AdminMetricChart.tsx` **100% branch**, tổng hai tệp **87.62% branch**; `.cache/admin-polish-coverage.log`. Không phải coverage toàn frontend.
- Biome check năm tệp TS/TSX, định dạng CSS và `git diff --check` đạt. Build compile **6.0s**, TypeScript **1268ms** đạt; frontend localhost đã cập nhật. `.cache/admin-polish-build.log`.
- Browser lọc sáu viewport đạt, có mở rộng sidebar tại 1280×900; đo tâm nhãn lệch tâm cột **<1px**, bề rộng cột **≤11px**, các nhãn hiển thị không chồng nhau. Không cuộn Tổng quan tại desktop cao ≥900px với lịch mở ở các viewport thử; mọi document không tràn. Script `admin_date_filter.py`, ảnh `.cache/admin-date/` đã được xem.
- Hồi quy **118 lượt/10 viewport** đạt, khôi phục assertion desktop không cuộn trong `admin_viewport.py` (không còn ngoại lệ cho lịch mở). JSON/ảnh `.cache/admin-polish-viewport/`, log `.cache/admin-polish-viewport.log`. Chỉ tablet/mobile/landscape thấp dùng fallback cuộn nội bộ theo thiết kế.

Chưa có kết quả CI, thiết bị thật hay trình duyệt khác. Mock/backend, stash và các thay đổi trước giữ nguyên. Không commit/push. Phần tiếp theo ghi lại lần triển khai trước khi tinh chỉnh này.

## Phạm vi và hành vi

Theo yêu cầu mới nhất (ngày/tháng/năm thay cho chỉ một ngày), mở rộng lịch hiện có để chọn ngày, một trong 12 tháng hoặc một trong nhóm 12 năm. Điều hướng qua tháng/năm/nhóm năm, đánh dấu ngày hiện tại và kỳ được chọn, khóa lựa chọn tương lai. Lịch được đưa lên đầu cột phải, giữ disclosure responsive. “Hôm nay”/“Tháng này”/“Năm nay” chọn kỳ hiện tại theo chế độ; “Bỏ lọc” trong thanh Tổng quan khôi phục mặc định. Đổi chế độ xem lịch chưa áp dụng bộ lọc cho đến khi chọn một mốc.

Áp dụng theo UTC+7 cho tài khoản mới (`createdAt`), ảnh tải lên (`uploadedAt`), lượt đăng nhập (`createdAt`) và ảnh gần đây. Lọc ngày dùng một cột biểu đồ, tháng dùng 28–31 ngày, năm dùng 12 cột tháng. Bảng truy cập hỗ trợ chuyển nhãn ngày/tháng tương ứng. Loại thời gian không hợp lệ và bản ghi sau thời điểm cập nhật. Giữ mặc định tổng toàn bộ và biểu đồ bảy ngày khi không lọc.

Phiên hiện còn hiệu lực, khóa tài khoản và số cảnh báo vẫn phản ánh trạng thái hiện tại, được ghi rõ; dữ liệu mock không có lịch sử đầy đủ để dựng trạng thái trong quá khứ. Không biến trạng thái hiện tại thành snapshot lịch sử. Không thay đổi tìm kiếm/phân trang các trang danh sách, không truyền lọc sang “Xem ảnh”, không API mới và không lưu lựa chọn qua remount.

## Tệp ảnh hưởng

- `frontend/src/features/admin/AdminCalendar.tsx`: chọn ngày/tháng/năm bằng Button trong lịch sẵn có.
- `AdminOverviewCalendar.tsx`: chuyển props lọc, giữ mở/đóng và media subscription.
- `AdminOverview.tsx`: state chọn kỳ, nhãn/reset, áp dụng số liệu và ảnh; trạng thái hiện tại tách rõ.
- `adminDateFilter.ts`, `adminOverviewStats.ts`: khoảng nửa mở UTC+7, lọc và gom nhóm theo ngày/tháng.
- `AdminOverviewPanels.tsx`, `AdminMetricChart.tsx`, `frontend/src/index.css`: ảnh theo kỳ, trạng thái trống, nhãn biểu đồ tháng và khoảng cách cột tháng.
- Test `AdminOverview.test.tsx`, `adminOverviewStats.test.ts`; browser `frontend/tests/browser/admin_date_filter.py`.

## Kiểm chứng mới

- RED: **3 ca lỗi/4 ca đạt** trước triển khai, do chưa có chọn kỳ và thống kê chưa lọc; `.cache/admin-date-red.log`.
- GREEN cuối: toàn bộ frontend **224/224, 37 tệp, 30.46s**, container exit 0, `pnpm test --maxWorkers=2 --testTimeout=15000`; `.cache/admin-date-green.log`. Bao gồm ngày chọn, đổi tháng/năm, giữ lọc sau refresh, kỳ rỗng, reset mặc định, UTC+7 ở giao năm/tháng/ngày, loại future/invalid và tháng nhuận.
- Coverage tập trung **12/12**, exit 0: `AdminCalendar.tsx` **91.46% branch**, `adminDateFilter.ts` và `adminOverviewStats.ts` **100% branch**; tổng ba tệp **93.85% branch**. Không phải coverage toàn frontend. Nguồn `.cache/admin-date-coverage.log`.
- Biome check chín tệp TS/TSX đạt; định dạng TS/CSS và `git diff --check` đạt (working tree có cảnh báo LF/CRLF).
- Production build compile **4.7s**, TypeScript **2.4s** đạt; frontend localhost:3000 được cập nhật. `.cache/admin-date-build.log`.
- Browser Chromium sáu viewport **1920×1080, 1280×900, 1366×768, 768×900, 375×812, 844×390** đạt: lựa chọn/khóa tương lai, 1/31/12 cột, ảnh tương ứng, kỳ rỗng, bỏ lọc, một request xác thực duy nhất, không page error hoặc document overflow. Script và ảnh `.cache/admin-date/`.
- Hồi quy toàn workspace: cập nhật `frontend/tests/browser/admin_viewport.py` để cho phép fallback cuộn Tổng quan khi lịch lọc mở, vẫn bắt tràn document và giữ kiểm tra danh sách/phân trang. Chạy mới **118 lượt trên 10 viewport** đạt; `.cache/admin-date-viewport.log`, JSON/ảnh `.cache/admin-date-viewport/`. Có cuộn nội bộ Tổng quan 122px tại 1440×900 và 1280×900 khi lịch mở; các màn hình nhỏ/thấp giữ fallback nội bộ. Không dùng số đo này làm cam kết mọi khối cùng hiện trọn mà không cuộn.

Lượt browser đầu dùng giả định cũ rằng mở lịch trên 1280×900 không cần cuộn trong Tổng quan; lịch có các nút 44px và thêm chế độ lọc cao hơn nên giả định đó không còn đúng. Giữ fallback cuộn trong khung đã được thiết kế cho nội dung mở rộng, không thu nhỏ nút hoặc cắt dữ liệu; kiểm tra không tràn document trên cả sáu viewport và không cuộn Tổng quan ở 1920×1080. Đã xem ảnh desktop/mobile của bản cuối. Các lượt trình duyệt trước ngày này vẫn là lịch sử; kết quả mới ghi riêng ở trên.

Chưa xác nhận GitHub Actions, thiết bị vật lý hay trình duyệt khác. Dữ liệu vẫn mock; không sửa backend, không apply/pop stash hoặc commit/push.
