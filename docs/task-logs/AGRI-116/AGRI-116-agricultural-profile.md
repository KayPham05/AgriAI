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

## Authenticated profile navigation fix — 2026-10-28

- User đã đăng nhập dùng `UserProfilePage`, nơi thiếu link tới quản lý hồ sơ sau merge
  AGRI-128.
- Thêm link `Quản lý hồ sơ` tới `/agricultural-profiles` và regression test.
- UserProfilePage: **9/9 pass**; typecheck, lint và diff check pass.
- Chưa commit/push thay đổi này.

## Figma plugin UI sync — 2026-11-03

- Đồng bộ danh sách/tìm kiếm, form, chi tiết/lịch sử và xác nhận xóa theo các frame
  đọc trực tiếp qua plugin Figma; link chẩn đoán chỉ nhận ID hồ sơ sở hữu.
- Full frontend trước chỉnh cuối **455/455 pass**; năm suite liên quan sau chỉnh cuối
  **56/56 pass**; typecheck/lint/format và Docker frontend production build pass.
- Xem UI fixture ở 375/768/1280px; rebuild/recreate riêng frontend local, healthy.
  Không sửa backend, AI, migration hoặc dữ liệu PostgreSQL.
- Chưa đo coverage mới, chạy E2E thật/CI hoặc commit/push. Nguồn frame, affected paths,
  giới hạn và bằng chứng: [báo cáo](../../reports/AGRI-116/figma_sync.md).

## Create profile during diagnosis — 2026-11-03

- Thêm action `Thêm hồ sơ mới` trong dropdown chẩn đoán, kể cả khi danh sách rỗng;
  dùng lại form/API hiện có trong dialog, tự chọn hồ sơ sau lưu và giữ ảnh đã chọn.
- Lưu lỗi giữ nội dung để thử lại; hủy giữ lựa chọn cũ; chặn gửi trùng/đóng khi đang lưu.
- Regression suite mới **5/5 pass**, typecheck/lint/format pass. Browser fixture đã
  kiểm mở/tạo/chọn/hủy. Docker frontend production build/recreate pass, healthy;
  `/diagnose` và backend health HTTP 200. Không sửa backend/AI hoặc dữ liệu thật.
- Full frontend sau bổ sung: **68 file, 463/463 pass**, 522,64 giây.
- Chưa commit/push, đo coverage hay xác minh GitHub Actions. Xem
  [bằng chứng chi tiết](../../reports/AGRI-116/figma_sync.md).

## Delivery preparation — 2026-11-03

- Theo yêu cầu push, commit code: `04e5852` điều hướng, `5e3ab09` lịch sử,
  `0090015` UI Figma, `508faa3` chọn/tạo hồ sơ khi chẩn đoán.
- Kiểm mới: **70/70 test** trong bảy suite, typecheck/lint/format pass;
  không chạy lại full suite/build. Chi tiết trong [báo cáo](../../reports/AGRI-116/figma_sync.md).
- Chỉ stage frontend và docs AGRI-116. Giữ AI/notebook/Compose AI ngoài commit;
  chưa tạo PR, cập nhật Jira Done hay xác minh CI. Các trạng thái chưa commit trước
  mục này là ghi nhận lịch sử.
