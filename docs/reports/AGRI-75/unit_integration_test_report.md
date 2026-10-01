# Báo cáo unit test và integration test — AGRI-75

> Cập nhật 2026-09-29. Backend và frontend được chạy lại sau thay đổi xử lý lỗi AI; Python dùng artifact cục bộ đã ghi nhận trước đó. Chưa phải kết quả GitHub Actions.

## Kết quả

| Phần | Loại test | Kết quả | Artifact cục bộ |
|---|---|---:|---|
| ASP.NET Core | Unit | 16/16 pass | `.cache/coverage/review-20260929/unit/unit.trx` |
| ASP.NET Core + PostgreSQL | Integration | 4/4 pass | `.cache/coverage/review-20260929/integration-docker/integration.trx` |
| Next.js | Vitest component/service và trang | 31/31 pass trên 7 file | `.cache/coverage/frontend/cobertura-coverage.xml` |
| Python AGRI-21 | Unit/logic dữ liệu, Linux/Python 3.12 | 43/43 pass | `.cache/coverage/python-linux/coverage.xml` |

Artifact `.cache/` không được đưa vào Git. Xem [báo cáo CI/coverage](ci_branch_coverage.md) để biết cấu hình đo và cách chạy.

## Backend unit test

[`AuthServiceTests`](../../../backend/tests/AgriVision.UnitTests/Services/AuthServiceTests.cs) có bốn ca về đăng ký/đăng nhập. [`PredictionServiceTests`](../../../backend/tests/AgriVision.UnitTests/Services/PredictionServiceTests.cs) kiểm tra ảnh hợp lệ, file sai/rỗng và không lưu bản ghi khi AI lỗi. [`FastApiPlantDiseasePredictorTests`](../../../backend/tests/AgriVision.UnitTests/Services/FastApiPlantDiseasePredictorTests.cs) kiểm tra timeout, HTTP lỗi, phản hồi sai và hợp lệ; [`GlobalExceptionMiddlewareTests`](../../../backend/tests/AgriVision.UnitTests/Services/GlobalExceptionMiddlewareTests.cs) kiểm tra HTTP 503/502 có thông điệp rõ. Các dependency AI được giả lập để kiểm tra xử lý hợp đồng và lỗi, không chạy checkpoint thật.

## Backend integration test

[`AgriVisionFactory`](../../../backend/tests/AgriVision.IntegrationTests/Fixtures/AgriVisionFactory.cs) khởi tạo API qua `WebApplicationFactory`, PostgreSQL 16 qua Testcontainers và áp dụng EF migration. Predictor và image storage được giả lập. Bộ test kiểm tra API, DI và DB, chưa kiểm tra AI thật hoặc storage ngoài.

| Ca | Hành vi đã kiểm tra |
|---|---|
| [`AuthControllerTests`](../../../backend/tests/AgriVision.IntegrationTests/Controllers/AuthControllerTests.cs) | Đăng ký rồi đăng nhập hợp lệ. |
| [`HealthControllerTests`](../../../backend/tests/AgriVision.IntegrationTests/Controllers/HealthControllerTests.cs) | DB healthy, AI không truy cập được; health tổng thể degraded. |
| [`PredictionsControllerTests`](../../../backend/tests/AgriVision.IntegrationTests/Controllers/PredictionsControllerTests.cs), ảnh hợp lệ | API trả 201 và lưu bản ghi vào PostgreSQL. |
| `PredictionsControllerTests`, phần mở rộng sai | API trả 400. |

Testcontainers cần Docker daemon. Compose smoke là kiểm tra riêng cho web, API, PostgreSQL và AI health mock; trạng thái healthy chưa chứng minh prediction thật.

## Frontend và Python

Vitest kiểm tra component, service, tiện ích và trang. `DiagnosePage.integration.test.tsx` kết hợp các thành phần frontend nhưng mock `predictionApi`, vì vậy chưa kiểm tra HTTP xuyên web → backend. Python suite kiểm tra logic AGRI-21 với dependency CPU, chưa dùng dataset hay checkpoint thật.

## Branch coverage và kết luận

| Phần | Branch đã cover / tổng | Tỷ lệ | Gate |
|---|---:|---:|---|
| Backend, gộp unit + integration | 100/246 | 40,65% | Sàn 35% đạt; mục tiêu 80% chưa đạt |
| Frontend | 255/954 | 26,72% | Sàn 25% đạt; mục tiêu 80% chưa đạt |
| Python trên Linux, lần đo trước | 458/1024 | 44,73% | Sàn 40% đạt; mục tiêu 80% chưa đạt |

Các suite đã chạy pass cục bộ và artifact đạt mức sàn tạm thời; chưa xác nhận pipeline GitHub. Cần tiếp tục thêm test để nâng dần lên 80%. Chưa có xác nhận E2E với AI thật.
