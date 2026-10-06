# Hướng dẫn chạy AgriVision bằng Docker

Hướng dẫn dùng PowerShell tại thư mục gốc repository. Cấu hình nguồn:
[Compose](../../docker-compose.yml), [Compose CI](../../docker-compose.ci.yml)
và [biến môi trường mẫu](../../.env.example).

## 1. Chuẩn bị

- Cài và mở Docker Desktop, sử dụng Linux containers.
- Chờ Docker Engine chạy, rồi kiểm tra:

```powershell
docker version
docker compose version
```

`docker version` cần hiển thị cả Client và Server. Compose cần hỗ trợ tùy chọn
`--wait`. Máy không cần cài Node.js hoặc .NET SDK để chạy stack này; Dockerfile
sẽ build frontend và backend. Lần build đầu cần mạng để tải image và dependency.

Mở terminal tại thư mục chứa `docker-compose.yml`:

```powershell
Set-Location "D:\coding for Future\Project 1\AgriAI"
```

Thay đường dẫn trên nếu clone repository ở nơi khác.

## 2. Tạo cấu hình local

Chỉ tạo `.env` nếu chưa có để giữ cấu hình đang dùng:

```powershell
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
notepad .env
```

Điền `POSTGRES_PASSWORD` và `JWT_SECRET`. JWT secret phải có ít nhất 32 byte
UTF-8; có thể tạo chuỗi ngẫu nhiên bằng PowerShell rồi dán vào `.env`:

```powershell
$jwtBytes = New-Object byte[] 32
$jwtRng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
$jwtRng.GetBytes($jwtBytes)
[Convert]::ToBase64String($jwtBytes)
$jwtRng.Dispose()
```

| Biến | Cách dùng |
|---|---|
| `POSTGRES_PASSWORD` | Mật khẩu PostgreSQL local, bắt buộc điền. |
| `JWT_SECRET` | Secret ký token, bắt buộc điền. |
| `POSTGRES_HOST_PORT` | Cổng DB trên máy, mặc định `5432`. |
| `API_HOST_PORT` | Cổng API trên máy, mặc định `5080`. |
| `FRONTEND_HOST_PORT` | Cổng web trên máy, mặc định `3000`. |
| `AI_SERVICE_URL` | Mặc định `http://host.docker.internal:8000`, trỏ từ container đến AI chạy trên máy. |
| `AI_TIMEOUT_SECONDS` | Timeout gọi dự đoán, mặc định `15` giây. |
| `CLOUDINARY_*` | Tùy chọn; bỏ trống để dùng lưu ảnh local trong volume `uploads`. |

Không commit `.env`. Các lệnh kiểm tra bên dưới dùng cổng mặc định; nếu đổi cổng,
thay URL tương ứng.

## 3. Khởi động web, API và PostgreSQL

```powershell
docker compose config --quiet
docker compose build
docker compose up -d --wait postgres
docker compose run --rm --no-deps backend --migrate
docker compose up --detach --wait --wait-timeout 180
docker compose ps
```

Chỉ chạy lệnh `up` khi kiểm tra cấu hình thành công. `--build` build image ứng
dụng; `--detach` chạy nền; `--wait` chờ dịch vụ running/healthy. Thời gian chờ
health không bao gồm toàn bộ thời gian build lần đầu.

Chỉ tiếp tục bước sau khi bước trước thành công. Migration chạy bằng lệnh riêng,
không mở HTTP server. Backend startup chỉ kiểm tra migration còn thiếu; nếu thiếu
thì thoát và hướng dẫn chạy `--migrate`. Frontend chờ backend healthy.
API chạy ở `Production`; migration không seed tài khoản hoặc danh mục demo cũ.
Database ứng dụng mới cần import danh mục theo mapping đã chốt trước khi dự đoán.
Ở `Development`, lệnh migration riêng mới seed danh mục minh họa và tài khoản
demo nếu có đủ cấu hình mật khẩu. Bộ seed này chưa phải mapping 59 lớp.
Sao lưu database đang có trước migration mới; xem [quy trình chi tiết](database_migrations.md).

| Dịch vụ | Địa chỉ mặc định |
|---|---|
| Web | <http://localhost:3000> |
| API | <http://localhost:5080> |
| PostgreSQL | `127.0.0.1:5432`, database `agrivision_db`, user `agrivision_user` |

Swagger UI có tại `http://localhost:5080/swagger`. Nếu `.env` đổi `FRONTEND_HOST_PORT` hoặc
`API_HOST_PORT`, dùng cổng tương ứng trong các URL trên. Compose bật Swagger riêng cho
backend chạy local mà không đổi `ASPNETCORE_ENVIRONMENT` khỏi `Production`.

Trình duyệt gọi `/api/*` qua Next.js, được proxy đến `http://backend:8080`
trong mạng Docker. PostgreSQL chỉ mở cổng trên loopback của máy.

## 4. Kiểm tra sau khi chạy

```powershell
docker compose ps
Invoke-RestMethod http://localhost:5080/api/health
(Invoke-WebRequest http://localhost:3000 -UseBasicParsing).StatusCode
Invoke-RestMethod http://localhost:5080/api/health/deps
```

- Các container cần có trạng thái `healthy`.
- `/api/health` trả `status: Healthy` và database `Healthy` khi API kết nối DB được.
- Trang web cần trả HTTP `200`.
- `/api/health/deps` kiểm tra AI riêng; trả HTTP `503` nếu AI chưa chạy hoặc không truy cập được.

**Compose gốc không khởi động FastAPI hoặc nạp checkpoint.** Web/API/DB vẫn
khởi động khi chưa có AI vì health của API chỉ kiểm tra DB. Muốn dự đoán thật,
cần chạy inference service riêng, cung cấp `/health` và `/predict`, rồi đặt
`AI_SERVICE_URL` phù hợp. AI trên host cần lắng nghe ở địa chỉ container truy
cập được, thường là `0.0.0.0:8000`. Repository hiện chưa có entrypoint FastAPI
để hướng dẫn một lệnh khởi động inference hoàn chỉnh.

Health AI thành công chỉ xác nhận endpoint phản hồi; cần kiểm tra ảnh qua
model thật để xác nhận inference. Khi AI không khả dụng, endpoint dự đoán trả
503; response AI sai hợp đồng trả 502.

## 5. Chạy Docker smoke với AI mock

Smoke kiểm tra container khởi động, web/API/DB và đường gọi health AI. Mock
chỉ cung cấp `/health`, không có `/predict` và không chạy ConvNeXt-Tiny.

Nếu stack ở bước 3 đang chạy, dừng stack đó trước để giải phóng cổng:

```powershell
docker compose down
```

Chạy smoke với project riêng để tách container và volume:

```powershell
docker compose -p agrivision-smoke -f docker-compose.yml -f docker-compose.ci.yml config --quiet
docker compose -p agrivision-smoke -f docker-compose.yml -f docker-compose.ci.yml up --build --detach --wait --wait-timeout 180
docker compose -p agrivision-smoke -f docker-compose.yml -f docker-compose.ci.yml ps
Invoke-RestMethod http://localhost:5080/api/health
Invoke-RestMethod http://localhost:5080/api/health/deps
(Invoke-WebRequest http://localhost:3000 -UseBasicParsing).StatusCode
```

Cả hai endpoint health cần trả `Healthy`, trang web trả HTTP `200`. Kết quả
này xác nhận smoke, không xác nhận độ chính xác hoặc inference của model.

Xem log và dừng bằng đúng project cùng các file Compose đã dùng:

```powershell
docker compose -p agrivision-smoke -f docker-compose.yml -f docker-compose.ci.yml logs --tail 100
docker compose -p agrivision-smoke -f docker-compose.yml -f docker-compose.ci.yml down
```

Tên project riêng không tách cổng host. Muốn chạy hai stack cùng lúc, cần chọn
cổng host khác cho từng stack.

## 6. Các lệnh dùng hằng ngày

Các lệnh sau áp dụng cho stack Compose gốc:

```powershell
# Chạy lại, dùng image đã build
docker compose up --detach --wait --wait-timeout 180

# Build và chạy lại sau khi đổi code frontend/backend
docker compose build
docker compose run --rm --no-deps backend --migrate
docker compose up --detach --wait --wait-timeout 180

# Kiểm thử API/database thật và tự dọn dữ liệu thử
powershell -NoProfile -File .agents/commands/verify_database.ps1

# Dọn ảnh hết hạn, giữ lịch sử và snapshot; lịch chạy tự động chưa cấu hình
docker compose run --rm --no-deps backend --expire-images

# Xem log gần nhất
docker compose logs --tail 100 backend frontend postgres

# Theo dõi log API; Ctrl+C để thoát theo dõi
docker compose logs --follow backend

# Tạm dừng rồi chạy lại các container hiện có
docker compose stop
docker compose start

# Dừng và xóa container/network, giữ dữ liệu volume
docker compose down

# Chỉ chạy PostgreSQL để phát triển backend ngoài Docker
docker compose up -d postgres
```

`postgres_data` giữ DB, `uploads` giữ ảnh local. Không thêm `-v` vào `down` nếu
cần giữ dữ liệu: tùy chọn đó xóa cả volume của stack. Chạy riêng PostgreSQL
vẫn cần `.env` hợp lệ vì Compose đọc cấu hình toàn stack.

## 7. Xử lý lỗi thường gặp

| Hiện tượng | Cách kiểm tra và xử lý |
|---|---|
| Không kết nối Docker Engine, lỗi named pipe | Mở Docker Desktop; kiểm tra `docker version` có Server. Nếu báo `Access is denied`, kiểm tra quyền truy cập Docker của tài khoản Windows. |
| `Set POSTGRES_PASSWORD` / `Set JWT_SECRET` | Điền giá trị trong `.env` tại root, chạy lại `docker compose config --quiet`. |
| Cổng đã được sử dụng | Dừng stack chiếm cổng hoặc đổi biến `*_HOST_PORT` trong `.env`, rồi chạy lại `up`. |
| Backend unhealthy hoặc thoát | Xem `docker compose logs --tail 100 backend postgres`; kiểm tra secret JWT, kết nối DB và migration. |
| Đổi mật khẩu `.env` nhưng DB từ chối | PostgreSQL sẽ `unhealthy` vì health check thử đăng nhập TCP bằng mật khẩu từ `.env`. Volume cũ giữ mật khẩu cũ; `POSTGRES_PASSWORD` chỉ khởi tạo DB khi volume mới. Dùng cấu hình đúng của DB hiện có hoặc đổi mật khẩu trong DB có chủ đích; không xóa volume để sửa lỗi nếu cần giữ dữ liệu. |
| `/api/health` tốt nhưng `/api/health/deps` trả 503 | Kiểm tra AI service, `/health` và `AI_SERVICE_URL`; `localhost` trong backend container trỏ về chính container đó. |
| Smoke healthy nhưng dự đoán lỗi | AI mock không hỗ trợ dự đoán. Chạy stack gốc và kết nối inference service thật. |
| `up --wait` hết thời gian | Xem `docker compose ps` và log của dịch vụ chưa healthy trước khi tăng thời gian chờ. |

Xem thêm [Docker và pipeline CI](docker_pipeline.md) để hiểu phạm vi kiểm tra
tự động. Tài liệu này mô tả cách chạy theo cấu hình nguồn; không phải báo cáo
một lần smoke hoặc inference đã được kiểm chứng.
