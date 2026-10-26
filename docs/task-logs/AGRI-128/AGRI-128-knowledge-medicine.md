# AGRI-128 / AGRI-122 — Knowledge and medicine A/B/C

- Cập nhật: 2026-10-25; A/B và frontend C đã có code/kiểm chứng local; DoD Jira còn chờ UAT/CI/review. Các mốc bên dưới được giữ riêng theo ngày.
- Owner: chưa xác nhận; không tự gán.
- Nhánh: `AGRI-128-knowledge-medicine`, base tích hợp `e1197ce`.
- PR: [#46](https://github.com/KayPham05/AgriAI/pull/46), đã giải quyết xung đột local với base e1197ce; chờ CI/review, chưa merge PR.

## Phạm vi đã triển khai

- Backend CRUD/tra cứu thuốc và bài viết dạng nội dung + nguồn; ngừng hoạt động khi xóa.
- Liên kết với cây–bệnh, publication Admin, lọc public, validation và phân trang.
- Tích hợp thuốc đủ điều kiện vào kết quả/snapshot; bảo toàn Guest và history.
- A/B tái sử dụng CRUD cây/bệnh và giữ mapping AI; phần C được triển khai ở mốc 2026-10-25 bên dưới.
- Admin duyệt nội dung bệnh qua API; sửa nội dung thu hồi duyệt. Response sau sửa thuốc/
  bài viết đọc lại database để phản ánh chính xác trigger. Không thay schema/migration.

## Kiểm chứng và phần còn lại

- Unit `unit-current-retry`: 109/109 đạt, không skip.
- Integration `integration-current`: 17/19 đạt; hai lỗi giữ duyệt do trigger DB cũ.
- Các lần chạy trên là mốc trước quyết định duyệt lại, không đại diện kết quả bàn giao.
- Người dùng đã chốt giữ trigger hiện tại, sửa xong cần duyệt lại. API đã được sửa để
  đọc lại cờ từ database sau lưu. Không thêm/sửa migration, không migrate database ứng dụng.
- Kết quả cuối: build 0 warning/0 error; **109 unit + 171 integration = 280/280 đạt**,
  không skip trong bộ lọc CI; branch coverage **547/740 = 73.92%**, vượt gate 60%,
  chưa đạt target 80%. Hai bộ qua script kiểm chứng TRX/coverage của CI.
- Bằng chứng: `.cache/knowledge-medicine/build-delivery.log`,
  `.cache/knowledge-medicine/verified/unit/unit.trx`,
  `.cache/knowledge-medicine/delivery/integration/integration.trx`,
  `.cache/knowledge-medicine/delivery/merged/Cobertura.xml`.
- Lần integration trước (`verified/integration`) có 8 lỗi setup Admin tại constraint
  thu hồi phiên; fixture đã đổi thành seed role Admin trước khi đăng nhập. Không đổi
  auth, trigger hoặc bỏ test. Lần `delivery/integration` đạt đủ 171 ca.
- `git diff --check` đạt. Code và tài liệu nằm riêng trong worktree nhánh này;
  worktree Guest/History giữ nguyên. Chưa commit/push/PR theo phạm vi được giao.
- Cần test thủ công và GitHub Actions sau khi hoàn tất; AI/storage test dùng fakes.

Chi tiết phạm vi, file ảnh hưởng, API và bằng chứng:
[báo cáo kỹ thuật](../../reports/AGRI-128/knowledge_medicine.md).
Kế hoạch: [A/B](../../plans/AGRI-128-knowledge-medicine-plan.md).

## 2026-10-25 — Lập kế hoạch C theo phạm vi mới

- Người dùng xác nhận cả Admin quản lý cây/bệnh/thuốc/bài viết và tra cứu User/Guest.
- Bổ sung [kế hoạch C](../../plans/AGRI-128-knowledge-medicine-frontend-plan.md):
  hiện trạng, màn hình, API, quy trình duyệt, phụ thuộc A/B, sáu bước thực hiện,
  ma trận nghiệm thu và unit/component/integration; không E2E.
- Đối chiếu khung Admin, guard/provider, catalog adapter, DTO/controllers và cấu hình
  frontend. Chưa sửa code, chưa tạo nhánh, commit/push hoặc PR cho phần C.
- File ảnh hưởng trong lượt: kế hoạch C mới, liên kết bổ sung vào kế hoạch A/B,
  báo cáo `knowledge_medicine.md`, index báo cáo và task log này.
- Chỉ rà tài liệu và liên kết nội bộ; không chạy build/test ở lượt lập kế hoạch.
  Kết quả test 2026-10-24 giữ nguyên là bằng chứng A/B, không dùng để kết luận C đạt.
- Còn lại: người dùng duyệt kế hoạch, kiểm tra base và khả năng tích hợp A/B trước
  khi triển khai; đề xuất bắt đầu bằng luồng bài viết Admin → public.

## 2026-10-25 — Đồng bộ nhánh gốc trước phần C

- Người dùng yêu cầu C làm chung nhánh `AGRI-128-knowledge-medicine`, không tạo nhánh
  mới, và merge nhánh `AGRI-128-backend-improvement` trước khi thực hiện.
- Đã fetch origin thành công; HEAD, FETCH_HEAD và origin/AGRI-128-backend-improvement
  cùng `a43797db2c216b8d1955b00b787a1b1962ad0cdd`.
- Chạy `git merge --ff-only origin/AGRI-128-backend-improvement` trả
  `Already up to date.` Không conflict; 39 đường dẫn local vẫn giữ sau thao tác.
- Không cần stash, không tạo commit hoặc push; chưa triển khai C. Cập nhật quyết
  định nhánh và mốc đồng bộ trong kế hoạch C, báo cáo và task log này.
- Không chạy lại tests vì không có thay đổi code từ merge. Bằng chứng kiểm tra:
  output fetch/merge/rev-parse và không có đường dẫn unmerged trong lượt này.

## 2026-10-25 — Triển khai C và kiểm chứng local

- Theo yêu cầu, thực hiện trên `AGRI-128-knowledge-medicine`; giữ nguyên backend A/B
  chưa commit, không tạo nhánh mới, không thay migration và không sửa worktree khác.
- Thêm UI Admin cho cây/bệnh/thuốc/bài viết/liên kết với API thật; thêm public list/detail,
  filter/search/pagination, nguồn và nội dung text an toàn. Guest không cần đăng nhập,
  User đọc public không phụ thuộc startup history. Giữ trigger sửa phải duyệt lại.
- Đường dẫn chính: `frontend/src/features/knowledge/`, `src/services/knowledgeApi.ts`,
  `AdminCrmPage.tsx`, `AppProvider.tsx`, routes public, navigation, types và frontend/tests.
  Kế hoạch C, báo cáo kỹ thuật và index đã cập nhật; không sửa package/lockfile.
- Kết quả mới: **402/402 frontend tests**, 59 file, không skip; 49 ca mới, không E2E.
  Coverage branch **1827/2548 = 71.70%**, vượt floor 60%, chưa đạt target 80%.
  Typecheck/lint/build đạt; formatter toàn cây đạt trên bản LF. Sau đó khôi phục
  CRLF của baseline không đổi để tránh trạng thái Git ngoài phạm vi; xem giới hạn
  Windows và hướng dẫn checkout LF trong báo cáo. `git diff --check` đạt.
- Backend build 0 warning/error; không chạy lại full backend tests trong lượt C.
  Bộ 280 backend tests ngày 2026-10-24 vẫn là bằng chứng lịch sử A/B.
- Thử UI với API thật và database riêng `agri122_ui_d1a1d5df8820`: bài viết tạo/duyệt/
  công khai/sửa/ngừng/khôi phục; thuốc tạo/lưu nhãn/xác minh/duyệt/public; tab Guest đọc
  dữ liệu được phép. HTTP kiểm thêm Guest 401, User 403, đổi nhãn thu hồi cờ + 404,
  duyệt lại + 200. Không dùng AI hoặc storage giả để tuyên bố inference thật.
- Kiểm responsive public 375/768/1280px; Admin 375px phát hiện nút nhãn dài tràn ngang,
  đã sửa wrap/max-width. Cần chụp lại Admin sau sửa và UAT nhóm; không ghi nhận bước
  chưa chạy là đạt. Seed loại bệnh Unknown được chuẩn bị thành Disease chỉ trong DB
  test để kiểm thuốc, không thay dữ liệu thật.
- Bằng chứng local: `D:/AgriAI/.cache/knowledge-c-coverage-verified.log`,
  `knowledge-c-build-verified.log`, `knowledge-c-live-check.log`, report coverage
  trong `.cache/coverage/frontend/`. Report chi tiết có ma trận và hướng dẫn UAT.
- Giữ môi trường test riêng để người dùng thử: web localhost:3000, API 127.0.0.1:5034.
  Chưa commit, push, PR hoặc xác nhận GitHub CI; không tự gán reviewer/owner hay Jira Done.

## 2026-10-25 — Debounce 500ms theo yêu cầu bổ sung

- Tái sử dụng SearchField cho danh mục public/Admin và liên kết cây–bệnh; tự lọc
  sau khi ngừng gõ 500ms. Enter/nút tìm áp dụng ngay, xóa trả danh sách ngay, tìm mới
  về trang 1. Hủy timer khi đổi URL/unmount, giữ bộ lọc hiện tại.
- Sửa 4 file source: shared CatalogControls và ba module KnowledgeAdmin/PublicCatalog/
  PlantDiseaseManager; thêm CatalogDebounce integration tests (12 ca).
- Kiểm chứng mới: **414/414 frontend tests**, 60 file, không skip; branch coverage
  **71.94% (1836/2552)**. Typecheck/lint/build/format 5 file và diff-check đạt.
  Format toàn cây Windows còn điều kiện LF như mốc trước; không hạ gate CI.
- Build lại, khởi động production frontend localhost:3000; quan sát tìm trên `/plants`
  tự đổi URL và danh sách. Các log `knowledge-debounce-*.log` tại `D:/AgriAI/.cache/`.
- Không đổi backend/schema/dependency, không E2E, chưa commit/push/PR. Cập nhật báo cáo
  kỹ thuật và index; các mốc 402 tests trước đó được giữ là bằng chứng lịch sử.

## 2026-10-25 — Chuẩn bị PR theo yêu cầu người dùng

- Phạm vi PR: AGRI-122 A/B/C (backend, Admin và tra cứu User/Guest), nhánh
  `AGRI-128-knowledge-medicine` → `AGRI-128-backend-improvement` theo chỉ định.
- Người dùng xác nhận đã test tay giao diện và yêu cầu không chạy lại test local.
  Giữ nguyên bằng chứng đã chạy: backend 2026-10-24 (109 unit + 171 integration),
  frontend 2026-10-25 (414 tests, typecheck/lint/build); không coi là test mới.
- Commit code: `7af021a` backend, `27b5fea` frontend. Không sửa code trong lượt tạo PR.
- Fetch nhánh đích thấy base đã tăng từ `a43797d` lên `e1197ce`. Kiểm tra
  `git merge-tree --write-tree --name-only` phát hiện xung đột tại PredictionService,
  PredictionServiceTests, AppProvider và việc chuyển KnowledgeMedicineTests từ
  IntegrationTests/Controllers sang ApiTests/Controllers. Đây là kiểm tra merge
  bằng object Git, không thực hiện merge và không đưa conflict marker vào source.
- PR chưa đủ điều kiện merge: cần tích hợp các thay đổi R2/API tests/profile mới,
  giải quyết xung đột rồi kiểm chứng phiên bản tích hợp. Không suy rộng kết quả
  local cũ thành kết quả trên base mới hoặc GitHub Actions.
- Reviewer theo rules: backend Trần Trung Thông (`trunthong09012005`), frontend
  Nguyễn Phạm Bảo Khanh (`kats205`), đối chiếu danh sách collaborator GitHub.
- Rà staged paths và diff, `git diff --cached --check` đạt cho hai commit code;
  chỉ có credential giả trong test. Không đưa cache/runtime secrets vào Git.
- DoD vẫn chờ tích hợp, CI và domain review. URL PR được bổ sung sau khi tạo.

## 2026-10-25 — PR đã tạo

- PR [#46 — AGRI-122 Implement knowledge and medicine management A/B/C](https://github.com/KayPham05/AgriAI/pull/46).
- Head `AGRI-128-knowledge-medicine`, base `AGRI-128-backend-improvement`.
- Đã push code và tài liệu; đã yêu cầu review `trunthong09012005` và `kats205`.
- Không chạy lại tests theo yêu cầu người dùng; PR ghi riêng kết quả lịch sử và xác
  nhận test tay của người dùng. Chưa xác minh GitHub Actions; chưa merge.
- Vẫn còn các xung đột với base mới đã ghi ở mốc trước; cần tích hợp và kiểm chứng
  trước khi merge. Không tự sửa code hoặc giảm điều kiện CI trong lượt tạo PR.

## 2026-10-26 — Giải quyết xung đột PR #46

- Tích hợp base e1197ce: giữ R2/upload journal cùng thuốc đã xác minh, cập nhật
  PredictionService/fixture và chuyển KnowledgeMedicineTests sang bộ ApiTests mới.
- Giữ public catalog và profile update trong AppProvider; regression phát hiện và
  sửa logout của restored pending session để luôn revoke server trước clear local.
- Cập nhật manifest 59 routes/11 ApiCase AGRI-122, test quyền và inactive visibility;
  hai test upstream chỉ sửa format. Không migration mới, không E2E, không đổi DB thật.
- Chi tiết thay đổi, các lần test thất bại và kết quả cuối: [báo cáo](../../reports/AGRI-128/knowledge_medicine.md).

- Kiểm chứng cuối 2026-10-26: backend 460/460 (156 unit + 65 integration + 239 API), branch 83.56%; frontend 440/440, branch 72.37%; typecheck/lint/build và format bản sao LF đạt. Không skip trong bộ lọc CI. Không chạy E2E/RealR2/RealCheckpoint hay migrate DB ứng dụng. Git không còn unmerged; CI remote chưa xác minh.
