# Docker và pipeline CI

Docker đóng gói ứng dụng để chạy nhất quán; GitHub Actions tự động kiểm tra mã nguồn và khả năng khởi động các container. Hiện chưa có bước tự động triển khai staging.

## Thành phần Docker

| Thành phần | Chức năng |
|---|---|
| [Dockerfile backend](../../backend/Dockerfile) | Build ASP.NET Core API, sau đó chạy trên image runtime bằng user thường. |
| [Dockerfile frontend](../../frontend/Dockerfile) | Build Next.js và chạy bản standalone bằng user thường. |
| [Dockerfile AI](../../ai/Dockerfile) | Build FastAPI inference với PyTorch CPU; checkpoint nằm ngoài image. |
| [Compose gốc](../../docker-compose.yml) | Chạy PostgreSQL, backend, frontend và AI; cấu hình cổng, biến môi trường và thứ tự khởi động. |
| PostgreSQL | Lưu dữ liệu; migration chạy riêng bằng `docker compose run --rm --no-deps backend --migrate`, startup API không đổi schema. |
| Volumes | `postgres_data` giữ dữ liệu DB; `uploads` giữ ảnh lưu cục bộ khi dùng fallback. |
| Health checks | Backend chờ DB và AI healthy, frontend chờ backend healthy. `/api/health` chỉ kiểm tra DB; `/api/health/deps` giám sát AI riêng. |
| [Compose CI](../../docker-compose.ci.yml) | Bổ sung job migration riêng; giữ AI thật và checkpoint mount read-only của Compose gốc. Workflow tải model từ Drive và kiểm tra SHA-256 trước khi chạy. |

Luồng ứng dụng: **Trình duyệt → Next.js → ASP.NET Core → PostgreSQL / AI service**.
AI thật chạy trong Compose tại `http://ai-service:8000`, checkpoint mount read-only.

## Sơ đồ Docker local và CI

```text
LOCAL: docker-compose.yml

  Browser
     |
     | http://localhost:3000
     v
  +-------------------+
  | Frontend Next.js  |
  | container :3000   |
  +---------+---------+
            |
            | /api/* -> http://backend:8080
            v
  +-------------------+         +----------------------+
  | ASP.NET Core API  |-------->| Real FastAPI         |
  | container :8080   |         | ai-service:8000      |
  +---------+---------+         | CPU, checkpoints:ro  |
            |                   +----------------------+
            |
            v
  +-------------------+
  | PostgreSQL 16     |
  | postgres:16-alpine|
  +---------+---------+
            |
            v
     [postgres_data]

  API --local images--> [uploads]


CI SMOKE: docker-compose.yml + docker-compose.ci.yml

  +------------------+     health only      +-------------------+
  | Real AI service  |<---------------------| ASP.NET Core API  |
  | GET /health      |                      +---------+---------+
  | POST /predict    |                                |
  +------------------+                                v
                                             +-------------------+
                                             | Frontend Next.js  |
                                             +-------------------+

  PostgreSQL + real AI -> healthy -> API -> healthy -> Frontend

  API readiness: GET /api/health -> DB only
  AI monitoring: GET /api/health/deps -> AI GET /health
  AI lost after startup: deps 503; API/web keep serving

  CI: download + SHA-256 -> checkpoints:ro -> real /predict smoke.
  Smoke verifies execution/schema, not model accuracy or full web E2E.
```

## Pipeline GitHub Actions

[Workflow CI](../../.github/workflows/ci.yml) chạy khi mở/cập nhật PR, push lên `main` hoặc kích hoạt thủ công. Các job kiểm tra chạy độc lập, sau đó `ci-gate` tổng hợp kết quả.

| Job | Chức năng |
|---|---|
| `secret-scan` | Checkout toàn bộ lịch sử và dùng Gitleaks quét Git history (`--all`), che giá trị secret trong log. |
| `compose-smoke` | Tải và kiểm checksum model; build/chạy Compose gốc + CI; kiểm tra DB, AI health, inference thật và quyền ghi uploads; tắt AI rồi kiểm tra API/web/proxy vẫn hoạt động; lưu log và dọn stack thử nghiệm. |
| `python-tests` | Chạy unit test Python bằng dependency CPU và kiểm tra branch coverage tối thiểu 40%. |
| `backend-tests` | Build .NET, chạy unit/integration với PostgreSQL Testcontainers; gộp coverage và kiểm tra mức tối thiểu 50%. |
| `frontend` | Chạy lint, test, build Next.js và kiểm tra branch coverage tối thiểu 25%. |
| `ci-gate` | Chỉ pass khi tất cả job phía trên thành công. |

Mục tiêu branch coverage là **80% riêng cho từng phần**; các mức trên là ngưỡng tạm thời. CI lưu log, kết quả test và coverage để xem lại. **Smoke inference thật kiểm tra khả năng chạy và hợp đồng HTTP, không xác nhận độ chính xác model hoặc toàn bộ luồng web.**

## Phạm vi setup

- Backend gọi `/predict` với timeout mặc định 15 giây, cấu hình qua `AI_TIMEOUT_SECONDS` trong Compose. Lỗi mạng, timeout và HTTP lỗi trả 503; response sai schema trả 502.
- Integration test dùng HTTP stub riêng để kiểm tra multipart `file`, JSON `class_index`, `class_name`, `confidence`, `top_k` và lỗi timeout/5xx. Compose smoke dùng model thật từ Drive; các kết quả này được báo cáo tách biệt.
- Backend gọi AI bằng DNS service nội bộ; PostgreSQL và AI giữ cổng bind `127.0.0.1`.
- Repo hiện không có `.github/dependabot.yml` để tạo PR cập nhật phiên bản định kỳ. Các job CI vẫn được cấu hình trong workflow riêng; việc bỏ cấu hình cập nhật phiên bản không tắt CI.
- Giữ `ci-gate`, timeout các job, quyền `contents: read`, concurrency và cache npm/pip hiện có. Required check `ci-gate` cần cấu hình riêng trên GitHub.
- Chưa thêm retry tự động cho POST upload, Trivy/hadolint/audit gate, coverage ratchet, NuGet/buildx cache hoặc pin SHA action. Bổ sung khi CI có baseline ổn định và có nhu cầu vận hành; Dependabot không thay thế vulnerability scan.

Kiểm chứng cục bộ ngày 2026-10-01: unit 18/18, integration 9/9; Compose build/
smoke và actionlint pass. Gitleaks history phát hiện 31 finding trong 65 commit,
nên secret gate chưa pass. Chi tiết và giới hạn tại [kế hoạch CI/CD](../plans/ci_cd_plan.md).

## Sơ đồ pipeline GitHub Actions

```text
  Pull request
  Push main
  Manual run
      |
      v
  +-----------------------+
  | GitHub Actions CI     |
  +-----------+-----------+
              |
              +----------------+----------------+----------------+----------------+
              |                |                |                |                |
              v                v                v                v                v
       +-------------+  +-------------+  +-------------+  +-------------+  +-------------+
       | secret-scan |  |compose-smoke|  |python-tests |  |backend-tests|  |  frontend   |
       | Gitleaks    |  |Docker health|  |tests + 40%  |  |tests + 50%  |  |tests + 25% |
       +------+------+  +------+------+  +------+------+  +------+------+  +------+------+
              |                |                |                |                |
              +----------------+----------------+----------------+----------------+
                                               |
                                               v
                                      +-----------------+
                                      |     ci-gate     |
                                      | all jobs pass   |
                                      +--------+--------+
                                               |
                                  +------------+-------------+
                                  |                          |
                                  v                          v
                             CI passes                  Pipeline fails
                                                        if any job fails

  CURRENT STATE: pipeline ends at ci-gate; no staging CD job.
```
