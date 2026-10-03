# Test viewpoint AgriVision AI

> Chuyển cấu trúc từ `Testing Document/Copy of Test viewpoint.md` sang đúng
> phạm vi AgriVision. Không chuyển trạng thái Done hoặc kết quả của dự án mẫu.
> Các case là thiết kế; trạng thái dưới đây được đối chiếu với mã hiện tại.
> Mã FR/NFR tham chiếu [đặc tả yêu cầu](../system_requirements.md).

## Cách dùng

- `Hiện có`: có mã tương ứng; chưa đồng nghĩa chạy test pass.
- `Mock`: chỉ kiểm thử hành vi demo, không báo đạt chức năng dự đoán thật.
- `Chờ`: chưa có phụ thuộc để chạy; testcase đặt `Blocked` kèm lý do.
- Mỗi viewpoint gắn yêu cầu ở [đặc tả](../system_requirements.md),
  test case ở [kế hoạch test](testing_strategy.md), và bằng chứng khi chạy.

| ID | Khu vực / yêu cầu | Viewpoint cần xác nhận | Trạng thái sản phẩm | Ưu tiên |
|---|---|---|---|---|
| VP-DATA-01 | Dataset, NFR-05 | Manifest v1.4 cố định; split/group/mapping không bị tạo lại lúc train. | Có pipeline và báo cáo AGRI-21; kiểm thử HTTP với model thật còn chờ. | Cao |
| VP-ML-01 | Train/evaluate, NFR-05 | Metric validation, chọn checkpoint, test set đóng, nhãn và preprocessing được version hóa. | Có kết quả nội bộ v1.4; chưa kiểm tra xuyên tầng. | Cao |
| VP-API-01 | Upload, FR-04/NFR-02 | File thiếu/rỗng, sai loại, quá giới hạn, nội dung hỏng không gọi AI/lưu DB. | API kiểm tra file rỗng/đuôi; chưa giới hạn dung lượng hoặc kiểm tra nội dung. | Cao |
| VP-API-02 | Predict, FR-05/06 | AI timeout/lỗi, response sai, class không tồn tại: không trả/lưu kết quả giả. | Adapter AI báo lỗi; mapping DB vẫn có fallback sang lớp đầu tiên. | Rất cao |
| VP-API-03 | Auth/history, FR-02/07 | Đăng nhập, phân quyền xem/xóa, phân trang, tách dữ liệu từng user. | Có API/test; GET theo ID chưa kiểm tra chủ sở hữu. | Cao |
| VP-DB-01 | DB, FR-06 | Migration, seed canonical label, transaction và ảnh mồ côi khi lỗi. | Có migration/seed minh họa; mapping chưa khớp checkpoint v1.4. | Cao |
| VP-WEB-01 | Tải ảnh, FR-04 | Chọn/kéo thả, preview, lỗi file, hủy request, loading. | Có Next.js và Vitest; cần kiểm tra theo policy ảnh thống nhất. | Trung bình |
| VP-WEB-02 | Kết quả/lịch sử, FR-05/07 | Response thật, thông báo lỗi, không giữ kết quả cũ, quyền lịch sử. | UI có test mock; E2E với AI thật còn chờ. | Trung bình |
| VP-E2E-01 | Xuyên tầng, FR-05/06 | Cùng ảnh qua CLI–AI HTTP–API–web có cùng nhãn; DB lưu đúng version. | Chờ FastAPI thật và contract. | Cao sau model gate |

## Quy tắc giao việc

Mỗi thành viên nhận một viewpoint, ghi mã nguồn/yêu cầu liên quan và viết case
theo [mẫu API](agri_api_test_cases.md) hoặc [mẫu màn hình](agri_screen_test_cases.md).
Test hiện có chỉ được đánh `Passed` sau khi ghi lệnh, môi trường, dữ liệu,
actual result và bằng chứng. Viewpoint chờ model vẫn được thiết kế trước nhưng
không tính vào tỷ lệ pass của phần đang chạy.

## Template viewpoint để sao chép

**Phạm vi / phiên bản:** `<feature, commit/contract, ngày rà soát>`

**Người phụ trách:** `<tên>`

**Nguồn yêu cầu:** `<link requirement hoặc quyết định đã duyệt>`

| ID viewpoint | Khu vực / yêu cầu | Đối tượng test (lớn → trung → nhỏ) | Mục cần xác nhận / rủi ro | Kỹ thuật và dữ liệu test | Mức ưu tiên | Trạng thái sản phẩm | Test case liên kết | Ghi chú |
|---|---|---|---|---|---|---|---|---|
| `VP-<AREA>-01` | `<FR/NFR-XX>` | `<ví dụ: Predict → upload → file rỗng>` | `<điều kiện có thể quan sát>` | `<boundary/negative/permission; fixture>` | `Cao/Trung bình/Thấp` | `hiện có/demo/chờ` | `<API/WEB/UNIT/INT-ID>` | `<phụ thuộc hoặc quyết định cần chốt>` |

Mỗi viewpoint quan trọng phải dẫn tới ít nhất một case cụ thể. Khi đổi contract,
rà lại cả các case liên kết; viewpoint chỉ mô tả điều cần kiểm tra, không ghi
`Passed` tại bảng này.
