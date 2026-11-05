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

## Navbar profile entry — 2026-11-03

Thêm `Hồ sơ nông nghiệp` trong `Navbar.tsx`, dùng chung cho thanh desktop và menu
điện thoại, đích `/agricultural-profiles`. Bổ sung route trong `appRoutes.ts` và
`NavigationTab` tại `types/index.ts` để đánh dấu đúng trang hiện tại. Giữ link avatar
tới hồ sơ cá nhân. Test harness được nối với route quản lý hồ sơ thật.

Kiểm chứng mới: regression trước sửa **2 fail/2 pass** do thiếu link; sau sửa,
`Navbar.test.tsx` + `App.routing.test.tsx` **14/14 pass**, 11,02 giây. Test kiểm href,
active state, đóng menu sau bấm và chuyển từ trang chẩn đoán sang quản lý hồ sơ qua
provider/shell thật. Fixture routing lúc đầu thiếu URL khởi tạo đã được sửa; không
đổi expected của tính năng. Typecheck, lint 246 file, format sáu file thay đổi và
Docker frontend production build pass. Frontend local recreate riêng và healthy.

Browser preview cô lập dùng component/CSS thật và dữ liệu tổng hợp: desktop 1280px
có đủ liên kết trên một dòng; mobile 375px mở menu và bấm được link. QA artifact
ignored: `.cache/qa-verification/agri116/figma-sync/navbar-profile-desktop.jpg`.
Preview đã dừng và viewport được reset. Chưa chạy lại full suite/coverage/CI hoặc
E2E với PostgreSQL cho thay đổi nhỏ này; số full suite ở mục trước là lịch sử.
Không thay backend/AI/DB. Chưa commit/push thay đổi navbar.

Delivery check cùng ngày, theo yêu cầu push: sau `git fetch origin`, nhánh 116
local/remote **0/0** trước commit. Chạy lại hai suite trên **14/14 pass**, 10,56 giây;
typecheck/lint/format sáu file pass, diff whitespace sạch. Chuẩn bị commit source,
test và docs navbar cùng nhau; loại AI/notebook/Compose AI và QA artifact. Không
chạy lại build/full suite hoặc xác minh GitHub Actions trong lượt push.

## Profile list action alignment — 2026-11-04

- `frontend/src/features/agricultural-profiles/AgriculturalProfilesRoute.tsx`:
  toolbar căn đáy ở desktop, input co giãn và nút tạo cao 52px bằng input; mobile
  nút tạo full width bên dưới input. Không dùng offset/margin bù cho label.
- `frontend/src/components/agricultural-profile/AgriculturalProfileCard.tsx`:
  grid nội dung co giãn + cột action theo kích thước nút, căn giữa chiều dọc ở desktop;
  `Xem chi tiết` sát mép phải phần nội dung panel. Mobile action xuống dưới, căn phải.
- Chỉ sửa layout; không thêm test kiểm class CSS. Suite quản lý hồ sơ hiện có
  **4/4 pass**, 12,49 giây; typecheck, lint 246 file và format hai file pass.
- Browser preview component/CSS thật với fixture tổng hợp: desktop 1280px input và
  nút tạo cùng top 187/bottom 239/height 52px; các nút chi tiết cách mép phải hàng
  dưới 0,001px và center delta 0. Tablet 768px input/nút tạo cũng cùng top/bottom;
  mobile 375px không tràn ngang, action nằm cuối hàng và sát mép phải. Đã bấm mở
  chi tiết và mở form tạo. Không ghi PostgreSQL trong preview; preview đã dừng,
  viewport đã reset. Artifact ignored:
  `.cache/qa-verification/agri116/figma-sync/profile-actions-desktop.jpg`.
- Docker frontend production build pass, recreate riêng frontend local và healthy.
  Không thay backend/AI/DB, không migration/xóa volume. Không chạy full suite,
  coverage hoặc CI trong lượt này; chưa commit/push.

## Save completed diagnosis into a profile — 2026-11-04

Bỏ chọn hồ sơ trước phân tích; sau kết quả, popup cho chọn/tạo hồ sơ và lưu hoặc
bỏ qua. Bổ sung API gắn kết quả đã có (owner-only, idempotent) và migration trigger
cho phép gắn hồ sơ sau INSERT; giữ lịch sử, snapshot, ảnh và TTL. Chi tiết contract,
paths, migration và bằng chứng: [lưu sau chẩn đoán](post_prediction_profile_save.md).

Kiểm chứng cuối: **485/485 backend** (.NET 9, gồm 163 unit/257 API/65 integration),
**469/469 frontend**, typecheck/lint/format và production builds pass. Đã backup DB,
áp dụng migration mới và recreate riêng backend/frontend local, healthy. Guest PUT
401; `/diagnose` và backend health HTTP 200. Chưa commit/push/đo coverage/xác minh CI.

Follow-up cùng ngày: nút lưu đặt dưới `Phân tích ngay`, nền xanh/chữ sáng, full width,
không icon. **7/7 test luồng lưu**, typecheck/lint và frontend build pass; browser
fixture đã kiểm desktop/mobile và mở lại popup. Chi tiết trong báo cáo trên.

## Profile card grid — 2026-11-04

Theo yêu cầu mới, chuyển các hồ sơ từ hàng trong một panel chung thành thẻ riêng.
`AgriculturalProfileCard.tsx` dùng CardHeader/Title/Description, Content và Footer
hiện có; tên, mô tả tối đa ba dòng, số chẩn đoán, ngày cập nhật và nút chi tiết ở
đáy phải. `AgriculturalProfilesRoute.tsx` dùng lưới 1/2/3 cột (mobile/sm/lg), bỏ
panel bao chung và giữ trạng thái tìm kiếm rỗng/tạo/sửa/xóa hiện có. Không thêm icon,
dependency hoặc sửa backend. Yêu cầu mới thay bố cục hàng của các mục lịch sử trước.

Kiểm chứng mới: route suite **4/4 pass**, 5,90 giây; typecheck, lint 246 file,
format hai file và Docker frontend production build pass. Không thêm test kiểm
class CSS. Browser fixture 1280px có ba thẻ cùng cao 314,4px và nút cùng mép đáy;
768px hai cột; 375px một cột, không tràn ngang; đã bấm mở đúng chi tiết. Ảnh ignored:
`.cache/qa-verification/agri116/post-result/profile-cards-desktop.jpg`.
Đã dừng preview/reset viewport. Shadcn CLI docs gặp DNS ENOTFOUND; đối chiếu source
Card local và [tài liệu chính thức](https://ui.shadcn.com/docs/components/base/card),
không cài/update component. Chưa chạy lại full suite/coverage/CI; chưa commit/push.
Đã recreate riêng frontend Docker local và xác nhận healthy; giữ các service khác.

## Profile detail layout — 2026-11-04

Theo yêu cầu tùy chỉnh trang sau khi bấm xem chi tiết, cập nhật
`frontend/src/features/agricultural-profiles/AgriculturalProfilesRoute.tsx`:
nút quay lại ở đầu, chẩn đoán/chỉnh sửa gần tên hồ sơ; desktop chia cột chính
cho thông tin canh tác và lịch sử, cột phụ hiển thị chủ sở hữu, ngày tạo/cập nhật,
số chẩn đoán. Mobile xếp một cột. Nút xóa có màu chữ cảnh báo và đặt riêng cùng
giải thích giữ lịch sử; vẫn đi qua màn xác nhận hiện có.
`frontend/src/components/agricultural-profile/AgriculturalProfileHistory.tsx`
hiển thị cây trồng, kết quả, thời gian theo nhóm; nút xem ở bên phải trên desktop,
trạng thái trống có hướng dẫn lưu sau kiểm tra lá. Giữ API, phân trang, retry và
các callback hiện có; không thêm icon hoặc dependency.

Kiểm chứng mới trong lượt này: **6/6 test** (route và history, 9,65 giây),
TypeScript, lint 246 file, format hai file và `git diff --check` pass.
Docker frontend production build pass; recreate riêng frontend local, healthy
trên cổng 3000. Browser preview dùng fixture kiểm lịch sử có/rỗng, tên dài,
320/768/1024/1440px, không tràn ngang theo DOM; heading nhận focus khi đổi trang
và Tab đến nút chẩn đoán. Không có console warning/error trong preview. Đây là
kiểm tra giao diện với dữ liệu mẫu, không phải E2E với PostgreSQL. Ảnh ignored:
`.cache/qa-verification/agri116/post-result/profile-detail-desktop.jpg`.
Đã đóng preview/reset viewport; chưa commit/push, chạy full suite/coverage/CI.
Không sửa AI/backend/database trong lượt tùy chỉnh này.

## Public crop, disease and medicine cards — 2026-11-04

Theo yêu cầu UI tiếp theo trên nhánh `AGRI-116-agricultural-profile-ui`, áp dụng
kiểu thẻ ảnh/nội dung/footer của trang chủ cho ba danh mục công khai. Thay đổi:

- `frontend/src/features/knowledge/PublicCatalogCard.tsx`: Card có ảnh 16:9,
  tên, tên khoa học/hoạt chất/cây minh họa khi có, nội dung tóm tắt và link chi
  tiết ở đáy. Ảnh cây dùng bộ ảnh hiện có; bệnh chỉ ghép ảnh lá đúng cây và
  condition trong `className` của quan hệ backend đang hoạt động. Giữ ghi chú
  ảnh minh họa chưa xác minh. Không dùng ảnh cây chung thay ảnh bệnh.
- `frontend/src/features/knowledge/PublicCatalog.tsx`: dùng thẻ mới cho cây,
  bệnh, thuốc; lưới 1/2/3/4 cột theo breakpoint. Giữ bài viết theo bố cục cũ,
  không thay search/debounce/filter/pagination hoặc quy tắc công khai.
- `frontend/src/services/catalogApi.ts`: tách/reuse `findPlantTemplate` từ
  logic nhận diện alias hiện có; giữ hành vi API adapter.
- `frontend/tests/integration/app/PublicCatalogCards.test.tsx`: kiểm nhận diện
  cây, cặp bệnh/cây, không lấy ảnh của cây khác, ảnh thiếu/lỗi, hoạt chất thuốc
  và link dùng ID backend.

DTO thuốc hiện không có trường ảnh, nên thẻ thuốc hiện ô “Chưa có ảnh sản phẩm”.
Mục cây/bệnh chưa nhận diện được hoặc ảnh tải lỗi cũng có ô thay thế, vẫn vào
chi tiết được. Không thêm ảnh thương hiệu, dependency, API, migration hay dữ liệu.

Kiểm chứng mới: test mới **6/6 fail trước triển khai** vì chưa có UI ảnh/fallback;
sau triển khai **42/42 pass** trong 4 file (PublicCatalogCards, PublicKnowledge,
CatalogDebounce, catalogApi), 14,16 giây. Typecheck, lint 248 file và format 4 file
pass. Docker frontend production build pass, recreate riêng frontend local healthy.
Browser trên bản production local đã xem danh sách cây/bệnh, tìm bệnh “Bac la lua”
ra 1 kết quả và bấm đúng chi tiết; responsive 1280/768/375px có 4/2/1 cột, không
tràn ngang theo DOM. Bốn thẻ cây hàng đầu cùng cao 407,74px và footer cùng đáy.
Console không ghi warning/error trong phiên kiểm tra. Danh mục thuốc local hiện
0 mục công khai, nên browser mới kiểm trạng thái rỗng/bộ lọc; thẻ thuốc có dữ liệu
được kiểm bằng Vitest, chưa có bằng chứng browser với thuốc công khai thật.
Đã đóng tab kiểm tra và reset viewport. Artifacts ignored:
`.cache/qa-verification/agri116/post-result/catalog-plants-desktop.jpg` và
`catalog-diseases-desktop.jpg` trong cùng thư mục.

Shadcn CLI docs gặp DNS ENOTFOUND; đã đối chiếu Card local và
[tài liệu Card chính thức](https://ui.shadcn.com/docs/components/base/card),
không cài/update component. Chưa chạy lại full suite/coverage/CI; chưa commit/push.
Các thay đổi backend/AI và hồ sơ từ lượt trước được giữ nguyên.

## Diagnosis started from a profile — 2026-11-04

`frontend/src/views/DiagnosePage.tsx` hiển thị tên hồ sơ khi mở liên kết
`/diagnose?profile=<id>` khớp danh sách hồ sơ của tài khoản. Gửi ID trong POST
phân tích hiện có để backend lưu kết quả cùng hồ sơ trong một thao tác. Thành công
hiện xác nhận đã lưu, cập nhật số chẩn đoán và bỏ popup chọn hồ sơ. Vào chẩn đoán
thông thường vẫn dùng popup sau kết quả. Hồ sơ không khớp danh sách không được
gửi lên API. Tra lại danh sách mỗi render để nhận dữ liệu hồ sơ tải sau khi mở trang.

`frontend/tests/integration/diagnosis/DiagnosePage.integration.test.tsx` cập nhật
regression owned/foreign link. RED ghi nhận 1 fail/14 pass trước triển khai.
GREEN mới có **55/55 pass**, 44,98 giây trong ba suite DiagnosePage.integration,
DiagnoseProfileCreation và predictionApi. Typecheck, lint 248 file, format và
diff whitespace check pass. Log ignored tại
`.cache/qa-verification/agri116/profile-context-{red,green}.log`.
Production frontend build pass. Chưa kiểm browser/E2E luồng tự lưu với tài khoản
và AI thật, chưa chạy full suite/coverage/CI hoặc commit/push trong lượt này.

## Profile diagnosis history search and plant filter — 2026-11-04

`AgriculturalProfileHistory.tsx` bổ sung tìm kiếm theo tên cây hoặc kết quả và bộ lọc theo cây trong lịch sử của hồ sơ. Bộ điều khiển hiện sau khi tải thành công, giữ phân trang, retry, empty state và mở kết quả đã lưu. Danh sách cây được suy ra từ dữ liệu trang hiện tại để không thêm API hoặc thay đổi contract.

Kiểm chứng mới: component history **2/2 pass**, typecheck, lint 248 file và format pass. Chưa chạy full suite, coverage hoặc CI. Chưa commit/push.

## Mở rộng định dạng ảnh chẩn đoán — 2026-11-04

Đã mở rộng luồng chẩn đoán để nhận JPEG, PNG và WEBP ở frontend (file picker,
validation và thông báo), backend (đuôi `.webp`) và AI service (MIME/content
validation). Bổ sung test upload WEBP cho AI và test validation tương ứng ở
frontend.

Nguyên nhân ba tệp `cachua_septoria.jpg`, `cachua_domvikhuan.jpg` và
`cachua_nhendo.jpg` trước đó lỗi là nội dung thực tế là WEBP nhưng mang đuôi
`.jpg`; sau khi cập nhật, cả ba trả HTTP 200 qua AI và backend. Một tệp được gửi
với tên thật `leaf.webp` cũng trả HTTP 200 qua backend mới. Test WEBP trong
container AI **1/1 pass**, frontend unit tests liên quan **14/14 pass**. Docker
rebuild/recreate cho `ai-service`, `backend` và `frontend` hoàn tất, cả ba healthy.

Host Python không có FastAPI nên không chạy được test AI trực tiếp ngoài
container; đã chạy bằng dependency trong container. Chưa chạy full suite,
coverage, CI hoặc commit/push.

## Hiển thị cây trong Top-3 — 2026-11-04

Top-3 trước đây chỉ lấy nhãn bệnh từ `predictionDetails`, nên khi độ tin cậy
thấp giao diện không cho biết mỗi bệnh thuộc cây nào. `TopPrediction` nay giữ
thêm tên cây từ `plantDisease.plant`; bộ đối chiếu hiển thị theo dạng
`Tên cây · Tên bệnh`, còn dữ liệu cũ không có tên cây vẫn giữ cách hiển thị cũ.

Kiểm chứng: `AnalysisResultCard` và `predictionApi` **40/40 pass**, TypeScript
`tsc --noEmit` và `git diff --check` pass. Chưa chạy full suite, coverage, CI
hoặc commit/push.

## Extend branch delivery — 2026-11-05

Branch: `AGRI-116-agricultural-profile-ui-extend`, created from the current AGRI-116 branch at user request. Includes profile diagnosis/save workflow and forward-only migration, profile cards/detail/history filters, public catalog cards/detail, WEBP support and crop names in Top-3. Unrelated AI experiments/notebooks, docker-compose.ai.yml and generated next-env.d.ts remain local.

Fresh verification: frontend full Vitest run outside sandbox: 475 passed / 2 failed (477 total). One failure was the avatar test expecting the old JPEG/PNG message; updated to the new JPEG/PNG/WEBP contract. Then the 10 affected suites passed 102/102 tests. The other failure remains in HomeBannerSlideshow.test.tsx:88 (timer count 1 instead of 0 after unmount); no slideshow changes in this delivery. The initial sandbox test attempt failed to load 68 suites due to ENOENT in its temporary transform cache; it is not a valid application test result. Typecheck and lint (248 files) passed; diff whitespace checks passed. Backend/AI/build results above are prior runs, not rerun during push preparation. Coverage and GitHub Actions are unverified; this is not a claim that all CI gates pass.
