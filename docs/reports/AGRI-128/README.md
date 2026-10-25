# AGRI-128 — Backend improvement

Điểm vào bằng chứng kỹ thuật của nhánh tích hợp `AGRI-128-backend-improvement`.
Mỗi hạng mục ghi riêng task Jira thực tế, phạm vi và ngày kiểm chứng; không suy
rộng kết quả một hạng mục thành nghiệm thu toàn bộ S3-01 đến S3-10.

| Hạng mục | Task | Báo cáo | Trạng thái |
| --- | --- | --- | --- |
| S3-09 — Admin và tra cứu frontend C | AGRI-122, story AGRI-114 | [Kế hoạch C](../../plans/AGRI-128-knowledge-medicine-frontend-plan.md), [triển khai và UAT](knowledge_medicine.md) | Local 2026-10-25 sau debounce 500ms: 414/414 test frontend, build/typecheck/lint đạt; branch coverage 71.94%. Kiểm chứng bài viết/thuốc với API thật và DB riêng. Đang tạo PR theo yêu cầu; base mới e1197ce có xung đột, chưa xác minh CI. Xem mốc bàn giao và giới hạn trong báo cáo. |
| S3-09 — Knowledge and medicine backend A/B | AGRI-122, story AGRI-114 | [API, kiểm chứng và giới hạn](knowledge_medicine.md) | Local 2026-10-24: 109 unit + 171 integration đạt, không skip; branch coverage 73.92% (gate 60%). Giữ trigger, sửa cần duyệt lại. Test tay đã được người dùng xác nhận 2026-10-25; đang tạo PR, chưa xác minh CI trên base mới. |
| S3-05 — Guest diagnosis, backend | AGRI-118, story AGRI-110 | [Contract, kiểm thử và giới hạn](guest_diagnosis.md) | Local: 90 test đạt, branch coverage 62.64%; chưa nghiệm thu UI/CI/PR. |
| S3-01/S3-02 — Auth improvement (PR #42) | AGRI-128 | [Triển khai](auth_improvement.md), [kiểm chứng mới 2026-10-23](auth_verification_2026_10_23.md) | Local: auth/transaction 10/10, unit 91/91, integration 140/140, không skip; branch coverage 65.94% đạt gate 60%, chưa đạt target 80%. GitHub CI của `ba89f19` đang đỏ. |

- [Chuẩn triển khai](../../plans/AGRI-128-implementation-rules.md).
- [Kế hoạch Guest backend](../../plans/AGRI-128-guest-diagnosis-plan.md).
- [Task log Guest backend](../../task-logs/AGRI-128/AGRI-128-guest-diagnosis.md).

DoD tổng thể AGRI-128 chưa hoàn tất. Các task khác không được triển khai hoặc
đánh giá trong đợt Guest backend này.
