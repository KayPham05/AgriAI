## Cập nhật bảo mật và migration — 2026-10-23

Bản mới cần migration `PrivateImageUploadJournal`; backup và chạy riêng `--migrate` trước startup. Local đã áp dụng sau backup, không xóa volume. [Hướng dẫn giới hạn, journal, cleanup và kiểm chứng](security_remediation.md). Rate 10 prediction/phút, 60 image/phút, 10 auth/phút; concurrency chung 8; quota mặc định 100 ảnh/intents/user, 15 MiB/ảnh. `--expire-images` xử lý intent stale >1 giờ ngoài expiry thông thường; phải chạy theo lịch vận hành, chưa có scheduler tự động. Các ghi chú lịch sử bên dưới về không cần schema migration không áp dụng cho journal mới.

# AGRI-129 — Cấu hình R2 đang áp dụng

Cập nhật 2026-10-23. Bucket dev đúng là `agrivision-images-dev`; `.env` và `appsettings.Development.json` ignored đã đồng bộ, Signed HeadBucket HTTP 200. [Nghiệm thu mới](security_remediation.md) xác nhận upload/read/delete/expiry thật và Dashboard private. Các đoạn chưa nghiệm thu dưới đây là lịch sử ngày 20/10, đã được thay thế bởi kết quả mới.

Key mới: `users/{userId}/predictions/{predictionId}/{imageId}.{extension}`. Key `r2/predictions/...` cũ vẫn hỗ trợ đến expiry; user xác nhận không có ảnh Cloudinary cần migrate. Docker không còn mount uploads; volume cũ không bị xóa.

Đổi `.env` cần recreate backend, đổi code/dependency cần rebuild. Sau thay đổi hiện tại đã rebuild và khởi động local. Credential chỉ backend, không đưa vào Git/log/frontend.

# AGRI-140 — R2 private storage

Cập nhật 2026-10-20 theo lựa chọn trực tiếp của người dùng: thay Cloudinary bằng R2.
Source adapter/config/UI đã triển khai; chưa nghiệm thu tài khoản R2 hoặc cloud E2E.

## Cấu hình local

Thu hồi credential đã xuất hiện trong chat và tạo credential mới **Object Read & Write**
giới hạn đúng bucket. Không chép token/secret vào tài liệu, Git, frontend hoặc image.
Backend dùng Access Key ID/Secret Access Key; không dùng Token Value của Cloudflare.

Docker Compose đọc `.env` ở root (được Git ignore):

```dotenv
R2_SERVICE_URL=https://<ACCOUNT_ID>.r2.cloudflarestorage.com
R2_BUCKET_NAME=agrivision-images-dev
R2_ACCESS_KEY_ID=<NEW_ACCESS_KEY_ID>
R2_SECRET_ACCESS_KEY=<NEW_SECRET_ACCESS_KEY>
```

Endpoint/bucket đã được đặt vào `.env` local trong phiên; không ghi credential chat.
Thêm giá trị mới trực tiếp bằng editor. Không dùng `docker compose config` không cờ
quiet vì có thể in secret; validate bằng `docker compose config --quiet`.
Khi Docker đã chạy, rebuild/recreate riêng backend để nhận cấu hình/dependency mới:

```powershell
docker compose up -d --build --no-deps backend
```

Lệnh trên cần PostgreSQL/AI đang chạy và schema đã khớp; không tự migrate hoặc xóa
volume. Đợt này chưa chạy lệnh đó vì Docker engine không khả dụng. Frontend cũng cần
build/recreate khi chạy bản Docker để có phần tải ảnh JWT/blob mới.

Chạy .NET trực tiếp: dùng file ignored `backend/src/AgriVision.API/appsettings.Development.json`
theo [example](../../../backend/src/AgriVision.API/appsettings.Development.json.example),
section `R2` gồm `ServiceUrl`, `BucketName`, `AccessKeyId`, `SecretAccessKey`.
Endpoint/bucket local đã đặt, điền credential mới tại máy. `.env` của Compose không
tự nạp vào `dotnet run`; dùng Development profile hoặc biến môi trường `R2__...`.
Không đưa secret vào shell history. Chỉ có R2 adapter, không cần `Storage:Provider`.

Bucket giữ private, tắt public development URL/custom domain. Không cần Worker,
domain riêng hoặc CORS cho luồng server-to-server này. Chọn Standard để thử;
[billing R2](https://developers.cloudflare.com/r2/pricing/) riêng với Cloudflare Free.

## Hành vi và source

- [R2ImageStorage](../../../backend/src/AgriVision.Infrastructure/Services/R2ImageStorage.cs):
  upload/read/delete qua SDK S3 4.0.104.5; key UUID trong `r2/predictions/`, JPEG/PNG;
  lỗi provider được đổi thành thông báo storage 503, không fallback local.
- [DI](../../../backend/src/AgriVision.Infrastructure/DependencyInjection.cs) kiểm cấu
  hình khi storage được resolve: HTTPS R2 endpoint, bucket và credential không rỗng;
  không dùng credential AWS ambient. Health/migration không chứng minh kết nối R2.
- [PredictionService](../../../backend/src/AgriVision.Application/Services/Implementations/PredictionService.cs):
  chỉ user lưu ảnh; persist fail cố xóa object vừa upload. Giữ object key trong field
  `ImagePublicId` hiện có, không cần schema migration. DTO trả URL API; snapshot không
  giữ URL tạm. Endpoint đọc kiểm owner, image thuộc prediction, expiry/DeletedAt.
- [Controller](../../../backend/src/AgriVision.API/Controllers/PredictionsController.cs):
  `GET /api/predictions/{id}/images/{imageId}`, JWT bắt buộc, 404 khi không có quyền/
  hết hạn/không còn object, no-store và nosniff. Không cấp quyền đọc ảnh người khác cho Admin.
- [PrivateImage](../../../frontend/src/components/common/PrivateImage.tsx): tải ảnh có
  Bearer JWT/cache no-store, revoke blob và abort khi đổi phiên/unmount; dùng cho
  history/detail/report/ảnh gốc GradCam. Guest preview/asset công khai giữ luồng cũ.
- [Expiry CLI](../../../backend/src/AgriVision.Infrastructure/Persistence/ImageExpiryCleanup.cs)
  tiếp tục gọi storage delete; missing object idempotent, lỗi giữ metadata/retry.
  Chưa thêm scheduler. Uploads volume cũ giữ nguyên; API ngừng phục vụ static uploads.

## Dữ liệu legacy và vận hành

Ảnh Cloudinary/local cũ chưa tự chuyển: URL legacy được ẩn khi đọc history; metadata,
snapshot và bytes gốc không bị xóa. Read legacy trả 404; delete/expiry không gọi R2
để giả vờ xóa object legacy nên có thể báo lỗi giữ history để xử lý riêng.

Trước chuyển dữ liệu: backup DB và export ảnh nguồn cần giữ; chỉ chuyển ảnh còn hạn,
upload với key R2 mới; kiểm checksum/đọc ảnh rồi cập nhật các tham chiếu trong
prediction/prediction_images nhất quán. Không rewrite snapshot nghiệp vụ; DTO ảnh
được chiếu từ metadata hiện hành. Chỉ xóa nguồn sau khi đã xác minh và có quyết định
retention. Chưa tạo/chạy script chuyển dữ liệu hoặc sửa DB ứng dụng trong phiên này.

Sau khi điền credential mới, thử tài khoản thật trên bucket dev: upload một ảnh hợp
lệ qua API, xem history/ảnh, thử user B/guest, lỗi credential/provider và xóa fixture.
Đối chiếu object trong Dashboard; sau đó kiểm expiry trên fixture riêng. Không dùng
`--expire-images` như health check vì lệnh xóa ảnh hết hạn thật. Live smoke này chưa chạy.

Nguồn: [Cloudflare .NET](https://developers.cloudflare.com/r2/examples/aws/aws-sdk-net/),
[R2 credentials](https://developers.cloudflare.com/r2/api/tokens/). Không deploy/CD
trong thay đổi storage; giữ Cloudflare Free DNS/proxy/HTTPS của thiết kế VPS.
