# AGRI-128 — Backend improvement

Điểm vào bằng chứng kỹ thuật của nhánh tích hợp `AGRI-128-backend-improvement`.
Mỗi hạng mục ghi riêng task Jira thực tế, phạm vi và ngày kiểm chứng; không suy
rộng kết quả một hạng mục thành nghiệm thu toàn bộ S3-01 đến S3-10.

| Hạng mục | Task | Báo cáo | Trạng thái |
| --- | --- | --- | --- |
| S3-09 — Admin và tra cứu frontend C | AGRI-122, story AGRI-114 | [Kế hoạch C](../../plans/AGRI-128-knowledge-medicine-frontend-plan.md), [triển khai và UAT](knowledge_medicine.md) | Tích hợp e1197ce, 2026-10-26: 440/440 tests, branch 72.37%; typecheck/lint/build và format bản sao LF đạt. PR #46 đã xử lý conflict local; CI/review còn chờ. |
| S3-09 — Knowledge and medicine backend A/B | AGRI-122, story AGRI-114 | [API, kiểm chứng và giới hạn](knowledge_medicine.md), [route matrix](knowledge_api_matrix.md) | Tích hợp e1197ce, 2026-10-26: 156 unit + 65 integration + 239 API = 460 tests; branch 83.56%. Giữ trigger, sửa cần duyệt lại; không migration mới. PR #46 chờ CI/review. |
| S3-05 — Guest diagnosis, backend | AGRI-118, story AGRI-110 | [Contract, kiểm thử và giới hạn](guest_diagnosis.md) | Local: 90 test đạt, branch coverage 62.64%; chưa nghiệm thu UI/CI/PR. |
| S3-01/S3-02 — Auth improvement (PR #42) | AGRI-128 | [Triển khai](auth_improvement.md), [kiểm chứng mới 2026-10-23](auth_verification_2026_10_23.md) | Local: auth/transaction 10/10, unit 91/91, integration 140/140, không skip; branch coverage 65.94% đạt gate 60%, chưa đạt target 80%. GitHub CI của `ba89f19` đang đỏ. |
| S3-02 — User Profile & Password Management, frontend | AGRI-128 | [Giao diện Figma, API mapping và kiểm chứng 2026-10-25](user_profile_frontend.md) | Đã triển khai UI; kiểm thử trình duyệt dùng fixtures. Chưa nghiệm thu API/DB thật. |

- [Chuẩn triển khai](../../plans/AGRI-128-implementation-rules.md).
- [Avatar người dùng: API, giao diện và kiểm chứng 2026-10-25](user_avatar.md) — backend unit 138/138, API 208/208, integration liên quan 22/22; frontend 377/377. Chưa áp dụng migration vào DB ứng dụng hoặc kiểm thử R2 thật.
- [Kế hoạch Guest backend](../../plans/AGRI-128-guest-diagnosis-plan.md).
- [Task log Guest backend](../../task-logs/AGRI-128/AGRI-128-guest-diagnosis.md).

DoD tổng thể AGRI-128 chưa hoàn tất. Các task khác không được triển khai hoặc
đánh giá trong đợt Guest backend này.
