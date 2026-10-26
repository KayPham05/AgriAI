# AGRI-122 — Knowledge and medicine A/B/C

- Ngày cập nhật: 2026-10-26. Kết quả tích hợp mới nhất nằm cuối báo cáo; các mốc 2026-10-24/25 giữ nguyên là lịch sử.
- Task: AGRI-122, story AGRI-114, hạng mục S3-09 của AGRI-128.
- Nhánh: `AGRI-128-knowledge-medicine`; đã tích hợp base `e1197ce` từ `AGRI-128-backend-improvement` cho [PR #46](https://github.com/KayPham05/AgriAI/pull/46).
- A/B/C và tích hợp đã kiểm chứng local (460 backend, 440 frontend tests). DoD Jira **chưa hoàn tất**: còn CI, domain review và xác nhận giao diện sau tích hợp; backend branch 83.56%, frontend 72.37%.
- Phạm vi ban đầu: backend A/B; ngày 2026-10-25 người dùng giao thêm UI phần C trên cùng nhánh. Không có upload tài liệu hay OpenAI advisor.

## Phần A — Danh mục và quản trị

| API | Quyền | Hành vi |
| --- | --- | --- |
| `GET /api/medicines`, `GET /api/medicines/{id}` | Guest/User | Chỉ thuốc approved + public + active; ẩn use chưa duyệt/xác minh hoặc cặp ngừng hoạt động |
| `GET /api/knowledge-documents`, `GET /api/knowledge-documents/{id}` | Guest/User | Chỉ tài liệu approved + public + active |
| `GET/POST /api/admin/medicines` | Admin | Tra cứu toàn bộ/tạo thuốc ở trạng thái nháp |
| `GET/PUT/DELETE /api/admin/medicines/{id}` | Admin | Xem/sửa/ngừng hoạt động; DELETE không xóa bản ghi |
| `PUT /api/admin/medicines/{id}/publication` | Admin | Đặt trạng thái duyệt, công khai, hoạt động |
| `PUT/DELETE /api/admin/medicines/{id}/uses/{plantDiseaseId}` | Admin | Gán/cập nhật/gỡ hướng dẫn nhãn theo cặp cây–bệnh |
| `GET/POST /api/admin/knowledge-documents` | Admin | Tra cứu toàn bộ/tạo bài viết nháp |
| `GET/PUT/DELETE /api/admin/knowledge-documents/{id}` | Admin | Xem/sửa/ngừng hoạt động bài viết |
| `PUT /api/admin/knowledge-documents/{id}/publication` | Admin | Đặt trạng thái duyệt, công khai, hoạt động |
| `GET /api/plant-diseases`, `GET /api/admin/plant-diseases` | Public/Admin | Tra cứu mapping hiện có; public chỉ cặp và cây/bệnh đang hoạt động |
| `PUT /api/admin/plant-diseases/{id}/availability` | Admin | Đổi `isActive`, không thay `ClassIndex`, `ClassName`, cây hoặc bệnh của mapping |
| `PUT /api/admin/diseases/{id}/approval` | Admin | Duyệt/thu hồi nội dung bệnh bằng `isContentApproved`; không đổi loại tình trạng |

API danh sách mới nhận `plantId`, `diseaseId`, `search`, `pageNumber` (mặc định 1),
`pageSize` (mặc định 20, tối đa 100); response dùng `PagedResult`.
Hai bộ lọc cây/bệnh phải khớp trên cùng một liên kết. Thứ tự có khóa phụ ID ổn định.
API CRUD cây/bệnh có sẵn được tái sử dụng: chặn tên trắng, không cho public dùng
`includeInactive=true` để đọc mục ngừng hoạt động; ẩn nội dung bệnh chưa được duyệt.
Admin có thể duyệt nội dung bệnh qua API riêng; sửa nội dung ở API CRUD thu hồi duyệt.
DTO bệnh trả thêm `isContentApproved`, `conditionType`; trong snapshot cũ thiếu trường,
giá trị là null để thể hiện không được ghi nhận, không suy ra từ danh mục hiện tại.

Tài liệu gồm `title`, `content`, `sourceUrl`, `plantDiseaseIds` (mảng rỗng cho bài chung).
Thuốc gồm `productName`, `activeIngredient`, `targetUse`, `sourceUrl`, `safetyWarning`,
`labelReference`. Các trường này bắt buộc; tên thuốc/tên bài tối đa 200 ký tự;
nguồn phải là URL HTTP(S) tuyệt đối, không chứa thông tin đăng nhập.
Không truy cập hay tự xác minh nội dung URL: Admin chịu trách nhiệm duyệt nguồn và nhãn.

Use thuốc gồm `labelDirections`, `isLabelVerified`, `isApproved`.
Không thể duyệt use khi nhãn chưa xác minh. Khi tạo use, cờ bị bỏ qua mặc định false;
khi cập nhật, cờ bị bỏ qua giữ giá trị hiện tại trước khi trigger xử lý. Nếu đổi hướng
dẫn nhãn, trigger thu hồi xác minh/duyệt kể cả khi request gửi hai cờ true. Chỉ liên kết cặp hoạt động
với tình trạng `Disease`. Liên kết không hợp lệ bị từ chối trước khi lưu nội dung.
Ngừng hoạt động thuốc/tài liệu đồng thời đặt `isPublic=false` theo constraint DB.

Nguồn chính: `backend/src/AgriVision.API/Controllers/{AdminMedicines,Medicines,AdminKnowledgeDocuments,KnowledgeDocuments,PlantDiseaseCatalog}Controller.cs`,
`backend/src/AgriVision.Application/Services/Implementations/{MedicineService,KnowledgeDocumentService,PlantDiseaseCatalogService,CatalogValidation}.cs`,
`backend/src/AgriVision.Infrastructure/Persistence/Repositories/{MedicineRepository,KnowledgeDocumentRepository,PlantDiseaseRepository}.cs`.

## Phần B — Kết quả chẩn đoán

`PredictionResultDto` bổ sung `recommendedMedicines`. Chỉ trả thuốc của đúng cặp
dự đoán khi confidence hữu hạn, lớn hơn 0.8 và không quá 1; bệnh thuộc `Disease`
và nội dung đã duyệt; cây, bệnh, cặp đều hoạt động; thuốc approved/public/active;
use approved và label verified. Không tự sinh tên thuốc hoặc liều lượng.

Trường `medication` giữ kiểu string/null, dựng từ danh mục đủ điều kiện cho lượt mới.
Không dùng `Disease.Medication` cũ để bỏ qua xác minh nhãn. Snapshot đã lưu không
bị viết lại; snapshot cũ thiếu trường mới đọc thành mảng rỗng. Guest nhận cùng nội dung
kết quả nhưng không thêm lịch sử/ảnh lâu dài. Truy vấn thuốc chạy trước upload để lỗi
truy vấn không tạo ảnh mồ côi. Cơ chế cleanup khi lưu history thất bại giữ nguyên.

Nguồn: `backend/src/AgriVision.Application/Services/Implementations/PredictionService.cs`,
`backend/src/AgriVision.Application/DTOs/Prediction/PredictionDtos.cs`, DTOs dưới `DTOs/Medicine/`.

## Kiểm chứng thực tế và vấn đề còn mở

### Kết quả bản bàn giao — 2026-10-24

| Kiểm tra | Kết quả | Nguồn bằng chứng cục bộ |
| --- | --- | --- |
| Build .NET 9 | Đạt, 0 warning, 0 error | `.cache/knowledge-medicine/build-delivery.log` |
| Toàn bộ unit | 109/109 đạt, 0 skip | `.cache/knowledge-medicine/verified/unit/unit.trx` |
| Integration theo bộ lọc CI | 171/171 đạt, 0 skip | `.cache/knowledge-medicine/delivery/integration/integration.trx` |
| Tổng | 280/280 đạt | Hai TRX trên, không cộng các lần chạy trước |
| Coverage nhánh gộp | 547/740 = **73.92%**, gate 60% đạt; target 80% chưa đạt | `.cache/knowledge-medicine/delivery/merged/Cobertura.xml` |
| Script kiểm chứng CI | Hai bộ qua `check_dotnet_test_results.py`; coverage qua `check_coverage.py --minimum-branches 60` | Chạy ngày 2026-10-24, khoảng 06:33 giờ local |
| Diff/nguồn | `git diff --check` đạt; không thay Domain/schema/migration | Diff nhánh hiện tại |

Phạm vi test riêng AGRI-122 là 18 unit + 31 integration, nằm trong tổng trên.
Toàn bộ API/Admin chạy HTTP thật, PostgreSQL thật trong container tạm; AI và storage
là fixture/fake. Không đổi workflow CI. Bộ lọc `Category!=RealCheckpoint` theo CI loại
trừ bài cần checkpoint thật; số skip trong bộ test được chọn là 0.
Unit đã chạy trên production code cuối; thay đổi sau đó chỉ là fixture Admin integration
và tài liệu. Không chạy lại unit chỉ để tạo số liệu lặp. ReportGenerator 5.5.4 gộp đúng
hai bộ kết quả đạt này, không đưa coverage của lần integration lỗi vào bản gộp.
Quét mẫu private key/token phổ biến không thấy match trong 38 file đổi/mới; đây không
phải một cuộc kiểm toán bảo mật toàn bộ repository. Log, TRX, coverage nằm trong `.cache`
được Git ignore. Worktree Guest và History không bị sửa trong lượt tiếp tục này.

### Lịch sử kiểm chứng trong quá trình triển khai

- Unit mới kiểm tra threshold, trạng thái/loại bệnh, URL, publication, không cập nhật
  một phần khi validation lỗi và trả đúng cờ từ DB sau khi sửa hướng dẫn nhãn.
- Integration mới chạy HTTP thật + PostgreSQL Testcontainers: Guest/User/Admin,
  draft/public, soft delete, filter, quan hệ cây–bệnh, điều kiện thuốc, snapshot và Guest.
- Lần chạy `unit-current-retry`: 109/109 đạt, không skip.
- Lần chạy `integration-current`: 17/19 đạt, 2 lỗi ở lifecycle sửa nội dung đã duyệt.
  Hai lỗi đều ở GET public sau PUT: DB trigger đã thu hồi duyệt nên trả 404.
- Kết quả bộ backend đầy đủ sau sửa fixture nằm ở bảng bản bàn giao phía trên.

Các mốc trên là bằng chứng trong quá trình triển khai, không phải lần kiểm chứng cuối.
Sau quyết định duyệt lại, `review-policy-green` đạt 18 unit + 31 integration;
`disease-review-green` đạt 31 integration gồm thêm luồng Admin duyệt bệnh.
`final/` đã đạt 109 unit + 171 integration trước bổ sung duyệt bệnh cuối cùng;
coverage lúc đó 533/724 = 73.62%, không đại diện cho bản bàn giao mới nhất.

Lần `verified/integration` có 163/171 đạt và 8 lỗi ở setup tài khoản Admin của bộ mới:
`ck_user_sessions_revocation` từ thao tác đổi role ngay sau đăng ký. Trigger dùng
`clock_timestamp()` của PostgreSQL, còn phiên đăng ký dùng `DateTime.UtcNow` của API;
ràng buộc yêu cầu revoked_at >= created_at. Fixture đã đổi thành tạo tài khoản Admin
trong DB trước khi có phiên, rồi đăng nhập qua API thật; không thay auth/constraint,
không thêm sleep hoặc tắt kiểm thử. Các test quyền vẫn dùng JWT và kiểm tra Guest/User/Admin.

Lệnh kiểm chứng theo CI (từ thư mục worktree, .NET SDK 9 và Docker đang chạy):

```powershell
dotnet build backend/AgriVision.sln --no-restore -m:1
dotnet test backend/tests/AgriVision.UnitTests --no-build --no-restore --settings backend/coverage.runsettings --collect 'XPlat Code Coverage' --logger 'trx;LogFileName=unit.trx' --results-directory .cache/knowledge-medicine/verified/unit
dotnet test backend/tests/AgriVision.IntegrationTests --no-build --no-restore --filter 'Category!=RealCheckpoint' --settings backend/coverage.runsettings --collect 'XPlat Code Coverage' --logger 'trx;LogFileName=integration.trx' --results-directory .cache/knowledge-medicine/delivery/integration
```

Sau đó chạy `.github/scripts/check_dotnet_test_results.py` cho từng thư mục; gộp hai
`coverage.cobertura.xml` bằng ReportGenerator 5.5.4 rồi chạy
`.github/scripts/check_coverage.py <merged/Cobertura.xml> --minimum-branches 60 --label Backend`.

Máy hiện dùng SDK 9.0.305 tại `D:\AgriAI\.cache\tools\dotnet-9.0.305`; cần đặt
`DOTNET_ROOT` và thêm thư mục đó vào PATH nếu shell mặc định chỉ có SDK 7.
Khi restore ở máy này, dùng `-p:RestoreFallbackFolders=` để bỏ đường fallback Visual Studio
không còn tồn tại. Không đổi SDK/dependency của dự án. Khi chạy lại, dùng thư mục kết quả mới
để trình kiểm chứng CI nhận đúng một TRX và một Cobertura cho mỗi bộ test.

Bằng chứng cục bộ nằm dưới `.cache/knowledge-medicine/`: log, TRX và coverage
không đưa vào Git. Các lần RED ban đầu (`red`, `unit-red`, `catalog-red`) chứng minh
ca thiếu API/quy tắc trước khi triển khai; không được xem là kết quả hiện tại.

### Quyết định kiểm duyệt cuối cùng — không thêm migration

Migration hiện hành `20261017084014_DatabaseImprovement` tự thu hồi duyệt khi sửa
nội dung/liên kết. Sau khi được giải thích, người dùng chọn **giữ trigger hiện tại,
sửa xong cần duyệt lại**, thay thế lựa chọn giữ duyệt ban đầu. Không thêm/sửa migration,
không migrate database ứng dụng. API đọc lại bằng truy vấn không tracking sau lưu,
trả cờ duyệt/xác minh và thời điểm từ database thay vì entity EF đã cũ.

Sửa thuốc thu hồi công khai/duyệt sản phẩm và xác minh/duyệt tất cả use. Sửa hướng dẫn
nhãn thu hồi use và sản phẩm. Sửa nội dung hoặc liên kết bài viết thu hồi công khai/duyệt
bài viết. Admin phải xác minh/duyệt use với hướng dẫn không đổi rồi duyệt/công khai thuốc
trong thao tác riêng. Khôi phục bản ghi ngừng hoạt động cần bước duyệt/công khai tiếp theo
vì trigger xem thay đổi `isActive` là thay đổi cần duyệt. Không thay test DB chính sách cũ.

Chưa chạy kiểm thử thủ công bởi người dùng, inference checkpoint thật hoặc Cloudinary thật.
Chưa commit/push/PR. Local test không xác nhận GitHub Actions đã đạt.

## Trình tự test thủ công

1. Chạy backend của đúng worktree và schema được thống nhất; đăng nhập Admin, Authorize
   bằng `Bearer <token>`. Lấy ID cặp từ `GET /api/admin/plant-diseases`. Nếu nội dung bệnh
   chưa duyệt, kiểm tra rồi gọi `PUT /api/admin/diseases/{diseaseId}/approval` với
   `{ "isContentApproved": true }`. Bệnh vẫn cần có `conditionType= Disease` đã xác định
   trong danh mục để thuốc được gán vào kết quả; API này không thay loại tình trạng AI.
2. POST thuốc với đầy đủ sáu trường; nhận 201. GET public theo ID phải 404 khi còn nháp.
3. PUT use với hướng dẫn nhãn, hai cờ true; PUT publication với ba cờ true.
   GET public phải 200, có nguồn/cảnh báo/use. User thường gọi route Admin nhận 403,
   Guest nhận 401.
4. POST bài viết với nội dung, link nguồn, ID cặp; duyệt/công khai, lọc theo cây/bệnh.
   Thiếu trường, nguồn sai, ID liên kết không có hoặc trùng phải 400 và không lưu dở dang.
5. Sửa nội dung/hướng dẫn nhãn: response cập nhật phải trả cờ duyệt false; public GET 404.
   Xác minh/duyệt lại use bằng cùng hướng dẫn không đổi, rồi duyệt/công khai sản phẩm;
   public GET trở lại 200. Bài viết sửa liên kết cũng phải duyệt/công khai lại.
6. Chẩn đoán với AI fixture đủ điều kiện: kiểm tra `recommendedMedicines` và `medication`;
   confidence <=0.8 hoặc Healthy/NutrientDeficiency không có thuốc. Fixture không thay
   thế nghiệm thu AI thật; confidence phụ thuộc kết quả AI khi test thủ công.
7. DELETE thuốc/bài viết: 204, public GET 404, Admin vẫn đọc được bản ghi ngừng hoạt động.
   Lịch sử chẩn đoán trước đó giữ nguyên snapshot; Guest không tạo thêm lịch sử.

### Payload mẫu dùng trên Swagger

Các giá trị sau chỉ là fixture kiểm thử, không phải sản phẩm/hướng dẫn nông nghiệp thật.
Tạo thuốc bằng `POST /api/admin/medicines`:

```json
{
  "productName": "AGRI-122 test product",
  "activeIngredient": "Test ingredient",
  "targetUse": "Test target",
  "sourceUrl": "https://example.test/source",
  "safetyWarning": "Fixture only, not for actual use",
  "labelReference": "https://example.test/label"
}
```

Gán use bằng `PUT /api/admin/medicines/{medicineId}/uses/{plantDiseaseId}`.
ID cặp lấy từ API danh mục, không dùng ID riêng của cây hoặc bệnh:

```json
{
  "labelDirections": "Fixture label only",
  "isLabelVerified": true,
  "isApproved": true
}
```

Duyệt/công khai bằng `PUT /api/admin/medicines/{id}/publication` hoặc route
`knowledge-documents` tương ứng:

```json
{ "isApproved": true, "isPublic": true, "isActive": true }
```

Tạo bài viết bằng `POST /api/admin/knowledge-documents` (mảng rỗng là bài chung;
để test lọc theo cây/bệnh, thay bằng ID cặp hợp lệ từ API):

```json
{
  "title": "AGRI-122 test article",
  "content": "Nội dung kiểm thử nhập trực tiếp, không upload file.",
  "sourceUrl": "https://example.test/article",
  "plantDiseaseIds": []
}
```

`PUT` nội dung dùng lại toàn bộ các trường của payload tạo; không gửi cờ duyệt vào
payload nội dung để cố duyệt trong cùng thao tác. Với use, thay hướng dẫn và gửi cờ true
cùng lúc cũng bị trigger thu hồi cờ; phải review riêng khi hướng dẫn không thay đổi.
Không thử nghiệm bằng thuốc hoặc liều lượng tự suy đoán. Chỉ đưa dữ liệu thật vào danh
mục công khai sau khi người có trách nhiệm xác minh nguồn, đối tượng sử dụng và nhãn.

## 2026-10-25 — Khảo sát và kế hoạch phần C

Người dùng xác nhận Admin quản lý cây/bệnh/thuốc/bài viết và tra cứu User/Guest.
Đã bổ sung [kế hoạch C](../../plans/AGRI-128-knowledge-medicine-frontend-plan.md),
gồm màn hình, contract API, duyệt lại sau chỉnh sửa, thứ tự triển khai và ma trận
unit/component/integration (không E2E). Chưa triển khai frontend.

Nguồn khảo sát: `frontend/src/features/admin/AdminCrmPage.tsx`, `AdminAccess.tsx`,
`AdminMockProvider.tsx`, `frontend/src/providers/AppProvider.tsx`,
`frontend/src/services/catalogApi.ts`, `frontend/src/lib/appRoutes.ts`, các controller
và DTO A/B. Khung Admin hiện dùng mock cho các module cũ; provider public hiện có
redirect Guest; catalog ghép dữ liệu tĩnh. Kế hoạch ghi rõ cách xử lý trong phạm vi C.

Lượt này chỉ thay đổi tài liệu, không chạy lại build/test. Các số liệu A/B ngày
2026-10-24 ở trên là bằng chứng lịch sử, không phải kết quả mới hoặc nghiệm thu C.
Chưa tạo nhánh frontend, commit/push/PR; A/B vẫn đang nằm ở worktree local.

### Đồng bộ base trước C — 2026-10-25

Theo yêu cầu mới, C làm chung trên `AGRI-128-knowledge-medicine`, không tạo nhánh
frontend riêng. Đã fetch `origin/AGRI-128-backend-improvement`; HEAD/FETCH_HEAD/ref
remote cùng `a43797db2c216b8d1955b00b787a1b1962ad0cdd`. Merge `--ff-only` báo
`Already up to date.`, không có file unmerged và giữ 39 đường dẫn local thay đổi.
Không có code mới từ merge, không chạy lại tests, không stash/commit/push.
Kế hoạch C được cập nhật tên nhánh và bằng chứng đồng bộ; chưa triển khai giao diện.

## 2026-10-25 — Triển khai và kiểm chứng phần C

### Kết quả và đường dẫn ảnh hưởng

- `frontend/src/services/knowledgeApi.ts`: DTO, request có/không token theo mục đích,
  phân trang/filter thuốc và bài viết, phân trang client cây/bệnh, đọc đủ các trang
  liên kết. Xử lý 204 và lỗi 400/401/403/404/5xx; không tự retry mutation.
- `frontend/src/features/knowledge/`: form nội dung dùng chung, trang Admin, quản lý
  liên kết hiện có, review nhãn thuốc và public list/detail. Không dùng AdminMockProvider
  để lưu dữ liệu tri thức; các module Admin cũ giữ nguyên phạm vi mock của chúng.
- `frontend/src/features/admin/AdminCrmPage.tsx`: năm mục cây, bệnh, thuốc, bài viết,
  liên kết cây–bệnh; lazy-load module. Mỗi mục reset editor bằng key riêng.
- Các route `frontend/src/app/(website)/(application)/{plants,diseases,medicines,knowledge}`
  và route chi tiết dùng API public. ID cây/bệnh cũ chỉ được dùng để ánh xạ identity;
  nội dung không lấy fallback tư vấn tĩnh khi API lỗi/ẩn bản ghi.
- `AppProvider.tsx`, `appRoutes.ts`, `types/index.ts`, `AppShell.tsx`, `IntroPage.tsx`:
  Guest mở trực tiếp danh mục; tài khoản đã đăng nhập cũng không cần tải history để
  đọc public. Dữ liệu khởi động riêng được hoãn đến khi vào khu vực cần nó.
- `frontend/tests/`: thêm service/unit, form/component và integration; cập nhật harness
  cùng routing regression. Không thêm file hoặc suite E2E.

Form bài viết nhập văn bản + nguồn, preview hiển thị text, không chạy HTML. Form
thuốc giữ thông tin nguồn/nhãn/cảnh báo; lưu hướng dẫn, xác minh, duyệt liên kết,
duyệt sản phẩm và công khai là các thao tác riêng. Mọi mutation lấy trạng thái thực
từ response/refetch; sửa nhãn tải lại cả sản phẩm. Khóa form và publication trong
khi mutation đang chạy. Ngừng hoạt động có xác nhận; khôi phục không tự công khai.
Liên kết cây–bệnh chỉ xem mapping và bật/tắt hoạt động, không sửa class AI.

### Kiểm tra tự động và bằng chứng mới

| Kiểm tra | Kết quả mới ngày 2026-10-25 |
| --- | --- |
| `corepack pnpm typecheck` | Đạt |
| `corepack pnpm lint` | Đạt, 226 file, không warning/error |
| `corepack pnpm format:check` | Đạt trên working copy LF; xem ghi chú Windows bên dưới |
| Biome format kiểm riêng diff C sau khôi phục baseline | Đạt, 33 file thêm/sửa; không có thay đổi formatter |
| `corepack pnpm test:coverage` | **59 file, 402/402 test đạt**, không skip |
| Branch coverage frontend | **1827/2548 = 71.70%**; vượt floor 60%, chưa đạt target 80% |
| `corepack pnpm build` | Đạt; compile, TypeScript và 13 static pages hoàn tất |
| Build API hiện có | 0 warning, 0 error; dùng để kiểm chứng C với DB riêng |
| `git diff --check` | Đạt |
| GitHub Actions | Chưa chạy cho thay đổi này; chưa commit/push/PR |

49 ca mới so với baseline 353 gồm 24 unit, 8 component và 17 integration:
endpoint/token, URL nguồn, allowlist public; validation/giữ input/chọn liên kết;
xác minh/duyệt/gỡ nhãn; tạo cây/bệnh; 401/403; ngừng/khôi phục;
trigger thu hồi duyệt; pending khóa form; Guest/User direct URL không tải history;
HTML dạng text; lỗi/empty/retry; server total và response cũ không ghi đè route mới.
Các test AdminAccess và auth có sẵn cũng nằm trong lần chạy toàn bộ 402 test.

Test hồi quy đã phát hiện và sửa: User restore trên public vẫn gọi history; lưu nhãn
chưa khóa publication cha; tên tiếng Việt rỗng che mất tên danh mục. Bằng chứng red/green
ở `D:/AgriAI/.cache/knowledge-c-lifecycle-{red,green}.log`; lần coverage trung gian có
2 lỗi tên hiển thị được giữ tại `knowledge-c-coverage-final.log`. Lần đạt cuối là
`knowledge-c-coverage-verified.log`, không lấy lần thất bại làm kết quả cuối.

Log build cuối: `D:/AgriAI/.cache/knowledge-c-build-verified.log`.
Coverage chi tiết ở `.cache/coverage/frontend/` trong worktree này. Logs/artifacts
đều local, không đưa vào Git. Các số backend 109 unit + 171 integration ở phần trên
là bằng chứng A/B cũ; lượt C không chạy lại toàn suite backend.

**Windows:** checkout gốc dùng `core.autocrlf=true`, trong khi Biome yêu cầu LF.
Đã xác minh format toàn cây sau chuẩn hóa LF. Sau kiểm tra, khôi phục CRLF của 194
file không có thay đổi nội dung để Git không báo modified ngoài phạm vi. File C giữ
format LF; không sửa lockfile/config formatter hay giảm gate. Vì vậy lệnh format toàn
cây trên checkout Windows hiện tại có thể tiếp tục báo CRLF của baseline. Khi kiểm
CI/clone mới, dùng checkout LF (`git -c core.autocrlf=false clone ...`); không diễn giải
kết quả LF local thành GitHub CI pass.

### Kiểm chứng thủ công với API và PostgreSQL

Môi trường riêng: database `agri122_ui_d1a1d5df8820` trong PostgreSQL local, tạo mới
rồi chạy **migration có sẵn** qua `--migrate`; không tạo migration mới, không reset
`agrivision_db`, không xóa volume. HTTP startup vẫn chỉ kiểm schema. API tại
`http://127.0.0.1:5034`, production frontend tại `http://localhost:3000`.

| Luồng | Bằng chứng quan sát |
| --- | --- |
| Guest vào `/knowledge`, `/admin` | Danh mục rỗng đọc được; Admin yêu cầu đăng nhập |
| Admin tạo bài + liên kết | Lưu qua API, trạng thái chưa duyệt; duyệt và công khai riêng |
| Guest xem bài | Tab không đăng nhập thấy danh sách/chi tiết, nguồn và liên kết |
| Sửa bài | UI Admin về chưa duyệt; Guest reload chi tiết thấy không khả dụng |
| Duyệt lại, ngừng, khôi phục bài | Trạng thái phản ánh API; khôi phục chưa duyệt và nút công khai bị khóa |
| Thuốc + hướng dẫn | UI tạo thuốc, gắn cặp, lưu nhãn, xác minh, duyệt liên kết, duyệt sản phẩm, công khai; Guest thấy nguồn/cảnh báo/đối tượng |
| Sửa nhãn qua HTTP thật | Root và use bị thu hồi cờ; public detail 404; xác minh/duyệt lại thì public 200 |
| Phân quyền HTTP thật | Guest gọi Admin 401; User gọi Admin 403 |
| Responsive public | Đã xem ảnh màn hình danh sách 375px, chi tiết bài 768px, chi tiết thuốc 1280px |
| Responsive Admin | Đã xem form thuốc 375px và desktop; phát hiện nút sửa hướng dẫn dài gây cuộn ngang, đã sửa wrap/max-width. Chưa chụp lại Admin sau sửa vì phiên browser kết thúc khi lượt chat đổi |

Log HTTP cuối `D:/AgriAI/.cache/knowledge-c-live-check.log` ghi 13 request đạt,
bao gồm xác nhận cờ root/use sau sửa nhãn. Đây là kiểm tra live local bằng fixture,
không phải suite E2E. UI/HTTP dùng dữ liệu tổng hợp `AGRI-122 · ...` với nguồn
`example.test`; không dùng làm kiến thức canh tác thật.

Seed ban đầu có `Chay_la_som` là `Unknown`; API từ chối gắn thuốc đúng quy tắc chỉ cho
loại `Disease`. Đã chuẩn bị **fixture trong DB riêng** thành `Disease` để kiểm tra
luồng thuốc; không tự phân loại danh mục production. Phân loại bệnh phải được nhóm
hoàn tất theo quy trình dữ liệu trước khi dùng chức năng gắn thuốc trong môi trường thật.

### Hướng dẫn UAT phần C

1. Mở `/knowledge` khi chưa đăng nhập; thử tìm kiếm, lọc cây/bệnh, chuyển trang và
   reload link có query. Mở `/plants`, `/diseases`, `/medicines` và chi tiết; API lỗi
   phải có thông báo/thử lại, không xuất hiện nội dung tĩnh thay thế.
2. Đăng nhập Admin hợp lệ, vào `/admin` → **Bài viết** → **Thêm mới**. Nhập tiêu đề,
   nội dung, link nguồn HTTP(S), chọn cặp nếu cần. Kiểm tra required/URL và xem trước.
3. Lưu → duyệt → công khai. Mở tab Guest để đối chiếu. Sửa nội dung → lưu: Guest
   reload phải không đọc được đến khi Admin duyệt/công khai lại.
4. Ngừng hoạt động → xác nhận → kiểm tra Guest. Khôi phục: vẫn chưa duyệt/chưa công khai.
5. **Thuốc**: tạo sản phẩm đủ nguồn/hoạt chất/đối tượng/cảnh báo/nhãn. Chọn cặp đang
   hoạt động với loại bệnh `Disease`; lưu hướng dẫn, mở lại hướng dẫn để xác minh,
   mở lại để duyệt liên kết; duyệt/công khai sản phẩm. Sửa nhãn để kiểm thu hồi cờ.
6. **Cây trồng/Bệnh cây**: thêm/sửa/ngừng/khôi phục; bệnh có duyệt/thu hồi nội dung.
   **Liên kết cây và bệnh**: bật/tắt một cặp thử nghiệm; class/index chỉ đọc.
7. User thường/Guest không được vào Admin; token hết hạn/lỗi API phải báo rõ và giữ
   nội dung form. Kiểm lại keyboard/focus, Admin 375/768/1280px trước nghiệm thu UI.

Không cần AI/Cloudinary cho các bước này. Không dùng thuốc thật để thử vòng đời.
Tài khoản demo chỉ tồn tại trong DB riêng; thông tin chạy local ở
`D:/AgriAI/.cache/knowledge-c-runtime.json` (không đưa vào Git). Còn lại: UAT của nhóm,
kiểm lại responsive Admin sau sửa, nâng coverage đến target nếu yêu cầu, commit/PR
khi được giao và GitHub Actions của đúng commit. Không đánh dấu Jira Done tự động.

## 2026-10-25 — Bổ sung debounce tìm kiếm 500ms

Theo yêu cầu bổ sung của người dùng, tái sử dụng `SearchField` có sẵn từ
`frontend/src/components/common/CatalogControls.tsx` cho public và Admin của bốn
danh mục, cùng bộ lọc liên kết cây–bệnh. Không thêm dependency, không đổi backend.

- Chờ 500ms kể từ lần gõ cuối mới lọc; tiếp tục gõ sẽ hủy timer cũ.
- Enter/nút Tìm kiếm áp dụng ngay và hủy timer, không gửi lại sau 500ms.
- Xóa từ khóa trả danh sách ngay; tìm mới về trang 1 và giữ bộ lọc cây/bệnh.
- URL public vẫn chứa từ khóa/filter/page; đổi URL hoặc rời trang hủy draft đang chờ.
- Callback timer dùng callback hiện tại để không ghi đè bộ lọc mới bằng closure cũ.
- Các trang cũ dùng `SearchField` giữ hành vi mặc định; nút submit và reset theo
  navigation là props tùy chọn. Ô tìm tài khoản toàn cục Admin ngoài phạm vi này.

File thay đổi ở lượt bổ sung: `CatalogControls.tsx` dùng chung,
`KnowledgeAdmin.tsx`, `PublicCatalog.tsx`, `PlantDiseaseManager.tsx`, và
`frontend/tests/integration/app/CatalogDebounce.test.tsx` (12 ca mới).

Kiểm chứng mới: 5/11 test debounce ban đầu thất bại đúng hành vi thiếu; sau triển khai
17/17 test mới + tìm kiếm cũ đạt, sau đó bổ sung test reset trang/giữ cây.
Toàn bộ frontend **414/414 tests, 60 files, không skip**; branch coverage
**1836/2552 = 71.94%**, vượt floor 60%, chưa đạt target 80%.
Typecheck, lint, production build, format của 5 file lượt này và `git diff --check`
đều đạt. Giới hạn CRLF baseline của kiểm tra format toàn cây Windows vẫn như trên.
Không chạy lại backend tests vì không sửa backend; không viết E2E.

Bằng chứng local: `D:/AgriAI/.cache/knowledge-debounce-red.log`,
`knowledge-debounce-green.log`, `knowledge-debounce-coverage.log`,
`knowledge-debounce-build.log`. Đã build và khởi động lại production frontend
localhost:3000; quan sát `/plants` tự cập nhật URL và kết quả sau nhập từ khóa
(từ khóa `cà` trả 2 mục). Không thao tác lên dữ liệu thật, không commit/push/PR.

## 2026-10-25 — Chuẩn bị PR theo yêu cầu người dùng

- Phạm vi PR: AGRI-122 A/B/C (backend, Admin và tra cứu User/Guest), nhánh
  `AGRI-128-knowledge-medicine` → `AGRI-128-backend-improvement` theo chỉ định.
- Người dùng xác nhận đã test tay giao diện và yêu cầu không chạy lại test local.
  Giữ nguyên bằng chứng đã chạy: backend 2026-10-24 (109 unit + 171 integration),
  frontend 2026-10-25 (414 tests, typecheck/lint/build); không coi là test mới.
- Commit code: `7af021a` backend, `27b5fea` frontend. Không sửa code trong lượt tạo PR.
- Fetch nhánh đích thấy base đã tăng từ `a43797d` lên `e1197ce`. Kiểm tra
  `git merge-tree --write-tree --name-only` phát hiện xung đột tại PredictionService,
  PredictionServiceTests, AppProvider và việc chuyển KnowledgeMedicineTests từ
  IntegrationTests/Controllers sang ApiTests/Controllers. Đây là kiểm tra merge
  bằng object Git, không thực hiện merge và không đưa conflict marker vào source.
- PR chưa đủ điều kiện merge: cần tích hợp các thay đổi R2/API tests/profile mới,
  giải quyết xung đột rồi kiểm chứng phiên bản tích hợp. Không suy rộng kết quả
  local cũ thành kết quả trên base mới hoặc GitHub Actions.
- Reviewer theo rules: backend Trần Trung Thông (`trunthong09012005`), frontend
  Nguyễn Phạm Bảo Khanh (`kats205`), đối chiếu danh sách collaborator GitHub.
- Rà staged paths và diff, `git diff --cached --check` đạt cho hai commit code;
  chỉ có credential giả trong test. Không đưa cache/runtime secrets vào Git.
- DoD vẫn chờ tích hợp, CI và domain review. URL PR được bổ sung sau khi tạo.

## 2026-10-25 — PR đã tạo

- PR [#46 — AGRI-122 Implement knowledge and medicine management A/B/C](https://github.com/KayPham05/AgriAI/pull/46).
- Head `AGRI-128-knowledge-medicine`, base `AGRI-128-backend-improvement`.
- Đã push code và tài liệu; đã yêu cầu review `trunthong09012005` và `kats205`.
- Không chạy lại tests theo yêu cầu người dùng; PR ghi riêng kết quả lịch sử và xác
  nhận test tay của người dùng. Chưa xác minh GitHub Actions; chưa merge.
- Vẫn còn các xung đột với base mới đã ghi ở mốc trước; cần tích hợp và kiểm chứng
  trước khi merge. Không tự sửa code hoặc giảm điều kiện CI trong lượt tạo PR.

## 2026-10-26 — Tích hợp nhánh gốc và giải quyết xung đột PR #46

- Merge base `e1197ce` vào `AGRI-128-knowledge-medicine` theo yêu cầu sửa conflict.
  Git ghi 4 mục unmerged; việc đổi vị trí KnowledgeMedicineTests liên quan cả đường
  dẫn cũ IntegrationTests/Controllers và đường dẫn mới ApiTests/Controllers.
- PredictionService giữ cả IMedicineService và IImageUploadJournal: giải quyết
  danh mục thuốc trước reserve/upload, giữ private image route, upload journal,
  cleanup R2 và snapshot chứa thuốc đã xác minh. Unit fixture truyền đủ hai dependency.
- AppProvider giữ public catalog và cập nhật tài khoản/avatar từ base. Phát hiện
  lỗi kết hợp: logout khi session còn ở loginPendingSession không gọi revoke server.
  Regression public-catalog logout thất bại trước sửa; sau sửa chọn phiên hiện hành
  hoặc phiên restored pending và giữ local login nếu revoke lỗi. 5/5 ca logout đạt.
- KnowledgeMedicineTests chuyển sang ApiTests và shared TestSupport; bổ sung 11 ApiCase,
  22 route mới vào manifest (tổng 59), kiểm Admin list và Guest/User denial cho uses/pairs.
  [Ma trận API AGRI-122](knowledge_api_matrix.md) ghi mapping từ contract đã kiểm.
- Bốn ca CatalogContractTests của base kỳ vọng Guest đọc inactive khác với yêu cầu
  AGRI-122. Cập nhật thành Guest 404/list ẩn, Admin đọc retained detail/list và kiểm
  nguyên vẹn quan hệ. Không mở quyền, đổi nghiệp vụ hoặc bỏ assertion dữ liệu.
- Hai test R2/profile nhập từ base chỉ sửa format theo Biome, không đổi assertion.
- Không thêm/sửa migration; migration R2/profile có sẵn được nhận nguyên từ base,
  chỉ chạy qua PostgreSQL Testcontainers. Không migrate database ứng dụng hay gọi R2 thật.
- Lượt đầu: unit 156/156 và integration 65/65 đạt; API 234/239 (manifest và bốn ca
  inactive nói trên). Frontend có 6 timeout lúc máy quá tải; cùng ba file chạy riêng
  đạt 18/18 sau dọn 60 worker MSBuild mồ côi của lần build bị chặn. Không tăng timeout.
- Kiểm chứng cuối và trạng thái push/CI sẽ ghi riêng bên dưới; kết quả cũ không thay
  thế kiểm chứng phiên bản tích hợp. Không viết E2E.

### Kiểm chứng cuối bản tích hợp — 2026-10-26

- Backend: `dotnet test backend/AgriVision.sln --no-restore -m:1 --filter
  'Category!=RealCheckpoint&Category!=RealR2' --settings backend/coverage.runsettings
  --collect 'XPlat Code Coverage' --logger trx`: **156 unit + 65 integration +
  239 API = 460/460 đạt**, không skip trong phạm vi lọc; các project biên dịch thành công.
  Runtime inventory/mapping guards đạt, bao gồm toàn bộ 59 controller routes.
- Backend coverage gộp bằng ReportGenerator: **879/1052 = 83.56%**, vượt floor 70%
  và target 80%. Bằng chứng `D:/AgriAI/.cache/knowledge-merge-verified/` (3 TRX,
  3 Cobertura), `knowledge-merge-verified.log` và
  `D:/AgriAI/.cache/knowledge-merge-coverage/Cobertura.xml`.
- Frontend: `pnpm exec vitest run --coverage --maxWorkers=2`: **440/440 tests**, 63
  files; branch **2002/2766 = 72.37%**, vượt floor 65%, chưa đạt target 80%.
  Hai worker là giới hạn tài nguyên local; giữ nguyên assertions/timeouts/coverage gate.
  Log `D:/AgriAI/.cache/knowledge-merge-frontend-final.log` và Cobertura ở
  `.cache/coverage/frontend/` trong worktree. Lần trung gian `frontend-verified`
  có timeout Admin và regression logout đỏ; không dùng làm bằng chứng nghiệm thu.
- Typecheck, lint, production build Next.js 16.4.1 đạt. Biome kiểm 234 file trên bản
  sao LF đạt; workspace Windows vẫn giữ newline baseline, không format hàng loạt.
  Logs `knowledge-merge-typecheck-final.log`, `knowledge-merge-lint-final.log`,
  `knowledge-merge-build-frontend.log`, `knowledge-merge-format-final.log` dưới cache root.
- Regression logout: log `knowledge-merge-logout-red.log` tái hiện lỗi không revoke
  phiên public, `knowledge-merge-logout-green.log` đạt 5/5; fixture reset mock giữa ca
  để callback/rejection chờ không ảnh hưởng ca sau.
- Git: không còn đường dẫn unmerged hoặc conflict markers; staged whitespace check đạt.
  Remote target vẫn e1197ce khi kiểm trước commit. PR #46 giữ hai reviewer ban đầu.
- Các kết quả trên là local, chưa xác minh GitHub Actions. Không chạy E2E, RealR2,
  RealCheckpoint, không test tay lại bản tích hợp hoặc migrate database ứng dụng.
