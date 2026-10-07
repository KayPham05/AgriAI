# Kubernetes và container

Kubernetes là lựa chọn tương lai, không phải thành phần đang triển khai của AgriAI. Ưu tiên Compose hiện có.

- Xác nhận context, namespace, version và quyền; không dùng production context mặc định.
- Helper generate chỉ ghi Deployment JSON (cũng hợp lệ YAML); không apply, cài cluster, tạo Service/Ingress/Secret hoặc ghi đè.
- Thay image demo, chốt port/probes/UID/quyền ghi/resource limits theo ứng dụng. Mẫu không production-ready và không chạy được mọi image.
- Validate gọi kubectl apply --dry-run=server --validate=strict. Cần cluster/RBAC; gửi request/schema/admission checks nhưng không persist resource. Admission webhooks có thể được gọi.
- Không phải offline validation; không hỗ trợ --schema-version. Schema là của cluster đã chọn.
- Deploy/public ingress/RBAC/delete namespace cần phê duyệt riêng. Thiếu tool/cluster phải ghi Blocked, không Pass.

[Mẫu Deployment](../examples/kubernetes/complete-app.yaml). Nguồn: [kubectl apply](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_apply/).
