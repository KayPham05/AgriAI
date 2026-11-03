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

## Rebase integration verification on 2026-10-26

Sau khi AGRI-122 được tích hợp vào `origin/AGRI-128-backend-improvement`, branch
`AGRI-116-agricultural-profile-ui` được rebase lên base `7aa28c9`. Conflict tại
`frontend/src/providers/AppContexts.ts` và `frontend/src/providers/AppProvider.tsx`
được gộp bằng cách giữ đồng thời auth changes của base và agricultural profile state,
CRUD callbacks của AGRI-116.

Kiểm chứng trên revision sau rebase `9afb350`:

- TypeScript `--noEmit`: pass.
- Biome lint: pass, không warning/error.
- Test mục tiêu AGRI-116: **36/36 pass**.
- Webpack production build: pass; route `/agricultural-profiles` được tạo.

Đây là kiểm chứng local sau rebase; chưa phải kết quả GitHub Actions.

## Frontend CI URL regression verification — 2026-10-26

Nguyên nhân lỗi CI là `AppProvider` gọi thêm `getAgriculturalProfiles` trong startup,
nhưng năm integration suites dùng `AppProvider` chưa mock module mới. Vitest chạy trong
Node nên request relative `/api/agricultural-profiles` ném `Failed to parse URL`, làm
startup và routing tests fail dây chuyền.

Đã sửa bằng cách mock đầy đủ agricultural profile API trong năm AppProvider integration
suites. Selector hồ sơ trên `DiagnosePage` chỉ hiển thị khi có hồ sơ để chọn, giữ thứ tự
keyboard hiện có khi danh sách rỗng.

Kiểm chứng local sau fix:

- AppProvider integration suites: **26/26 pass**.
- Full frontend suite serial: **447/447 pass**.
- Coverage serial: branch **70,30% (2031/2889)**, vượt floor frontend 65%.
- TypeScript, Biome lint và Webpack production build: pass.

Default parallel run trên máy Windows còn 4 test timeout do cạnh tranh worker tài nguyên;
đây là giới hạn môi trường local, không phải lỗi URL profile. GitHub Actions chưa được
xác nhận lại trên revision sửa.

## Authenticated profile navigation fix — 2026-10-28

Sau khi AGRI-128 đưa user đã đăng nhập sang `UserProfilePage`, link quản lý hồ sơ chỉ
còn ở `ProfilePage` của luồng cũ nên không hiển thị trên trang hồ sơ cá nhân thực tế.
Đã thêm section và link `Quản lý hồ sơ` tới `/agricultural-profiles` vào
`frontend/src/views/UserProfilePage.tsx`, kèm regression test.

Kiểm chứng local: UserProfilePage **9/9 test pass**, TypeScript pass, Biome lint pass và
`git diff --check` pass. Thay đổi chưa commit/push.

## Figma plugin UI sync — 2026-11-03

Đã đọc design context/screenshot trực tiếp qua plugin và đồng bộ danh sách dạng hàng,
tìm kiếm, form, chi tiết/lịch sử theo hồ sơ và xác nhận xóa. Link chẩn đoán chọn trước
hồ sơ sở hữu; giữ contract/backend và toàn bộ file AI.

Full frontend trước điều chỉnh cuối: **455/455 pass**; năm suite liên quan sau chỉnh
cuối: **56/56 pass**. Typecheck, lint, format các file thay đổi và production Docker
frontend build pass; frontend local đã recreate và healthy. UI được xem trên browser
với dữ liệu cô lập ở 375/768/1280px; chưa phải E2E với PostgreSQL, chưa đo coverage mới
hoặc xác minh CI. Chưa commit/push. Chi tiết nguồn frame, paths, lệnh và giới hạn:
[Figma sync](figma_sync.md).

## Create profile during diagnosis — 2026-11-03

Thêm lựa chọn `Thêm hồ sơ mới` trong dropdown hồ sơ ở trang chẩn đoán, kể cả khi
chưa có hồ sơ. Mở form hiện có bằng dialog, gọi `createProfile` của provider và chọn
hồ sơ vừa tạo; không rời trang hoặc tự gửi chẩn đoán. Ảnh đã chọn và lựa chọn cũ
được giữ khi hủy/lưu lỗi; request đang lưu chặn gửi trùng và đóng dialog.

Các paths mới: `CreateAgriculturalProfileDialog.tsx` và
`DiagnoseProfileCreation.test.tsx`; cập nhật `DiagnoseRoute.tsx`, `DiagnosePage.tsx`.
Bằng chứng kiểm thử và build được ghi trong [báo cáo chi tiết](figma_sync.md).

Kiểm chứng mới sau bổ sung: full frontend **68 file, 463/463 pass**; typecheck,
lint, format và Docker frontend production build pass. Frontend local đã recreate,
healthy; `/diagnose` HTTP 200. Chưa commit/push hoặc xác minh GitHub Actions.

## Delivery preparation — 2026-11-03

Theo yêu cầu push của user, đã tạo bốn commit code trên
`AGRI-116-agricultural-profile-ui`: `04e5852` (điều hướng), `5e3ab09` (lịch sử),
`0090015` (giao diện Figma), `508faa3` (chọn/tạo hồ sơ khi chẩn đoán). Những ghi chú
chưa commit/push phía trên mô tả trạng thái ở các lượt trước.

Kiểm lại trước commit: **7 file, 70/70 test pass**, typecheck, lint và format 16 file
pass. Chỉ chuẩn hóa CRLF sang LF ở hai file trang hồ sơ cá nhân khi format, không đổi
hành vi. Full suite **463/463** và Docker build là bằng chứng của lượt triển khai
trước, không chạy lại trong lượt push. Không stage AI, notebook, Compose AI hoặc
artifact QA. Chưa xác minh GitHub Actions; xem [chi tiết](figma_sync.md).
