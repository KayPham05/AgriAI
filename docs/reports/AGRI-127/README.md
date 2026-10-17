# AGRI-127 — Database Improvement

Nhánh `AGRI-127-database-improvement`; cập nhật 2026-10-17.
**DoD DB/migration/kiểm thử đã chốt: hoàn tất.** UI/API mới, nghiệm thu toàn hệ thống
và Jira Done không nằm trong kết luận này.

## Tài liệu

- [Tổng quan và đối chiếu 10 US](database_improvement_overview.md).
- [Thiết kế, quyết định và migration](database_improvement_implementation.md).
- [Việc còn lại và quyết định mở](../../notes/remaining_work.md) — checklist duy nhất.
- [QA hệ thống và checkpoint](system_qa.md), [test frontend](../../../frontend/tests/README.md),
  [skill QA](qa_skills_setup.md).
- [Gate CI](../../../.github/workflows/ci.yml); UUID v7 tạm gác trong [remaining_work.md](../../notes/remaining_work.md).
- [Task log](../../task-logs/AGRI-127/AGRI-127-database-improvement.md).
- Rà secret trước commit — snapshot 1.101 file và lịch sử
  HEAD/mọi ref local: Gitleaks 0 finding; cấu hình local không trùng snapshot.

- [Accuracy/Macro-F1 test set v1.4](fixed_test_evaluation.md) — kết quả đánh giá mới trên ổ D.

## Bằng chứng local theo đợt

| Đợt | Kết quả | Artifact dưới `.cache/qa-verification/agri127/` |
|---|---|---|
| Gate mới | Backend 33 unit + 83 integration; frontend 215 pass | `coverage-uuid/summary.json` |
| QA hệ thống | Backend 33 + 84 (có 1 checkpoint thật); AI 74; frontend 215 pass | `system/summary.json` |
| Frontend layout | 215 pass; typecheck/lint pass; build pass ở đợt system | `frontend-layout/summary.json`, `system/frontend-build.log` |

Branch coverage backend/frontend/Python: **62,01%/61,83%/47,12%**.
Gate hiện hành **60%/60%/40%**, target mỗi phần 80%. Bộ 83 loại RealCheckpoint;
bộ 84 có chạy ca đó, storage vẫn fake. Đây không phải bằng chứng GitHub Actions.
Nguồn: [CI](../../../.github/workflows/ci.yml), [AI tests](../../../ai/tests/README.md),
[frontend tests](../../../frontend/tests/README.md). Merge main lịch sử ở task log riêng.

## Sửa báo nhầm disease — đợt sau

[Sửa loss và hiệu chỉnh checkpoint đã xác minh](disease_false_positive_fix.md):
428 ảnh khỏe nhầm Dom_than_la → 0; disease accuracy99,0909%, Macro-F1 0,970392.
81 AI + 1 .NET real-checkpoint pass; Python branch47,12% (`disease-fix/coverage/`).
Recall Dom_than_la giảm7/8 → 6/8; xem trade-off trong báo cáo. Model file gốc giữ nguyên.

Rà trước commit (2026-10-17): sửa link gate trong `AGENTS.md` về README này;
không thấy dataset/checkpoint/cache/backup/env trong danh sách file mới chưa được
ignore. Checkpoint và evidence cache được ignore; diff check pass. Đây là kiểm tra
đường dẫn và diff, chưa phải rà secret toàn nội dung hoặc chạy lại các suite.

## Bàn giao commit local — 2026-10-17

Checklist chung được chuyển sang [docs/notes/remaining_work.md](../../notes/remaining_work.md)
để nhóm tiếp tục thực hiện; đã sửa liên kết đi/về. Người dùng cho phép commit
toàn bộ thay đổi hiện tại, chia theo nhóm Conventional Commits với key AGRI-127.
Kết quả test/coverage ở trên là các đợt đã ghi nhận, không chạy lại trong bước
commit tài liệu. Đợt rà Gitleaks trước đó: snapshot/HEAD/mọi ref local 0 finding;
evidence ignored `leak-audit/`. GitHub Actions, review/PR và push chưa thực hiện.
