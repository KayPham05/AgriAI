# Kế hoạch CI/CD AgriVision AI

> Cập nhật 2026-09-29 trên nhánh `AGRI-75-ci-testing-setup`. Kết quả dưới đây là kiểm tra cục bộ; chưa có kết quả GitHub Actions.

## Mục tiêu

CI build và kiểm tra Next.js, ASP.NET Core và Python; chạy unit test, integration test và hướng tới **branch coverage ít nhất 80% cho từng phần** backend, frontend, Python. Do tỷ lệ hiện có thấp hơn, gate tạm thời giữ mức sàn theo artifact đo: backend 35%, frontend 25%, Python 40%. Docker Compose kiểm tra khởi động và health. CD triển khai sau khi CI đạt và luồng suy luận thật sẵn sàng.

## Đã triển khai

| Phần | Cấu hình hiện tại | Kết quả cục bộ |
|---|---|---|
| CI | [Workflow](../../.github/workflows/ci.yml) chạy trên PR, push `main` và thủ công. Các job `compose-smoke`, `python-tests`, `backend-tests`, `frontend` độc lập; `ci-gate` tổng hợp. | Chưa kiểm chứng trên GitHub Actions. |
| Docker | [Compose gốc](../../docker-compose.yml) dựng PostgreSQL, API, Next.js; [Compose CI](../../docker-compose.ci.yml) thêm AI health mock. Web/API có Dockerfile. [Compose backend](../../backend/docker-compose.yml) dành riêng cho PostgreSQL khi phát triển. | Bốn service healthy; mock chỉ kiểm tra health. |
| Backend | Unit và integration dùng PostgreSQL Testcontainers; xuất TRX/Cobertura, gộp bằng ReportGenerator; sàn 35%, mục tiêu 80%. | Unit 16/16, integration 4/4; branch gộp 100/246 = 40,65%. |
| Frontend | Node 24, pnpm 10.34.5; lint, Vitest coverage, Next.js build; sàn 25%, mục tiêu 80%. | 31/31 test; branch 255/954 = 26,72%. |
| Python | Python 3.12, dependency CPU; chạy suite AGRI-21 và coverage.py; sàn 40%, mục tiêu 80%. | 43/43 test trên Linux ở lần đo trước; branch 458/1024 = 44,73%. |

Chi tiết ca kiểm thử: [báo cáo unit/integration](../reports/AGRI-75/unit_integration_test_report.md). Cấu hình và artifact: [báo cáo coverage](../reports/AGRI-75/ci_branch_coverage.md).

**Trạng thái:** các test pass cục bộ và số coverage mới đạt interim floors; chưa có workflow GitHub Actions run để xác nhận. Backend dùng coverage gộp hai suite, không lấy trung bình hai tỷ lệ. Chưa có workflow CD hay required check được xác nhận trên GitHub.

## Việc tiếp theo cho CI

1. Thêm test theo các nhánh nghiệp vụ còn thiếu: auth, validation/upload, lịch sử, lỗi DB/AI và UI/API contract. Nâng các sàn backend 35 → 50 → 65 → 80%, frontend 25 → 40 → 60 → 80%, Python 40 → 55 → 70 → 80%. Test cần xác nhận hành vi, không chỉ tăng tỷ lệ coverage.
2. Chạy workflow trên PR, kiểm tra từng job và artifact TRX/Cobertura. Sau khi pipeline xanh, cấu hình `ci-gate` làm required check theo quy tắc nhánh của nhóm.
3. Khi checkpoint, mapping nhãn và schema inference được chốt, thêm contract/E2E với AI thật: cùng ảnh phải cho kết quả nhất quán từ API tới UI, kể cả nhánh AI lỗi.

## Hướng CD

1. Đóng gói image theo commit SHA, lưu phiên bản API/web/model; cấp secret qua môi trường, không lưu dataset, checkpoint hoặc credential trong Git.
2. Triển khai staging với DB, storage và model đã xác nhận. Chạy migration có kiểm soát, smoke test auth, upload, prediction, history và trường hợp AI lỗi.
3. Kiểm tra backup, rollback ứng dụng/schema và giám sát health, lỗi, độ trễ trước khi phát hành production.

CI đạt mục tiêu khi ba coverage gate đều đạt 80%, mọi job pass trên GitHub Actions và required check được áp dụng. CD cần thêm bằng chứng staging và quy trình phát hành/rollback đã kiểm chứng.
