# Security và secrets

Không commit secret, checkpoint, dataset hoặc browser profile. Ignore không làm sạch history; secret lộ cần thu hồi/rotate và xử lý history có phê duyệt.

- Helper scan-secrets gọi Gitleaks dir với --redact: scan directory contents, không Git history.
- Cần Gitleaks có subcommand dir (CI baseline v8.24.2); không tự tải/cài tool. Tool thiếu là lỗi, findings giữ exit code.
- CI dùng Gitleaks git với --log-opts=--all. Directory scan đạt không suy ra history sạch.
- Không in secret, không allowlist broad để green CI. False positive cần chứng cứ và xử lý hẹp được duyệt.
- Ownership/role và kiểm tra ảnh ở server; popup/client validation không thay bảo vệ API.
- Terraform plan/state có thể nhạy cảm; Kubernetes Secret base64 không mặc nhiên an toàn.
- Deploy/push/state mutation cần quyền rõ ràng.

Nguồn: [Gitleaks CLI](https://github.com/gitleaks/gitleaks).
