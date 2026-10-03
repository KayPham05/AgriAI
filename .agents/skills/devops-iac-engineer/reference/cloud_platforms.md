# Lựa chọn cloud

Không chọn AWS/Azure/GCP chỉ vì skill liệt kê. AgriAI chưa có cloud staging được xác nhận.

- Ghi tải, ngân sách, vùng dữ liệu, GPU/CPU inference, availability và người vận hành.
- So sánh VM + Compose với managed services theo nhu cầu; không tự thêm Kubernetes/multi-cloud.
- Người dùng xác nhận account/project/subscription và region trước provisioning.
- Identity quyền tối thiểu, credential ngắn hạn khi hỗ trợ; không nhúng key vào Git.
- DB không public mặc định; chốt network, TLS, registry, backup/restore và lifecycle ảnh.
- Budget alert, tags và egress cost phải kiểm tra theo cloud được chọn.
- Tra tài liệu chính thức khi cần giá/quota/spec hiện tại; không đưa số chưa đo hoặc claim compliance.

Helper --cloud chỉ ghi metadata, không gọi cloud API hoặc kiểm chứng quota/chi phí/region.
