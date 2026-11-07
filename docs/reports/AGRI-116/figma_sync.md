# AGRI-116 — Đồng bộ giao diện hồ sơ từ Figma, 2026-11-03

## Phạm vi và nguồn thiết kế

- Nhánh: `AGRI-116-agricultural-profile-ui`; HEAD nền `d565022`, thay đổi chưa commit.
- Đã đọc trực tiếp bằng plugin Figma với tài khoản kết nối của người dùng; session
  `1863a4af-e825-4940-af13-698d8412a41e`.
- File [AgriVision AI · Quản lý hồ sơ](https://www.figma.com/design/sENsAMduZgE8hw8E5Jip4W?node-id=9-28).
  Design context và screenshot lấy từ các frame `9:28` (danh sách), `9:72` (tạo),
  `9:104` (sửa), `9:134` (chi tiết), `9:204` (xác nhận xóa), `9:229` (rỗng).
- Giữ thanh điều hướng chung và brand hiện hành của app. Không đưa mã màn hình,
  nhãn Jira, ghi chú bàn giao hoặc dữ liệu minh họa trong Figma vào UI production.
- Các frame trong phạm vi chỉ dùng text, controls và bề mặt; không có asset ảnh/SVG
  tĩnh cần tải từ Figma. Dùng font Manrope, semantic tokens, Button/Card/Input/
  Textarea/Separator/AlertDialog hiện có; không thêm dependency.

## Thay đổi

| Source | Hành vi/bố cục |
| --- | --- |
| `frontend/src/features/agricultural-profiles/AgriculturalProfilesRoute.tsx` | Danh sách dạng hàng, tìm theo tên không phân biệt hoa/thường, số kết quả, khôi phục khi không có kết quả; form full width; summary, trạng thái thành công và trang xác nhận xóa. |
| `frontend/src/components/agricultural-profile/AgriculturalProfileCard.tsx` | Hàng hồ sơ với tên, mô tả, số chẩn đoán, ngày cập nhật và nút xem chi tiết. |
| `frontend/src/components/agricultural-profile/AgriculturalProfileForm.tsx` | Label/hint/error sát trường; tên trim 1–150 ký tự; hủy form bẩn cần xác nhận; cảnh báo browser unload khi chưa lưu. |
| `frontend/src/components/agricultural-profile/AgriculturalProfileHistory.tsx` | Lịch sử thật theo hồ sơ, phân trang 10 kết quả, trạng thái tải/rỗng/lỗi/thử lại; mở kết quả qua callback hiện có của app. |
| `frontend/src/services/predictionApi.ts` | Bổ sung adapter dùng filter `agriculturalProfileId`, `pageNumber`, `pageSize` đã có ở backend; không đổi request startup cũ. |
| `frontend/src/views/DiagnosePage.tsx` | Link từ hồ sơ chọn trước ID qua `?profile=` chỉ khi ID nằm trong danh sách hồ sơ của user; request không gửi ID ngoài danh sách. |

Giữ nguyên owner CRUD và quy tắc xóa: history vẫn thuộc tài khoản, bỏ liên kết với
hồ sơ; không xóa ngay hoặc gia hạn TTL ảnh. Không sửa backend/schema/migration/AI.
Thay đổi link từ `UserProfilePage` có trước lượt này được giữ nguyên.

## Kiểm chứng mới

Thực thi local ngày 2026-11-03 trên working tree của nhánh trên:

- TDD: route tests ban đầu **4 fail** vì thiếu search/luồng tương ứng; form dirty
  cancel fail vì chưa có dialog; diagnosis link fail vì chưa chọn trước hồ sơ.
  Test tên rỗng fail vì native validation chặn trước lỗi inline; đã sửa `noValidate`
  trên form, giữ validation JS và thuộc tính required/ARIA.
- Full frontend: `node_modules/.bin/vitest.cmd run --maxWorkers=1 --reporter=dot`:
  **66 file, 455/455 pass**, 304,39 giây. Lượt này diễn ra trước bổ sung hai test
  history và điều chỉnh validation tên trống cuối; không trình bày là full suite
  sau cùng. Các cảnh báo Next/Image ở `HomeBannerSlideshow.test.tsx` có sẵn ngoài
  phạm vi, không có test fail trong lượt full này.
- Sau thay đổi cuối: cùng runner, năm file route/form/history/diagnosis/API:
  **5 file, 56/56 pass**, 23,38 giây. Hai test history kiểm retry/mở kết quả và
  trang sau thay thế trang trước; không chỉ kiểm mock render.
- `node_modules/.bin/tsc.cmd --noEmit`: pass.
- `node_modules/.bin/biome.cmd lint . --error-on-warnings`: pass, 244 file.
- Biome format check 11 file thay đổi liên quan: pass. `git diff --check`: pass.
- Host Webpack build pass trước điều chỉnh validation cuối. Docker frontend build
  sau chỉnh cuối chạy Node 24.15.0, pnpm 10.34.5, `pnpm run build` / Turbopack:
  pass, route `/agricultural-profiles` được tạo.
- `docker compose build frontend`, rồi
  `docker compose up -d --no-deps --wait --wait-timeout 120 frontend`: thành công,
  frontend healthy. Không restart các service khác, không chạy migration/xóa volume.
  Kiểm tra sau recreate: `http://127.0.0.1:3000/agricultural-profiles` HTTP 200;
  backend `/api/health` HTTP 200; Compose báo cả bốn service healthy, các service
  khác giữ nguyên thời gian khởi động.

Host Node là 24.13.0; Corepack không tải được pnpm do sandbox DNS. Các test/static
checks dùng executable đã cài theo lockfile. Một số lượt Vitest trong sandbox gặp
ENOENT ở file tạm; đã chạy ngoài sandbox để thu kết quả thật, không tính các lượt
đó là pass. Production Docker build dùng đúng Node/pnpm theo package.json.

## Browser review và giới hạn

- Preview cô lập tại `http://127.0.0.1:3116`, Vite development từ dependency đã có;
  component/stylesheet production thật, auth/context/HTTP fixtures tổng hợp. Link
  Next được thay bằng anchor trong preview; URL đích được kiểm ở integration tests.
- Đã xem danh sách/form/chi tiết/xác nhận xóa, tìm kiếm rỗng và dialog bỏ thay đổi;
  desktop 1280×900, tablet 768×1024, mobile 375×812. Kiểm DOM ở mobile/desktop không
  có tràn ngang. Không nhận định đây là E2E PostgreSQL hay inference thật.
- Artifact local ignored: `.cache/qa-verification/agri116/figma-sync/`, gồm preview
  fixtures và `list-desktop.jpg`, `create-desktop.jpg`, `delete-desktop.jpg`.
  Preview chỉ phục vụ QA và dừng sau kiểm chứng; không thêm route QA vào app.
- Cảnh báo bỏ thay đổi bao phủ nút Hủy và browser unload; chưa chặn mọi navigation
  nội bộ qua thanh điều hướng Next.js. Thay đổi ở phiên khác cần tải lại danh sách.
- Chưa chạy lại coverage, backend suite hoặc GitHub Actions; không dùng số coverage
  cũ làm bằng chứng mới. Không commit/push, không cập nhật Jira Done/PR trong lượt này.

## Follow-up: tạo hồ sơ tại trang chẩn đoán — 2026-11-03

Yêu cầu bổ sung của user: thêm tùy chọn `Thêm hồ sơ mới` ngay trong danh sách chọn
hồ sơ. Đây là bổ sung theo yêu cầu, không khẳng định dialog này có trong frame Figma.

- `frontend/src/features/diagnosis/DiagnoseRoute.tsx`: nối callback `createProfile`
  và tên chủ sở hữu từ context hiện có.
- `frontend/src/views/DiagnosePage.tsx`: hiện dropdown cho user chưa có hồ sơ,
  thêm action mở dialog và tự chọn ID vừa tạo. Guest không có action này.
- `frontend/src/components/agricultural-profile/CreateAgriculturalProfileDialog.tsx`:
  dùng lại `AgriculturalProfileForm`, giữ nội dung khi API lỗi, hiển thị lỗi/thử lại,
  chặn gửi trùng và đóng khi đang lưu. Không thay backend/API/schema/AI.
- `frontend/tests/integration/diagnosis/DiagnoseProfileCreation.test.tsx`: năm test
  dùng route/form/context thật, mock điểm gọi tạo hồ sơ và chẩn đoán. Kiểm tạo hồ sơ
  đầu tiên, trimming, tự chọn, gửi ID khi người dùng phân tích, giữ ảnh, retry, hủy,
  pending và Guest; không tự gọi prediction sau khi tạo hồ sơ.

Bằng chứng mới cho lượt bổ sung:

- TDD: trước triển khai **4 fail, 1 pass** do thiếu dropdown/action; sau triển khai
  **5/5 pass**, 12,22 giây.
- Full frontend sau toàn bộ thay đổi bổ sung:
  `node_modules/.bin/vitest.cmd run --maxWorkers=1 --reporter=dot`:
  **68 file, 463/463 pass**, 522,64 giây. Có các cảnh báo Next/Image tại suite banner
  đã ghi ở lượt trước; không có test fail. Lượt này dùng host Node 24.13.0 và runner
  đã cài; production Docker build bên dưới dùng Node/pnpm theo manifest.
- TypeScript `tsc --noEmit`: pass. Biome lint toàn frontend: pass, 246 file;
  Biome format bốn file code/test của lượt bổ sung: pass. `git diff --check`: pass.
- Browser preview cô lập: đã mở action bằng chuột, nhập/lưu form và thấy hồ sơ mới
  được chọn; mở lại/hủy giữ lựa chọn. Dữ liệu chỉ nằm trong state fixture,
  không ghi PostgreSQL. Ảnh local ignored: `diagnosis-create-option.jpg` trong
  `.cache/qa-verification/agri116/figma-sync/`. Preview đã dừng sau kiểm chứng.
- `docker compose build frontend`: pass, Node 24.15.0/pnpm 10.34.5,
  Next.js production Turbopack build. Sau `up -d --no-deps --wait --wait-timeout 120
  frontend`, frontend healthy; các service khác không restart. `/diagnose` và backend
  `/api/health` HTTP 200. HTTP probe ban đầu bị sandbox chặn socket, lần chạy ngoài
  sandbox thành công. Không migration/xóa volume hoặc ghi dữ liệu thật.
- Chưa đo coverage mới, chạy backend suite, E2E với PostgreSQL/inference thật hoặc
  GitHub Actions cho lượt bổ sung; chưa commit/push.

## Delivery preparation — 2026-11-03

- User yêu cầu commit/push lên nhánh 116 hiện tại. Sau `git fetch origin`,
  `HEAD...origin/AGRI-116-agricultural-profile-ui` là **0/0** trước commit;
  không merge/rebase hoặc rewrite history.
- Các commit code: `04e5852` sửa đường vào quản lý hồ sơ; `5e3ab09` thêm lịch sử
  theo hồ sơ; `0090015` đồng bộ giao diện Figma; `508faa3` chọn/tạo hồ sơ khi chẩn đoán.
- Kiểm chứng mới trước commit: `tsc --noEmit` pass; Biome lint 246 file pass;
  Biome format 16 file code/test thay đổi pass. Lượt format đầu phát hiện CRLF ở
  `UserProfilePage.tsx` và test tương ứng, đã chuẩn hóa LF; diff Git giữ nguyên
  thay đổi hành vi đã kiểm thử.
- Chạy lại bảy suite navigation/form/history/route/diagnosis/API bằng Vitest serial:
  **70/70 pass**, 83,02 giây. Không chạy lại full suite, coverage, backend hoặc Docker
  build trong lượt push; các kết quả trước giữ nguyên mốc thực thi của chúng.
- Kiểm staged paths/diff và whitespace trước từng commit. Chỉ đưa source/test
  frontend và docs AGRI-116; AI, notebook, `docker-compose.ai.yml` và QA artifacts
  local giữ ngoài commit. Những câu chưa commit/push ở các mục trước là lịch sử.
- Chưa tạo PR, cập nhật Jira Done hoặc xác minh GitHub Actions trong lượt này.
