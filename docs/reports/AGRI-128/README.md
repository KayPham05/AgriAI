# AGRI-128 — Backend improvement

Điểm vào bằng chứng kỹ thuật của nhánh tích hợp `AGRI-128-backend-improvement`.
Mỗi hạng mục ghi riêng task Jira thực tế, phạm vi và ngày kiểm chứng; không suy
rộng kết quả một hạng mục thành nghiệm thu toàn bộ S3-01 đến S3-10.

| Hạng mục | Task | Báo cáo | Trạng thái |
| --- | --- | --- | --- |
| S3-06 — History và hồ sơ nông nghiệp | AGRI-119, story AGRI-111 | [Phần A](history_part_a.md), [tích hợp CRUD phần B](history_part_b.md) | Sửa CI sau merge 116205b, 2026-10-26: 163 unit + 65 integration + 255 API = 483 tests đạt; branch 83.59%, gate 70% PASS local. [PR #45](https://github.com/KayPham05/AgriAI/pull/45) chờ CI/review/manual; giữ Guest chọn hồ sơ trả 401 của base. |
| S3-09 — Admin và tra cứu frontend C | AGRI-122, story AGRI-114 | [Kế hoạch C](../../plans/AGRI-128-knowledge-medicine-frontend-plan.md), [triển khai và UAT](knowledge_medicine.md) | Tích hợp e1197ce, 2026-10-26: 440/440 tests, branch 72.37%; typecheck/lint/build và format bản sao LF đạt. PR #46 đã xử lý conflict local; CI/review còn chờ. |
| S3-09 — Knowledge and medicine backend A/B | AGRI-122, story AGRI-114 | [API, kiểm chứng và giới hạn](knowledge_medicine.md), [route matrix](knowledge_api_matrix.md) | Tích hợp e1197ce, 2026-10-26: 156 unit + 65 integration + 239 API = 460 tests; branch 83.56%. Giữ trigger, sửa cần duyệt lại; không migration mới. PR #46 chờ CI/review. |
| S3-05 — Guest diagnosis, backend | AGRI-118, story AGRI-110 | [Contract, kiểm thử và giới hạn](guest_diagnosis.md) | Local: 90 test đạt, branch coverage 62.64%; chưa nghiệm thu UI/CI/PR. |
| S3-01/S3-02 — Auth improvement (PR #42) | AGRI-128 | [Triển khai](auth_improvement.md), [kiểm chứng mới 2026-10-23](auth_verification_2026_10_23.md) | Local: auth/transaction 10/10, unit 91/91, integration 140/140, không skip; branch coverage 65.94% đạt gate 60%, chưa đạt target 80%. GitHub CI của `ba89f19` đang đỏ. |
| S3-02 — User Profile & Password Management, frontend | AGRI-128 | [Giao diện Figma, API mapping và kiểm chứng 2026-10-25](user_profile_frontend.md) | Đã triển khai UI; kiểm thử trình duyệt dùng fixtures. Chưa nghiệm thu API/DB thật. |

- [Chuẩn triển khai](../../plans/AGRI-128-implementation-rules.md).
- [Avatar người dùng: API, giao diện và kiểm chứng 2026-10-25](user_avatar.md) — backend unit 138/138, API 208/208, integration liên quan 22/22; frontend 377/377. Chưa áp dụng migration vào DB ứng dụng hoặc kiểm thử R2 thật.
- [Kế hoạch Guest backend](../../plans/AGRI-128-guest-diagnosis-plan.md).
- [Task log Guest backend](../../task-logs/AGRI-128/AGRI-128-guest-diagnosis.md).

DoD tổng thể AGRI-128 chưa hoàn tất. Các task khác không được triển khai hoặc
đánh giá trong đợt Guest backend này.

## 2026-10-28 — Khôi phục Docker trên nhánh knowledge

- Nhánh `AGRI-128-knowledge-medicine`, HEAD `8c146bf`, Compose project `agriai`.
- Backend dừng với `Database migrations are pending` tại
  `backend/src/AgriVision.API/Program.cs:202`; database mới có 3 migration.
- Đã đọc 5 migration còn thiếu trong
  `backend/src/AgriVision.Infrastructure/Persistence/Migrations/`, tạo backup
  `.cache/database-verification/agrivision_before_knowledge_20261028_162307_ca219be1177a4f6495f2d2e0a0573a7e.dump`
  (53.190 bytes), kiểm tra archive bằng `pg_restore --list`; chưa thử restore.
- Chạy `docker compose --env-file D:/AgriAI/.env -p agriai run --rm --no-deps backend --migrate`
  thành công: lịch sử DB có 8 migration, cuối cùng `20261025094714_UserAvatarUrl`.
- Khởi động backend/frontend bằng `up -d --no-deps --wait --wait-timeout 60 backend frontend`:
  cả hai healthy; PostgreSQL healthy. HTTP trực tiếp `/api/health` tại port 5080 và
  proxy tại port 3000 trả `Healthy`, database `Healthy`; trang chủ port 3000 trả 200.
- Không sửa source/migration hoặc rebuild AI. Container AI vẫn tắt; chưa kiểm thử
  inference, storage, các luồng nghiệp vụ hay chạy lại unit/integration/CI.
- Chỉ cập nhật báo cáo này và task log; không commit/push. DoD tổng thể chưa hoàn tất.

## 2026-10-28 — Chẩn đoán lỗi lưu hướng dẫn thuốc

- Quan sát UI thật tại `http://localhost:3000/admin`: chọn `Ca_chua / Chay_la_som`,
  lưu hướng dẫn nhận `Medicine use requires an active plant/disease pair with condition Disease.`
- Truy vấn DB xác nhận cây, bệnh và cặp đều active nhưng `condition_type=Unknown`.
  Trong 59 cặp active hiện có: 47 Unknown, 10 Healthy, 2 NutrientDeficiency; chưa có Disease.
- `MedicineService.AssignUseAsync` chặn Unknown đúng contract. `MedicineUses.tsx`
  chỉ lọc `pair.isActive`; DTO lookup không có condition và trạng thái cây/bệnh.
  `CatalogEditor.tsx` cùng Create/UpdateDiseaseRequest chưa hỗ trợ thay condition.
- Giới hạn này đã được ghi trong [UAT trước](knowledge_medicine.md): test dùng
  fixture Disease riêng, không chứng minh danh mục ứng dụng đã được phân loại.
- Chưa sửa source hoặc dữ liệu; đang chờ chọn phạm vi: bổ sung phân loại qua Admin
  hoặc chỉnh riêng dữ liệu local. Không bỏ kiểm tra Disease hay tự phân loại cả danh mục.

## 2026-10-28 — Thực thi phân loại bệnh trong Admin

- Theo xác nhận của người dùng, bổ sung phân loại trong trình sửa/tạo bệnh cây;
  quản lý thuốc giữ chọn cặp cây–bệnh và giải thích điều kiện trước khi lưu.
- Backend kiểm tra bốn loại hợp lệ, giữ tương thích update cũ, thu hồi duyệt khi
  đổi loại và ẩn hướng dẫn công khai của cặp không còn thuộc Disease.
- Backend/frontend Docker đã build và healthy; API lookup mới trả đủ metadata
  cho 59 cặp. Giữ nguyên dữ liệu phân loại, volume PostgreSQL và AI.
- Kiểm chứng mới: 168 unit + 65 integration + 240 API và 447 frontend đều đạt;
  typecheck/lint/build đạt. API được chạy lại sau khi sửa mã ApiCase trùng.
- Chi tiết thay đổi, kết quả test hiện tại, giới hạn UAT và cách dùng tại
  [báo cáo phân loại bệnh](disease_classification.md). Chưa commit/push.

## 2026-10-29 — Bàn giao tìm kiếm liên kết trong thuốc

- Thêm tìm kiếm cặp cây–bệnh tại Đối tượng sử dụng và nhãn, hỗ trợ không dấu,
  lọc liên kết đã gắn/danh sách chọn và giữ bản nháp khi tìm.
- Kiểm chứng ngày 28: 449 frontend tests, typecheck/lint/build đạt; frontend Docker
  healthy. UAT trên Admin xác nhận lọc 59 cặp còn một cặp và xóa lọc hoạt động.
- Nơi hiển thị cho người dùng, điều kiện công khai và bằng chứng tại
  [báo cáo](disease_classification.md#2026-10-29--bàn-giao-tìm-kiếm-cặp-câybệnh-trong-thuốc).

## 2026-10-29 — Hoàn thiện năm thay đổi Admin đã thống nhất

- Chuyển tìm kiếm vào popup chọn cặp cây–bệnh, bỏ ô tìm bên ngoài và trường
  Đối tượng sử dụng cũ. Backend cho phép bỏ trường cũ, giữ dữ liệu đã có.
- Hiện bệnh/tình trạng dưới hoạt động của cây; hiện phân loại dưới hoạt động
  của bệnh; phân trang liên kết 20 mục và debounce tìm kiếm 500 ms.
- Kiểm chứng ngày 29: 453 frontend, 168 unit, 241 API đạt. Integration đạt 63/65
  ở lượt đầu; hai lỗi đếm migration cũ đã sửa và chạy lại đạt 2/2.
- Docker backend/frontend đã build, migration riêng đã áp dụng; cả hai healthy.
  Khi tiếp tục lúc 11:01 đã khởi động lại frontend đang dừng, health trực tiếp/proxy
  đều 200/Healthy. AI không cập nhật. UAT trực tiếp đã xác nhận cây/bệnh; popup và
  phân trang có test tự động, chưa hoàn tất UAT do phiên đăng nhập/kết nối trình duyệt.
- Chi tiết source, tương thích dữ liệu, backup và giới hạn trong
  [báo cáo refinements](admin_catalog_refinements.md). Chưa commit/push.
