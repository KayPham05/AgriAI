# AGRI-129 — R2 private storage và thiết kế Cloudflare/CD

Nhánh: `AGRI-129-R2-storage-private`. Các mốc 18–20/10 ban đầu thuộc AGRI-140, sau đó chuyển hồ sơ sang AGRI-129.

## 2026-10-18 — Thiết kế Cloudflare và VPS

- Chốt Cloudflare Free, Caddy/HTTPS, bảo vệ origin, migration riêng và backup/rollback; cập nhật kế hoạch CD manual.
- Chỉ review tài liệu; chưa cấu hình DNS/TLS, triển khai VPS hoặc xác minh CI từ xa.

## 2026-10-20 — Thiết kế và chuyển storage sang R2

- Thay Cloudinary bằng R2 private; thiết kế key theo user/prediction/image, ảnh qua API kiểm JWT/owner/expiry, frontend tải blob có JWT; bỏ static uploads.
- Lượt đầu: backend build + 44 unit, frontend 218 test/check/build pass; Docker/cloud E2E chưa chạy tại thời điểm đó.
- Nghiên cứu email transport; chưa chọn hoặc triển khai. Báo cáo mail riêng đã được người dùng xóa.

## 2026-10-23 — Hoàn tất R2 private

- Triển khai key chuẩn trên bucket `agrivision-images-dev`; giữ đọc key R2 cũ, bảo toàn dữ liệu/volume. Cập nhật Docker/CI và hướng dẫn VPS.
- Lượt nghiệm thu: 113 unit, 141 integration, 2 ca R2/checkpoint thật và 356 frontend test pass; build và browser smoke pass. Fixture đã dọn.
- Coverage thời điểm này: backend 72.09%, frontend 69.33%; đây là kết quả lịch sử trước vá bảo mật.

## 2026-10-23 — Review và vá bảo mật

- Xử lý bốn finding: dependency, logout chưa revoke, thiếu giới hạn tài nguyên và nguy cơ object mồ côi.
- Vá Next/sharp; thêm revoke session, rate/concurrency/quota/size bounds, journal upload và cleanup retry. Backup rồi migrate riêng; local schema 6 migrations, bốn service healthy.
- Sau vá: 117 unit, 147 integration, 2 ca real và 359 frontend test/check/build pass; production audit 0 advisory. Live smoke kiểm bytes R2, revoke token và journal; chỉ dọn fixture.

## 2026-10-23 — Kiểm ảnh người dùng và coverage

- Browser chẩn đoán ảnh nho: history/detail tải lại được; R2 GET 200, 60,481 bytes, SHA-256 khớp nguồn. Giữ kết quả trong tài khoản; mô hình trả Ngô/Chay la 98.9%, cần kiểm AI riêng.
- Chạy lại coverage: 117 unit + 147 integration pass, 2 opt-in real skip; frontend 359 pass. Backend 73.33%, frontend 69.45%.
- Nâng CI gate backend 70%, frontend 65% và đồng bộ Vitest; kiểm báo cáo với ngưỡng mới PASS. Target 80% chưa đạt; Python gate giữ 40%.

## 2026-10-23 — Quy tắc agent và tinh gọn tài liệu

- Thư mục tài liệu theo Jira key; tasklog ngắn gọn, không README trong tasklog. Bỏ link tới file người dùng đã xóa, giữ bằng chứng cần thiết trong báo cáo còn lại.
- Lượt đồng bộ trước: 73 liên kết local và diff pass. Lượt chỉnh tasklog này chỉ kiểm tài liệu, không chạy lại app test/cloud.

## Còn lại và bằng chứng

- Chưa scheduler cleanup, pentest, xác minh GitHub Actions hoặc nghiệm thu VPS; chưa commit/push.
- [Báo cáo tổng](../../reports/AGRI-129/README.md), [review ban đầu](../../reports/AGRI-129/security_review.md), [xử lý và kiểm chứng](../../reports/AGRI-129/security_remediation.md), [VPS](../../vps_deployment.md), [CI/CD](../../plans/ci_cd_plan.md).

## 2026-10-23 — Commit theo nhóm

- Theo yêu cầu, chia storage/upload, logout, dependency, CI, luật agent và tài liệu thành 6 conventional commit có AGRI-129. Kiểm staged paths/diff từng nhóm; không push. Giữ kết quả test trước đó, không ghi là chạy mới.
