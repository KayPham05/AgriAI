# Docker và pipeline CI

Docker đóng gói ứng dụng để chạy nhất quán; GitHub Actions tự động kiểm tra mã nguồn và khả năng khởi động các container. Hiện chưa có bước tự động triển khai staging.

## Thành phần Docker

| Thành phần | Chức năng |
|---|---|
| [Dockerfile backend](../../backend/Dockerfile) | Build ASP.NET Core API, sau đó chạy trên image runtime bằng user thường. |
| [Dockerfile frontend](../../frontend/Dockerfile) | Build Next.js và chạy bản standalone bằng user thường. |
| [Compose gốc](../../docker-compose.yml) | Chạy PostgreSQL, backend và frontend; cấu hình cổng, biến môi trường và thứ tự khởi động. |
| PostgreSQL | Lưu dữ liệu; backend áp dụng EF Core migration khi khởi động. |
| Volumes | `postgres_data` giữ dữ liệu DB; `uploads` giữ ảnh lưu cục bộ khi dùng fallback. |
| Health checks | Backend chờ DB healthy, frontend chờ backend healthy. `/api/health` chỉ kiểm tra DB; `/api/health/deps` giám sát AI riêng. |
| [Compose CI](../../docker-compose.ci.yml) | Bổ sung AI health mock để smoke test không cần model thật. Mock chỉ có `/health`, không có `/predict`. |

Luồng ứng dụng: **Trình duyệt → Next.js → ASP.NET Core → PostgreSQL / AI service**. AI thật chạy riêng, được cấu hình qua `AI_SERVICE_URL`.

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
  | container :8080   |         | AI_SERVICE_URL       |
  +---------+---------+         | outside Compose      |
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
  | AI health mock   |<---------------------| ASP.NET Core API  |
  | GET /health      |                      +---------+---------+
  | no /predict      |                                |
  +------------------+                                v
                                             +-------------------+
                                             | Frontend Next.js  |
                                             +-------------------+

  PostgreSQL -> healthy -> API -> healthy -> Frontend

  API readiness: GET /api/health -> DB only
  AI monitoring: GET /api/health/deps -> AI GET /health
  AI unavailable: deps 503; API/web can still start

  NOTE: AI mock pass = health/startup only; model inference is not tested.
```

## Pipeline GitHub Actions

[Workflow CI](../../.github/workflows/ci.yml) chạy khi mở/cập nhật PR, push lên `main` hoặc kích hoạt thủ công. Các job kiểm tra chạy độc lập, sau đó `ci-gate` tổng hợp kết quả.

| Job | Chức năng |
|---|---|
| `secret-scan` | Checkout toàn bộ lịch sử và dùng Gitleaks quét Git history (`--all`), che giá trị secret trong log. |
| `compose-smoke` | Build và chạy Compose gốc + CI; kiểm tra DB, AI health, quyền ghi uploads; tắt AI mock rồi kiểm tra API, trang web và proxy vẫn hoạt động; lưu log và dọn stack. |
| `python-tests` | Chạy unit test Python bằng dependency CPU và kiểm tra branch coverage tối thiểu 40%. |
| `backend-tests` | Build .NET, chạy unit/integration với PostgreSQL Testcontainers; gộp coverage và kiểm tra mức tối thiểu 35%. |
| `frontend` | Chạy lint, test, build Next.js và kiểm tra branch coverage tối thiểu 25%. |
| `ci-gate` | Chỉ pass khi tất cả job phía trên thành công. |

Mục tiêu branch coverage là **80% riêng cho từng phần**; các mức trên là ngưỡng tạm thời. CI lưu log, kết quả test và coverage để xem lại. **Smoke test với AI mock không xác nhận suy luận ConvNeXt-Tiny hoặc độ chính xác model.**

## Phạm vi setup

- Backend gọi `/predict` với timeout mặc định 15 giây, cấu hình qua `AI_TIMEOUT_SECONDS` trong Compose. Lỗi mạng, timeout và HTTP lỗi trả 503; response sai schema trả 502.
- Integration test dùng HTTP stub riêng để kiểm tra multipart `file`, JSON `class_index`, `class_name`, `confidence`, `top_k` và lỗi timeout/5xx. Compose vẫn dùng mock chỉ có health; cả hai đều không kiểm chứng model thật.
- `extra_hosts` hỗ trợ backend gọi AI trên host Linux. PostgreSQL giữ cổng bind `127.0.0.1`; chưa cần thêm Compose override chỉ để di chuyển một cổng local.
- [Dependabot](../../.github/dependabot.yml) kiểm tra NuGet, npm, pip, Docker và GitHub Actions hàng tuần, tối đa 3 PR cập nhật phiên bản mỗi ecosystem. Cấu hình theo [tài liệu GitHub](https://docs.github.com/en/code-security/reference/supply-chain-security/dependabot-options-reference).
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
       | Gitleaks    |  |Docker health|  |tests + 40%  |  |tests + 35%  |  |tests + 25% |
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
