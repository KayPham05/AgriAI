# AGRI-128 — Backend improvement

Điểm vào bằng chứng kỹ thuật của nhánh tích hợp `AGRI-128-backend-improvement`.
Mỗi hạng mục ghi riêng task Jira thực tế, phạm vi và ngày kiểm chứng; không suy
rộng kết quả một hạng mục thành nghiệm thu toàn bộ S3-01 đến S3-10.

| Hạng mục | Task | Báo cáo | Trạng thái |
| --- | --- | --- | --- |
| S3-06 — History và hồ sơ nông nghiệp | AGRI-119, story AGRI-111 | [Phần A](history_part_a.md), [tích hợp CRUD phần B](history_part_b.md) | Kiểm lại trước [PR #45](https://github.com/KayPham05/AgriAI/pull/45): 98 unit + 156 integration đạt; branch coverage 66.61%, gate 60% PASS. Chờ CI/review/manual; giữ Guest chọn hồ sơ trả 401 của base. |
| S3-05 — Guest diagnosis, backend | AGRI-118, story AGRI-110 | [Contract, kiểm thử và giới hạn](guest_diagnosis.md) | Local: 90 test đạt, branch coverage 62.64%; chưa nghiệm thu UI/CI/PR. |
| S3-01/S3-02 — Auth improvement (PR #42) | AGRI-128 | [Triển khai](auth_improvement.md), [kiểm chứng mới 2026-10-23](auth_verification_2026_10_23.md) | Local: auth/transaction 10/10, unit 91/91, integration 140/140, không skip; branch coverage 65.94% đạt gate 60%, chưa đạt target 80%. GitHub CI của `ba89f19` đang đỏ. |

- [Chuẩn triển khai](../../plans/AGRI-128-implementation-rules.md).
- [Kế hoạch Guest backend](../../plans/AGRI-128-guest-diagnosis-plan.md).
- [Task log Guest backend](../../task-logs/AGRI-128/AGRI-128-guest-diagnosis.md).

DoD tổng thể AGRI-128 chưa hoàn tất. Các task khác không được triển khai hoặc
đánh giá trong đợt Guest backend này.
