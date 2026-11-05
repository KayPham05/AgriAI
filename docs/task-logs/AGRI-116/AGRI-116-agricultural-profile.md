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

## Navbar profile entry — 2026-11-03

- Thêm `Hồ sơ nông nghiệp` trên navbar desktop/menu mobile, dẫn tới
  `/agricultural-profiles`; route/type mapping nhận diện đúng mục đang chọn.
- Cập nhật Navbar/routing tests và route thật trong test harness. **14/14 pass**;
  typecheck/lint/format và production Docker frontend build pass.
- Đã xem preview 1280/375px, kiểm menu/link; frontend local recreate và healthy.
  Chưa chạy lại full suite/coverage/CI, chưa commit/push. Xem [report](../../reports/AGRI-116/README.md).
- Delivery check theo yêu cầu push: chạy lại **14/14 pass**, typecheck/lint/format
  pass; chỉ đưa source/test/docs navbar, loại AI và artifact. Chưa xác minh CI.

## Profile list action alignment — 2026-11-04

- Căn nút tạo bằng chiều cao/đáy input tìm kiếm; đưa nút chi tiết sát phải panel,
  căn giữa hàng desktop và xuống dưới ở mobile. Chỉ sửa hai component layout.
- **4/4 test** quản lý hồ sơ hiện có pass; typecheck/lint/format, Docker frontend
  build pass. Browser fixture đã kiểm 1280/768/375px và mở chi tiết/form tạo.
- Frontend local recreate, healthy. Chưa commit/push, chạy full suite/coverage/CI.
  Chi tiết và paths: [report](../../reports/AGRI-116/README.md).

## Save completed diagnosis into a profile — 2026-11-04

- Bỏ selector trước phân tích; thêm popup chọn/tạo hồ sơ sau khi có kết quả,
  lưu idempotent vào kết quả hiện có hoặc bỏ qua; không gọi lại AI.
- API owner-only và migration trigger mới; giữ snapshot/ảnh/TTL/history. Full
  frontend **469/469 pass**, browser fixture desktop/mobile và production builds pass.
- Chưa commit/push/đo coverage/xác minh CI. Xem [contract và bằng chứng backend](../../reports/AGRI-116/post_prediction_profile_save.md).
- Kết quả cuối backend **485/485 pass** (.NET 9; 163 unit/257 API/65 integration).
  Sau backup, migrate riêng local thành công và recreate backend/frontend healthy;
  health/trang HTTP 200, Guest gắn hồ sơ 401. Giữ AI và volumes; chưa commit/push.
- Follow-up vị trí nút: chuyển lưu xuống dưới phân tích, nền xanh nổi bật, không icon.
  **7/7 test**, typecheck/lint/frontend build pass; kiểm browser desktop/mobile.
  Chưa commit/push; bằng chứng chi tiết trong report lưu sau chẩn đoán.

## Profile card grid — 2026-11-04

- Chuyển danh sách sang thẻ riêng 1/2/3 cột; giữ tên/mô tả/số chẩn đoán/ngày cập
  nhật, nút chi tiết ở đáy phải; dùng Card có sẵn, không thêm icon/dependency.
- **4/4 test** route, typecheck/lint/format và production frontend build pass.
  Browser fixture đã kiểm 1280/768/375px và mở chi tiết. Không chạy full suite mới.
- Chưa commit/push. Paths/bằng chứng: [report](../../reports/AGRI-116/README.md).

## Profile detail layout — 2026-11-04

- Sắp xếp chi tiết thành cột nội dung/lịch sử và cột thông tin hồ sơ; đưa chẩn
  đoán/chỉnh sửa lên đầu, xóa đặt riêng. Lịch sử thêm kết quả và hướng dẫn khi rỗng.
- **6/6 test**, typecheck/lint/format/diff check và production build pass.
  Browser fixture kiểm tên dài, dữ liệu có/rỗng và responsive 320–1440px.
- Frontend Docker local healthy. Chưa commit/push/full suite/coverage/CI;
  paths và giới hạn kiểm chứng: [report](../../reports/AGRI-116/README.md).

## Public catalog cards — 2026-11-04

- Áp dụng thẻ ảnh/nội dung/nút đáy cho cây, bệnh và thuốc; tái sử dụng ảnh có
  sẵn, chỉ ghép đúng cặp cây/bệnh; thuốc chưa có ảnh hiện ô thay thế.
- **42/42 test**, typecheck/lint/format và production build pass; frontend
  Docker local healthy. Browser kiểm cây/bệnh, search/chi tiết và 375/768/1280px.
- Thuốc local chưa có mục công khai; thẻ có dữ liệu mới kiểm bằng Vitest.
  Chưa commit/push/full suite/coverage/CI. [Paths và bằng chứng](../../reports/AGRI-116/README.md).

## Diagnosis started from a profile — 2026-11-04

- Link chẩn đoán từ hồ sơ hiển thị tên và gửi ID trong POST phân tích để tự lưu,
  thành công bỏ popup. Chẩn đoán thông thường tiếp tục chọn hồ sơ sau kết quả.
- **55/55 test**, typecheck/lint/format và frontend production build pass.
  Chưa kiểm browser/E2E với AI thật hoặc commit/push. [Bằng chứng](../../reports/AGRI-116/README.md).

## Profile diagnosis history search and plant filter — 2026-11-04

- Thêm tìm kiếm theo tên cây/kết quả và lọc theo cây trong lịch sử hồ sơ.
- Component history **2/2 pass**, typecheck/lint/format pass. Chưa chạy full suite, coverage, CI hoặc commit/push.

## Mở rộng định dạng ảnh chẩn đoán — 2026-11-04

- Nhận JPEG/PNG/WEBP xuyên suốt file picker, frontend validation, backend
  extension check và AI content validation; thêm regression test WEBP.
- Ba tệp `.jpg` thực tế là WEBP đã trả HTTP 200 qua AI và backend sau rebuild;
  tệp gửi với tên thật `leaf.webp` cũng trả HTTP 200. AI container test **1/1**,
  frontend unit tests liên quan **14/14**; ba container local healthy.
- Host thiếu FastAPI nên test AI được chạy trong container. Chưa full suite,
  coverage, CI, commit hoặc push.

## Hiển thị cây trong Top-3 — 2026-11-04

- Bổ sung tên cây vào dữ liệu Top-3 và hiển thị `Tên cây · Tên bệnh`, tránh mơ
  hồ khi các lớp bệnh có cùng tên hoặc độ tin cậy thấp.
- **40/40 test** component/API, TypeScript và diff check pass. Chưa full suite,
  coverage, CI, commit hoặc push.

## Extend branch delivery — 2026-11-05

- Prepared `AGRI-116-agricultural-profile-ui-extend` with profile/diagnosis, catalog UI, migration, WEBP and Top-3 changes; unrelated AI experiments stay local.
- Fresh affected frontend checks: 102/102 pass; typecheck/lint pass. Full run before avatar expectation update: 475/477 pass; HomeBannerSlideshow timer assertion remains unresolved. No new backend/AI/coverage/CI claim.
- See [delivery evidence and limits](../../reports/AGRI-116/README.md).
