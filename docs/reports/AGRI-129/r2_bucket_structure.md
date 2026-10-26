# AGRI-129 — Cấu trúc bucket R2 theo người dùng

Cập nhật 2026-10-23: **đã triển khai và kiểm R2 thật** với bucket `agrivision-images-dev`, key đúng thiết kế bên dưới. [Bằng chứng nghiệm thu](security_remediation.md). Mục hiện trạng/checklist ngày 20/10 bên dưới được giữ như hồ sơ thiết kế lịch sử.

# AGRI-140 — Cấu trúc bucket R2 theo người dùng

- Ngày: 2026-10-20. Jira key AGRI-140 theo xác nhận trực tiếp của người dùng.
- Nhánh kiểm tra: `main`; không tạo nhánh, commit hoặc thay đổi tài khoản Cloudflare.
- **DoD báo cáo thiết kế: hoàn tất. Triển khai prefix theo user: chưa hoàn tất.**
- Bucket local do người dùng cung cấp: `agrivision-images-dev`; chưa xác minh
  nội dung, quyền public/private hoặc credential trên tài khoản thật trong lượt này.
- [Báo cáo tổng](README.md), [tích hợp R2 hiện có](r2_storage.md).

## 1. Mục tiêu và phạm vi

Mỗi người dùng có một vùng ảnh riêng theo user ID trong cùng bucket private.
Backend quản lý toàn bộ object và kiểm quyền truy cập. Dùng một bucket cho mỗi môi
trường; production dùng bucket và credential riêng, tên thực tế chọn lúc triển khai.
Không tạo bucket/token riêng cho từng tài khoản ứng dụng ở quy mô hiện tại.

R2 lưu object trong không gian key phẳng. Ký tự `/` nhóm key theo prefix để Dashboard
hiển thị như thư mục; không phải thư mục filesystem hay tài nguyên có ACL riêng.
Thư mục user xuất hiện khi có ảnh đầu tiên, không cần tạo lúc đăng ký tài khoản.
Nguồn: [Cloudflare objects và prefixes](https://developers.cloudflare.com/r2/objects/).

## 2. Cấu trúc đề xuất

```text
agrivision-images-dev/              # bucket private cho local/dev
└── users/
    ├── {userId-A}/
    │   └── predictions/
    │       ├── {predictionId-1}/
    │       │   ├── {imageId-1}.jpg
    │       │   └── {imageId-2}.png
    │       └── {predictionId-2}/
    │           └── {imageId-3}.jpg
    └── {userId-B}/
        └── predictions/
            └── {predictionId-3}/
                └── {imageId-4}.jpg
```

Object key chuẩn:

```text
users/{userId}/predictions/{predictionId}/{imageId}.{extension}
```

| Thành phần | Quy tắc |
|---|---|
| `userId` | ID tài khoản đã xác thực, backend lấy từ JWT; không lấy owner tùy ý từ request |
| `predictionId` | ID prediction backend đã tạo và gắn với user trước khi upload |
| `imageId` | ID bản ghi prediction_images, tạo trước upload; duy nhất cho từng ảnh |
| Định dạng ID | UUID hiện hành của dự án, dạng `D` lowercase có dấu gạch ngang; không đổi generator/UUID version |
| Extension | Giá trị `jpg`, `jpeg` hoặc `png`, không gồm dấu chấm; chuẩn hóa theo file đã được backend/AI kiểm tra, không dùng nguyên tên file gốc |
| Database | Lưu đầy đủ object key trong field `ImagePublicId` hiện có; không lưu presigned URL hết hạn làm địa chỉ cố định |

Không đưa email, họ tên, tên bệnh, confidence hoặc ngày vào key. Các dữ liệu này
đã có trong DB; đổi danh mục/thông tin người dùng không làm đổi vị trí ảnh.
Không chia thư mục theo hồ sơ nông nghiệp vì hồ sơ tùy chọn: gỡ/xóa hồ sơ phải giữ
prediction, ảnh còn hạn và snapshot. Cấu trúc minh họa nhiều ảnh không xác nhận
workflow upload nhiều ảnh đã được triển khai hoặc nghiệm thu.

## 3. Quyền truy cập và phân chia dữ liệu

- Bucket ảnh private; tắt public development URL và custom domain public cho bucket.
  Credential R2 chỉ ở backend, giới hạn bucket; không cấp cho trình duyệt.
- Prefix user chỉ phục vụ tổ chức dữ liệu. Ranh giới quyền là xác thực và kiểm owner
  của prediction trong DB, không phải việc biết hoặc đoán được object key.
- Khi đọc/xóa: tìm prediction và image trong DB, kiểm image thuộc prediction,
  quyền thao tác và hạn ảnh, rồi dùng đúng key đã lưu. Không nhận raw object key
  tùy ý từ client. Với key mới, kiểm các ID trong key khớp metadata trước gọi storage.
- Giữ endpoint ảnh `GET /api/predictions/{id}/images/{imageId}` có JWT, kiểm owner,
  no-store/nosniff; frontend fetch bằng JWT rồi hiển thị blob như tích hợp hiện tại.
  Không cần CORS R2 vì trình duyệt không gọi R2 trực tiếp.
- Quyền hiện hành: đọc ảnh chỉ owner; xóa history theo owner/Admin đã có. Prefix mới
  không mở thêm quyền Admin. Guest không upload R2 hoặc tạo kho ảnh lâu dài.
- Backup nếu dùng R2 thì dùng bucket/credential riêng, không đặt dump DB trong
  `users/`. Lượt này không tạo bucket backup, quota người dùng hoặc tính năng quản lý file.

## 4. Luồng upload, đọc và cleanup

1. Backend xác định owner từ JWT, kiểm file và kết quả AI/mapping như hiện tại.
2. Tạo `predictionId` và `imageId`; truyền ngữ cảnh có kiểu rõ ràng gồm các ID vào
   storage. Storage dựng key chuẩn từ ID đáng tin cậy; không để client chọn prefix.
3. Upload object, nhận key; ghi prediction/image/expiry/snapshot theo luồng hiện có.
   Nếu lưu DB lỗi, cố xóa đúng object vừa upload và ghi lỗi cleanup để xử lý.
4. Đọc ảnh qua API kiểm quyền/expiry; danh sách history lấy từ DB, không LIST bucket
   để xác định quyền hoặc thay thế phân trang lịch sử.
5. Ảnh hết hạn theo `ExpiresAt` sau 30 ngày; API chặn đọc ngay khi hết hạn dù object
   chưa bị xóa vật lý. `--expire-images` xóa theo key DB, đánh dấu metadata, giữ snapshot/history.
6. Xóa object không còn tồn tại là idempotent; provider lỗi thì giữ metadata để retry.
   Lệnh cleanup chạy theo lịch vận hành riêng chưa được cấu hình trong lượt này.

Chưa bật lifecycle xóa toàn prefix `users/` hoặc dùng tuổi object thay `ExpiresAt`.
Copy ảnh sang key mới có thể đổi mốc tuổi object trong khi expiry DB phải giữ nguyên.
Không tự xóa toàn prefix khi gỡ hồ sơ, khóa tài khoản hoặc thay role. Chính sách xóa
tài khoản/toàn bộ dữ liệu cần quyết định riêng trước khi thực hiện thao tác hàng loạt.

## 5. Hiện trạng và phần phải sửa khi triển khai

Đối chiếu source ngày 2026-10-20:

| Source | Hiện tại | Cần thay để áp dụng thiết kế |
|---|---|---|
| [IImageStorage](../../../backend/src/AgriVision.Application/Common/Interfaces/Services/IImageStorage.cs) | Upload nhận stream/fileName | Thêm ngữ cảnh owner/prediction/image ID, cập nhật mọi caller/fake/test |
| [R2ImageStorage](../../../backend/src/AgriVision.Infrastructure/Services/R2ImageStorage.cs) | Tạo key `r2/predictions/{uuid}.{ext}`; kiểm prefix cũ | Tạo key `users/...`; validate key mới, tiếp tục hỗ trợ đúng key R2 cũ đã lưu |
| [PredictionService](../../../backend/src/AgriVision.Application/Services/Implementations/PredictionService.cs) | Prediction ID có trước upload, image ID tạo sau; read/project kiểm prefix cũ | Tạo image ID trước upload; truyền ID; cập nhật read/project/delete không ẩn ảnh R2 cũ |
| [ImageExpiryCleanup](../../../backend/src/AgriVision.Infrastructure/Persistence/ImageExpiryCleanup.cs) | Xóa bằng ImagePublicId từ DB | Tiếp tục xóa đúng key đã lưu cho cả hai dạng; không suy lại key mới cho object cũ |
| [Controller](../../../backend/src/AgriVision.API/Controllers/PredictionsController.cs) và [PrivateImage](../../../frontend/src/components/common/PrivateImage.tsx) | URL API kiểm quyền và frontend JWT/blob | Giữ URL/contract; thay cách tổ chức object không yêu cầu public URL mới |

DB tiếp tục dùng field hiện có; không cần thêm bảng bucket-per-user hoặc rewrite
migration history chỉ để đổi prefix. Field `ImagePublicId` được tái sử dụng làm
object key, tên field API/DB giữ để tránh thay đổi contract không cần thiết.

## 6. Chuyển đổi dữ liệu

Ưu tiên áp dụng key mới cho ảnh upload sau thay đổi, giữ key R2 cũ hoạt động tới hết
hạn. Không bắt buộc di chuyển toàn bộ ảnh cũ chỉ để Dashboard nhìn đồng nhất.

Nếu cần chuyển object R2 cũ sang prefix user, làm trên fixture trước:

1. Backup metadata DB và danh sách object; xác định owner/prediction/image/expiry từ
   DB. Không suy owner từ tên ảnh; thiếu owner thì đưa vào danh sách xử lý riêng.
2. Copy object còn hạn sang key mới, kiểm bytes/checksum và đọc lại qua API.
3. Cập nhật các tham chiếu metadata liên quan nhất quán, giữ `ExpiresAt` và snapshot
   nghiệp vụ; ghi mapping old-key/new-key phục vụ đối soát và rollback.
4. Xác minh DB trỏ key tồn tại; chỉ xóa object nguồn sau quyết định vận hành và xác
   nhận có bản phục hồi. Chạy lại không tạo copy trùng hoặc làm mất ảnh.

Cloudinary/local là luồng chuyển provider riêng, không thể chỉ đổi key DB thành
`users/...` khi chưa upload bytes lên R2. Xem [hướng dẫn legacy](r2_storage.md).
Lượt báo cáo này không copy/xóa object hoặc sửa dữ liệu DB nào.

## 7. Checklist nghiệm thu triển khai sau này

- [ ] Hai user upload tạo hai prefix owner khác nhau; key khớp ID trong DB.
- [ ] File trùng tên không ghi đè; extension sai/tên có path không điều khiển object key.
- [ ] JWT/user ID giả hoặc truy cập chéo prediction/image bị từ chối trước storage.
- [ ] Guest không upload cloud; storage/DB lỗi không báo thành công sai.
- [ ] Key R2 cũ còn đọc/xóa/cleanup được; legacy provider vẫn được xử lý riêng.
- [ ] Ảnh mới/cũ hết hạn bị chặn đọc; cleanup retry không xóa history/snapshot.
- [ ] DB write fail dọn đúng object; copy/migration có đối soát và thử lại an toàn.
- [ ] HTTP/frontend regression giữ URL API, no-store, JWT/blob và hành vi đổi phiên.
- [ ] Chạy thử bucket dev thật và kiểm private access; ghi kết quả riêng với unit/fake.

## 8. Kiểm chứng của lượt báo cáo

Đã đọc source upload/read/key và xác nhận vẫn dùng prefix cũ. Báo cáo này chỉ thiết
kế; không chạy lại app tests/build, cloud smoke, benchmark hoặc migration. Các test
đã ghi ở README của đợt trước không phải bằng chứng prefix theo user đã hoạt động.
Kiểm tra diff và liên kết local được ghi trong task log của lượt này.
