# Health, logs và quan sát

AgriAI có /api/health kiểm tra DB và /api/health/deps kiểm tra AI HTTP health. Không xác nhận checkpoint/mapping hoặc phân loại đúng.

- Phân biệt startup/liveness/readiness, availability và chất lượng dự đoán. Health mock không phải inference.
- Log request ID, latency, lỗi upload/AI/DB và version có nguồn; không log bearer token, secret, bytes ảnh hoặc dữ liệu cá nhân.
- Latency percentiles/SLO cần điều kiện đo được duyệt; không tự đặt ngưỡng/số liệu.
- Theo dõi DB connection, volume, upload, AI timeout và mapping rejection; không biến unknown mapping thành success.
- Alert cần action, owner, runbook; owner chưa có ghi chờ.
- Backup restore/drill chỉ ở môi trường được phép, không phá production.

[Mã health](../../../../backend/src/AgriVision.API/Controllers/HealthController.cs), [phạm vi kiểm thử AGRI-75](../../../../docs/reports/AGRI-75/README.md).
