# AGRI-76 — Chỉnh sửa tài liệu phân tích và thiết kế

- **Owner:** Chưa xác nhận thành viên phụ trách; không tự gán tên.
- **Ngày hoàn thành lần chỉnh sửa tài liệu:** 2026-10-03; chưa tuyên bố toàn bộ Jira task Done.
- **Branch:** `AGRI-76-requirements-analysis-design`.
- **Pull request:** Chưa tạo. Ban đầu chỉ sửa tài liệu; sau đó người dùng cho phép commit theo Conventional Commits. Không push.
- **Source đối chiếu:** `094ec6e6f6fe8c75a3256f5d7e73d43fd01852a5` và working tree hiện tại.

## 1. Completed Work

Bổ sung phân tích hệ thống đang có để phục vụ AGRI-76, tách khỏi yêu cầu và sơ đồ mục tiêu.
Sửa thông tin sai về multipart, health endpoint và tham chiếu NFR; thay liên kết handbook đã bị xóa.
Cập nhật baseline CI có giới hạn theo commit, thêm ma trận truy vết và điểm vào báo cáo.
Giữ tài liệu đề xuất, ERD và các thay đổi không liên quan; không sửa source ứng dụng.

## 2. Main Changes

| File | Thay đổi trong lần này |
|---|---|
| `docs/system_requirements.md` | Thêm hiện trạng, tác nhân/quyền API, ma trận FR/NFR → source → trạng thái → kiểm thử; ghi điều kiện chốt các yêu cầu chưa rõ. |
| `docs/system_design_diagrams.md` | Thêm BFD, DFD ngữ cảnh và mức 1 hiện trạng; giữ sơ đồ mục tiêu ở phần riêng; giữ ERD/schema và bổ sung nguồn controller. |
| `docs/notes/agri_api_test_cases.md` | Sửa nhận định web gửi `image`: source Next.js gửi `file`, tương thích DTO `File`; không suy ra case đã pass. |
| `docs/notes/agri_integration_test_cases.md` | Bỏ blocker sai tên field; tách ca health DB và AI, ghi response theo controller, bỏ liên kết NFR-03 không đúng. |
| `docs/development_roadmap.md` | Ghi run CI `36992608938` thành công cho commit `727aa59`; không khẳng định HEAD hay working tree có cùng kết quả. |
| `docs/reports/AGRI-45/BACKEND_SYSTEM_REPORT_AND_FRONTEND_INTEGRATION_GUIDE.md` | Thay hai liên kết handbook bị hỏng bằng ma trận hiện trạng; giữ nội dung lịch sử. |
| `docs/README.md` | Thêm liên kết báo cáo AGRI-76 và tasklog này. |
| `docs/reports/AGRI-76/README.md` | Tạo điểm vào bằng chứng, nguồn source và DoD chưa hoàn tất. |

## 3. Results and Verification

- Đối chiếu trực tiếp Auth/Predictions/Plants/Diseases/Health controllers, AuthService, PredictionService, DTO, web predictionApi và HealthControllerTests.
- Source web dùng `form.append('file', ...)`; DTO dùng `File`. Test health hiện có kiểm tra DB không phụ thuộc AI và AI unavailable ở endpoint `/deps`; không chạy lại suite trong lần này.
- Bằng chứng CI: [run 36992608938](https://github.com/KayPham05/AgriAI/actions/runs/36992608938), SHA `727aa59f5b1ded338df09ba338ca13b45c12a864`, conclusion `success` theo bản JSON đã lưu local. Không truy vấn lại trạng thái GitHub trong lần chỉnh sửa này.
- Kiểm tra 14 Markdown đang thay đổi/thêm mới trong `docs/`: 104 liên kết nội bộ (đường dẫn và heading) hợp lệ; 70 dấu hàng rào code cân bằng. Kiểm tra bằng PowerShell, không truy cập URL ngoài.
- `git diff --check`: đạt cho diff tracked; chỉ có cảnh báo Git chuẩn hóa LF → CRLF. Tại thời điểm hoàn tất lần sửa đầu, chưa stage/commit/push; nền source là `094ec6e`.
- Không chạy runtime tests, Docker, benchmark, secret scanner hoặc inference thật: thay đổi chỉ là Markdown; không ghi các ca thiết kế thành Passed.
- ERD SVG không thay đổi trong lần này. Sơ đồ Mermaid mới chưa được render/QA hình ảnh; kiểm tra cấu trúc văn bản không thay cho render.

## 4. Issues or Blockers

- Khoảng trống ứng dụng vẫn còn: POST prediction/GET ID chưa bảo vệ đầy đủ, mapping DB fallback, kiểm tra ảnh chưa đủ, chưa cleanup ảnh lỗi hoặc hết hạn. Đây là phát hiện tài liệu, không phải lỗi đã sửa trong source.
- Cần nhóm duyệt profile fields, admin scope, nhiều ảnh, chính sách xóa, đơn vị dung lượng, model contract/version và tiêu chí hiệu năng; không tự đặt ngưỡng hoặc kết quả.
- Tên file dùng `documentation` thay hậu tố thành viên vì owner chưa xác nhận; đổi theo quy ước `AGRI-XXX-<member>.md` khi xác nhận người phụ trách và cập nhật các liên kết.
- Giữ Mermaid/SVG hiện có thay vì thêm bộ HTML/skin theo skill diagram-design để phạm vi sửa tài liệu nhỏ nhất, không thêm định dạng hay dependency không được yêu cầu.

## 5. Remaining Work or Follow-up

- Render/kiểm tra bố cục Mermaid mới và duyệt phân tích hiện trạng cùng nhóm.
- Đối chiếu toàn bộ mô tả/DoD AGRI-76 trong Jira; chưa coi ảnh chụp một phần mô tả là checklist đầy đủ.
- Chốt quyết định còn mở, bổ sung case chưa có và chạy kiểm thử bằng môi trường phù hợp; model thật kiểm chứng riêng với stub/health.
- Sửa các khoảng trống source bằng task được giao riêng; không tự chuyển chúng thành thay đổi ứng dụng trong lần này.
- Commit cục bộ theo yêu cầu tiếp theo của người dùng; chưa push. Skill DevOps không liên quan vẫn giữ ngoài commit.

## 6. Phạm vi commit được yêu cầu tiếp theo

- Nhóm phân tích/thiết kế: README, tech stack, yêu cầu, sơ đồ/ERD, roadmap, báo cáo và tasklog AGRI-76; bỏ handbook trùng/lỗi thời, sửa tham chiếu báo cáo AGRI-45 và cảnh báo hướng dẫn Colab v1.3 là lịch sử.
- Nhóm tài liệu kiểm thử: năm file API/integration/screen/unit/viewpoint, đối chiếu mã FR/NFR và hiện trạng. Không thay đổi mã test thực thi hoặc tuyên bố test pass.
- Subject dự kiến: `docs(docs): AGRI-76 document current system analysis and design` và `docs(docs): AGRI-76 align test documentation with current contracts`.
- Không thêm `.agents/skills/devops-iac-engineer/`, không thay đổi Git config, không bỏ qua hooks, không rewrite history hoặc push.
- Kiểm tra trước commit: 15 Markdown (gồm README root), 117 liên kết nội bộ/heading hợp lệ, hàng rào code cân bằng; SVG hợp lệ XML; `git diff --check` đạt. Hai subject dự kiến đều qua commitlint của repo với 0 lỗi/cảnh báo. Không chạy lại runtime tests vì chỉ thay đổi tài liệu.

## 7. Bổ sung skill theo yêu cầu tiếp theo

- Hai commit tài liệu đã tạo: `0b90406` (phân tích/thiết kế) và `6b29cfb` (tài liệu kiểm thử); skill ban đầu được giữ ngoài hai commit đó.
- Người dùng yêu cầu bổ sung phần thiếu của [devops-iac-engineer](../../.agents/skills/devops-iac-engineer/README.md), sau đó xác nhận dùng AGRI-76 cho commit skill riêng. Đây là tooling theo yêu cầu bổ sung, không phải chức năng DevOps đã triển khai của sản phẩm.
- Bổ sung bảy reference, helper stdlib, ba mẫu local và unittest; chỉnh tài liệu skill để phản ánh capability thực tế. Không thêm Terraform/Kubernetes vào stack đang chạy hoặc thay CI policy.
- Kiểm tra local: 10 test helper đạt; skill validator, syntax Python, YAML mẫu và liên kết đạt. Native CLI được mock; chưa kiểm chứng cloud/cluster/secret scanner thật hoặc full CI.
- Subject: `chore(skills): AGRI-76 add devops iac engineer skill`. Không push hay tạo PR trong lần này. Bằng chứng và giới hạn chi tiết ở [implementation guide](../../.agents/skills/devops-iac-engineer/IMPLEMENTATION_GUIDE.md).
