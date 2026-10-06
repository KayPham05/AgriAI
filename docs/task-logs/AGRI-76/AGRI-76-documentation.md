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
- Người dùng yêu cầu bổ sung phần thiếu của [devops-iac-engineer](../../../.agents/skills/devops-iac-engineer/README.md), sau đó xác nhận dùng AGRI-76 cho commit skill riêng. Đây là tooling theo yêu cầu bổ sung, không phải chức năng DevOps đã triển khai của sản phẩm.
- Bổ sung bảy reference, helper stdlib, ba mẫu local và unittest; chỉnh tài liệu skill để phản ánh capability thực tế. Không thêm Terraform/Kubernetes vào stack đang chạy hoặc thay CI policy.
- Kiểm tra local: 10 test helper đạt; skill validator, syntax Python, YAML mẫu và liên kết đạt. Native CLI được mock; chưa kiểm chứng cloud/cluster/secret scanner thật hoặc full CI.
- Subject: `chore(skills): AGRI-76 add devops iac engineer skill`. Không push hay tạo PR trong lần này. Bằng chứng và giới hạn chi tiết ở [implementation guide](../../../.agents/skills/devops-iac-engineer/IMPLEMENTATION_GUIDE.md).

## 8. Thực hiện bộ Phân tích & Thiết kế đầy đủ — 2026-10-05

- Source baseline `99d6e56b825f8448aae442b87a4b3e34ee338a52`, branch `AGRI-76-requirements-analysis-design`; working tree sạch trước khi bắt đầu. Không tự đặt owner/reviewer hoặc dùng tasklog để giả nhận Team Lead approval.
- Theo thứ tự: kiểm source/DB → System Analysis và BFD → ERD/schema live → Use Case Specification → DFD/Activity/Sequence/Class/State → traceability → render/verification.
- Bổ sung [System Analysis](../../reports/AGRI-76/system_analysis.md), [Use Case Specification (14 UC tại lần tạo ban đầu; hiện còn 10)](../../reports/AGRI-76/use_case_specifications.md), [DB verification](../../reports/AGRI-76/database_verification.md), [traceability](../../reports/AGRI-76/traceability.md), [bộ 28 sơ đồ editable](../../reports/AGRI-76/diagrams/README.md) và gallery HTML/SVG.
- Đối chiếu PostgreSQL thật: sáu bảng/43 cột nghiệp vụ, 14 PK/FK/check constraints và 13 secondary indexes của migration; snapshot chỉ metadata, không tài khoản/lịch sử/credential.
- Phát hiện/ghi rõ: UI ảnh 15 MiB vs mục tiêu 30 MB, profile UI chỉ state, guest history browser là nhánh code chưa truy cập được từ UI, khác khả năng gọi API public, mapping fallback, ảnh mồ côi sau lỗi, confidence HTTP [0,1] khác CLI %, chưa có FastAPI bridge trong checkout. Không sửa ứng dụng trong task tài liệu.

### Chỉnh theo review ngày 2026-10-05

- Sửa UC-05 chỉ dành cho user đã đăng nhập/vào ứng dụng; phân biệt UI bị chặn bởi `hasEnteredApp=false` với các API prediction/detail/catalog công khai. Nhánh guest browser còn trong code được ghi rõ là chưa có đường vào UI; đồng bộ System Analysis, specification, BFD, DFD, Use Case, Activity, Sequence và traceability.
- Thêm phản hồi `D2 → P2: kết quả ghi / lỗi DB` ở DFD Level 1 để khớp Level 2 prediction.
- Render lại 28 SVG/gallery, validator trả OK; kiểm cấu trúc và xem ảnh mới của các sơ đồ chính bị ảnh hưởng. Chưa stage/commit/push; Team Lead review vẫn chưa hoàn tất.
- State Diagram dùng PredictionStatus có thật của DiagnosePage; Prediction entity/DB không có status. Không tự thêm Created/Processing/Completed/Failed vào schema hoặc sơ đồ hiện trạng.
- Kiểm tra: renderer 28 source thành công, validator HTML/SVG đạt, schema/ERD đối chiếu đạt, liên kết/fences/XML/IDs kiểm tra đạt, visual QA và sửa swimlane trước render lại, `git diff --check` đạt. [Chi tiết và giới hạn](../../reports/AGRI-76/verification.md).
- Chưa chạy runtime tests hoặc checkpoint inference. DoD còn Team Lead review/feedback (gồm State UI/AI boundary) và commit source editable; chưa stage/commit/push trong lần này.

## 9. Đồng bộ tài liệu tổng quan theo review — 2026-10-05

- Cập nhật [system_requirements.md](../../system_requirements.md): baseline `99d6e56`, phân biệt guest gọi API trực tiếp với main UI sau login/restore; FR-03 ghi có sửa hồ sơ UI chỉ trong state, chưa lưu DB; phân biệt validation UI 15 MiB với validation API ở FR-04/NFR-02.
- Cập nhật [system_design_diagrams.md](../../system_design_diagrams.md): phần hiện trạng dùng trực tiếp ba SVG BFD/context/Level 1 và liên kết source PlantUML của bộ AGRI-76; thống nhất ID F1.1–F5.2/P1–P7/D1–D5, external AI/Cloudinary và phản hồi ghi DB giữa Level 1/2. Bổ sung liên kết Level 2 và balancing ledger.
- Kiểm tra hai file: 62 đường dẫn local, 7 heading anchors, fences và whitespace đạt; năm SVG được dẫn hợp lệ XML/title/desc; xác nhận source hai mức có cùng phản hồi ghi DB và context có Ops/AI/Cloudinary. Năm block Mermaid mục tiêu/ERD giữ nguyên so với HEAD; không chạy renderer Mermaid cho các block không đổi. `git diff --check` đạt.
- Không thay đổi ứng dụng hoặc schema; không chạy runtime tests/inference; chưa stage/commit/push. Team Lead review vẫn còn chờ.

## 10. Tạo database PostgreSQL theo ERD — 2026-10-06

- Theo yêu cầu PostgreSQL mới nhất của người dùng, không tạo SQLite. Bổ sung thư mục [database](../../../database/README.md) gồm `postgres_schema.sql`, `verify_schema.sql` và hướng dẫn kết nối/tái tạo; lấy cấu trúc từ snapshot ERD đã đối chiếu InitialCreate, baseline `99d6e56`.
- Khởi động service PostgreSQL hiện có; tạo database riêng `agrivision_erd`, owner `agrivision_user`, rồi áp dụng schema trong transaction. Database ứng dụng `agrivision_db` giữ nguyên; dữ liệu PostgreSQL nằm trong volume Compose, thư mục repo chỉ lưu source SQL/hướng dẫn.
- `psql ON_ERROR_STOP` apply thành công; metadata database mới khớp 43 cột, 14 constraints, 19 indexes (6 PK + 13 secondary). Sáu bảng đều trống; service healthy, cổng local `127.0.0.1:55434`.
- Không seed tài khoản/danh mục/nhãn giả, không tạo `__EFMigrationsHistory`; không đổi backend connection string hoặc chạy model/application tests. Chưa stage/commit/push.

### Chuyển SQL sang thư mục root — 2026-10-06

- Theo yêu cầu người dùng, chuyển toàn bộ source SQL và hướng dẫn sang `database/` ở root; giữ ERD, snapshot và bằng chứng kiểm chứng trong `docs/reports/AGRI-76/`.
- Cập nhật đường dẫn nguồn và lệnh trong database README, liên kết từ báo cáo/tasklog; chuyển kết quả xác minh database vào DB verification AGRI-76. Hai file SQL giữ nguyên SHA-256 sau di chuyển; không thao tác lại database Docker, chưa stage/commit/push.

## 11. Activity, Sequence và State mục tiêu cốt lõi — 2026-10-06

- Người dùng xác nhận State Diagram, chỉ chức năng cốt lõi và quy trình mục tiêu. Bổ sung 7 source PlantUML/SVG: 3 Activity, 3 Sequence cho đăng nhập, dự đoán một ảnh/xem kết quả, lịch sử/chi tiết/xóa của mình; 1 State logic xử lý ảnh.
- [Tài liệu giải thích/mapping/Planned](../../reports/AGRI-76/core_target_workflows.md), [tổng quan](../../system_design_diagrams.md) và gallery đều liên kết bộ mục tiêu. Cập nhật README và traceability; giữ baseline hiện trạng riêng. State đề xuất không phải enum/cột DB hiện có, không thay đổi ứng dụng hoặc SQL.
- Renderer tạo đủ 35 SVG/gallery, validator đạt, visual QA cả 7 sơ đồ mới đạt; kiểm tra liên kết/anchors/XML/IDs/fences và whitespace đạt. Không chạy runtime/model/DB tests; chưa stage/commit/push hoặc nhận Team Lead approval.

## 12. Tối ưu tối đa 10 Use Case — 2026-10-06

- Theo yêu cầu người dùng, giảm Use Case còn 10 mục tiêu; gộp đọc/sửa hồ sơ, kết quả/lịch sử, CRUD danh mục. Giữ chi tiết nhánh/quyền trong đặc tả và bảng đổi mã; chuyển 4 bước include của prediction về Activity/Sequence.
- Đồng bộ mã UC trong BFD, DFD, Activity, Sequence, State, đặc tả, System Analysis, traceability, requirements, story lịch sử và file tổng hợp. Process/flow DFD, Class/ERD/SQL không đổi về nghiệp vụ/schema. Các phần lịch sử tasklog dùng ID cũ được đối chiếu qua bảng chuyển mã trong Use Case Specification.
- Render 35 SVG/gallery, xác nhận mọi source dùng usecase có tối đa 10 oval; spec đúng 10 UC. XML/accessibility/IDs, 406 links/26 anchors, validator và whitespace đạt. Visual QA Use Case/BFD/DFD Level 1 và Sequence catalog/history đạt; chi tiết tại verification.
- Không chạy runtime/inference/database tests; không stage/commit/push. Team Lead review vẫn chờ.

## 13. Rà soát tài liệu còn sót sau tối ưu Use Case — 2026-10-06

- Theo yêu cầu người dùng, rà soát 26 tài liệu liên quan và chỉnh mục lục, README báo cáo/sơ đồ, tài liệu tổng quan, giải thích workflow, bảng truy vết và tham chiếu UC ghép. Bảng mã cũ/tasklog lịch sử giữ vai trò đối chiếu, không phải bộ Use Case đang áp dụng.
- Làm rõ core target là nhánh một ảnh của tài khoản đã đăng nhập; quyền khách dự đoán và giới hạn dung lượng cả lượt vẫn giữ theo quyết định đã chốt. Sửa nhận định POST public sai quyền mục tiêu; GET lịch sử tài khoản vẫn cần kiểm owner. Gallery và State hiện trạng/mục tiêu được ghi riêng.
- 523 links/27 anchors, fences, XML/accessibility/IDs, giới hạn Use Case và whitespace đạt; render 35 SVG/gallery, validator OK. Không thay ứng dụng, source diagram hoặc SQL; không chạy runtime/model/DB tests, chưa stage/commit/push.

## 14. Đồng bộ mô hình với schema/behavior sau AGRI-70 — 2026-10-07

- Sửa bốn finding review: ERD/Class theo 9 bảng; prediction AI/strict mapping trước storage với khách 200 không history/user 201; chi tiết JWT/owner; P3 đọc catalog D3. Đồng bộ Activity/Sequence/BFD/DFD/UC/specification/traceability và tài liệu tổng quan; bổ sung migration/expiry CLI, snapshot/cleanup và catalog soft-delete đúng source.
- Đọc live metadata PostgreSQL, lưu snapshot không chứa dữ liệu user: 9 bảng/69 cột, 9 PK/9 FK, hai migration. Giữ ERD 6 bảng và bộ cũ làm bằng chứng lịch sử. Phần triển khai backend/migration/tests vẫn thuộc AGRI-70; lần này chỉ cập nhật mô hình AGRI-76.
- Render thành công 36 source PlantUML/SVG/gallery; kiểm XML/accessibility/IDs, skill validator và visual QA tám sơ đồ bị ảnh hưởng. Sửa lỗi renderer ẩn varchar(n), kiểm trực tiếp SVG đủ 69 cột/kiểu/default/ràng buộc.
- Sau sửa đã spawn subagent read-only review; xử lý findings vòng 1 về target table, snapshot error HTTP status và UC-10 CLI precondition. Review vòng 2 **technical PASS**, không còn P1/P2. Câu lặp biên tập đã sửa. [Chi tiết xử lý review](../../reports/AGRI-76/review_resolution_2026-10-07.md).
- [Verification/DoD](../../reports/AGRI-76/verification.md) đánh dấu phần kỹ thuật hoàn tất. Chưa có Team Lead review/feedback thật và chưa commit editable; chưa đánh dấu Jira Done. Không chạy lại runtime/model tests, không stage/commit/push.
