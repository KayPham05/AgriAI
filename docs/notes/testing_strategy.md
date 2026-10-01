# Kế hoạch kiểm thử AgriVision AI

> Cập nhật CI/Docker/coverage ngày 2026-09-29: xem
> [báo cáo AGRI-75](../reports/AGRI-75/ci_branch_coverage.md).
> Các số liệu và mô tả Vite bên dưới là lịch sử ngày 2026-09-27.

> Đối chiếu với `main` commit `65082f6`, cập nhật ngày 2026-09-27. Bảng test
> case là thiết kế kiểm thử; trạng thái `cần bổ sung` không có nghĩa là test đã pass.

## 1. Bằng chứng hiện tại

| Khu vực | Có trong repo | Kết quả kiểm tra tại máy này |
|---|---|---|
| Python dataset | `ai/tasks/agri_21/tests/` dùng `unittest` | 5/5 test độc lập dependency pass (`test_label_mapping`, `test_split_dataset_by_group`). Full discovery chưa pass: 11 import error do thiếu Pillow/NumPy/Torch/TorchVision; `.venv` hiện hỏng. |
| .NET unit | Project xUnit tại `backend/tests/AgriVision.UnitTests` | Sau `dotnet restore`, 7/7 unit test pass; TRX và Cobertura được tạo. |
| .NET integration | Project xUnit dùng Testcontainers PostgreSQL | 2/2 test auth/health pass cục bộ với Docker Desktop; chưa chạy trên GitHub Actions. Các test này không cần checkpoint. |
| Frontend | React/Vite; `pnpm lint` gọi `tsc --noEmit`; chưa có test runner/UI E2E | `pnpm install --frozen-lockfile`, `pnpm lint`, `pnpm build` pass sau khi dọn output `dist` cũ. Vite preview trả HTTP 200 và root HTML. |
| Docker | Hai Compose file cùng định nghĩa PostgreSQL 16; root Compose cho đổi cổng host qua `POSTGRES_HOST_PORT` | Docker Desktop 28.4.0 kết nối được. PostgreSQL Compose `up --wait` healthy và `pg_isready` pass tại cổng host 55432; container đã dừng, volume được giữ. |
| Branch coverage | Unit test dùng `coverlet.collector` | Cobertura của unit test: 22/196 branch = **11,22%**, 193/2401 line = 8,03% trên các assembly API/Application/Domain/Infrastructure. Đây là baseline quan sát, chưa phải ngưỡng đạt. |

`backend/AgriVision.sln` chứa các project mã nguồn và test; `backend/AgriVision.slnx`
hiện rỗng. Khi chạy test, dùng `.sln` hoặc đường dẫn `.csproj` và kiểm tra output
có **số test được chạy**. Exit code 0 với chỉ thông báo build thành công không
đủ làm bằng chứng test pass.

## 2. Ma trận kiểm thử

| Mức | Mục đích | Môi trường / dữ liệu |
|---|---|---|
| Unit | Nhánh validate file, xác thực, ánh xạ nhãn, lỗi dịch vụ, phân quyền | Mock dependency; không gọi DB/cloud/model thật. |
| Integration API/DB | Endpoint, EF migration/repository, transaction, quyền truy cập | PostgreSQL Testcontainers; cấu hình test riêng, không dùng dữ liệu thật. |
| Contract AI | Trường JSON, đơn vị confidence, canonical label, top-k, lỗi checkpoint | Checkpoint và ảnh fixture được version hóa bên ngoài Git; test rõ khi thiếu. |
| Frontend | Validate ảnh, loading/error/result, lịch sử | Mock API phù hợp hợp đồng đã chốt. |
| End-to-end | Một ảnh qua CLI → AI HTTP → .NET → web/DB | Môi trường staging với checkpoint xác nhận; kiểm tra cùng mapping và kết quả. |
| AI evaluation | Macro-F1, per-class recall/support, confusion matrix | Manifest v1.3 cố định; chọn bằng validation, test sau khi chốt. |

## 3. Test case ưu tiên

| ID | Tình huống | Kết quả mong đợi | Trạng thái |
|---|---|---|---|
| TC-01 | Tải JPG/PNG hợp lệ | API gọi AI thật, ánh xạ đúng lớp, lưu một bản ghi và trả kết quả đúng contract. | Cần bổ sung E2E |
| TC-02 | Thiếu file, file rỗng, định dạng sai | 4xx; không upload, không gọi AI, không lưu DB. | Cần bổ sung |
| TC-03 | File vượt giới hạn hoặc nội dung không phải ảnh dù đuôi hợp lệ | 4xx; không lưu ảnh/bản ghi. | Cần bổ sung |
| TC-04 | AI service timeout, lỗi HTTP hoặc checkpoint thiếu | Trả lỗi dịch vụ rõ ràng; không tạo dự đoán giả hay bản ghi thành công. | Cần bổ sung; code hiện có fallback giả |
| TC-05 | AI trả `class_index`/nhãn không có trong mapping DB | Trả lỗi contract/mapping; không chọn lớp đầu tiên để thay thế. | Cần bổ sung; code hiện có fallback |
| TC-06 | AI trả confidence ngoài khoảng đã chốt hoặc top-k không nhất quán | Từ chối phản hồi và ghi log an toàn. | Cần bổ sung |
| TC-07 | Lưu DB lỗi sau khi upload ảnh | Không trả thành công; xử lý ảnh mồ côi theo chính sách đã chốt. | Cần bổ sung |
| TC-08 | Người A đọc/xóa lịch sử của người B | Bị từ chối; dữ liệu của B giữ nguyên. | Cần bổ sung integration |
| TC-09 | Migration + seed trên DB trống | Schema hợp lệ, mapping DB khớp checkpoint triển khai. | Cần bổ sung |
| TC-10 | Cùng ảnh qua CLI và HTTP AI | Canonical label, preprocessing và confidence khớp trong sai số số học đã định. | Cần bổ sung |
| TC-11 | Web nhận lỗi 4xx/5xx, mạng ngắt, hủy upload | Hiện trạng thái/lời báo đúng; không hiển thị kết quả cũ như kết quả mới. | Cần bổ sung frontend |
| TC-12 | Data v1.3 train/val/test | Không chia lại, không trùng path/group xuyên split; nhãn checkpoint đúng manifest. | Có test một phần; cần chạy full suite |

## 4. Branch coverage và gate đề xuất

Branch coverage đo các nhánh điều kiện được chạy, khác line coverage và khác
"coverage của nhánh Git". Ưu tiên `PredictionService`, auth, validate upload,
adapter AI và phân quyền; kiểm tra cả nhánh thành công **và** nhánh lỗi. Không
đặt tỷ lệ đã đạt khi chưa có báo cáo.

NuGet restore và .NET unit test đã chạy được tại máy này. Dùng collector đã
khai báo để xuất Cobertura:

```powershell
dotnet restore backend/AgriVision.sln
dotnet test backend/tests/AgriVision.UnitTests/AgriVision.UnitTests.csproj --no-restore --collect:"XPlat Code Coverage" --logger trx
```

Chỉ đọc `TestResults/**/coverage.cobertura.xml` khi file được tạo và số test
được chạy > 0. Báo cáo phải nêu line rate, branch rate, số test, module được
đo và phần đã loại trừ. CI hiện fail nếu thiếu TRX/Cobertura, không có test
pass hoặc không có branch hợp lệ; chưa áp ngưỡng tỷ lệ. Sau khi có baseline đáng tin cậy, chọn ngưỡng branch coverage cho
code nghiệp vụ cùng đội; ban đầu chống suy giảm so với baseline, rồi tăng
ngưỡng theo các nhánh rủi ro. Không dùng tỷ lệ tổng để bỏ qua TC-04/TC-05.

Lệnh chạy Python từ root, với `python` trỏ tới môi trường có dependency:

```powershell
python -X utf8 -m unittest discover -s ai/tasks/agri_21/tests -p "test_*.py"
```

Chưa cấu hình đo branch coverage Python trong repo. Nếu cần gate này, bổ sung
`coverage.py`, chạy `coverage run --branch -m unittest ...` và chốt phạm vi
module đo; không trộn kết quả Python với .NET thành một tỷ lệ duy nhất.

## 5. Điều kiện báo cáo kết quả

Mỗi lần chạy ghi commit, lệnh, môi trường, số test phát hiện/chạy/pass/fail,
coverage artifact và lý do test bị skip/block. Integration cần Docker daemon và
image PostgreSQL; frontend cần `pnpm install --frozen-lockfile`. Không ghi "pass" cho lệnh chỉ build,
thiếu dependency, thiếu checkpoint hoặc Docker chưa chạy.
