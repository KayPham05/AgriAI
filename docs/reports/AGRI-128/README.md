# AGRI-128 — Backend improvement

Điểm vào bằng chứng kỹ thuật của nhánh tích hợp `AGRI-128-backend-improvement`.
Mỗi hạng mục ghi riêng task Jira thực tế, phạm vi và ngày kiểm chứng; không suy
rộng kết quả một hạng mục thành nghiệm thu toàn bộ S3-01 đến S3-10.

| Hạng mục | Task | Báo cáo | Trạng thái |
| --- | --- | --- | --- |
| S3-05 — Guest diagnosis, backend | AGRI-118, story AGRI-110 | [Contract, kiểm thử và giới hạn](guest_diagnosis.md) | Local: 90 test đạt, branch coverage 62.64%; chưa nghiệm thu UI/CI/PR. |
| S3-01/S3-02 — Auth improvement (PR #42) | AGRI-128 | [Khắc phục 3 vấn đề auth & test hồi quy](auth_improvement.md) | Local: 91/91 unit test đạt, 0 build warning/error; 9 test tích hợp TDD đã bổ sung. |

- [Chuẩn triển khai](../../plans/AGRI-128-implementation-rules.md).
- [Kế hoạch Guest backend](../../plans/AGRI-128-guest-diagnosis-plan.md).
- [Task log Guest backend](../../task-logs/AGRI-128/AGRI-128-guest-diagnosis.md).

DoD tổng thể AGRI-128 chưa hoàn tất. Các task khác không được triển khai hoặc
đánh giá trong đợt Guest backend này.
