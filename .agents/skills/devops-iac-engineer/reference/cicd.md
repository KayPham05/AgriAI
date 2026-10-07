# CI/CD và GitOps

Nguồn thật: [CI workflow](../../../../.github/workflows/ci.yml), [commitlint](../../../../commitlint.config.cjs). Không tự sửa gate, coverage hoặc legacy baseline.

- Commit mới cần Jira key thật liên quan: type(scope): AGRI-XXX description. Không gắn tooling không liên quan vào AGRI-76.
- Thiếu key trượt jira-subject, rồi ci-gate trượt. Phê duyệt ngoại lệ bằng lời không thay cấu hình CI.
- Không lách bằng --no-verify, ignore broad hay tăng baseline. Thay policy cần yêu cầu riêng.
- Ghi đúng SHA/run; startup/mock/coverage/model inference là bằng chứng khác nhau.
- CD chỉ thêm khi có môi trường thực; secret store, workflow permissions và deploy approval rõ ràng.
- gitops init chỉ tạo Kustomize skeleton local. Không cài ArgoCD/Flux, nối repo hoặc bật auto-sync.
- Rollback dựa artifact/DB policy; không tự reset branch hoặc xóa volume.

[Workflow mẫu](../examples/pipelines/skill-check.yml) chỉ là example, không tự chạy trong CI repository.
