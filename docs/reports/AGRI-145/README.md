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
- Explicit API adapters: `API-HEALTH-01` and `API-PRED-GUEST-01` pass locally and in live-contract CI.
- Screen group: **9 pass, 0 fail**, `RUN-screen`, exit `0`.
- Playwright: **11 trạng thái, 3 kích thước**, `RUN-playwright`, exit `0`.
- Sheets sync local với service account: **pass**; chạy lần hai **7/7 unchanged**, không duplicate. Remote protected sync cũng pass ở run `43570450037`.
- Security audit: key không bị Git track, key path bị ignore, không phát hiện secret pattern thật trong workflow/config.

## Giới hạn còn lại

- GitHub Actions run `43570450037` **pass toàn bộ**: smoke, live-contract, backend, frontend, Playwright, summary và `sheets-sync`.
- Live-contract đã được xác minh trên GitHub: checkpoint/migration stack, health và guest adapter pass. Sheets key được cleanup bằng `if: always()`.
- Viewpoint vẫn là evidence/design rows, chưa có runner riêng.
- Key service account chỉ dùng protected secret; không đưa vào Git.

## PR CI fix (2026-11-14)

- `secret-scan` bắt dummy JWT test-only trong lịch sử; thêm `.gitleaks.toml` allowlist đúng chuỗi placeholder.
- `frontend` fail vì assertion `getByRole` gặp hai preview ảnh; đổi sang `findAllByRole` và kiểm tra preview đầu tiên.
- Commit `f348ac1`; PR checks sau push: `secret-scan`, `frontend`, `ci-gate` và các job liên quan đều pass.

## Tài liệu liên quan

- Workflow: `.github/workflows/testcase-workflow.yml`
- Runner: `tools/testcase-workflow/`
- Hướng dẫn chuyển đổi: `docs/notes/production_test_automation_guide.md`
