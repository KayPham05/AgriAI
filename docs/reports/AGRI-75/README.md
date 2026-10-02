# AGRI-75 — Báo cáo thiết lập CI và kiểm thử

Tài liệu hiện tại: [kế hoạch CI/CD](../../plans/ci_cd_plan.md) và [báo cáo unit/integration test](unit_integration_test_report.md).

## Cập nhật ngày 2026-10-02 — Secret scan

Đã xác minh và loại trừ đúng bốn fingerprint của token minh họa bị cắt trong
tài liệu cũ. Lịch sử nhánh AGRI-75 còn ba finding; scan mọi ref local còn 27
finding. **Secret gate vẫn fail**; credential cần chủ tài khoản xác minh/đổi
và lịch sử Git cần xử lý có phối hợp. Xem [phân loại và bằng chứng kiểm chứng](secret_scan_triage.md).

## Cập nhật ngày 2026-10-01

Backend dùng .NET 9: unit 18/18 và integration 9/9 pass. Đã tách health DB/AI,
đặt timeout dự đoán, bổ sung HTTP contract stub và kiểm tra API trả 503 khi AI
không truy cập được. Compose smoke xác nhận web/API còn hoạt động khi tắt AI;
uploads có quyền ghi dưới user thường. Chưa đo lại coverage hoặc chạy GitHub Actions.

Gitleaks quét lịch sử 65 commit, phát hiện 31 finding cần phân loại/xử lý;
secret gate chưa pass. Dependabot đã thêm; chưa triển khai thêm scanner gate,
coverage ratchet hay CD. Chi tiết kiểm chứng tại [kế hoạch CI/CD](../../plans/ci_cd_plan.md).

## Cập nhật ngày 2026-09-29

**DoD chưa hoàn thành:** cấu hình CI/Docker đã được kiểm chứng cục bộ; các suite
đã chạy pass nhưng cả ba phần chưa đạt mục tiêu **80% branch coverage**. Gate
tạm thời là backend 35%, frontend 25%, Python 40% để chặn suy giảm trong khi
bổ sung test; đây không phải xác nhận đạt mục tiêu.
Xem [báo cáo CI và branch coverage hiện tại](ci_branch_coverage.md) để biết phạm vi,
lệnh chạy, số test, artifact, Docker smoke và phần còn lại.

Backend: 16 unit + 4 integration pass, coverage gộp 40,65%. Frontend: 31 test
pass, coverage 26,72%. Python Linux/Python 3.12: 43 test pass, coverage 44,73%
từ lần đo trước.
Docker Next.js/API/PostgreSQL/AI health stub: 4 service healthy ở lần chạy trước.
FastAPI adapter nay trả lỗi 503/502 thay vì dự đoán giả khi AI lỗi hoặc phản hồi
sai. Chưa chạy workflow trên GitHub hoặc bật required check. Không xác nhận suy
luận model thật.

## Lịch sử ngày 2026-09-27

Phần dưới ghi lại lần chạy cũ; cấu hình hiện tại và bằng chứng mới nằm ở báo cáo
ngày 2026-09-29 liên kết phía trên.

- **Ngày đối chiếu:** 2026-09-27
- **Nhánh:** `AGRI-75-ci-testing-setup`; base `main` `65082f6`
- **Trạng thái DoD:** **Chưa hoàn thành**. Đã thiết lập và kiểm chứng CI cơ bản tại máy; workflow đã commit cục bộ nhưng chưa có kết quả GitHub Actions. CD chưa được thiết lập.
- **Phạm vi báo cáo:** cấu hình CI, Docker health gate và các kiểm tra hiện có. Không đánh giá chất lượng model hay xác nhận luồng dự đoán ảnh thật.

## Công việc đã thực hiện

| Hạng mục | Hiện trạng | Nguồn |
|---|---|---|
| Khởi động dịch vụ | Backend chờ PostgreSQL healthy; frontend chờ backend healthy. AI health stub chạy độc lập trong Compose CI. `/api/health` kiểm tra DB, `/api/health/deps` kiểm tra AI. PostgreSQL dùng image chính thức; image tùy biến được nhắc ở báo cáo gốc đã bỏ. | [`docker-compose.yml`](../../../docker-compose.yml), [`backend/Dockerfile`](../../../backend/Dockerfile), [`frontend/Dockerfile`](../../../frontend/Dockerfile) |
| CI | Workflow PR và push `main` chạy `service-health` trước `python-smoke`, `dotnet-unit`, `dotnet-integration`, `frontend`. | [`.github/workflows/ci.yml`](../../../.github/workflows/ci.yml) |
| Test .NET | Unit test xuất TRX và Cobertura; integration test dùng PostgreSQL Testcontainers. Script kiểm tra có test thực chạy và có dữ liệu branch coverage. | [`backend/tests/`](../../../backend/tests/), [`check_dotnet_test_results.py`](../../../.github/scripts/check_dotnet_test_results.py) |
| Python và frontend | CI chạy hai module Python độc lập dependency; frontend chạy `pnpm lint` (`tsc --noEmit`) và `pnpm build`. | [`ci.yml`](../../../.github/workflows/ci.yml), [`frontend/package.json`](../../../frontend/package.json) |
| Tài liệu test | Có viewpoint và template/case API, screen, unit, integration; case chưa thực thi vẫn được ghi `Not run` hoặc `Blocked`. | [Chiến lược kiểm thử](../../notes/testing_strategy.md), [báo cáo chạy trước đó](../../notes/testing_ci_execution_report.md) |

## Bằng chứng kiểm tra cục bộ

| Kiểm tra | Kết quả | Giới hạn bằng chứng |
|---|---|---|
| `docker compose --project-name agrivision_demo up --build --detach --wait` | Bốn service đều healthy; kiểm tra lại bằng `docker compose --project-name agrivision_demo ps`. | Chạy tại máy này, dùng AI health stub; không phải một GitHub Actions run. |
| Frontend và API qua `http://127.0.0.1:3001` | Trang web HTTP 200; `/api/health` trả `Healthy`, database và AI health đều `Healthy`. | Chỉ xác nhận web/proxy và sức khỏe dịch vụ. |
| Auth qua web proxy | Đăng ký → đăng nhập → `/api/auth/me` trả cùng user ID; gọi `/me` không token trả 401. | Gọi HTTP trực tiếp. Login modal trên UI vẫn là hồ sơ demo, chưa gọi backend. |
| .NET unit TRX gần nhất | 7/7 pass, 0 fail. | Artifact cục bộ `.cache/ci-unit-docker-check/unit.trx` (Git bỏ qua), chưa phải artifact CI từ xa. |
| .NET unit Cobertura gần nhất | 22/198 branch = 11,11%; 193/2405 line = 8,02%. | Artifact cục bộ `.cache/ci-unit-docker-check/**/coverage.cobertura.xml` (Git bỏ qua); chưa đặt ngưỡng coverage. |
| .NET integration và Python smoke | Lần chạy cục bộ đã ghi 2/2 integration và 5/5 Python smoke pass. | Xem [báo cáo thực thi](../../notes/testing_ci_execution_report.md); không chạy lại hai suite khi lập báo cáo này. |

## Việc còn lại trước khi đóng AGRI-75

1. Push nhánh và mở PR; kiểm tra **từng job** pass trên GitHub Actions, lưu link run và artifact vào báo cáo. Chưa đặt required check trước khi có kết quả này.
2. Chốt phạm vi bắt buộc của CI: chạy full Python suite sau khi chuẩn bị dependency; thêm test cho các nhánh auth, upload, quyền lịch sử và lỗi AI có thể kiểm tra bằng stub dù chưa có model.
3. Bổ sung kiểm thử UI/API contract; hiện màn hình đăng nhập dùng dữ liệu demo và contract upload web/.NET còn lệch. Sau khi đo baseline trên phạm vi nghiệp vụ, thống nhất ngưỡng branch coverage và gate chống suy giảm.
4. Khi có checkpoint và mapping được xác nhận, mới chạy contract AI, suy luận xuyên tầng và staging smoke test. Thiết kế CD riêng sau các gate đó; health check của AI stub không chứng minh suy luận hoạt động.

**Kết luận:** phần **thiết lập CI tối thiểu và kiểm chứng cục bộ** đã làm xong. **CI testing toàn diện và CD chưa hoàn thành**; AGRI-75 chưa nên chuyển `Done` nếu DoD yêu cầu pipeline GitHub xanh và các test bắt buộc.
