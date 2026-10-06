# AGRI-76 — Phân tích hiện trạng và thiết kế hệ thống

- **Đối chiếu:** 07/10/2026, working tree sau AGRI-70 trên nền commit 99d6e56.
- **Branch:** AGRI-76-requirements-analysis-design.
- **DoD Jira:** Chưa hoàn tất; phần kỹ thuật/review độc lập đạt, source editable đã commit tại `6fb0536`; còn Team Lead review và xử lý feedback.
- **Jira yêu cầu:** [Description/DoD](../../task-logs/AGRI-76/Jira-description.md).

## Kết quả và điểm vào

Đã sửa theo review: schema 9 bảng/Class, AI/mapping trước storage, guest 200 không history,
GET detail JWT/owner và luồng P3 ↔ catalog D3. Đồng bộ Activity/Sequence/DFD/Use Case/spec/traceability,
bổ sung vận hành migration/expiry riêng và sửa catalog DELETE soft-delete theo source.

- [System Analysis](system_analysis.md): scope, actor/functions, workflows/data/rules/dependencies và Planned.
- [Use Case Specification](use_case_specifications.md): 10 mục tiêu, nhánh/quyền và bảng đổi ID lịch sử.
- [Traceability](traceability.md): BFD → UC → DFD → Activity → Sequence → Class/ERD/State; balancing.
- [DB verification](database_verification.md) / [metadata mới](assets/database_schema_current.json): agrivision_db có 9 bảng/69 cột, 2 migration.
- [Sơ đồ editable](diagrams/README.md), [gallery offline](diagrams/index.html), [tổng hợp](diagram_compendium.md): 36 bản chính, phân biệt hiện tại/mục tiêu/lịch sử.
- [ERD hiện tại](diagrams/erd_current.puml) / [SVG](diagrams/erd_current.svg): sau ConfirmedRequirementsSchema.
- [ERD 6 bảng](diagrams/erd.puml) / [metadata cũ](assets/database_schema.json): giữ nguyên baseline lịch sử 05/10.
- [SQL/database ERD riêng](../../../database/README.md): agrivision_erd là baseline, không migration source ứng dụng.
- [Verification và DoD](verification.md): kết quả render/validation/review và các mục nghiệm thu còn chờ.
- [Review resolution 07/10](review_resolution_2026-10-07.md): các finding đã sửa, subagent review vòng 2 PASS và giới hạn nghiệm thu.
- [Task log AGRI-76](../../task-logs/AGRI-76/AGRI-76-documentation.md).
- [Task log AGRI-70](../../task-logs/AGRI-70-database-migrations.md): code/schema/migration và kiểm thử runtime; không gán phần code đó vào AGRI-76.
- [Yêu cầu mục tiêu](../../system_requirements.md), [tài liệu sơ đồ tổng quan](../../system_design_diagrams.md), [quy trình mục tiêu cốt lõi](core_target_workflows.md).

## Nguồn và giới hạn

[Controllers](../../../backend/src/AgriVision.API/Controllers/), [PredictionService](../../../backend/src/AgriVision.Application/Services/Implementations/PredictionService.cs),
[migration mới](../../../backend/src/AgriVision.Infrastructure/Persistence/Migrations/20261006161042_ConfirmedRequirementsSchema.cs),
[Domain](../../../backend/src/AgriVision.Domain/Entities/), [repositories](../../../backend/src/AgriVision.Infrastructure/Persistence/Repositories/),
[web predictionApi](../../../frontend/src/services/predictionApi.ts), [AI](../../../ai/).

Hiện có snapshot/owner/expiry/strict mapping trong source; chưa nghiệm thu FastAPI/checkpoint xuyên tầng,
nhiều ảnh, email/Google/reset endpoints, đầy đủ validation ảnh/UI mới/private storage/scheduler.
State hiện tại là PredictionStatus UI; không tạo DB lifecycle/status giả.
Bằng chứng metadata/render không là kiểm thử chức năng/model. Kết quả CI cũ không xác nhận HEAD này.
