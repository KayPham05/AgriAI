# AGRI-76 — Use Case Specification hiện trạng

Cập nhật 07/10/2026 theo working tree sau AGRI-70; nền commit 99d6e56 chỉ là baseline trước thay đổi. Các luồng sau phản ánh source, không phải kết quả kiểm thử runtime. Actor, rules và nguồn: [System Analysis](system_analysis.md); mapping: [traceability](traceability.md).

## Phân biệt hiện trạng và mục tiêu cập nhật

[Phỏng vấn đã xác nhận](../../notes/user_story_decisions_2026-10-06.md) cập nhật mục tiêu ngày 2026-10-06. UC-01–UC-10 đã đối chiếu source mới sau AGRI-70; đặc tả không tự chứng minh nghiệm thu toàn bộ User Story. Đăng ký trả JWT ngay, web chặn khách và thiếu Google/reset là hành vi hiện tại, không bác bỏ yêu cầu sản phẩm mới.

## Ranh giới web và API

`App.tsx` khởi tạo `hasEnteredApp=false`. Khách chỉ thấy IntroPage/LoginModal; phiên khôi phục hợp lệ hoặc đăng nhập thành công rồi chọn vào ứng dụng mới mở các màn hình chính. Logout đặt `hasEnteredApp=false` và quay về IntroPage. Vì vậy UC-03 và các thao tác prediction/history/catalog trên web yêu cầu đã vào ứng dụng bằng phiên đăng nhập. Khách gọi trực tiếp POST prediction (200, không storage/history) và GET danh mục. GET prediction list/detail cần JWT; detail kiểm owner.

Các nhánh `guestProfile`, `readGuestHistory`, mở/xóa kết quả browser và đồng bộ `leafai_history` tồn tại trong code, nhưng chưa có đường vào các màn hình đó từ UI dành cho khách. Đây là **nhánh code chưa truy cập được từ UI hiện tại**, không phải chức năng web đã cung cấp và cũng không tự gắn nhãn Planned/Future.

## Tối ưu còn 10 Use Case — 2026-10-06

Gộp theo mục tiêu người dùng, giữ nguyên các nhánh nghiệp vụ và quyền truy cập. Kiểm file/lưu ảnh/gọi AI/mapping/ghi DB là bước nội bộ UC-05, được đặc tả trong Activity/Sequence, không còn là các oval Use Case độc lập. Không thêm include/extend chỉ để nối các bước xử lý.

| ID cũ (chỉ tham chiếu lịch sử) | ID hiện tại | Phạm vi |
|---|---|---|
| UC-01 | UC-01 | Đăng ký |
| UC-02 | UC-02 | Đăng nhập |
| UC-03, UC-05 | UC-03 | Quản lý hồ sơ và khôi phục phiên |
| UC-04 | UC-04 | Đăng xuất trên trình duyệt |
| UC-06 | UC-05 | Phân loại một ảnh lá |
| UC-07, UC-08 | UC-06 | Xem kết quả và lịch sử |
| UC-09 | UC-07 | Xóa kết quả |
| UC-10 | UC-08 | Tra cứu cây/bệnh |
| UC-11, UC-12, UC-13 | UC-09 | Quản lý danh mục |
| UC-14 | UC-10 | Kiểm tra dịch vụ |

## UC-01 — Đăng ký

- Mục tiêu/actor: khách tạo tài khoản và nhận phiên.
- Trigger/input: submit FullName, Email, Password tại LoginModal; POST `/api/auth/register`.
- Tiền điều kiện: API/DB phục vụ; không đòi JWT.
- Luồng chính: web gửi JSON → AuthService kiểm email tồn tại → hash BCrypt → tạo User role User → AddAsync/SaveChanges → GenerateToken → 200 AuthResponse → web lưu phiên theo remember.
- Thay thế/lỗi: email trùng → 400; model binding lỗi → 400; DB exception → middleware theo loại lỗi (thường 500); mạng lỗi → thông báo web. Validator có source nhưng chưa chứng minh được gọi trong pipeline.
- Hậu điều kiện thành công: user/hash lưu DB; JWT trả cho client, không có bảng session. JWT failure sau lưu user không có rollback được thể hiện trong source.
- BFD/data/rules: F1.1; users; R01/R02. Activity/sequence authentication.

## UC-02 — Đăng nhập

- Mục tiêu/actor: khách xác thực tài khoản.
- Trigger/input: Email, Password; POST `/api/auth/login`.
- Tiền điều kiện: tài khoản tồn tại cho luồng thành công.
- Luồng chính: web gửi JSON → GetByEmailAsync → BCrypt.Verify → ký JWT → 200 AuthResponse → saveAuthSession → màn hình thành công.
- Lỗi: user không tồn tại hoặc mật khẩu sai → 401; lỗi mạng → web báo không kết nối; không tạo dữ liệu prediction.
- Hậu điều kiện: phiên nằm localStorage hoặc sessionStorage; không có refresh-token/revocation flow được khảo sát.
- BFD/data/rules: F1.2; users đọc; R01/R02. Activity/sequence authentication.

## UC-03 — Quản lý hồ sơ và khôi phục phiên

### Nhánh: Đọc hồ sơ và khôi phục phiên

- Actor/trigger: người dùng đã đăng nhập; GET `/api/auth/me`, hoặc reload web có phiên đã lưu.
- Tiền điều kiện/input: JWT hợp lệ với user ID parse được.
- Luồng chính: restoreAuthSession đọc phiên → GET me → authentication pipeline → GetCurrentUserAsync → UserDto → khôi phục authSession/userProfile và đặt hasEnteredApp=true.
- Thay thế: không có phiên → null, giữ IntroPage/LoginModal; JWT sai hoặc user claim không hợp lệ → 401; user không còn tồn tại → 404; restore lỗi thì clearAuthSession.
- Hậu điều kiện: hồ sơ được đọc, không sửa users. State giao diện dựng lại từ UserDto.
- BFD/data/rules: F1.3; users + browser session; R02. Activity authentication, DFD process 1.4.

### Nhánh: Sửa hồ sơ giao diện

- Actor/input: user đã đăng nhập và đã vào ứng dụng, dùng UI ProfilePage; name, role hiển thị, location.
- Tiền điều kiện: hasEnteredApp=true sau đăng nhập/restore, mở form sửa hồ sơ.
- Luồng chính: handleSave → onUpdateProfile → App setUserProfile → đóng edit.
- Thay thế: hủy sửa không lưu; reload/khôi phục phiên dựng lại profile từ server nếu restore thành công; không có phiên thì trở về IntroPage.
- Hậu điều kiện: chỉ state UI đổi; email, users và JWT role không được sửa. Không xem đây là endpoint sửa hồ sơ hoàn chỉnh.
- BFD/data: F1.5; profile state bộ nhớ. Planned: cập nhật hồ sơ server.

## UC-04 — Đăng xuất trên trình duyệt

- Actor/input: user chọn đăng xuất; không có logout API.
- Tiền điều kiện: có phiên web.
- Luồng chính: App xóa authSession → clearAuthSession xóa cả localStorage/sessionStorage → reset guestProfile/history trong state, đặt hasEnteredApp=false và hiển thị IntroPage/LoginModal.
- Thay thế: thao tác khi không còn phiên không tạo server transaction.
- Hậu điều kiện: browser không giữ phiên; JWT đã cấp không bị revoke bởi thao tác này.
- BFD/data: F1.4; browser session. Không gán users update hoặc bảng token.

## UC-05 — Phân loại một ảnh lá

- Actor/mục tiêu: khách API trực tiếp hoặc user; web hiện cần login/restore và hasEnteredApp=true.
- Trigger/input: multipart `file` tại POST `/api/predictions`; JWT tùy chọn.
- Tiền điều kiện thành công: HTTP AI trả contract hợp lệ; top-1/mọi top-k có ClassIndex/ClassName khớp catalog. Nhánh user còn cần storage/DB ghi được; khách không cần ghi storage/DB.
- Luồng chính:
  1. UI JPEG/PNG, >0 và ≤15 MiB, decode preview; XHR uploading/analyzing theo callback.
  2. Controller lấy UserId nullable; service kiểm rỗng/.jpg/.jpeg/.png, buffer.
  3. Gọi AI `/predict` bằng stream độc lập; adapter kiểm JSON/contract.
  4. Tra ClassIndex và kiểm ClassName top-1/mọi top-k chính xác; tạo prediction/details trong bộ nhớ.
  5. Khách: MapToResultDto →200, Images rỗng, HasHistoricalSnapshot=false; không upload/AddAsync.
  6. User: upload ảnh sau AI/mapping; PredictionImage position=0, expiry +30 ngày; map DTO + snapshot JSON.
  7. AddAsync/SaveChanges prediction/details/image/snapshot →201 + Location.
  8. Web map DTO/hiển thị; field warning/medication/expiry mới chưa đồng bộ đầy đủ ở UI.
- Lỗi: file sai →400; AI HTTP/timeout →503; JSON/contract →502; index/name thiếu/sai →400 không fallback; Cloudinary lỗi/thiếu config fallback local; storage exception dừng trước ghi DB. Lỗi persistence cố cleanup với CancellationToken.None; cleanup false/exception chỉ log, giữ lỗi gốc. XHR network/timeout/abort là nhánh frontend.
- Hậu điều kiện: khách chỉ có DTO lượt hiện tại, không có history DB; user có ảnh/metadata/snapshot. Không tạo record lỗi. Cleanup best effort không đảm bảo mọi object đã được xóa.
- BFD/data/rules: F2.1–F2.7; D2/D3/D5, AI/Cloudinary; R03–R06/R10/R13. Activity/Sequence prediction/errors, DFD 2.x, PredictionStatus UI.

## UC-06 — Xem kết quả và lịch sử

### Nhánh: Xem kết quả

- Actor/input: user đọc detail theo ID với JWT; khách xem trực tiếp DTO của POST trong UC-05, không được GET history/detail.
- Tiền điều kiện GET thành công: JWT/UserId hợp lệ, record tồn tại và owner khớp. Admin không có ngoại lệ đọc record khác.
- Luồng chính: GET `/api/predictions/{id}` → GetPredictionByIdAsync(id,ct,userId) → repository Include images/catalog/details → owner check → ReadStoredResult.
- Có snapshot: deserialize kết quả gốc; legacy NULL: MapToResultDto từ catalog, HasHistoricalSnapshot=false. ProjectImages ẩn URL hết hạn/DeletedAt; trả 200 DTO.
- Lỗi: guest/JWT/claim sai →401; record thiếu hoặc sai owner →404; JSON snapshot sai cú pháp/không deserialize được gây JsonException/NotSupportedException →500; deserialize ra null gây InvalidOperationException →400; request lỗi hiển thị lỗi UI.
- Hậu điều kiện: chỉ đọc, không sửa DB; chưa ACL ảnh storage riêng tư đầy đủ. Confidence UI hiển thị %.
- BFD/data: F3.1; D2 images/snapshot + D3 catalog đọc qua Includes, đặc biệt legacy. Activity result, Sequence history.

### Nhánh: Xem lịch sử

- Actor/input: user JWT + pageNumber/pageSize; web đã vào app.
- Luồng chính: web trang 1/100 → controller → page/size dương → count/list theo UserId, sort/page/Includes → snapshot hoặc catalog legacy, ẩn URL hết hạn →200 PagedResult.
- Lỗi: JWT/claim sai →401; page/size <1 →400; lỗi load web ghi warning. Nhánh guest browser có code nhưng chưa vào được UI.
- Hậu điều kiện: không sửa DB; không nhập history guest vào tài khoản; UI phân trang/expiry chưa đầy đủ.
- BFD/data: F3.2; D2/D3; R07/R10. Activity/Sequence history.

## UC-07 — Xóa kết quả

- Actor/input: owner hoặc Admin với JWT/ID; thao tác web yêu cầu đã vào ứng dụng.
- Trigger: xác nhận xóa ở UI; DELETE `/api/predictions/{id}` đối với phiên server.
- Tiền điều kiện server: JWT hợp lệ, record tồn tại, owner khớp hoặc role Admin.
- Luồng chính: tải record → kiểm quyền → DeleteImageAsync cho các ID chưa DeletedAt và legacy ID distinct → kiểm bool true → DeleteAsync/SaveChanges → cascade details/images → 204 → UI loại record khỏi state.
- Thay thế/lỗi: nhánh xóa guest state/localStorage tồn tại trong code nhưng không truy cập được từ UI hiện tại. Record không có →404; sai owner →401 theo middleware; token sai →401; role Admin được xóa record khác; bool xóa ảnh false →400 và giữ history; exception storage chặn DB delete; lỗi DB có thể xảy ra sau ảnh đã xóa. Không có distributed transaction được khảo sát.
- Hậu điều kiện thành công server: prediction/details/images xóa sau storage thành công; lỗi DB sau xóa storage có thể để history còn nhưng ảnh đã mất.
- BFD/data/rules: F3.3; D2/D5 và Cloudinary; R08/R10. Activity history, sequence delete.

## UC-08 — Tra cứu cây/bệnh

- Actor/input: khách/user/admin; list, ID, includeInactive tại API.
- Tiền điều kiện API: không đòi JWT; màn hình tra cứu trên web yêu cầu đã đăng nhập và vào ứng dụng.
- Luồng chính: GET `/api/plants` hoặc `/api/diseases` → service/repository → DTO; GET `/{id}` trả chi tiết.
- Thay thế: ID không có →404; list mặc định active; API cho includeInactive không có Admin guard trong GET; web dùng dữ liệu plantData tĩnh nếu load API thất bại.
- Hậu điều kiện: không sửa dữ liệu; trường treatment/prevention là danh mục, không chứng minh recommender thuốc theo giai đoạn.
- BFD/data: F4.1; D3. Không include prediction vì người dùng có thể đọc độc lập.

## UC-09 — Quản lý danh mục

### Nhánh: Tạo danh mục

- Actor/input: Admin; CreatePlantRequest hoặc CreateDiseaseRequest, POST API tương ứng.
- Tiền điều kiện: JWT có role Admin; tên không xung đột unique DB cho luồng thành công.
- Luồng chính: role check → service tạo entity IsActive=true/CreatedAt → repository lưu → 201 DTO/Location.
- Lỗi: thiếu/sai token →401; non-admin →403 tại authorization; duplicate/DB constraint error → middleware, thường 500 nếu không chuyển exception. Không khẳng định validator đã chạy.
- Hậu điều kiện: plants hoặc diseases có record mới; không tự tạo plant_diseases/class_index.
- BFD/data: F4.2; D3; R09. API có code, chưa thấy UI quản trị.

### Nhánh: Sửa danh mục

- Actor/input: Admin; ID và UpdatePlantRequest/UpdateDiseaseRequest, PUT `/{id}`.
- Tiền điều kiện: authorization Admin, record tồn tại.
- Luồng chính: tải record → cập nhật fields và IsActive → UpdatedAt UTC → SaveChanges →200 DTO.
- Lỗi: ID không có →404; 401/403 auth; constraint error theo middleware.
- Hậu điều kiện: metadata/IsActive đổi, không tự remap label/checkpoint.
- BFD/data: F4.3; D3; R09. Không có class cấu hình tự tạo.

### Nhánh: Xóa danh mục

- Actor/input: Admin; ID, DELETE cây/bệnh `/{id}`.
- Tiền điều kiện: record tồn tại và quyền Admin; DELETE là soft-delete, không xóa vật lý record.
- Luồng chính: tải record → DeleteAsync đặt IsActive=false/UpdatedAt → SaveChanges →204.
- Lỗi: không có →404; DB update lỗi → middleware theo loại lỗi; auth →401/403.
- Hậu điều kiện: record giữ trong DB với IsActive=false; không cascade lịch sử hoặc xóa mapping. Không khẳng định có popup quản trị khi chưa có UI.
- BFD/data: F4.4; D3; R09.

## UC-10 — Vận hành và kiểm tra dịch vụ

- Actor/input: người vận hành; health DB/AI hoặc lệnh riêng --migrate/--expire-images.
- Tiền điều kiện health HTTP: API đang nhận request, không đòi JWT. Lệnh CLI không mở HTTP; cần cấu hình backend/DB hợp lệ, PostgreSQL hoạt động; expiry còn cần schema hiện tại và cấu hình storage phù hợp.
- Luồng DB: CanConnectAsync →200 Healthy hoặc 503 Degraded, checks.Database.
- Luồng AI: HTTP GET baseURL `/health`, timeout 3 giây →200 Healthy hoặc 503 Degraded, checks.AiService.
- Hậu điều kiện: không gọi `/predict`, không tạo prediction. Healthy không chứng minh model được load hoặc phân loại đúng.
- Lệnh migration: áp dụng pending migrations và seed demo chỉ Development, thoát; startup thường không migration. Lệnh expiry: đọc ảnh hết hạn, xóa storage, clear references/DeletedAt, giữ history/snapshot; lỗi có thể retry và exit 1, chưa scheduler.
- BFD/data/rules: F5.1–F5.4; P7 health/P8 vận hành; D6 migration history/schema, D1/D3 seed Development, D2 metadata và D5/Cloudinary; R10–R12.

## Quy tắc quan hệ UML

Use Case diagram có đúng 10 mục tiêu nghiệp vụ. Association nối actor với mục tiêu; Admin kế thừa User và User kế thừa quyền API công khai của Khách. Không vẽ include/extend vì các bước nội bộ không được tách thành Use Case và không có mục tiêu mở rộng độc lập cần biểu diễn. Đăng nhập là tiền điều kiện của chức năng protected. UC-03 gồm đọc/restore và sửa hồ sơ UI; UC-06 gồm detail/history cần JWT và owner; khách chỉ xem DTO của POST trong UC-05; UC-09 chỉ Admin tạo/sửa/xóa danh mục. Các nhánh có điều kiện truy cập riêng trong đặc tả, không suy ra khách được xem lịch sử hoặc quản trị.

## Đối chiếu Use Case mục tiêu sau phỏng vấn

| Story mục tiêu | Use Case hiện trạng liên quan | Hành vi mục tiêu và khoảng trống |
|---|---|---|
| US-01 | UC-05 | Khách và user gửi một/nhiều ảnh; validation tổng lượt, nhận biết ngoài phạm vi, tổng hợp theo AC nguồn. UI và contract hiện một ảnh phải đổi. |
| US-02/03 | UC-06/UC-08 | Kết quả/cảnh báo/quyền thuốc/nội dung kiểm duyệt theo story; source hiện tại chưa chứng minh đáp ứng. |
| US-04 | UC-01 | Email tạo trạng thái chưa xác minh, gửi mã, xác minh trước quyền được chọn; không dùng luồng trả JWT ngay như bằng chứng xác minh email. |
| US-05 | UC-02 | Bổ sung Google; kiểm tra trạng thái email theo lựa chọn còn mở và giới hạn sai sau khi duyệt thông số. |
| US-06 | Chưa có UC runtime tương ứng | Gửi mã đặt lại, kiểm hiệu lực, cập nhật hash; thiết kế contract/data theo sổ quyết định. |
| US-07 | UC-04 | Kết thúc phiên web; thu hồi token server là đề xuất, source hiện chỉ xóa browser session. |
| US-08 | UC-06 | Tự lưu lượt của tài khoản cùng mọi ảnh/snapshot; web phải điều hướng phân trang. Schema đã có prediction_images/snapshot; API vẫn một ảnh, legacy dùng catalog và UI phân trang chưa đủ. |
| US-09 | UC-07 | Xóa bản ghi của mình; giữ cleanup hết hạn theo AC nguồn. Xác nhận/xóa ảnh ngay/lỗi một phần vẫn là đề xuất cần thiết kế. |

Tiền điều kiện mục tiêu: dự đoán không đòi phiên; lịch sử/xóa cần phiên và owner. Các thông số chưa chốt dùng trạng thái đề xuất ở story, không sao chép số mẫu sang contract production. Xem [thiết kế mục tiêu](../../system_design_diagrams.md#2-thiết-kế-mục-tiêu--không-phải-hiện-trạng-agri-76) và [AC nguồn](../../notebooks/user_stories_overview_nguyen_pham_bao_khanh_2026-10-05.md).
