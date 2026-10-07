# Terraform và IaC

Chỉ dùng khi có yêu cầu provisioning được duyệt. AgriAI hiện dùng Compose; thêm skill không thay stack.

- Xác nhận account, vùng, chi phí, quyền và tài nguyên trước khi viết provider/resource.
- Helper init-project tạo starter local không provider/resource/credential; cloud và region chỉ là metadata.
- Chạy terraform init -backend=false riêng khi cần chuẩn bị validate; lệnh có thể tải module/provider. Helper không auto-init.
- terraform validate kiểm tra cả directory, không xác nhận cloud API/state hoặc deploy. --file nhận directory hoặc lấy directory cha.
- Plan/apply/destroy/state mutation cần phê duyệt riêng. Không dùng auto-approve mặc định.
- Không commit state, plan và tfvars chứa secret. Chọn backend/locking theo phiên bản được duyệt; không áp công thức cũ cho mọi môi trường.

[Mẫu local](../examples/terraform/main.tf). Nguồn: [Terraform validate](https://developer.hashicorp.com/terraform/cli/commands/validate).
