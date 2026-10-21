# AGRI-116 — Agricultural profile backend

## Agricultural profiles — 2026-10-21

DoD backend S3-03 và phần chọn hồ sơ khi chẩn đoán S3-06: **hoàn tất**.
Giao diện nằm ngoài phạm vi theo yêu cầu người dùng. Không kết luận hoàn tất toàn
bộ pipeline AGRI-128 hoặc Jira Done. Người dùng đã xác nhận task hồ sơ thuộc
AGRI-116; nhánh bàn giao là `AGRI-116-agricultural-profile`, xuất phát từ HEAD
`ad22a8a` của AGRI-128 theo yêu cầu.

Kiểm chứng local mới ngày 2026-10-21: **79 unit + 99 integration pass**, failed/skipped 0;
branch coverage backend **308/500 = 61,60%**, vượt gate 60% (target 80%). Build
0 warning/0 error. Suite `Category=RealCheckpoint` được loại tường minh; các test
prediction trong đợt này dùng fake AI/storage và PostgreSQL thật qua Testcontainers.
Lệnh và artifact: [báo cáo hồ sơ](agricultural_profiles.md#kiểm-chứng-toàn-bộ-backend).
Chưa chạy GitHub Actions hoặc nghiệm thu inference/storage thật trong hạng mục này.
Đợt chạy lại trước push trên nhánh AGRI-116 cũng đạt các số liệu trên; artifact
riêng tại `.cache/qa-verification/agri116/prepush/` (xem mục bàn giao trong báo cáo).

- [Contract, nghiệp vụ và bằng chứng kiểm thử hồ sơ](agricultural_profiles.md).
- [Pipeline triển khai](../../plans/AGRI-128-backend-improvement-plan.md).
- [Quy tắc backend](../../plans/AGRI-128-implementation-rules.md).
- [Task log AGRI-116](../../task-logs/AGRI-116/AGRI-116-agricultural-profile.md).
- [Nhật ký triển khai ban đầu trên nhánh nền](../../task-logs/AGRI-128/AGRI-128-backend-improvement.md).

Source chính:
[controller](../../../backend/src/AgriVision.API/Controllers/AgriculturalProfilesController.cs),
[service](../../../backend/src/AgriVision.Application/Services/Implementations/AgriculturalProfileService.cs),
[repository](../../../backend/src/AgriVision.Infrastructure/Persistence/Repositories/AgriculturalProfileRepository.cs),
[prediction service](../../../backend/src/AgriVision.Application/Services/Implementations/PredictionService.cs).
Không thay đổi source `ai/`, dataset hoặc checkpoint trong hạng mục này.
