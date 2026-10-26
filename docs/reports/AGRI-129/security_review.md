> Cập nhật sau remediation 2026-10-23: bốn finding dưới đây đã được xử lý và kiểm lại trong phạm vi local. Xem [remediation, review lại và bằng chứng mới](security_remediation.md). Nội dung bên dưới giữ nguyên như hồ sơ review trước sửa.

# AGRI-129 — Security review R2 và các luồng liên quan

Ngày: 2026-10-23; branch `AGRI-129-R2-storage-private`. Review working tree hiện tại, gồm WIP có sẵn; không sửa app/config/package, không commit/push/deploy.

## Kết luận

Có 4 vấn đề cần xử lý: dependency frontend có advisory nghiêm trọng, logout UI không revoke server session, thiếu giới hạn lạm dụng API tốn tài nguyên, và upload có thể để lại object ngoài DB khi kết quả ghi R2 không xác định. Chưa thấy bypass JWT/owner/expiry trong luồng ảnh đã đọc; không coi điều này là chứng nhận toàn hệ thống an toàn.

Skill: security-best-practices (TypeScript/React/Next.js), aspnet-core/security-and-identity (.NET không thuộc coverage của security-best-practices), qa-testing/security-testing và unit-testing, cùng ponytail. Ranh giới: static review + existing tests + local synthetic probe + dependency audits; không scanner chủ động, brute force, tải lớn hoặc exploit RCE trên app/cloud.

## 1. [P1 / High] Dependency frontend có advisory Critical; cần vá trước public deploy

- Vị trí: [package.json:34](../../../frontend/package.json#L34), [lockfile:3014](../../../frontend/pnpm-lock.yaml#L3014), [Dockerfile:13](../../../frontend/Dockerfile#L13).
- Bằng chứng: Next.js `16.3.6`, sharp `0.35.4`; runtime `node:24.15.0-bookworm-slim` là glibc. `corepack pnpm audit --prod --json` báo 12 advisory: 2 Critical, 4 High, 5 Moderate, 1 Low. Đây là kết quả dependency matching, không phải 12 exploit đã chứng minh.
- Advisory upstream [GHSA-2464-fhr4-w9xw](https://github.com/vercel/next.js/security/advisories/GHSA-2464-fhr4-w9xw) nêu khả năng RCE qua upstream image processing trên Linux glibc; vá Next 16.4.1 hoặc sharp >=0.35.5. Version và nền tảng hiện tại khớp điều kiện đã biết; chưa gửi payload hoặc chứng minh đường SVG khai thác được trên ứng dụng.
- [GHSA-673q-mjm6-r5xr](https://github.com/vercel/next.js/security/advisories/GHSA-673q-mjm6-r5xr) là advisory Critical khác, yêu cầu `use cache` trả nhiều typed arrays; chưa thấy tính năng này trong source, không khẳng định app khai thác được lỗi đó. Một số advisory khác cũng có điều kiện router/caching riêng.
- Ảnh R2 dùng PrivateImage `unoptimized` không loại bỏ Image Optimization API đang dùng bởi các ảnh public khác. Nếu exploit đạt điều kiện, có thể ảnh hưởng frontend container; credential R2 hiện chỉ backend, không mặc định coi bị lộ trực tiếp.
- Khắc phục đề xuất: nâng bản Next đã vá (ít nhất 16.4.1 theo advisory được đọc), xác minh lockfile thực sự resolve sharp >=0.35.5; rebuild image; chạy audit, frontend check/build và smoke ảnh. Không tự nâng package trong lượt review.

## 2. [P2 / Medium] Đăng xuất UI không thu hồi server session

- Vị trí: [AppProvider.tsx:270](../../../frontend/src/providers/AppProvider.tsx#L270), đối chiếu [AuthController.cs:48](../../../backend/src/AgriVision.API/Controllers/AuthController.cs#L48) và [JwtTokenGenerator.cs:30](../../../backend/src/AgriVision.Infrastructure/Authentication/JwtTokenGenerator.cs#L30).
- Bằng chứng: callback `logout` gọi `clearAuthSession()`, reset state/router, không gọi `POST /api/auth/logout`. Backend endpoint revoke sid đã có và middleware kiểm `RevokedAt`; đường UI không kích hoạt nó.
- Tác động: logout trên màn hình không vô hiệu hóa bản sao bearer JWT; ai đã có token vẫn có thể đọc/xóa ảnh của owner cho đến expiry/revoke. JWT mặc định 1440 phút, server session 7 ngày; thời hạn thực tế còn tùy config và token còn hạn, không mặc định nói token luôn sống 7 ngày.
- Đây là lỗi luồng auth có sẵn, không do đổi prefix. Smoke trước chỉ chứng minh gỡ phiên UI/ảnh blob, chưa chứng minh revoke phía server.
- Khắc phục đề xuất: thêm client logout gọi endpoint bằng token hiện tại, thiết kế xử lý network failure rõ ràng, dọn state local trong finally. Test UI logout phải assert có request revoke, rồi thử lại token cũ qua HTTP phải nhận 401; không revoke session thiết bị khác.

## 3. [P2 / Medium] Chưa có rate/concurrency/quota cho inference và tải ảnh R2

- Vị trí: [PredictionsController.cs:23](../../../backend/src/AgriVision.API/Controllers/PredictionsController.cs#L23), [PredictionService.cs:66](../../../backend/src/AgriVision.Application/Services/Implementations/PredictionService.cs#L66), [R2ImageStorage.cs:52](../../../backend/src/AgriVision.Infrastructure/Services/R2ImageStorage.cs#L52), [Program.cs:24](../../../backend/src/AgriVision.API/Program.cs#L24).
- Bằng chứng: guest POST được phép gọi inference, source không có rate limiter/concurrency policy/quota; GET ảnh owner gọi R2 mỗi lần, copy toàn bộ response vào MemoryStream rồi ToArray. Không có cache chia sẻ private (đúng về privacy) nhưng cũng chưa có giới hạn bù lại.
- Tác động: request lặp có thể chiếm CPU inference, RAM và R2 operations. Người dùng đăng ký tự phục vụ có thể lưu nhiều ảnh; không thấy quota dung lượng/số ảnh. Không cần giả mạo owner để gây chi phí/availability issue này.
- Framework có giới hạn request body mặc định; FastAPI có giới hạn 15 MiB/20 triệu pixel. Vì vậy không kết luận mỗi request có dung lượng vô hạn. Chưa đo tải và không khẳng định mọi môi trường thiếu WAF; deploy edge chưa được xác minh trong review này. Compose publish API không chỉ loopback, nên cấu hình local cũng cần xem firewall khi chia sẻ LAN.
- Khắc phục đề xuất: giới hạn IP cho guest, user/IP cho user, concurrency inference và quota lưu trữ; giới hạn upload sớm theo hợp đồng hiện hành. Giới hạn download song song/rate trước R2 và cân nhắc stream có bound thay nhiều bản sao RAM; giữ no-store và kiểm quyền. Backend limiter phải hoạt động khi gọi trực tiếp, không dựa riêng Cloudflare.
- Test cần có: hết budget trả 429 trước AI/storage; user khác không tiêu chung quota nhầm; byte limit từ chối sớm; không load-test bucket thật trong lượt review.

## 4. [P2 / Medium] Object mồ côi có thể vượt retention khi upload thất bại không xác định

- Vị trí: [R2ImageStorage.cs:30](../../../backend/src/AgriVision.Infrastructure/Services/R2ImageStorage.cs#L30), [PredictionService.cs:127](../../../backend/src/AgriVision.Application/Services/Implementations/PredictionService.cs#L127), [ImageExpiryCleanup.cs:17](../../../backend/src/AgriVision.Infrastructure/Persistence/ImageExpiryCleanup.cs#L17).
- Bằng chứng: key được dựng trước PutObject; storage trả key chỉ sau await thành công. Upload nằm ngoài try/catch compensation DB; nếu PutObject remote đã commit nhưng ACK mất/timeout/cancel thì caller thoát trước ghi metadata. Cleanup chỉ duyệt PredictionImages trong DB nên không tìm thấy object đó.
- Probe local với Moq mô phỏng remote commit rồi TaskCanceledException xác nhận exception truyền ra và không gọi DeleteObject. Đây là kiểm đường lỗi có kiểm soát, chưa tái hiện lỗi mạng trên R2 thật và chưa khẳng định bucket đang có orphan.
- Tác động: ảnh riêng tư vẫn trong bucket nhưng không có ExpiresAt/metadata để CLI dọn; có thể giữ quá 30 ngày, tích lũy dung lượng. Không phải bypass quyền đọc ảnh qua API.
- Khắc phục đề xuất: caller giữ key xác định từ context trước side effect; bao phủ toàn bộ đoạn upload→persist bằng compensation có timeout độc lập cancellation của request. Nếu dọn không xác nhận được, cần ghi pending cleanup bền vững hoặc cơ chế đối soát orphan có grace period và kiểm DB; không bulk-delete prefix hoặc áp lifecycle theo tuổi object thay expiry DB. Test remote-commit/lost-ACK, compensation fail/retry và DB failure; không xóa ảnh hợp lệ khi retry.

## Điểm đã kiểm và giới hạn

- JWT/owner/expiry/key metadata, không nhận raw key client; read owner-only, delete owner/Admin; R2 HTTPS endpoint và credential backend; static uploads tắt; response ảnh no-store/nosniff; frontend blob theo token và revoke/abort. Không thấy sink HTML/XSS trực tiếp trong các component ảnh đã rà.
- Backend Docker ignore `appsettings*.json` và `.env*`; chưa thấy đường đưa credential R2 vào frontend trong source/config đã review. Không đọc/in secret để làm audit này; không xác minh credential đã rotate hoặc audit lịch sử Git đầy đủ.
- JWT trong Web Storage, CORS rộng và thiếu CSP là điểm hardening có sẵn. Chưa chứng minh XSS/credentialed-CORS exploit, không nâng thành finding lộ ảnh trong review này. FastAPI nội bộ đã kiểm content ảnh, không coi chỉ kiểm extension ở API là bypass content validation toàn luồng.
- Không thực hiện pentest production, scanner, brute force, fault injection R2 thật, dependency audit Python/container OS hoặc xác minh GitHub Actions. Private bucket được xác minh trong lượt triển khai trước, không kiểm lại Dashboard lượt này.

## Kiểm chứng mới ngày review

1. `dotnet test backend/tests/AgriVision.UnitTests/AgriVision.UnitTests.csproj --no-build --no-restore --filter 'FullyQualifiedName~R2ImageStorageTests|FullyQualifiedName~ImageStorageKeyTests|FullyQualifiedName~NewKeys_Require|FullyQualifiedName~ReadImage_Requires|FullyQualifiedName~DeletePrediction_ShouldReject' --verbosity minimal`: **21 pass, 0 skip**. Không thay thế pentest; không dùng số suite cũ làm kết quả mới.
2. Probe `dotnet run --project .cache/qa-verification/agri129/security-probe/Probe.csproj --verbosity quiet`: pass assertion remote-commit/cancel/no-delete tại boundary mock; không network cloud.
3. `corepack pnpm audit --prod --json`: artifact `.cache/qa-verification/agri129/frontend-security-audit.json`; 12 advisory như mục 1. Shell wrapper parse báo cáo có exit 0 không có nghĩa audit sạch; dữ liệu vulnerabilities là nguồn kết luận. Đối chiếu advisory trên repository upstream bằng web.
4. `dotnet list backend/AgriVision.sln package --vulnerable --include-transitive`: không báo vulnerable package trong 6 project theo nguồn NuGet hiện tại; không chứng minh toàn bộ backend không có lỗ hổng.

Thứ tự đề xuất: vá dependency trước public deploy; sửa revoke UI; thêm controls chống abuse; đóng đường orphan. Mọi kết quả nghiệm thu chức năng trước đây giữ nguyên nhưng **không đồng nghĩa security acceptance**.
