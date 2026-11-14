# AGRI-145 — Testcase workflow

## Phạm vi

Workflow quản lý registry testcase cho `api`, `screen`, `viewpoint`; thực thi nhóm API/.NET, Vitest và Playwright; nhập artifact kết quả rồi đồng bộ Google Sheets. Mapping group → testcase dùng `case_ids`, không fan-out ngầm.

## Thay đổi chính

- Validator artifact kiểm tra schema, duplicate, status và trả exit `1` cho `Failed`/`Blocked`.
- Runner ghi `results.json`, giữ exit code, import artifact trước Sheets sync.
- Sync bảo vệ cột manual/business, đánh dấu testcase cũ `Deprecated`, retry lỗi mạng/429/5xx và batch value writes.
- CI có 7 job, gồm live-contract cho health/guest adapters, artifact aggregation, readiness, concurrency cho Sheets sync và quyền tối thiểu `contents: read`.

## Bằng chứng hiện tại

- `python -m unittest tools.testcase-workflow.test_workflow tools.testcase-workflow.test_sheets_client -q`: **23 pass**.
- YAML parse bằng PyYAML: **7 jobs**.
- Docker Compose: postgres, AI, backend, frontend **healthy**; `/diagnose` và `/api/health`: **HTTP 200**.
- API group: **294 pass, 0 fail**, `RUN-api`, exit `0` (dotnet cases).
- Explicit API adapters: `API-HEALTH-01` and `API-PRED-GUEST-01` pass locally against Docker; the live-contract CI job is configured but not yet run remotely.
- Screen group: **9 pass, 0 fail**, `RUN-screen`, exit `0`.
- Playwright: **11 trạng thái, 3 kích thước**, `RUN-playwright`, exit `0`.
- Sheets sync local với service account: **pass**; chạy lần hai **7/7 unchanged**, không duplicate. GitHub secret `GCP_SA_KEY_BASE64` chưa được cấu hình nên remote Sheets write chưa chạy.\n- Security audit: key không bị Git track, key path bị ignore, không phát hiện secret pattern thật trong workflow/config.

## Giới hạn còn lại

- GitHub Actions run `43569299656` trên SHA `5b612b4` **pass**: smoke, live-contract, backend, frontend, Playwright và summary đều xanh; `sheets-sync` skipped vì dispatch trên feature branch không thỏa điều kiện push `main`.
- Live-contract đã được xác minh trên GitHub: checkpoint/migration stack, health và guest adapter pass.
- Viewpoint vẫn là evidence/design rows, chưa có runner riêng.
- Key service account chỉ dùng local/protected secret; không đưa vào Git.

## Tài liệu liên quan

- Workflow: `.github/workflows/testcase-workflow.yml`
- Runner: `tools/testcase-workflow/`
- Hướng dẫn chuyển đổi: `docs/notes/production_test_automation_guide.md`\n\n\n\n\n\n