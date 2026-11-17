# AGRI-145 — Đặc tả & Checklist Kiểm thử E2E Thủ công (Manual E2E Test Cases)

Tài liệu này tách riêng hoàn toàn **10 ca kiểm thử E2E thủ công (Manual E2E)**, độc lập với bộ 40 ca Automated E2E ([frontend_e2e_test_specification.md](frontend_e2e_test_specification.md)).

Theo quy chuẩn dự án ([TESTING.md](../../../TESTING.md)), các ca Manual E2E dưới đây tuyệt đối không được để chung trong tài liệu, mã nguồn (`frontend/tests/browser/e2e/`) hoặc cấu hình (`tools/testcase-workflow/config/`) của E2E tự động. Không đánh dấu **Pass** nếu chỉ chạy qua mock API.

---

## 1. Điều kiện chạy

- Hệ thống chạy đầy đủ frontend, backend, PostgreSQL và AI service (hoặc chủ động ngắt/giả lập lỗi dịch vụ ở các ca kiểm tra khả năng phục hồi).
- Có 2 tài khoản người dùng (`User A`, `User B`) và 1 tài khoản `Admin` để kiểm tra cô lập dữ liệu và quyền xóa ảnh.
- Ghi lại ngày chạy, commit/URL môi trường, người thực hiện và link bằng chứng/screenshot.

## 2. Quy ước trạng thái

| Trạng thái | Ý nghĩa |
|---|---|
| `Not run` | Chưa thực hiện chạy tay trên hệ thống thật |
| `Pass` | Đạt toàn bộ kết quả mong đợi trên hệ thống thật |
| `Fail` | Có ít nhất một kết quả mong đợi không đạt |
| `Blocked` | Không thể chạy do thiếu môi trường, dữ liệu mẫu hoặc công cụ can thiệp lỗi |

---

## 3. Ma trận & Checklist 10 Ca Manual E2E

| Mã Test | Ưu tiên | Phân hệ | Tiêu đề kịch bản | Tiền điều kiện | Các bước thực hiện manual | Kết quả mong đợi | Status | Evidence / Ghi chú |
|---|:---:|---|---|---|---|---|---|---|
| `E2E-DIAG-04` | **P1** | Chẩn đoán AI | Cảnh báo khi độ tin cậy thấp (`confidence < 0.45` hoặc phân bố Top-3 phẳng) | Ở trang `/diagnose`, có mẫu ảnh tạo dự đoán độ tin cậy thấp | 1. Tải lên ảnh có độ tin cậy thấp hoặc phân bố Top-3 chênh lệch $\le 0.05$.<br>2. Bấm "Phân tích bệnh". | Hiển thị cảnh báo độ tin cậy thấp (`LOW_CONFIDENCE_SOFTMAX`); không đưa ra kết luận khẳng định sai lệch (tuân thủ FR-05). | Not run | |
| `E2E-DIAG-06` | **P1** | Chẩn đoán AI | Giữ kết quả khi ảnh tạm hết hạn và cho phép thử lại | Đã có kết quả guest diagnosis; ảnh tạm đã hết hạn (`--expire-images`) | 1. Chạy hết hạn ảnh tạm hoặc mở lại kết quả có ảnh hết hạn.<br>2. Quan sát thông báo và thực hiện phân tích lại. | Kết quả chẩn đoán vẫn hiển thị; giao diện báo ảnh tạm hết hạn rõ ràng và cho phép thử lại, không crash. | Not run | |
| `E2E-DIAG-08` | **P2** | Chẩn đoán AI | Khả năng phục hồi khi AI Service gặp sự cố (Timeout / 503) | Tạm dừng container `ai-service` hoặc chặn kết nối AI | 1. Gửi ảnh phân tích tại `/diagnose` khi `ai-service` dừng.<br>2. Bật lại `ai-service` và bấm "Thử lại". | Giao diện không crash; hiển thị banner báo lỗi kết nối rõ ràng và nút "Thử lại" hoạt động khi dịch vụ phục hồi. | Not run | |
| `E2E-HIST-04` | **P1** | Lịch sử chẩn đoán | Tìm kiếm và lọc lịch sử chẩn đoán theo cây trồng & trạng thái | Đã đăng nhập, tài khoản có nhiều bản ghi lịch sử thuộc các loại cây/trạng thái khác nhau | 1. Mở `/history`.<br>2. Nhập từ khóa tìm kiếm, lọc theo loại cây và trạng thái khỏe/bệnh, chuyển đổi chế độ xem list/cards. | Danh sách lọc đúng các bản ghi khớp tiêu chí; hiển thị empty state nếu không có kết quả khớp. | Not run | |
| `E2E-HIST-05` | **P2** | Lịch sử chẩn đoán | Kiểm tra cô lập dữ liệu lịch sử giữa hai người dùng | Hai tài khoản thật `User A` và `User B`; `User A` có bản ghi lịch sử | 1. Lấy ID bản ghi lịch sử của `User A`.<br>2. Đăng nhập `User B`, thử truy cập/xóa ID của `User A`. | `User B` bị từ chối (403/404); bản ghi lịch sử của `User A` vẫn nguyên vẹn trong DB (NFR-01). | Not run | |
| `E2E-PROF-AGRI-04` | **P1** | Hồ sơ nông nghiệp | Theo dõi lịch sử dịch bệnh của riêng từng hồ sơ nông nghiệp | Hồ sơ nông nghiệp đã được liên kết với ít nhất 1 kết quả chẩn đoán | 1. Mở `/agricultural-profiles`.<br>2. Chọn xem chi tiết/lịch sử của hồ sơ đã liên kết chẩn đoán. | Hiển thị đúng danh sách các ca chẩn đoán đã liên kết với hồ sơ nông nghiệp đó theo thứ tự thời gian. | Not run | |
| `E2E-PROF-AGRI-05` | **P2** | Hồ sơ nông nghiệp | Xóa hồ sơ nông nghiệp và bảo toàn lịch sử chẩn đoán | Hồ sơ nông nghiệp đang có liên kết chẩn đoán | 1. Xóa hồ sơ nông nghiệp tại `/agricultural-profiles` và xác nhận.<br>2. Mở lại `/history`. | Hồ sơ nông nghiệp bị xóa khỏi danh sách; các bản ghi lịch sử chẩn đoán của người dùng trong `/history` vẫn được bảo toàn. | Not run | |
| `E2E-CAT-05` | **P2** | Cẩm nang & Danh mục | Trạng thái hiển thị khi bản ghi thiếu dữ liệu chi tiết | Có bản ghi bệnh/thuốc chưa điền đủ thông tin phác đồ | 1. Mở trang chi tiết của bản ghi bệnh/cây chưa hoàn thiện nội dung. | Giao diện hiển thị nội dung fallback chuẩn, không vỡ bố cục hoặc lỗi runtime. | Not run | |
| `E2E-CAT-06` | **P2** | Cẩm nang & Danh mục | Trạng thái Loading, lỗi API (500) và Empty state của Catalog | Mở `/plants`, `/diseases`, `/medicines`, `/knowledge` khi mạng chậm/lỗi hoặc từ khóa không khớp | 1. Tìm kiếm từ khóa không tồn tại để kiểm tra empty state.<br>2. Giả lập lỗi backend để kiểm tra thông báo lỗi và nút thử lại. | Hiển thị loading indicator, thông báo lỗi cho phép thử lại và empty state chuẩn xác; không crash. | Not run | |
| `E2E-ADM-05` | **P1** | Cổng quản trị CRM | Quản lý ảnh, xem cảnh báo và xóa ảnh trong Admin Images | Đăng nhập quyền `Admin`, có ảnh chẩn đoán trong hệ thống | 1. Vào `/admin` $\rightarrow$ mục `Images`.<br>2. Tìm kiếm ảnh, mở cảnh báo xóa, xác nhận xóa ảnh và reload danh sách. | Hiển thị đúng cảnh báo trước khi xóa; ảnh bị xóa khỏi danh sách/backend sau reload; phiên Admin vẫn giữ nguyên. | Not run | |

---

## 4. Kết luận chạy tay

Sau khi thực hiện kiểm thử thủ công trên môi trường thật, cập nhật cột `Status` và `Evidence / Ghi chú` trong bảng trên, sau đó tổng hợp số lượng `Pass`, `Fail`, `Blocked` vào [README.md](README.md).
