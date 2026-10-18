# AGRI-127 — QA hệ thống

Đợt QA ngày 2026-10-17, trước khi nâng gate. Phạm vi DB/migration/backend/AI/frontend;
không triển khai API/UI mới. [Việc tồn đọng](../../notes/remaining_work.md) quản lý tập trung.

## Kết quả và bằng chứng

Artifact dưới `.cache/qa-verification/agri127/system/`:

| Phần | Kết quả của đợt này | Artifact |
|---|---|---|
| Backend | 33 unit + 84 integration pass, 0 skip; 42 persistence + 42 API/service | `summary.json`, `backend-coverage/*.trx` |
| AI | 55 unit + 13 HTTP fake-model + 6 checkpoint thật = 74 pass | `ai-all.log` |
| Frontend | 34 file/215 test pass; typecheck/lint/build pass | `frontend-final.log`, `frontend-typecheck.log`, `frontend-lint.log`, `frontend-build.log` |
| Format | 4 file đổi pass; toàn checkout Windows fail 161 file cũ, chủ yếu CRLF | `frontend-changed-format.log`, `frontend-format.log` |
| CI validators | 3 pass; selector thường nhận 83 integration | `ci-validator-tests.log`, `ci-integration-selection.log` |

Tổng 406 test ứng dụng; không cộng thêm 3 validator. Branch backend **222/358 =
62,01%**, Python **503/1074 = 46,83%**, frontend **925/1496 = 61,83%** từ các XML
coverage/`summary.json`. Sàn tại đợt này 50/25/40 (backend/frontend/Python);
[gate sau](../../../.github/workflows/ci.yml) là 60/60/40, target mỗi phần vẫn 80%.

## Thay đổi đã kiểm tra

- Thêm 27 ca: 9 DB/migration, 3 FastAPI, 15 frontend; topK mở rộng subcase.
- DB: ownership, reapproval liên kết/thuốc, blank profile, race session–disable/role,
  upgrade/repeat/forward-only và indexes. Dùng PostgreSQL disposable.
- FastAPI: 15 MiB/15 MiB+1, pixel limit, cleanup sau lỗi; không đổi model.
- Frontend: Guest/response lỗi/abort và tương tác hồ sơ hiển thị/lịch sử.
  5 ca fail trước sửa adapter `predictionApi.ts`; sau sửa contract 17 pass.
  Evidence: `frontend-contract-red.log`, `frontend-contract-green.log`.
- Gom 24 file AI vào `ai/tests/`: 21 giữ hash, không mất method cũ; script nguồn
  giữ nguyên. Evidence `ai-test-moves.json`. [Cấu trúc hiện hành](../../../ai/tests/README.md).

Giới hạn: storage fake trong API test; jsdom không phải E2E. Session/JWT, CRUD mới,
accuracy lúc đó, scans/performance/GPU/GitHub Actions chưa nghiệm thu; xem checklist.
Khoảng trống coverage: offline scripts/training CLI, route/provider frontend;
`validation.ts`/`gradcam.ts` chưa tìm thấy caller hoạt động. Không loại source/test giả.
Các lỗi pnpm/temp permission và fixture thiếu avatarUrl đã xử lý trong đợt này;
không phải backlog mới. Không reset DB ứng dụng hoặc thay split/metrics.
