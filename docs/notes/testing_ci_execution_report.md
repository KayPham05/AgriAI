# Báo cáo thực hiện tài liệu kiểm thử và CI

Ngày 2026-09-27 · Nhánh `AGRI-75-ci-testing-setup` · base `main` đối chiếu `65082f6`.
Workflow và Docker đã commit cục bộ; chưa có kết quả GitHub Actions. Ba file trong
`Testing Document/` là mẫu đầu vào và được giữ nguyên.

## 1. Việc đã thực hiện

| Bước | Kết quả | Bằng chứng trong repo |
|---|---|---|
| 1. Đối chiếu hiện trạng với mẫu | Chuyển cấu trúc viewpoint và test case mẫu sang dữ liệu AgriVision; phân biệt mã thật, demo/mock, và hạng mục chờ checkpoint. Case thiết kế chưa được đánh Passed. | [Viewpoint](agri_test_viewpoints.md), [API cases](agri_api_test_cases.md), [screen cases](agri_screen_test_cases.md) |
| 2. Cập nhật thứ tự phát triển | Đặt gate train/evaluation và mapping trước suy luận thật, tích hợp API/DB, Next.js và staging; giữ ERD/yêu cầu như thiết kế cần chốt. | [Kế hoạch phát triển](../development_roadmap.md) |
| 3. Chạy kiểm thử hiện có | Chạy được subset Python, .NET unit, frontend lint/build; ghi riêng các suite bị chặn. | Bảng lệnh bên dưới và [kế hoạch kiểm thử](testing_strategy.md) |
| 4. Thêm CI bước đầu | Workflow PR/push `main` có health gate tuần tự cho PostgreSQL, AI mock, API và frontend; Python smoke, .NET unit/integration, frontend phụ thuộc gate này. Chưa thêm CD. | [Workflow](../../.github/workflows/ci.yml), [script kiểm tra](../../.github/scripts/check_dotnet_test_results.py), [báo cáo AGRI-75](../reports/AGRI-75/README.md) |
| 5. Chuyển frontend sang pnpm | Bỏ `esbuild` direct dependency không sử dụng, chốt `pnpm@10.32.1`, tạo lockfile pnpm và bỏ lockfile cũ; cập nhật lệnh CI/tài liệu. | `frontend/package.json`, `frontend/pnpm-lock.yaml`, `frontend/README.md` |
| 6. Chuẩn bị integration DB | Sửa route health thành `/api/health` theo test/tài liệu API; test xác nhận PostgreSQL healthy khi AI chưa chạy. Bỏ test rỗng, cố định URL AI không hoạt động trong fixture. | `backend/src/AgriVision.API/Controllers/HealthController.cs`, `backend/tests/AgriVision.IntegrationTests/` |
| 7. Thêm AI mock health cho CI | Chỉ trả `Healthy` tại `/health`; không tạo dự đoán, không tải model. API phải báo DB và AI đều Healthy trong health gate. | `.github/scripts/mock_ai_health.py` |
| 8. Kiểm tra Docker Desktop và tránh đụng cổng | PostgreSQL cục bộ khác giữ cổng IPv4 5432; cho root Compose đổi cổng host, CI dùng 55432 và sửa tạm connection string API trong health job. | `docker-compose.yml`, `.github/workflows/ci.yml` |

## 2. Kết quả chạy cục bộ

| Lệnh / kiểm tra | Kết quả | Giới hạn |
|---|---|---|
| `python -X utf8 -m unittest ai.tasks.agri_21.tests.test_label_mapping ai.tasks.agri_21.tests.test_split_dataset_by_group` | **5/5 pass** | Chỉ hai module không cần thư viện ML. |
| `python -X utf8 -m unittest discover -s ai/tasks/agri_21/tests -p 'test_*.py'` | **Chưa pass:** 26 test được chạy, 11 import error | Thiếu Pillow, NumPy, Torch, TorchVision. `.venv` hiện trỏ đến Python không truy cập được. |
| `dotnet restore backend/AgriVision.sln` | **Pass** | Có cảnh báo assembly EF Core 9.0.1/9.0.2 trong build; không có lỗi restore. |
| `dotnet build backend/src/AgriVision.API/AgriVision.API.csproj --no-restore --verbosity quiet` | **Pass**, 0 warning/0 error | Chỉ xác nhận build; API health vẫn cần PostgreSQL và AI mock chạy đồng thời. |
| `dotnet test backend/tests/AgriVision.UnitTests/AgriVision.UnitTests.csproj --no-build --no-restore --collect:"XPlat Code Coverage" --logger "trx;LogFileName=unit.trx"` | **7/7 pass**; có TRX và Cobertura | Chỉ unit test; không suy ra integration pass. |
| `python -X utf8 .github/scripts/check_dotnet_test_results.py .cache/ci-unit-current` | **Pass** với artifact vừa tạo | Branch coverage là baseline quan sát, chưa áp ngưỡng chất lượng. |
| Cobertura unit test | **22/196 branch = 11,22%**; **193/2401 line = 8,03%** | Mẫu số gộp các assembly API/Application/Domain/Infrastructure được collector ghi nhận. Chưa loại trừ phần không thuộc logic nghiệp vụ. |
| `pnpm install --frozen-lockfile`, `pnpm lint` tại `frontend/` | **Pass** | Lockfile pnpm được tạo bằng pnpm 10.32.1. |
| `pnpm build` | **Pass**, 1.681 module | Lần đầu gặp `EPERM` khi Vite dọn output `frontend/dist/assets` cũ; sau khi dọn đúng thư mục build trong workspace, chạy lại pass. |
| Vite dev và preview qua pnpm | **Pass**, HTTP 200 và HTML có root | Chỉ xác nhận web được phục vụ; chưa phải kiểm thử UI/E2E. |
| AI mock `/health` | **Pass**, trả `{"status":"Healthy"}` | Chỉ xác nhận mock health, không tải model hoặc kiểm thử suy luận. |
| `docker info` | **Pass**, Docker Desktop 28.4.0 | Cần quyền truy cập Docker pipe; lệnh sandbox mặc định bị từ chối quyền. |
| `docker compose config --quiet`; đặt `$env:POSTGRES_HOST_PORT='55432'` rồi chạy `docker compose up --detach --wait postgres`, `docker compose exec -T postgres pg_isready` | **Pass**, container healthy và nhận kết nối | Cổng 5432 trên máy trỏ tới PostgreSQL khác; container thử nghiệm đã dừng bằng `docker compose down`, không xóa volume. |
| Health API với PostgreSQL Compose cổng 55432 và AI mock | **Pass**, HTTP 200, `status=Healthy`, DB=`Healthy`, AI=`Healthy` | Kiểm tra kết nối và startup; AI mock không kiểm tra suy luận. |
| `dotnet test backend/tests/AgriVision.IntegrationTests/AgriVision.IntegrationTests.csproj --no-restore --list-tests` | **Pass**, phát hiện 2 test auth/health | Chỉ biên dịch và liệt kê test, chưa chạy được logic. |
| `dotnet test backend/tests/AgriVision.IntegrationTests/AgriVision.IntegrationTests.csproj --no-build --no-restore --logger trx` | **2/2 pass**, có TRX | Testcontainers dùng DB riêng; lần chạy trước khi mở Docker Desktop đã fail do thiếu daemon, nay đã chạy lại đạt. |

Đã kiểm tra `.NET` bằng project unit cụ thể. Một lần `dotnet test` trên solution
trả exit code 0 nhưng chỉ hiện build, không có test summary; lần đó **không được
tính là test pass**. Workflow `.github/workflows/ci.yml` chưa chạy trên GitHub,
vì vậy health gate từ xa chưa được xác nhận. Trong
workflow, một health check lỗi làm job fail và bốn job có `needs: service-health`
không được chạy.

## 3. Phần chưa hoàn thành và thứ tự tiếp theo

1. **Model/data gate:** nhóm xác nhận model hiện chưa cho kết quả train đạt yêu
   cầu. Cần ghi experiment, validation Macro-F1/per-class recall, checkpoint,
   preprocessing và label mapping bất biến. Báo cáo này không xác minh chất lượng
   model hoặc bịa số liệu đánh giá.
2. **Môi trường kiểm thử:** sửa `.venv`, cài dependency ML đúng phiên bản và chạy
   full Python suite. CI đã có health gate bốn service và integration
   Testcontainers; cần chạy PR để xác nhận trên GitHub, xử lý lỗi nếu có rồi
   mới đặt làm required check. Docker cục bộ đã chạy được; PostgreSQL khác ở
   cổng 5432 buộc health job dùng cổng riêng 55432.
3. **Contract và nhánh lỗi:** chốt request/response AI–API–web, bỏ đường trả
   kết quả giả khi AI lỗi; viết unit/contract test cho lỗi upload, timeout,
   unknown class và quyền lịch sử. Sau đó đo lại branch coverage theo phạm vi
   nghiệp vụ và thống nhất ngưỡng chống suy giảm.
4. **Sản phẩm và triển khai:** khớp seed DB với checkpoint, bổ sung migration
   cho metadata model, chuyển web sang Next.js, viết kiểm thử UI/E2E trên
   checkpoint được xác nhận. Dockerfile mẫu đã có; cần staging smoke test trước CD.
5. **Bảo mật/vận hành:** cấu hình backend đang chứa secret trong Git; cần
   đổi/thu hồi giá trị còn hiệu lực, tách cấu hình ra khỏi Git và rà soát trước
   khi cấp credential cho CI/staging. Chưa triển khai hoặc bật CD.

Tài liệu API và màn hình là **mẫu để thành viên viết tiếp**. Mỗi case cần gắn
requirement/viewpoint, dữ liệu và môi trường, bước chạy, expected/actual,
evidence, trạng thái. Chỉ chuyển sang Passed sau khi thực thi trên đúng tầng và
ghi bằng chứng; một UI demo trả dữ liệu giả không xác nhận tính năng phân loại.
