# AGRI-116: lưu vào hồ sơ sau chẩn đoán, 2026-11-04

## Phạm vi và hành vi

User yêu cầu bỏ selector hồ sơ ở bước chọn ảnh, hỏi sau khi đã có kết quả. Nhánh
`AGRI-116-agricultural-profile-ui`; giữ thay đổi căn chỉnh danh sách hồ sơ của lượt trước.

- User đăng nhập phân tích ảnh không gửi `agriculturalProfileId`. Khi API trả kết quả,
  popup hỏi có muốn lưu vào hồ sơ; chọn hồ sơ hiện có hoặc tạo hồ sơ mới trong cùng
  popup. Tạo thành công chỉ chọn hồ sơ, vẫn cần bấm `Lưu vào hồ sơ` để gắn kết quả.
- `Bỏ qua`/đóng popup không gắn hồ sơ. Hành vi lưu lịch sử tài khoản sẵn có được giữ:
  kết quả vẫn trong `Mẫu đã lưu`; popup nói rõ điều này. Guest không có popup và
  không lưu dữ liệu. Lỗi dự đoán không có popup; kết quả tin cậy thấp vẫn có lựa chọn
  lưu và giữ cảnh báo hiện có.
- Lưu chỉ cập nhật liên kết của kết quả đã có, không upload hoặc gọi AI lần hai.
  Lỗi giữ lựa chọn và kết quả để thử lại; đang lưu chặn bấm trùng và đóng popup.
  Tạo lỗi giữ nội dung form; Hủy form bẩn dùng xác nhận bỏ thay đổi hiện có.
- Nếu bỏ qua, có nút mở lại popup. Khi thành công có thông báo tên hồ sơ, bộ đếm
  hồ sơ trong context tăng một lần. Link `?profile=` chỉ gợi ý hồ sơ thuộc danh sách
  sở hữu trong popup, không tự lưu khi phân tích.

## Code và contract

- `frontend/src/views/DiagnosePage.tsx`, `features/diagnosis/DiagnoseRoute.tsx`:
  bỏ selector đầu vào, mở popup sau kết quả và nối state hiện có.
- `components/agricultural-profile/SavePredictionProfileDialog.tsx` dùng lại
  `AgriculturalProfileForm`; thay component tạo hồ sơ trong chẩn đoán cũ đã không
  còn consumer. `providers/AppContexts.ts`, `AppProvider.tsx` cập nhật bộ đếm local.
- `frontend/src/services/predictionApi.ts`: adapter JSON/Bearer cho API gắn hồ sơ.
- `backend/src/AgriVision.API/Controllers/PredictionsController.cs`:
  **PUT `/api/predictions/{id:guid}/agricultural-profile`**, body
  `{ "agriculturalProfileId": "<uuid>" }`. Thành công **204**, Guest **401**,
  ID hồ sơ rỗng/thiếu/sai định dạng **400**; kết quả/hồ sơ thiếu, không sở hữu hoặc
  kết quả đã gắn với hồ sơ khác **404**. Request lặp cùng kết quả/hồ sơ idempotent.
- DTO/interface/service ở `AgriVision.Application`; `PredictionRepository.cs`
  cập nhật riêng FK bằng một câu SQL có điều kiện owner của cả hai tài nguyên.
  Không chuyển owner, không viết lại JSON snapshot, images, createdAt hoặc TTL.
  Manifest `backend/tests/AgriVision.ApiTests/Contracts/api_manifest.json` có route
  mới và mapping tới hai ApiCase kiểm HTTP với PostgreSQL thật, AI/storage fake.

## Migration và dữ liệu

Trigger cũ từ `20261017084202_OptionalAgriculturalProfiles` từ chối mọi gắn hồ sơ
sau INSERT, gây **500** trong test lưu sau dự đoán. Giữ nguyên migration cũ, thêm
`20261104060000_PostPredictionProfileAssignment`: thay function trigger để cho phép
NULL → hồ sơ cùng owner, idempotent cùng ID và detach; vẫn cấm chuyển trực tiếp
giữa hai hồ sơ. Sau detach/xóa hồ sơ, kết quả không còn nhóm có thể gắn lại hồ sơ.
Owner guard và account-delete SET NULL vẫn được giữ. Không đổi bảng/cột/snapshot.
Migration mới forward-only; không chạy rollback dữ liệu. Các test legacy-upgrade,
catalog-id preservation và downgrade protection được cập nhật mốc chín migration.

## Kiểm chứng đã thực thi

- Frontend regression mới trước implementation: **5 fail, 2 pass**, do selector
  cũ còn hiện và chưa có popup. Sau implementation: **7/7 pass**, 6,15 giây.
- Full frontend: `vitest run --maxWorkers=1 --reporter=dot`: **68 file, 469/469 pass**,
  359,95 giây. Cảnh báo Next/Image tại suite banner có sẵn. API adapter suite chạy
  riêng **33/33 pass** (204 không body, JSON/token, 404); typecheck/lint pass.
  Format chín file liên quan pass sau điều chỉnh formatter ở adapter test.
- Host thiếu runtime .NET 9, lượt testhost ban đầu aborted, không tính là pass.
  Backend chạy bằng `mcr.microsoft.com/dotnet/sdk:9.0-alpine`, runtime .NET 9.0.22,
  PostgreSQL disposable qua Testcontainers, AI/storage doubles. Lượt RED hai API
  tests fail vì endpoint chưa có. Lượt tiếp phát hiện trigger cũ chặn gắn hồ sơ;
  đã thêm migration. Lượt full đầu thiếu SQL embedded fixture `/database`, đã bổ
  sung vào container QA; không sửa test project để né lỗi.
- Lượt sau migration: **163 unit, 257 API pass**; ba integration assertions cũ
  fail vì giả định có tám migration/cho rollback qua boundary mới. Đã cập nhật
  expected contract và chạy lại, giữ kiểm tra không mất dữ liệu/ID/snapshot.
- Backend/frontend Docker production build đã pass. Kết quả local deployment và
  lượt backend cuối ghi tiếp dưới đây, không dùng lượt fail làm bằng chứng thành công.

## Browser review và giới hạn

Preview localhost cô lập dùng route/component/CSS thật, context + HTTP fixtures
tổng hợp. Đã chọn ảnh mẫu dự án, phân tích, thấy popup sau kết quả; chọn hồ sơ,
tạo hồ sơ ngay tại popup rồi lưu. Desktop 1280px, mobile 375px: popup mobile rộng
343px, không tràn nội dung ngang, cao 357px; nút chọn/tạo/bỏ qua/lưu đều dùng được.
Ảnh minh chứng local ignored:
`.cache/qa-verification/agri116/post-result/save-result-desktop.jpg`.
Preview không phải inference thật hoặc E2E toàn stack; không ghi DB thật từ browser.
Đã dừng preview/đóng tab/reset viewport sau kiểm tra.

Chưa đo coverage hoặc xác minh GitHub Actions; chưa commit/push. AI/notebook và
Compose AI không thay đổi. Logs/TRX/backup QA ở `.cache/qa-verification/agri116/post-result/`
giữ local và không đưa vào Git.

## Kết quả cuối và local deployment

- Lượt backend cuối: `dotnet test AgriVision.sln --filter
  "Category!=RealCheckpoint&Category!=RealR2" --logger trx --results-directory /evidence`
  trong SDK 9 container: **163 unit / 257 API / 65 integration pass**, tổng **485/485**,
  không skip. TRX cuối có suffix `05_46_17.trx`, `05_46_19.trx`, `05_46_19[1].trx`;
  thời lượng lần lượt khoảng 3 giây / 1 phút 41 giây / 2 phút 43 giây.
  Lượt này đã có assertions Admin/foreign/deleted/empty IDs, không chuyển link
  đã gắn, idempotence, dữ liệu snapshot/images/TTL và manifest runtime/mapping.
- Chín migration được kiểm fresh + legacy upgrade, giữ catalog IDs, bảo vệ
  downgrade và `HasPendingModelChanges == false`. Ba lỗi integration của lượt trước
  đã được sửa theo boundary mới, không skip/loại suite.
- Docker production build cuối backend + frontend pass. Frontend dùng
  Node 24.15.0/pnpm 10.34.5; backend .NET 9. Không dùng host runtime 10 thay .NET 9.
- Trước áp dụng migration vào database ứng dụng local: tạo `pg_dump -Fc`,
  xác nhận `pg_restore --list` đọc được. Backup ignored
  `before-local-migration.dump` tại thư mục QA trên, 72.348 byte. Không đưa backup
  vào Git; file tạm trong container đã dọn, backup local vẫn giữ.
- `docker compose run --rm --no-deps backend --migrate` áp dụng riêng
  `20261104060000_PostPredictionProfileAssignment` thành công. Không chạy HTTP
  server từ command migration, không sửa migration cũ hoặc xóa volume.
- `docker compose up -d --no-deps --wait --wait-timeout 120 backend frontend`:
  hai service healthy. PostgreSQL/AI service giữ nguyên, không restart.
  Sau recreate: `/diagnose` **HTTP 200**, `/api/health` **HTTP 200**;
  PUT gắn hồ sơ không token **401**, không ghi dữ liệu từ probe Guest.
- Đã dọn container SDK QA, giữ logs/TRX ignored. `git diff --check` pass;
  không stage/commit/push. Chưa xác minh CI hoặc chạy real checkpoint/R2;
  kiểm thử PostgreSQL với AI/storage fake không phải nghiệm thu inference thật.

## Vị trí và màu nút lưu — 2026-11-04

Theo yêu cầu tiếp theo, chuyển nút mở lại popup và thông báo lưu thành công từ đầu
trang xuống ngay dưới `Phân tích ngay` trong panel ảnh của `DiagnosePage.tsx`.
Nút dùng nền primary xanh, chữ primary-foreground, rộng bằng nút phân tích, không
thêm icon. Chữ có thể xuống dòng trên màn hình hẹp. Giữ popup tự mở sau kết quả.

Kiểm chứng mới: suite luồng lưu **7/7 pass**, 6,33 giây; typecheck/lint pass.
Docker frontend production build pass. Browser fixture 1280px xác nhận nút rộng
bằng nút phân tích (638,875px), cách dưới 12px, nền `rgb(23,97,58)`, chữ sáng và
không có SVG. Mobile 375px giữ khoảng cách 12px, chữ trong nút không tràn; bấm mở
lại popup thành công. Không khẳng định lượt này là E2E thật hoặc full suite mới.
Artifact ignored: `post-result/save-button-below-analysis.jpg` trong thư mục QA
AGRI-116. Đã dừng preview/reset viewport. Chưa commit/push.
Frontend Docker local đã recreate riêng và healthy; không restart service khác.
