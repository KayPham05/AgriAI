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

## Bổ sung UI AGRI-116 — 2026-10-25

- **Nhánh:** `AGRI-116-agricultural-profile-ui`, tách từ `main` `018bf32`.
- **Đã triển khai:** màn hình danh sách/tạo/chỉnh sửa/chi tiết/xóa hồ sơ theo
  Figma; API client và context CRUD; link từ hồ sơ tài khoản; chọn hồ sơ khi
  chẩn đoán và gửi `agriculturalProfileId` tùy chọn.
- **Kiểm chứng:** typecheck pass; Biome lint pass; Webpack production build pass;
  36/36 test riêng cho API hồ sơ, request chẩn đoán và form pass.
- **Giới hạn:** full Vitest/unit suite trong sandbox gặp lỗi `ENOENT` khi các
  worker jsdom đọc file tạm; chưa trình bày suite đó là pass. Backend evidence
  và các thay đổi AI/Compose lịch sử được giữ nguyên.

## Docker local verification — 2026-10-25

- Rebuild thành công bằng `docker compose build` cho frontend, backend và AI.
- Giữ nguyên PostgreSQL volume local. Credential role `agrivision_user` được đồng
  bộ với `.env` sau khi người dùng xác nhận thay đổi local này.
- Chạy migration explicit bằng `docker compose run --rm --no-deps backend --migrate`;
  hai migration pending hoàn tất thành công.
- Sau khi khởi động lại, cả `postgres`, `ai-service`, `backend` và `frontend` đều
  healthy. Backend `/api/health` và AI `/health` trả về OK.
- Route `/agricultural-profiles` có trong frontend image và được phục vụ; khi chưa
  đăng nhập route chuyển về trang giới thiệu theo middleware xác thực.

Đợt này chỉ kiểm chứng Docker local. Không xóa volume, không thay đổi remote database
và không đụng vào source hoặc artifact trong `ai/`.

## Rebase verification — 2026-10-26

- Rebase branch AGRI-116 lên `origin/AGRI-128-backend-improvement` tại `7aa28c9`,
  sau khi base đã tích hợp AGRI-122.
- Resolve conflict tại hai provider frontend, giữ auth changes của base và CRUD
  agricultural profile của AGRI-116.
- Revision sau rebase: `9afb350`.
- Typecheck, Biome lint, Webpack production build và **36/36 test mục tiêu** pass.
- Đã tạo backup local `backup/AGRI-116-before-rebase-20261026`; file AI untracked
  vẫn được giữ ngoài commit.

## Frontend CI regression — 2026-10-26

- Root cause: năm AppProvider integration suites chưa mock startup dependency
  `getAgriculturalProfiles`, khiến Node/Vitest parse lỗi URL relative.
- Đã thêm mock API vào năm suites và chỉ hiển thị profile selector khi có profile.
- AppProvider suites: **26/26 pass**; full frontend serial: **447/447 pass**.
- Coverage serial: branch **70,30% (2031/2889)**; typecheck, lint và production build pass.
- Default parallel local còn 4 timeout do worker contention; GitHub Actions chưa chạy lại
  trên revision sửa.
