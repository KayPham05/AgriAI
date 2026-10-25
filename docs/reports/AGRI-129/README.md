# AGRI-129 — R2 private storage

**DoD local/R2: hoàn tất; production/VPS chưa triển khai.**

- Bucket private `agrivision-images-dev`; key `users/{userId}/predictions/{predictionId}/{imageId}.{extension}`.
- [Cấu hình và vận hành](r2_storage.md), [cấu trúc bucket](r2_bucket_structure.md).
- [Review bảo mật ban đầu](security_review.md) và [xử lý, kiểm chứng](security_remediation.md): bốn finding đã xử lý trong phạm vi local.
- Kiểm coverage gần nhất ngày 2026-10-23: backend 117 unit + 147 integration pass, 2 opt-in real skip; frontend 359 pass. Backend branch 73.33%, frontend 69.45%; đạt gate mới 70%/65%, target 80% chưa đạt. Python gate giữ 40%.
- Browser chẩn đoán ảnh người dùng: history/detail tải lại được; signed GET R2 200, 60,481 bytes, SHA-256 khớp file gốc. Mô hình trả Ngô/Chay la 98.9% cho ảnh nho; chưa xác nhận nhãn đúng. [Bằng chứng được giữ lại](security_remediation.md#browser-kiểm-ảnh-người-dùng).
- Chưa scheduler cleanup, pentest, xác minh GitHub Actions hoặc nghiệm thu VPS. Không coi kiểm chứng local là kết quả production.

## Tài liệu triển khai

- [Hướng dẫn VPS](../../vps_deployment.md).
- [Kế hoạch CI/CD](../../plans/ci_cd_plan.md).
- [Task log](../../task-logs/AGRI-129/AGRI-129-cloudflare-cd-design.md).

## Lịch sử và tinh gọn tài liệu

Thiết kế Cloudflare/VPS ngày 2026-10-18 và R2 ngày 2026-10-20 ban đầu thuộc AGRI-140, sau đó được chuyển sang hồ sơ AGRI-129. Các mục lịch sử còn trong tài liệu chi tiết không thay thế kết quả mới phía trên.

Người dùng đã xóa báo cáo nghiệm thu riêng và nghiên cứu Docker Mailserver; đã bỏ liên kết tới các file này, giữ bằng chứng R2 cần thiết trong báo cáo bảo mật. Email transport chưa chốt/triển khai. Không khôi phục các file đã xóa.
