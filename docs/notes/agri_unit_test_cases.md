# Mẫu và ca kiểm thử unit AgriVision

> Dùng cấu trúc bảng ca kiểm thử của `Testing Document/`, áp dụng cho một hàm
> hoặc service cô lập. Đây là **thiết kế**, không phải kết quả chạy test.
> Liên kết yêu cầu và viewpoint tại [kế hoạch phát triển](../development_roadmap.md)
> và [viewpoint](agri_test_viewpoints.md).

## Cách dùng

- Mỗi case kiểm tra một hành vi cụ thể theo Arrange–Act–Assert. Mock repository,
  image storage và AI predictor khi test service; không gọi DB, cloud hoặc model thật.
- Ghi tên test và đường dẫn file thực tế sau khi triển khai. `Passed` chỉ được
  điền khi có lệnh chạy, actual result và bằng chứng.
- Với Python, dùng `unittest.TestCase` và tên file `test_*.py` theo quy tắc repo.
  Với backend hiện tại, dùng xUnit trong `backend/tests/AgriVision.UnitTests/`.

## Template để sao chép cho một module

- **Module / nguồn:** `<tên lớp/hàm, đường dẫn code>`
- **Yêu cầu / viewpoint:** `<FR/NFR-XX, VP-XX>`
- **Phiên bản:** `<commit, dataset/model/contract nếu liên quan>`
- **Môi trường / lệnh chạy:** `<SDK, lệnh, fixture/mock>`

| ID | Hàm / tên test | Điều kiện đầu vào và mock (Arrange) | Hành động (Act) | Kết quả và tương tác mong đợi (Assert) | Actual / bằng chứng | Kết quả | Ghi chú |
|---|---|---|---|---|---|---|---|
| `UNIT-<AREA>-01` | `<Method_ShouldOutcome_WhenCondition>` | `<giá trị biên, mock trả gì>` | `<gọi một hàm>` | `<return/exception; dependency được gọi bao nhiêu lần>` | `<điền sau khi chạy>` | `Not run` | `<file test hoặc bug>` |

**Tổng kết sau khi chạy:** Total `<n>`; Passed `<n>`; Failed `<n>`; Blocked `<n>`;
Not run `<n>`; lệnh `<...>`; số test thực chạy `<n>`; artifact `<TRX/coverage nếu có>`.

## Case ưu tiên

| ID | Module / viewpoint | Arrange → Act | Assert mong đợi | Trạng thái thiết kế |
|---|---|---|---|---|
| UNIT-PRED-01 | `PredictionService`, VP-API-01 | File `null` hoặc rỗng → `PredictAsync`. | Báo lỗi đầu vào; storage, AI và repository không được gọi. | Cần đối chiếu test hiện có. |
| UNIT-PRED-02 | `PredictionService`, VP-API-01 | File đuôi không hỗ trợ → `PredictAsync`. | Báo lỗi đầu vào; không upload/lưu. | Cần đối chiếu test hiện có. |
| UNIT-PRED-03 | `PredictionService`, VP-API-02 | AI predictor ném timeout/lỗi → `PredictAsync`. | Không trả kết quả thành công và không thêm prediction; kiểm tra dọn ảnh theo policy khi được chốt. | Cần bổ sung; không suy ra policy đã triển khai. |
| UNIT-PRED-04 | `PredictionService`, VP-API-02 | AI trả class không có trong DB → `PredictAsync`. | Từ chối mapping sai, không lưu dự đoán. | Mục tiêu; code hiện fallback sang lớp đầu tiên. |
| UNIT-AI-01 | `ai/utils/label_mapping.py`, VP-DATA-01 | Mapping checkpoint thiếu/trùng index → chuẩn hóa mapping. | Lỗi rõ ràng, không âm thầm đổi thứ tự nhãn. | Đối chiếu với `test_label_mapping.py`. |
| UNIT-WEB-01 | UI upload, VP-WEB-01 | File sai loại/quá giới hạn → validate. | UI không gửi API; thông báo phù hợp policy. | Chờ test runner và policy web/API thống nhất. |

Không dùng test có mock AI để khẳng định model phân loại đúng ảnh thật.
