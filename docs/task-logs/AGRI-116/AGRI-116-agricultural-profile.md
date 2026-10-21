# AGRI-116 — Agricultural profile backend

- Ngày bàn giao: 2026-10-21.
- Nhánh: `AGRI-116-agricultural-profile`.
- Nhánh nền/commit ban đầu: `AGRI-128-backend-improvement`, `ad22a8a`.
- Jira AGRI-116 được người dùng xác nhận sau đợt triển khai ban đầu trên AGRI-128.
- Owner/PR: chưa xác nhận; chưa tạo PR hoặc đổi trạng thái Jira.

## Phạm vi thay đổi

- CRUD hồ sơ theo owner, tên bắt buộc 1–150 ký tự sau trim và mô tả tùy chọn.
- Request chẩn đoán nhận profile ID tùy chọn, kiểm tra cùng owner trước AI/storage.
- Xóa hồ sơ giữ lịch sử, snapshot/top-K/ảnh; FK hiện có đặt liên kết null.
- Bổ sung service unit tests và HTTP/PostgreSQL integration tests.
- Không sửa entity/schema/migration, không làm UI hoặc thay cấu hình logging/CI.
- Source: `backend/src/AgriVision.API/Controllers/AgriculturalProfilesController.cs`,
  `backend/src/AgriVision.Application/{DTOs/AgriculturalProfile,Common/Interfaces/Persistence,Services}`,
  `backend/src/AgriVision.Infrastructure/Persistence/Repositories/AgriculturalProfileRepository.cs`;
  DI, prediction DTO/controller/service/interface và tests liên quan.

## Kiểm chứng và bàn giao

Đã chạy lại trước commit trên nhánh AGRI-116: **79 unit + 99 integration pass**,
failed/skipped 0 trong suite chạy; loại RealCheckpoint bằng filter. Build pass,
0 warning/error. Branch coverage **308/500 = 61,60%**, gate 60% PASS, target 80% chưa đạt.
Artifact local ignored: `.cache/qa-verification/agri116/prepush/{unit,integration,merged}/`.
Lệnh cụ thể, đợt cũ/TDD và giới hạn: [báo cáo kỹ thuật](../../reports/AGRI-116/agricultural_profiles.md).
Rà staged diff 21 đường dẫn backend/tài liệu: whitespace pass; commitlint pass;
Gitleaks v8.24.2 staged scan 0 finding (`prepush/secrets/gitleaks-staged.json`).
Không trình bày số liệu đợt cũ như lần chạy mới; không suy ra GitHub Actions đã pass.

Theo yêu cầu mới, chỉ commit/push phần backend và tài liệu liên quan. Những thay
đổi AI/ensemble/notebook/Compose có sẵn giữ ngoài commit, không gán Jira AGRI-116.
Các giới hạn quy tắc naming/private token và xác thực JWT/session đã nêu trong
báo cáo; UI, inference/storage thật và review/PR còn ngoài phạm vi đợt bàn giao.
