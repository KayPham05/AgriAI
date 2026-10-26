# AGRI-128 / AGRI-122 — Kế hoạch phần C: Admin và tra cứu công khai

- Ngày lập: 2026-10-25. Task AGRI-122, story AGRI-114, S3-09.
- Người dùng xác nhận phạm vi: Admin quản lý cây, bệnh, thuốc, bài viết; User/Guest tra cứu.
- Trạng thái hiện tại (2026-10-25): người dùng đã giao triển khai C; code và kiểm chứng local đã có trên nhánh dưới đây. Chưa commit/push/PR; chưa nghiệm thu GitHub CI hoặc Jira Done. Xem [báo cáo C](../reports/AGRI-128/knowledge_medicine.md#2026-10-25--triển-khai-và-kiểm-chứng-phần-c).
- Nhánh gốc theo yêu cầu: `AGRI-128-backend-improvement`.
- Nhánh thực hiện C: `AGRI-128-knowledge-medicine`, chung backend A/B theo xác nhận
  người dùng ngày 2026-10-25; không tạo nhánh frontend riêng.
- Kế hoạch này nối tiếp [backend A/B](AGRI-128-knowledge-medicine-plan.md), không thay đổi kết quả kiểm thử A/B ngày 2026-10-24.

## 1. Kết quả cần bàn giao

Admin nhập và quản lý dữ liệu thật qua API. Thuốc/bài viết được duyệt và công khai
thì User và Guest có thể tra cứu như nhau, không cần đăng nhập để đọc. Sau khi Admin
sửa nội dung, dữ liệu trở về trạng thái cần duyệt lại theo trigger backend hiện hành.

Các mục dưới đây giữ lại kế hoạch ban đầu. Sau khi người dùng giao triển khai, C
được thực hiện cùng nhánh A/B; kết quả thực tế và giới hạn ghi ở báo cáo C và task log.

| Nhóm | Trong phạm vi C | Giới hạn |
| --- | --- | --- |
| Admin | Danh sách, thêm/sửa, trạng thái hoạt động cây/bệnh; duyệt nội dung bệnh; quản lý thuốc, bài viết và liên kết cây–bệnh | Không viết lại quản trị tài khoản, ảnh, phiên đăng nhập |
| User/Guest | Danh sách/chi tiết cây, bệnh, thuốc, bài viết; tìm kiếm và lọc theo cây/bệnh phù hợp từng API | Chỉ đọc dữ liệu công khai; không có nút quản trị |
| Thuốc | Nguồn, hoạt chất, đối tượng sử dụng, cảnh báo, tham chiếu nhãn và hướng dẫn theo đúng cặp cây–bệnh | Tra cứu không đồng nghĩa thuốc phù hợp với mọi cây hoặc kết quả chẩn đoán |
| Bài viết | Nhập tiêu đề, nội dung văn bản, link nguồn; gắn không hoặc nhiều cặp cây–bệnh | Không upload PDF/Word; đề xuất Textarea và xem trước văn bản, chưa thêm rich-text editor |
| Kiểm thử | Unit, component, integration frontend; kiểm tra thủ công với API thật | Không viết E2E theo yêu cầu người dùng |

Không gộp giao diện chẩn đoán Guest, giao diện History, ChatGPT advisor hoặc thay đổi
dataset/nhãn AI vào C. Việc hiển thị `recommendedMedicines` ngay trong kết quả chẩn
đoán là phần tích hợp UI khác, cần xác nhận riêng nếu muốn mở rộng.

## 2. Hiện trạng và các phụ thuộc đã kiểm tra

Khảo sát trên worktree `AGRI-128-knowledge-medicine`, base local `a43797d`.
Ngày 2026-10-25 đã fetch `origin/AGRI-128-backend-improvement` theo yêu cầu và chạy
`git merge --ff-only origin/AGRI-128-backend-improvement`: `Already up to date.`
HEAD, FETCH_HEAD và remote-tracking ref cùng `a43797db2c216b8d1955b00b787a1b1962ad0cdd`.
Không conflict, không tạo commit; 39 đường dẫn thay đổi local được giữ qua thao tác.

| Thành phần hiện có | Cách sử dụng trong C |
| --- | --- |
| `frontend/src/features/admin/AdminCrmPage.tsx`, `AdminAccess.tsx` | Tái sử dụng khung, điều hướng và kiểm tra role. Admin hiện chỉ có tổng quan/người dùng/ảnh/phiên |
| `frontend/src/features/admin/AdminMockProvider.tsx` | Các module quản trị cũ dùng mock; module tri thức mới phải gọi API thật, không lưu giả bằng provider này |
| `frontend/src/services/authApi.ts` | Tái sử dụng phiên/token; API quản trị gửi `Authorization: Bearer <token>` |
| `frontend/src/providers/AppProvider.tsx` | Hiện chuyển khách chưa vào app về `/` và tải catalog cùng history lúc khôi phục phiên; cần tách điều kiện cho trang tra cứu công khai |
| `frontend/src/services/catalogApi.ts`, `frontend/src/data/plantData.ts` | Hiện ghép API với dữ liệu tĩnh/ID giao diện. Form Admin phải dùng GUID backend; nội dung công khai không được lấy bản tĩnh thay cho nội dung chưa duyệt hoặc đã ẩn |
| `frontend/src/views/PlantsPage.tsx`, `DiseasesPage.tsx` và trang chi tiết | Tái sử dụng bố cục/tìm kiếm phù hợp, rà lại nguồn dữ liệu và liên kết |
| `frontend/src/components/ui/`, `CatalogControls.tsx`, `CatalogPagination.tsx` | Tái sử dụng Button, Input, Textarea, Select, Checkbox, Dialog, AlertDialog, Badge và các thành phần danh mục |
| Backend A/B local | Có API thuốc, bài viết, liên kết và publication; đang là thay đổi chưa commit trong worktree này, chưa mặc định có trên nhánh gốc/remote |

Điều kiện tích hợp: backend A/B phải sẵn có ở môi trường chạy và có tài khoản Admin
được cấp hợp lệ. Nếu A/B chưa được gộp về base, có thể phát triển frontend theo contract
và test doubles, nhưng chưa nghiệm thu tích hợp thật. Không tự chuyển các file backend
chưa commit sang nhánh mới, không mang code History/Guest vào PR frontend.

## 3. Bản đồ màn hình đề xuất

Giữ giao diện xanh/nền sáng, typography và tokens trong `DESIGN.md`; mở rộng khung
hiện có, không thiết kế lại toàn bộ website. Các nhãn/route mới được duyệt cùng kế hoạch.

### C1. Khu vực Admin

Thêm nhóm điều hướng “Tri thức nông nghiệp” với bốn mục. Có thể giữ cơ chế chọn
module tại `/admin` hiện tại; chưa cần tạo hệ thống routing Admin mới.

| Màn hình | Nội dung và thao tác | Điều kiện nghiệm thu |
| --- | --- | --- |
| Cây trồng | Danh sách; tên, tên tiếng Việt, tên khoa học, mô tả; thêm/sửa/ngừng hoạt động/khôi phục theo API | Tải lại vẫn giữ thay đổi; không thêm nhãn AI từ form |
| Bệnh cây | Danh sách; tên, mô tả, triệu chứng, xử lý, phòng ngừa; sửa, trạng thái hoạt động, duyệt nội dung | Nội dung chưa duyệt được đánh dấu; sửa xong phản ánh trạng thái duyệt thực tế |
| Liên kết cây–bệnh, trong khu vực danh mục | Chọn/xem cặp đã có, xem class/mapping ở chế độ chỉ đọc, bật/tắt hoạt động theo API | Không tạo cặp AI hoặc sửa `ClassIndex`/`ClassName`; chọn đúng cặp để gắn tài liệu/thuốc |
| Thuốc | Danh sách và form chi tiết; quản lý các đối tượng sử dụng, hướng dẫn nhãn, xác minh/duyệt từng liên kết; duyệt/công khai sản phẩm | Lưu nội dung, xác minh nhãn, duyệt và công khai là các bước phân biệt |
| Bài viết | Danh sách, form tiêu đề/nội dung/nguồn/cặp cây–bệnh; xem trước, duyệt, công khai, ngừng hoạt động/khôi phục | Bài chung được phép không gắn cặp; bài đã ngừng không xuất hiện ở public |

Danh sách thuốc/bài viết hiển thị rõ ba trạng thái độc lập: hoạt động, đã duyệt,
công khai; use của thuốc có thêm xác minh nhãn. Không gộp tất cả thành một nhãn
“Đã duyệt” khiến người dùng hiểu nhầm đã công khai hoặc đã đủ điều kiện khuyến nghị.

Form thuốc gồm `productName`, `activeIngredient`, `targetUse`, `sourceUrl`,
`safetyWarning`, `labelReference`; hướng dẫn riêng mỗi cặp là `labelDirections`.
Tên thuốc/tiêu đề bài tối đa 200 ký tự; các trường bắt buộc, URL HTTP(S) và GUID
đối chiếu DTO/validation backend. Không tự thêm dropdown trạng thái hiệu lực pháp lý
vì contract hiện tại chỉ có trạng thái hoạt động/duyệt/công khai.

Nút xóa thuốc/bài viết mang nhãn “Ngừng hoạt động”, có xác nhận giải thích dữ liệu
vẫn được giữ. Khôi phục không tự công khai lại. Với cây/bệnh, giữ đúng hành vi API
và thông báo ràng buộc khi ngừng hoạt động; không hứa xóa cứng dữ liệu liên quan.

### C2. Tra cứu cho User và Guest

| Đường dẫn đề xuất | Nội dung |
| --- | --- |
| `/plants`, `/plants/[id]` | Giữ trang cây hiện có; dùng dữ liệu hợp lệ, thêm liên kết xem bệnh/bài viết/thuốc theo cây |
| `/diseases`, `/diseases/[id]` | Giữ trang bệnh; nội dung chưa duyệt hiển thị thông báo API, không điền nội dung tĩnh thay thế |
| `/medicines`, `/medicines/[id]` | Danh sách và chi tiết thuốc công khai; nguồn, hoạt chất, cảnh báo, nhãn và hướng dẫn theo cặp được phép công khai |
| `/knowledge`, `/knowledge/[id]` | Danh sách và bài viết; nội dung, nguồn, ngày cập nhật và các liên kết cây–bệnh |

Đề xuất một mục “Tra cứu” nhóm các danh mục để thanh điều hướng không quá dài.
Giữ URL cây/bệnh cũ và ánh xạ ID hiện có; route thuốc/bài viết mới dùng GUID API.
Nội dung quản trị và lựa chọn form luôn dùng GUID, không gửi slug làm ID backend.

Các yêu cầu bắt buộc:

- Guest mở thẳng link chi tiết hoặc tải lại vẫn đọc được; không bị ép đăng nhập,
  không tải API history/profile/admin để mở danh mục.
- User và Guest xem cùng phiên bản công khai. Kể cả Admin xem trang public cũng gọi
  contract public; với cây/bệnh cần tránh đính token Admin làm lộ bản chưa duyệt.
- Không lấy danh sách Admin rồi chỉ lọc ở browser. Backend là nơi thực thi quyền.
- Thuốc/bài viết có tìm kiếm, lọc cây, lọc bệnh, phân trang server. Đổi bộ lọc về trang 1;
  lưu bộ lọc vào URL để tải lại/chia sẻ được. Chọn cây thì cập nhật lựa chọn bệnh hợp lệ.
- API thuốc/bài viết hiện chưa hỗ trợ lọc theo cờ duyệt/hoạt động; chưa đưa filter
  server cho các cờ đó vào cam kết C, và không lọc một trang rồi báo tổng kết quả sai.
- Cây/bệnh hiện trả mảng; giữ tìm kiếm/phân trang phía client phù hợp, không giả định
  đã có contract `PagedResult` cho hai endpoint này.
- Có loading, rỗng, lỗi mạng, thử lại, không tìm thấy. Bản bị ẩn/ngừng sau khi mở
  phải hiển thị trạng thái không còn khả dụng khi fetch lại, không phục hồi từ fixture.
- Nội dung bài viết hiển thị dạng văn bản an toàn, giữ xuống dòng; không render HTML
  do người nhập cung cấp. Link nguồn chỉ HTTP(S); mở tab mới có thuộc tính phù hợp.
- Với thuốc luôn thể hiện nguồn/nhãn và cảnh báo; không tự suy ra liều lượng, không
  gắn nhãn “phù hợp với cây của bạn” chỉ vì sản phẩm có trong danh sách tra cứu.

## 4. Mapping API để triển khai

Chi tiết payload: [báo cáo backend A/B](../reports/AGRI-128/knowledge_medicine.md).

| Nhu cầu UI | API hiện có |
| --- | --- |
| Cây/bệnh public | `GET /api/plants`, `/api/diseases` và `/{id}` |
| Cây/bệnh Admin | Cùng routes với token Admin; `includeInactive=true` khi đọc; `POST`, `PUT /{id}`, `DELETE /{id}` |
| Duyệt nội dung bệnh | `PUT /api/admin/diseases/{id}/approval` |
| Chọn cặp cây–bệnh | `GET /api/admin/plant-diseases`; public dùng `/api/plant-diseases` |
| Bật/tắt cặp | `PUT /api/admin/plant-diseases/{id}/availability` |
| Thuốc Admin | `GET/POST /api/admin/medicines`; `GET/PUT/DELETE /{id}` |
| Duyệt/công khai/khôi phục thuốc | `PUT /api/admin/medicines/{id}/publication` |
| Hướng dẫn theo cặp | `PUT/DELETE /api/admin/medicines/{id}/uses/{plantDiseaseId}` |
| Bài viết Admin | `GET/POST /api/admin/knowledge-documents`; `GET/PUT/DELETE /{id}`; `PUT /{id}/publication` |
| Tra cứu thuốc/bài viết | `GET /api/medicines`, `/api/knowledge-documents` và `/{id}` |

`CatalogFilterParams`: `plantId`, `diseaseId`, `search`, `pageNumber`, `pageSize`
(mặc định 20, tối đa 100). Lấy tổng và trạng thái trang từ response API. Bộ chọn cặp
phải đọc đủ các trang cần thiết, không chỉ trang đầu 20 mục. Khi sửa bản có liên kết
đã ngừng hoạt động, không tự xóa các ID không còn xuất hiện trong bộ chọn public;
Admin dùng dữ liệu Admin và hiển thị trạng thái của liên kết.

Service frontend riêng cho quản trị/public, typed DTO theo contract. Xử lý `204`
không có JSON; thông báo `400` cạnh trường hoặc đầu form; `401` yêu cầu đăng nhập lại;
`403` báo thiếu quyền; `404` báo tài nguyên không khả dụng; lỗi server/mạng giữ nội dung
form để thử lại. Không log token. Không tự retry mutation có thể tạo trùng.

## 5. Quy trình duyệt phải thể hiện trên UI

### Bài viết

1. Nhập nội dung + nguồn + liên kết và lưu bản nháp.
2. Xem trước nội dung đã lưu; Admin thực hiện duyệt và công khai.
3. Sửa nội dung/nguồn/liên kết: lưu xong đọc trạng thái backend, thông báo cần duyệt lại.
4. Ngừng hoạt động: bỏ khỏi public; dữ liệu vẫn xem được ở Admin.
5. Khôi phục hoạt động trước, đọc lại trạng thái, duyệt/công khai sau.

### Thuốc

1. Nhập thông tin sản phẩm và lưu.
2. Gắn cặp cây–bệnh hợp lệ, nhập đúng hướng dẫn trên nhãn rồi lưu.
3. Người có trách nhiệm đối soát nguồn/nhãn; thao tác riêng xác minh và duyệt use
   với nội dung không đổi, sau đó duyệt/công khai sản phẩm.
4. Sửa sản phẩm có thể thu hồi cả duyệt/công khai và xác minh/duyệt các use; sửa nhãn
   thu hồi trạng thái use và sản phẩm. Sau mutation use phải tải lại cả parent medicine.
5. Không làm nút “Lưu và giữ duyệt”. Không gửi nội dung sửa cùng cờ true rồi giả định
   vẫn được duyệt; trigger có thể thu hồi cờ trong cùng request.

Sau mọi mutation, dùng response đã đọc lại DB hoặc refetch để đồng bộ list/detail.
Không hiển thị thành công trước khi API xác nhận. Hiển thị các bước đã lưu nếu một
chuỗi thao tác bị lỗi giữa chừng, không nói toàn bộ quy trình đã hoàn tất.

## 6. Thứ tự triển khai và điều kiện hoàn tất từng bước

| Bước | Việc thực hiện | Kết quả có thể tự test |
| --- | --- | --- |
| 1. Chuẩn bị | Kiểm tra base/API A/B; xác nhận Admin; chốt route/navigation; định nghĩa DTO/service và fixtures theo contract | Gọi đọc danh mục thật; form chưa cần hoàn chỉnh |
| 2. Nền public và quyền | Mở allowlist trang tra cứu; tách tải public khỏi history; giữ AdminAccess; xử lý role/token hết hạn | Guest mở trực tiếp danh mục được; User/Guest không vào Admin |
| 3. Bài viết xuyên suốt | Form Admin, lưu/duyệt/công khai/ngừng/khôi phục; public list/detail, nguồn và filter | Admin tạo bài, Guest thấy; Admin sửa thì Guest không thấy đến khi duyệt lại |
| 4. Cây, bệnh, quan hệ | Kết nối CRUD hiện có; duyệt bệnh; bộ chọn cặp đầy đủ; rà nội dung tĩnh public | Thay đổi danh mục phản ánh đúng; không thay mapping AI |
| 5. Thuốc xuyên suốt | Form sản phẩm, use theo cặp, nguồn/nhãn, quy trình duyệt; public list/detail | Sửa nhãn thu hồi trạng thái; Guest chỉ thấy nội dung/link đủ điều kiện |
| 6. Kiểm chứng và bàn giao | Hoàn thiện các lớp test, responsive, lỗi/empty; chạy checks; cập nhật report/task log | Có ma trận AC, kết quả thực tế, hướng dẫn test thủ công và PR để reviewer đọc |

Mỗi bước viết test hành vi tương ứng rồi triển khai, không dồn toàn bộ kiểm thử cuối
task. Chưa cam kết số ngày vì chưa chốt trạng thái tích hợp A/B và thay đổi frontend
từ đồng nghiệp. Có thể bàn giao từng bước sau khi kiểm chứng, nhưng không đánh dấu
toàn bộ C Done khi chưa đạt cả Admin và tra cứu public.

## 7. Kế hoạch kiểm thử (không E2E)

| Lớp | Các ca bắt buộc |
| --- | --- |
| Unit — `frontend/tests/unit/` | Service đúng endpoint/token/public không token Admin; serialize filter/GUID; `204`; parse lỗi có/không body; validation trường/URL; ánh xạ trạng thái publication |
| Component — `frontend/tests/component/` | Form thuốc/bài/cây/bệnh; required/maxlength; chọn nhiều cặp; pending chống double-submit; lỗi giữ input; modal xác nhận ngừng; trạng thái cần duyệt lại; nguồn/cảnh báo; loading/empty/retry/pagination; keyboard/focus |
| Integration — `frontend/tests/integration/` | Admin tạo → duyệt → public đọc; sửa → thu hồi → duyệt lại; nhãn đổi → refetch parent; ngừng/khôi phục; Guest direct URL/reload; User bị chặn Admin; token hết hạn; filter đổi nhanh không hiển thị response cũ; backend lỗi không fallback nội dung chưa duyệt |
| Thủ công với BE + PostgreSQL | Hai cửa sổ Admin và Guest đối chiếu dữ liệu sau từng thao tác; reload; kiểm đủ cặp trên nhiều trang; lỗi nguồn/thiếu trường; thao tác trên bản đã ngừng; kiểm responsive 375/768/1280px và bàn phím |

Integration frontend dùng Vitest/Testing Library và HTTP doubles theo cách repo đã
có, không phải E2E và không thay thế kiểm chứng với API thật. Backend tiếp tục là
nơi kiểm thử ngăn truy cập trái phép; frontend ẩn nút không đủ chứng minh bảo mật.

Chạy từ `frontend/` khi có code:

```powershell
corepack pnpm check:ci
corepack pnpm test:coverage
```

Lệnh theo `package.json` hiện có; không đổi phiên bản package manager/lockfile.
`vitest.config.mts` trên base khảo sát đặt branch coverage floor 60%, target dự án
80%; đối chiếu lại config/workflow trước thực hiện, không giảm gate để pass. Không
chạy tooling probes đồng thời lint/format toàn cây. Chỉ báo CI pass khi có kết quả
GitHub của đúng commit, không suy ra từ chạy local.

## 8. Ma trận nghiệm thu theo AGRI-122

| AC | Bằng chứng cần có cho C |
| --- | --- |
| Admin quản lý danh mục/tài liệu đúng quyền | CRUD UI thực sự lưu qua API; Guest/User bị chặn Admin; test 401/403 |
| Tra cứu theo cây hoặc bệnh | Query đúng GUID; bộ lọc kết hợp cùng cặp; tổng/trang đúng; deep link và reload giữ filter |
| Thuốc có nguồn và trạng thái | Form bắt buộc nguồn/nhãn/cảnh báo; Admin thấy các cờ; public thấy nguồn và ngày cập nhật, không diễn giải IsActive thành giấy phép pháp lý |
| Dữ liệu thiếu/sai bị từ chối | Validation UI và lỗi API hiển thị rõ; không mất nội dung nhập hoặc báo thành công giả |
| Chỉ đọc nội dung công khai đã duyệt | Public endpoints và luồng thu hồi/duyệt lại; không lấy draft từ Admin API, fixture hoặc nội dung tĩnh |
| Không tự coi thuốc là khuyến nghị phù hợp | Chi tiết đúng đối tượng/hướng dẫn đã xác minh; không tự tạo liều hoặc suy diễn eligibility ở frontend |

## 9. Môi trường, Git và bàn giao

- Chỉ đọc kế hoạch không cần bật Docker. Phát triển UI với test doubles không cần AI.
- Kiểm chứng thực tế cần frontend + backend chứa A/B + PostgreSQL (Docker theo
  command guide). CRUD/tra cứu không cần chạy inference AI hoặc Cloudinary.
- Không có migration mới cho C; nếu database thiếu schema, dừng xác minh migration
  đã có theo quy trình riêng, không tự xóa/reset database hoặc volumes.
- Thực hiện C ngay trên `AGRI-128-knowledge-medicine` cùng A/B theo yêu cầu mới nhất;
  không tạo nhánh khác. Giữ nguyên các worktree khác. Lượt đồng bộ nhánh gốc chưa
  triển khai frontend.
- PR frontend hướng về `AGRI-128-backend-improvement` theo chỉ định người dùng,
  Jira thực tế AGRI-122; reviewer frontend theo rules: Nguyen Pham Bao Khanh.
  Xác minh GitHub account trước khi request review, không đoán handle.
- Cập nhật báo cáo kỹ thuật, task log, ma trận test và ảnh kiểm tra thủ công nếu có.
  Commit/push/PR thực hiện khi người dùng yêu cầu; chưa thực hiện ở lượt lập kế hoạch.

## 10. Bước tiếp theo để người dùng bắt đầu

Đọc và duyệt phạm vi/màn hình/quy trình trên. Sau đó giao triển khai bước 1–3 trước:
kiểm tra API và quyền truy cập, làm trọn luồng bài viết Admin → Guest. Đây là luồng
đơn giản hơn thuốc, giúp kiểm tra được cách nối API, duyệt, công khai và ngừng hoạt
động trước khi bổ sung xác minh nhãn. Không cần nhập dữ liệu thuốc thật để thử UI.

### Cập nhật sau triển khai — 2026-10-25

Các bước 1–5 đã có code; bước 6 có 402 test frontend đạt, production build đạt,
kiểm chứng bài viết/thuốc với API và PostgreSQL riêng. Người dùng tiếp tục UAT theo
[ma trận thủ công](../reports/AGRI-128/knowledge_medicine.md#hướng-dẫn-uat-phần-c).
Không cần chạy AI cho CRUD/tra cứu. Chưa tự tạo PR; C không thêm migration và không
thay đổi quy trình trigger yêu cầu duyệt lại. Branch coverage 71.70% chưa đạt target
80%; giới hạn kiểm tra responsive và môi trường Windows được ghi rõ trong báo cáo.
