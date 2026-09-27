# Test viewpoint AgriVision AI

> Chuyển cấu trúc từ `Testing Document/Copy of Test viewpoint.md` sang đúng
> phạm vi AgriVision. Không chuyển trạng thái Done hoặc kết quả của dự án mẫu.
> Trạng thái sản phẩm dựa trên `main` commit `65082f6` và xác nhận của nhóm
> ngày 2026-09-27 rằng model chưa cho kết quả đạt yêu cầu.

## Cách dùng

- `Hiện có`: có mã tương ứng; chưa đồng nghĩa chạy test pass.
- `Mock`: chỉ kiểm thử hành vi demo, không báo đạt chức năng dự đoán thật.
- `Chờ`: chưa có phụ thuộc để chạy; testcase đặt `Blocked` kèm lý do.
- Mỗi viewpoint gắn yêu cầu ở [kế hoạch phát triển](../development_roadmap.md),
  test case ở [kế hoạch test](testing_strategy.md), và bằng chứng khi chạy.

| ID | Khu vực / yêu cầu | Viewpoint cần xác nhận | Trạng thái sản phẩm | Ưu tiên |
|---|---|---|---|---|
| VP-DATA-01 | Dataset, NFR-01 | Manifest v1.3 cố định; split/group/mapping không bị tạo lại lúc train. | Có pipeline; full suite chưa chạy ở môi trường hiện tại. | Cao |
| VP-ML-01 | Train/evaluate, NFR-01 | Metric validation, chọn checkpoint, test set đóng, nhãn và preprocessing được version hóa. | Chờ model đạt gate; chưa có kết quả được xác nhận. | Cao |
| VP-API-01 | Upload, FR-01 | File thiếu/rỗng, sai loại, quá giới hạn, nội dung hỏng không gọi AI/lưu DB. | API có validate đuôi file; cần kiểm tra giới hạn và nội dung. | Cao |
| VP-API-02 | Predict, FR-02/03 | AI timeout/lỗi, response sai, class không tồn tại: không trả/lưu kết quả giả. | Có fallback mock; chưa đạt hành vi mục tiêu. | Rất cao |
| VP-API-03 | Auth/history, FR-04/05 | Đăng nhập, phân quyền xem/xóa, phân trang, tách dữ liệu từng user. | Có API và vài test; chưa xác nhận integration. | Cao |
| VP-DB-01 | DB, FR-03 | Migration, seed canonical label, transaction và ảnh mồ côi khi lỗi. | Có migration/seed minh họa; mapping chưa khớp checkpoint. | Cao |
| VP-WEB-01 | Tải ảnh, FR-01 | Chọn/kéo thả, preview, lỗi file, hủy request, loading. | Có UI React/Vite demo; chưa là Next.js. | Trung bình |
| VP-WEB-02 | Kết quả/lịch sử, FR-02/04 | Response thật, thông báo lỗi, không giữ kết quả cũ, quyền lịch sử. | UI và localStorage demo; chờ contract/API. | Trung bình |
| VP-E2E-01 | Xuyên tầng, FR-02/03 | Cùng ảnh qua CLI–AI HTTP–API–web có cùng nhãn; DB lưu đúng version. | Chờ checkpoint, service AI và contract. | Cao sau model gate |

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
