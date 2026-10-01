# Mẫu và test case API AgriVision

> Phỏng theo cấu trúc `Testing Document/Copy of Testcase API.md`; các API
> voucher, khách hàng và sản phẩm trong file mẫu không thuộc AgriVision.
> Các case dưới đây là **thiết kế**, chưa có kết quả thực thi.

## Mẫu để thành viên điền

| Trường | Nội dung cần ghi |
|---|---|
| ID, requirement, viewpoint | Ví dụ `API-PRED-01`, `FR-02`, `VP-API-02`. |
| API và trạng thái sản phẩm | Method/path theo code hoặc contract đã duyệt; `hiện có`, `mock`, `chờ`. |
| Tiền điều kiện / dữ liệu | User/token, ảnh fixture, DB state, AI stub/checkpoint và phiên bản. |
| Request | Headers, params, form/body; không ghi token hoặc secret thật. |
| Expected response | Status, schema và thông điệp lỗi theo contract; không đoán giá trị nhãn AI. |
| Expected side effects | Số bản ghi DB, ảnh được tạo/xóa, AI có được gọi hay không. |
| Actual / result / evidence | Điền sau khi chạy: `Passed`, `Failed`, `Blocked`, `Not run`; log/TRX/ảnh chụp không chứa secret. |

## Case ưu tiên để triển khai kiểm thử

| ID | Liên kết | Điều kiện và request | Expected response / side effects | Trạng thái |
|---|---|---|---|---|
| API-PRED-01 | FR-01, VP-API-01 | `POST /api/predictions` thiếu `File` hoặc file rỗng. | Lỗi client; không upload, không gọi AI, không thêm prediction. | Not run |
| API-PRED-02 | FR-01, VP-API-01 | File có đuôi không được hỗ trợ hoặc ảnh hỏng. | Lỗi client; không gọi AI hoặc lưu ảnh/bản ghi. | Not run; cần chốt policy kiểm tra nội dung |
| API-PRED-03 | FR-02/03, VP-API-02 | AI stub timeout/trả lỗi. | Không có response thành công, không có prediction giả. | Not run; code hiện có fallback giả |
| API-PRED-04 | FR-02/03, VP-API-02 | AI trả class index/nhãn không có trong DB. | Không ánh xạ sang lớp đầu tiên; không lưu prediction sai. | Not run; code hiện có fallback |
| API-PRED-05 | FR-02/03, VP-API-02 | AI stub trả kết quả hợp lệ theo contract đã chốt. | Response và DB cùng nhãn, confidence, top-k và model version. | Blocked: contract/checkpoint chưa chốt |
| API-HIST-01 | FR-04, VP-API-03 | User A gọi `GET /api/predictions` bằng token của A. | Chỉ có bản ghi thuộc A theo phân trang. | Not run |
| API-HIST-02 | FR-04, VP-API-03 | User A gọi `DELETE /api/predictions/{id}` của B. | Bị từ chối; bản ghi và ảnh của B giữ nguyên. | Not run |
| API-DB-01 | FR-03, VP-DB-01 | Migration/seed trên PostgreSQL trống. | Schema đúng; mapping lớp khớp checkpoint được chọn. | Blocked: mapping/checkpoint chưa chốt |

Các status code cụ thể và JSON mẫu phải được bổ sung khi API contract được duyệt.
Không ghi expected `200`/`201` cho các case chưa xác nhận hành vi. Test dùng
mock/stub phải ghi rõ đây là contract test, không phải bằng chứng model dự đoán
đúng ảnh thực.

## Template chi tiết để sao chép cho mỗi endpoint

- **API / method / path:** `<tên>` / `<METHOD> <path>`
- **Nguồn contract:** `<link tới controller, OpenAPI hoặc contract đã duyệt>`
- **Trạng thái:** `hiện có | demo/mock | chờ contract`
- **Người thiết kế / phiên bản:** `<tên>` / `<commit hoặc phiên bản contract>`
- **Môi trường / dữ liệu:** `<URL test, DB test, AI stub hoặc checkpoint, fixture>`

| ID | Requirement / viewpoint | Nhóm kiểm tra | Tiền điều kiện | Request (header, params, body/form) | Kết quả HTTP và body mong đợi | DB / storage / AI mong đợi | Actual / bằng chứng | Kết quả | Cách chạy / ghi chú |
|---|---|---|---|---|---|---|---|---|---|
| `API-<AREA>-01` | `<FR-XX, VP-API-XX>` | `Method / Validate / Logic / Format / Error` | `<trạng thái user, DB, AI>` | `<dữ liệu cụ thể; không ghi secret>` | `<status/schema theo contract>` | `<số bản ghi, ảnh, số lần gọi AI>` | `<điền sau khi chạy>` | `Not run` | `Manual/Auto; lệnh hoặc link test` |

**Tổng kết sau khi chạy:** Total `<n>`; Passed `<n>`; Failed `<n>`; Blocked `<n>`;
Not run `<n>`. Chỉ tính Passed khi có actual result và bằng chứng; ghi lý do
Blocked trong cột ghi chú. Với `POST /api/predictions`, field form trong
ASP.NET Core hiện là `File`; web demo hiện gửi `image`, nên ca tích hợp này
phải ghi rõ lệch contract thay vì suy ra pass.
