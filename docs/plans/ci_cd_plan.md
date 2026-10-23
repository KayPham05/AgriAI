# Kế hoạch CI/CD AgriVision AI

## Hiện trạng đối chiếu ngày 2026-10-18 — AGRI-140

Checkout `237afa7`, nhánh `main`; người dùng cung cấp key AGRI-140. Phần lịch sử bên
dưới giữ nguyên kết quả từng đợt, không phải cấu hình hoặc phép đo mới nhất.

- Chỉ có [workflow CI](../../.github/workflows/ci.yml); chưa có publish/deploy job.
  `ci-gate` yêu cầu commitlint, secret-scan, compose-smoke, python-tests,
  backend-tests và frontend cùng thành công.
- Gate branch hiện hành: backend **60%**, frontend **60%**, Python **40%**;
  mục tiêu mỗi phần 80%. Không đổi gate trong cập nhật tài liệu này.
- Compose smoke tải hai checkpoint, kiểm SHA-256, build AI thật và gọi `/predict`
  trực tiếp để kiểm contract/59 nhãn. [Compose CI](../../docker-compose.ci.yml)
  chạy migration one-shot trước backend. Đây chưa phải prediction qua web/API/storage thật.
- [AI Dockerfile CPU](../../ai/Dockerfile) đã có. [Compose gốc](../../docker-compose.yml)
  còn build local, publish port web/API và bật Swagger; chưa có Compose production,
  Caddyfile, release manifest hoặc script deploy/backup/restore trong tập file kiểm tra.
- Backend chỉ migrate bằng `--migrate`; HTTP startup kiểm schema. Rollback image
  không tự rollback DB; không sửa migration history hoặc xóa volume.
- [QA local 2026-10-17](../reports/AGRI-127/system_qa.md) có model thật nhưng storage
  fake/jsdom; không thay nghiệm thu domain/HTTPS/cloud storage hoặc kết quả GitHub.
- `gh run list --workflow ci.yml --branch main --limit 5 --json databaseId,headSha,status,conclusion,url`
  ngày 2026-10-18 báo lỗi kết nối `api.github.com`; trạng thái CI từ xa **chưa xác minh**.
  Không suy ra workflow đang đỏ hoặc xanh.

## Đánh giá CD ngày 2026-10-18 — AGRI-140

**Nên bắt đầu chuẩn bị CD manual ngay; chưa nên bật tự deploy khi merge `main`.**
Cloudflare Free đủ cho DNS/proxy/HTTPS trong [thiết kế VPS](../vps_deployment.md);
không phải trở ngại phải nâng gói để viết CD. Còn thiếu bộ production và bằng chứng
vận hành nên chưa viết job deploy thực thi trong yêu cầu đánh giá này.

| Phần | Có thể làm tiếp | Điều kiện trước chạy/publish/deploy |
|---|---|---|
| Đóng gói release | Compose production độc lập dùng image, Caddyfile, env example không secret; benchmark image AI đã có | Không publish port nội bộ/Swagger; forwarded headers/HTTPS đúng; model và catalog 59 lớp khớp |
| Build/publish | Thiết kế build ba image, tag SHA và ghi digest sau `ci-gate` | CI thành công đúng SHA tin cậy trên main; registry/quyền package; không publish từ PR không tin cậy, không nhúng checkpoint/secret |
| Deploy manual | Thiết kế `workflow_dispatch` chọn SHA/release đã kiểm; serialize bằng concurrency, không hủy release đang migrate | VPS/domain thật, SSH host key và kênh runner→VPS phù hợp firewall, secret store và người vận hành được xác nhận |
| Migration và dữ liệu | Dùng CLI `--migrate` từ backend image đích; kế hoạch import catalog | Backup nhất quán ngoài VPS; restore thử trên DB riêng; compatibility/forward-only rõ ràng |
| Nghiệm thu release | Smoke nội bộ và HTTPS domain, auth/owner/guest/upload/history/ảnh hết hạn | R2 private/read/delete và không fallback local; E2E checkpoint thật; benchmark RAM/timeout/quá tải |
| Rollback | Manifest SHA/digest/model/migration/backup ID, lệnh quay image và quy trình restore | Diễn tập; migration không tương thích thì giữ maintenance và xử lý DB có chủ đích, không tự downgrade |

Lộ trình triển khai: chuẩn bị bộ production → xác minh CI đúng SHA → build/publish
release → diễn tập deploy/backup/restore bằng tay → workflow manual gọi cùng script.
Với quy mô demo một VPS, không bắt buộc dựng staging riêng; dùng project/DB thử riêng
cho diễn tập để giữ dữ liệu ứng dụng. Chỉ cân nhắc tự deploy sau merge khi quy trình
manual đã ổn định và được cho phép. Chưa tự tạo workflow, publish image hay cấu hình
GitHub Environment. Nếu dùng approval protection, kiểm hỗ trợ theo gói GitHub và độ
hiển thị repo; Cloudflare Free không quyết định tính năng đó.

Cloudflare bootstrap DNS/Origin CA làm riêng; deploy thường ngày không cần token sửa
zone hoặc private key Origin CA trên runner. Không mở SSH toàn Internet để tiện dùng
GitHub-hosted runner. Hướng dẫn workflow manual:
[GitHub Docs](https://docs.github.com/en/actions/how-tos/manage-workflow-runs/manually-run-a-workflow).

## Lịch sử kế hoạch và kết quả 2026-09-29–2026-10-07

> Cập nhật cấu hình 2026-10-01 trên nhánh `AGRI-75-ci-testing-setup`. Các số coverage bên dưới là kết quả cục bộ ngày 2026-09-29; chưa có kết quả GitHub Actions được xác nhận.

Gate backend cập nhật ngày 07/10/2026 lên 50%; kết quả backend trong bảng được đo lại cùng ngày. Các kết quả frontend/Python và Docker cũ giữ để tra cứu lịch sử. Xem [coverage report](../reports/AGRI-75/ci_branch_coverage.md).

### Mục tiêu lịch sử

CI build và kiểm tra Next.js, ASP.NET Core và Python; chạy unit test, integration test và hướng tới **branch coverage ít nhất 80% cho từng phần** backend, frontend, Python. Do tỷ lệ hiện có thấp hơn, gate tạm thời giữ mức sàn theo artifact đo: backend 50%, frontend 25%, Python 40%. Docker Compose kiểm tra khởi động và health. Chưa cấu hình CD staging vì chưa dùng đến; suy luận thật vẫn cần dịch vụ AI và checkpoint đã được kiểm chứng.

### Đã triển khai tại thời điểm kế hoạch cũ

| Phần | Cấu hình hiện tại | Kết quả cục bộ |
|---|---|---|
| CI | [Workflow](../../.github/workflows/ci.yml) chạy trên PR, push `main` và thủ công. Job `secret-scan` dùng Gitleaks; các job `compose-smoke`, `python-tests`, `backend-tests`, `frontend` độc lập; `ci-gate` tổng hợp. | Chưa kiểm chứng trên GitHub Actions. |
| Docker | [Compose gốc](../../docker-compose.yml) dựng PostgreSQL, API, Next.js; [Compose CI](../../docker-compose.ci.yml) thêm AI health mock. | Bốn service trong Compose CI healthy ở lần đo trước; mock chỉ kiểm tra health. |
| Backend | Unit và integration dùng PostgreSQL Testcontainers; xuất TRX/Cobertura, gộp bằng ReportGenerator; sàn 50%, mục tiêu 80%. | Ngày 07/10: unit 33/33, integration 13/13; branch gộp 213/364 = 58,52%. |
| Frontend | Node 24, pnpm 10.34.5; lint, Vitest coverage, Next.js build; sàn 25%, mục tiêu 80%. | 31/31 test; branch 255/954 = 26,72%. |
| Python | Python 3.12, dependency CPU; chạy suite AGRI-21 và coverage.py; sàn 40%, mục tiêu 80%. | 43/43 test trên Linux ở lần đo trước; branch 458/1024 = 44,73%. |

PostgreSQL dùng trực tiếp image `postgres:16-alpine`; schema do EF Core migration quản lý. Khi chỉ cần DB cục bộ, chạy `docker compose up -d postgres` từ root. Health check được ghi trực tiếp tại mỗi file, không thêm lớp template.

`/api/health` kiểm tra DB để Compose khởi động web/API độc lập với AI;
`/api/health/deps` giám sát AI. Timeout dự đoán mặc định 15 giây, chưa retry POST.
Compose smoke tắt AI mock để kiểm tra API/web còn hoạt động và kiểm tra quyền
ghi uploads của backend. HTTP contract stub nằm trong integration suite, không
được xem là kiểm chứng model thật. Đã bỏ cấu hình Dependabot ngày 2026-10-02
theo yêu cầu giữ phiên bản dependency hiện tại;
chưa thêm vulnerability/image scan gate hay coverage ratchet ở giai đoạn setup.

Chi tiết ca kiểm thử: [báo cáo unit/integration](../reports/AGRI-75/unit_integration_test_report.md). Cấu hình và artifact: [báo cáo coverage](../reports/AGRI-75/ci_branch_coverage.md).

#### Kiểm chứng sau chỉnh sửa ngày 2026-10-01

- Sau khi đưa backend về .NET 9, `dotnet test backend/AgriVision.sln --verbosity quiet` trên máy cục bộ: unit **18/18 pass**, integration với PostgreSQL Testcontainers **4/4 pass**. Chưa build lại Docker image hoặc đo lại branch coverage; các tỷ lệ trong bảng vẫn là của ngày 2026-09-29.
- Trước khi bỏ cấu hình staging, `docker compose config --quiet` pass cho Compose gốc, gốc + CI và staging. Compose smoke trên project thử nghiệm riêng: PostgreSQL, AI health mock, backend, frontend đều healthy; API và proxy trả `Healthy`. Container và volume thử nghiệm đã được dọn. Đây là bằng chứng của lần kiểm tra trước, chưa phải kiểm tra lại sau khi bỏ staging.
- Gitleaks v8.24.2 quét bản xuất 326 file nguồn hiện tại: không phát hiện secret. Đây là quét **file hiện tại**, không phải quét lịch sử Git; credential đã từng có trong Git vẫn cần chủ tài khoản xác minh và thu hồi/đổi nếu còn hiệu lực.
- actionlint 1.7.12 kiểm tra workflow: pass. GitHub Actions và VPS staging vẫn chưa được chạy.

Sau khi tách health và bổ sung kiểm thử HTTP contract (2026-10-01):

- Unit **18/18 pass**, integration **9/9 pass** trên .NET 9. HTTP stub kiểm tra
  multipart/JSON, timeout và 5xx; API dự đoán trả 503 khi AI không truy cập được.
- Compose gốc và gốc + CI: `config --quiet` pass. Build và smoke trên project
  riêng `agri-setup-6610f795`: bốn service healthy; backend chạy UID 1654,
  uploads có quyền ghi. Tắt AI mock: `/api/health/deps` trả 503, API health,
  proxy và frontend vẫn hoạt động. Đã dọn container/volume thử nghiệm.
- actionlint **1.7.7** trong container: pass. Chưa chạy workflow mới trên GitHub
  và chưa đo lại coverage.
- Gitleaks **v8.24.2**, `git --log-opts=--all --redact`: **65 commit, 31 finding**,
  exit 1. Finding gồm cấu hình/tài liệu cũ và file build/cache từng được commit;
  chưa phân loại hết false positive hay xác minh credential còn hiệu lực.
  Gate mới sẽ fail cho đến khi xử lý finding. Báo cáo đã redact tại
  `.cache/compose-setup/gitleaks-history.json` (ngoài Git); log smoke tại
  `.cache/compose-setup/`. Không rewrite lịch sử hoặc thêm ignore để ép pass.

**Trạng thái:** các test từ lần đo trước đạt interim floors; chưa có workflow GitHub Actions run được xác nhận. Backend dùng coverage gộp hai suite, không lấy trung bình hai tỷ lệ. Đã bỏ cấu hình CD staging chưa sử dụng để giữ cấu hình tối thiểu. Required check chưa được xác nhận trên GitHub.

### Việc tiếp theo cho CI trong kế hoạch cũ

1. Thêm test theo các nhánh nghiệp vụ còn thiếu: auth, validation/upload, lịch sử, lỗi DB/AI và UI/API contract. Nâng các sàn backend 50 → 65 → 80%, frontend 25 → 40 → 60 → 80%, Python 40 → 55 → 70 → 80%. Test cần xác nhận hành vi, không chỉ tăng tỷ lệ coverage.
2. Chạy workflow trên PR, kiểm tra từng job và artifact TRX/Cobertura. Sau khi pipeline xanh, cấu hình `ci-gate` làm required check theo quy tắc nhánh của nhóm.
3. Khi checkpoint, mapping nhãn và schema inference được chốt, thêm contract/E2E với AI thật: cùng ảnh phải cho kết quả nhất quán từ API tới UI, kể cả nhánh AI lỗi.

### Kế hoạch CD cũ và đính chính

Kế hoạch cũ chưa cấu hình CD staging; đề xuất bổ sung khi có nhu cầu triển khai.
Nhận định cũ backend tự migrate lúc startup đã được thay thế: HTTP startup hiện chỉ
kiểm schema, migration chạy CLI riêng `--migrate`. Phương án hiện hành là production
demo một VPS và deploy manual theo đánh giá AGRI-140 ở đầu tài liệu; staging riêng
không còn là điều kiện mặc định. Rollback image vẫn không tự rollback schema DB.

CI đạt mục tiêu khi ba coverage gate đều đạt 80%, mọi job pass trên GitHub Actions và required check được áp dụng. CD cần bằng chứng staging với AI thật và quy trình phát hành/rollback đã kiểm chứng.
