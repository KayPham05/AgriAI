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

## UI completion on 2026-10-25

Nhánh thực hiện: `AGRI-116-agricultural-profile-ui`, tách từ `main` tại
`018bf32`. Phần giao diện trước đây được loại khỏi phạm vi backend nay đã được
triển khai theo file Figma hồ sơ nông nghiệp:

- Thêm API client và state context cho danh sách, tạo, sửa và xóa hồ sơ.
- Thêm route `/agricultural-profiles` với trạng thái danh sách, rỗng, loading,
  tạo mới, chỉnh sửa, chi tiết và xác nhận xóa.
- Thêm liên kết từ hồ sơ tài khoản và bộ chọn hồ sơ trong luồng chẩn đoán;
  request chẩn đoán gửi `agriculturalProfileId` tùy chọn.
- Giữ quy tắc backend: chỉ user đã đăng nhập quản lý hồ sơ; xóa hồ sơ giữ lại
  lịch sử chẩn đoán theo FK `SET NULL`.

Kiểm chứng mới trên nhánh UI:

- `tsc --noEmit`: pass.
- Biome lint: pass, không warning/error.
- Webpack production build: pass; route `/agricultural-profiles` được tạo.
- API client, prediction profile field và form validation: **36/36 test pass**.
- Full Vitest/unit suite: chưa xác nhận; sandbox worker của Vitest/jsdom báo
  `ENOENT` khi đọc file tạm. Đây là giới hạn môi trường chạy hiện tại, không được
  ghi nhận là test pass.

## Docker local verification on 2026-10-25

Đã rebuild Compose trên nhánh `AGRI-116-agricultural-profile-ui` bằng
`docker compose build`. Frontend build trong image tạo route
`/agricultural-profiles`; backend và AI image cũng build thành công.

Database volume local giữ nguyên. Khi recreate stack, backend phát hiện credential
trong volume cũ khác `.env`; theo xác nhận của người dùng, role local
`agrivision_user` được đồng bộ lại mật khẩu với `.env`. Sau đó migration được chạy
tường minh bằng `docker compose run --rm --no-deps backend --migrate`, áp dụng:

- `20261023080635_PrivateImageUploadJournal`;
- `20261023130623_SessionRevocationClockSafety`.

Kiểm chứng sau khi khởi động lại:

- `agriai-postgres-1`: healthy;
- `agriai-ai-service-1`: healthy;
- `agriai-backend-1`: healthy;
- `agriai-frontend-1`: healthy;
- `/api/health` backend: OK;
- `/health` AI service: OK;
- `/agricultural-profiles`: route phục vụ được; user chưa đăng nhập sẽ được chuyển
  về trang giới thiệu theo quy tắc bảo vệ tài khoản.

Đây là kiểm chứng local Docker, không đại diện cho môi trường remote hoặc production.
