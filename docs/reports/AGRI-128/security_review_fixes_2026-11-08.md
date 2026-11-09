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

## CI follow-up 2026-11-08

Hai test `KnowledgeMedicineTests` fail vì logic public medicine đã yêu cầu `ConditionType == Disease` ở cấp medicine. Điều này loại nhầm fixture liên kết active nhưng chưa phân loại (`Unknown`). Đã sửa để cấp medicine chỉ yêu cầu liên kết active; condition `Disease` vẫn kiểm soát các use được expose và recommendation.

- Build: 0 warning / 0 error.
- Local targeted API run: blocked at Testcontainers setup because Docker daemon is unavailable.

## CI follow-up 2026-11-08 (second regression)

`Relations_ShouldRejectUnknownPairs_AndPublishSavedUses` yêu cầu use legacy với `ConditionType=Unknown` vẫn xuất hiện public. Predicate map/filter đã cho phép `Disease` hoặc `Unknown`; các loại `Healthy` và `NutrientDeficiency` tiếp tục bị ẩn, còn recommendation chỉ nhận `Disease`.

## CI follow-up 2026-11-08 (third regression)

Sau khi xóa use cuối cùng, test vẫn gọi GET medicine public và kỳ vọng `200` với danh sách use rỗng. Detail service đã cho phép medicine active/public không có use; các medicine có use vẫn phải có ít nhất một quan hệ active. Public list không thay đổi.

## Review P1 follow-up — 2026-11-09

Đã sửa SMTP failure của password reset bằng cách xóa token pending sau lỗi gửi; retry tiếp theo không còn bị throttle bởi token chết. Thêm HTTP tests cho resend setup/login 2FA và negative/expired reset. README AGRI-132 đã đồng bộ policy hiện tại.

Verification: build solution 0 warning/0 error; unit 228/228; `git diff --check` pass. API test execution remains Docker-blocked locally.

- Resend 2FA nay consume challenge cũ sau khi phát hành challenge mới, nên code cũ không thể verify lại; test HTTP xác nhận setup/login resend, challenge mới và replay challenge cũ đều bị từ chối.

## CI follow-up — 2026-11-09

Sửa test isolation cho SMTP failure bằng recipient-specific fault injection; tránh làm nhiễu các test auth chạy song song. Bổ sung mapping manifest cho `auth.password_reset.negative` và `auth.two_factor.resend`.

Verification: solution build sạch, unit 228/228, manifest 5/5. Cần chờ GitHub Actions xác nhận full API suite.

## CI follow-up — rate-limit isolation 2026-11-09

Bốn test auth fail đồng thời do fixed-window account challenge limiter hardcode 20/phút theo IP dùng chung của GitHub runner. Đã cấu hình limit qua `TrafficLimits:AccountChallengesPerMinute`, giữ default production 20 và nâng riêng Testcontainers fixture lên 10000.

## CI follow-up — test environment limiter 2026-11-09

Run #115 vẫn fail bốn auth tests dù đã thêm config fixture; policy được tạo sớm nên cấu hình UseSetting không ổn định ở CI. Đã thêm guard theo environment Testing để budget account challenge tối thiểu 10000, không thay đổi production default.

## CI follow-up — deterministic reset negative test 2026-11-09

Test negative reset được làm deterministic: mã sai luôn khác mã thật và chỉ token của user test bị expire. Tránh collision ngẫu nhiên và cập nhật nhầm token của test song song.

## Database expiry constraint follow-up — 2026-11-09

CI failure was reproduced locally with Docker/Testcontainers. The failing fixture updated only `expires_at` while `created_at` remained later than the new expiry, violating PostgreSQL `ck_user_action_tokens_expiry` (`expires_at > created_at`). The test now updates both timestamps so `created_at < expires_at` while keeping the token expired. This is a test-fixture/database-constraint issue, not a missing real token or GitHub environment issue.

Fresh verification: solution build 0 warning/0 error; targeted reset test 1/1; unit tests 228/228; full API coverage suite 293/293; `git diff --check` passed.
