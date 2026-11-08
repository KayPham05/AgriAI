# AGRI-128 — Security review fixes 2026-11-08

## Phạm vi

Đối chiếu các finding SEC-001 đến SEC-005 trong review PR #63 với `origin/AGRI-128-backend-improvement`, sau đó sửa code và thêm regression coverage.

## Đã sửa

- Reset mật khẩu thu hồi mọi session đang hoạt động; mã mới được hash theo ID token để tránh va chạm với unique index, đồng thời giữ tương thích token legacy còn hạn.
- Cho phép WEBP xuyên suốt image key, prediction upload và R2 read/write.
- Cô lập concurrency budget theo prediction/user hoặc IP; auth không còn dùng chung bucket và avatar dùng image policy.
- CORS dùng allow-list `Cors:AllowedOrigins`, mặc định local `http://localhost:3000`; Compose/.env.example đã có biến cấu hình.
- Knowledge và medicine public chỉ truy vấn/hiển thị khi có liên kết cây-bệnh active; medicine yêu cầu condition `Disease`.

## Kiểm chứng

- `dotnet restore backend/AgriVision.sln` — đạt.
- `dotnet build backend/AgriVision.sln --no-restore` — đạt, 0 warning/0 error.
- `dotnet test backend/tests/AgriVision.UnitTests/AgriVision.UnitTests.csproj --no-build --no-restore` — **228/228 đạt**.
- Regression API tests cho reset/session, CORS và limiter đã biên dịch; chạy local bị chặn khi Testcontainers không kết nối được Docker daemon (`npipe://./pipe/docker_engine`).
- `git diff --check` — đạt.

## Giới hạn còn lại

Cần để GitHub Actions chạy lại API/integration tests sau khi push vì môi trường local hiện không có Docker daemon hoạt động. Kết quả local không thay thế CI.
