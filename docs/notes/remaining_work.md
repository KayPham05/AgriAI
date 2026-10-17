# AGRI-127 — Việc còn lại và quyết định còn mở

Cập nhật: 2026-10-17. Nhánh: `AGRI-127-database-improvement`.

Đây là danh sách bàn giao tập trung. Các báo cáo khác giữ thiết kế và bằng chứng
của từng đợt; cập nhật trạng thái việc còn lại tại file này để tránh nhiều bản khác nhau.
Nguồn: [tổng quan](../reports/AGRI-127/database_improvement_overview.md),
[thiết kế DB](../reports/AGRI-127/database_improvement_implementation.md), [QA hệ thống](../reports/AGRI-127/system_qa.md),
[checkpoint/bảo mật](../reports/AGRI-127/system_qa.md) và quyết định trực tiếp trong phiên.

**Trạng thái phạm vi chính:** DB/migration/kiểm thử đã chốt của AGRI-127 đã hoàn tất
theo bằng chứng được ghi nhận. Chưa thấy quyết định dữ liệu nào còn thiếu đang chặn
phạm vi đó. Các mục dưới không tự mở rộng AGRI-127 thành triển khai toàn bộ US-01–10,
không xác nhận Jira Done hoặc toàn nhánh đã qua kiểm tra trên GitHub.

## 1. Xác minh và bàn giao còn thiếu

- [ ] **Thử khôi phục backup trên PostgreSQL riêng.** Đã có custom-format dump và
  đọc được `pg_restore --list`; chưa restore thử. Đối chiếu dữ liệu/schema/catalog
  và migration đúng thời điểm backup, sau đó thử nâng lên 5 migration hiện tại;
  không ghi đè database/volume ứng dụng.
- [ ] **Xác minh GitHub Actions trên thay đổi được bàn giao.** Local pass không thay
  thế kết quả workflow. Ngưỡng branch hiện hành backend/frontend/Python là
  **60%/60%/40%**, target từng phần **80%**; xem [gate và lần đo](../reports/AGRI-127/README.md).
- [ ] **Rà lỗi format toàn frontend trước khi tuyên bố `check:ci` local đạt.** Lần
  `system/frontend-format.log` báo 161 file cũ khác formatter trên Windows, chủ yếu
  CRLF; file thay đổi đã có kiểm tra riêng pass. Cần xác minh nguyên nhân/môi trường
  và phạm vi sửa, không mass-format ngoài phạm vi hoặc tắt kiểm tra. Không suy ra
  GitHub Actions đang fail từ kết quả này; workflow và `check:ci` không cùng tập lệnh.
- [ ] **Review/PR và bàn giao Git khi được yêu cầu.** Chưa có bằng chứng review của
  con người, chưa commit/push/tạo PR cho các thay đổi hiện tại. Đây không phải quyền
  tự thực hiện các thao tác đó; không tự gán reviewer hoặc đổi trạng thái Jira.

## 2. API/UI và tích hợp đã rõ yêu cầu, chưa triển khai

Các mục này nằm ngoài phạm vi triển khai DB đã chốt, được giữ để giao cho công việc
tính năng tiếp theo. Không coi có bảng hoặc test fixture là có API vận hành.

- [ ] **Hồ sơ nông nghiệp:** CRUD theo chủ sở hữu, tên bắt buộc/mô tả tùy chọn;
  mời tạo sau đăng nhập và cho phép bỏ qua. Hồ sơ nhóm kết quả, cây/bệnh lấy từ
  từng kết quả; không buộc chọn cây hoặc giới hạn mỗi hồ sơ một cây/bệnh.
- [ ] **Gắn/gỡ hồ sơ khi chẩn đoán:** truyền profile ID tùy chọn trước khi dự đoán,
  kiểm tra sở hữu và lưu cùng kết quả trong giao dịch. Không chọn hồ sơ vẫn auto-save
  theo tài khoản. Không chuyển/gắn lại kết quả cũ; gỡ liên kết hoặc xóa hồ sơ giữ
  lịch sử/snapshot, ảnh tiếp tục hết hạn sau 30 ngày. Gỡ hồ sơ không gọi xóa prediction.
- [ ] **Lọc lịch sử:** kết hợp user/hồ sơ/cây/bệnh/ngày, phân trang tại DB và sort
  thời gian + ID ổn định; trả thông tin hồ sơ phù hợp. Cần contract ở mục 3.
- [ ] **Phiên và tài khoản:** nối JWT với `user_sessions`, phát session ID và kiểm
  tra user active/role/expiry/revoked cho API bảo vệ. `LoginAsync` hiện chưa kiểm tra
  `IsActive`; DB thu hồi phiên chưa làm JWT HTTP mất hiệu lực. Logout thu hồi phiên
  hiện tại; disable/đổi role thu hồi mọi phiên, ghi audit actor/action cùng giao dịch.
- [ ] **Tài khoản cá nhân và xác thực:** hoàn thiện cập nhật thông tin/đổi mật khẩu,
  Google, verify email và quên/reset mật khẩu bằng identities/action tokens hiện có.
  DB đã có cấu trúc hỗ trợ; các endpoint/contract tương ứng chưa được nghiệm thu.
- [ ] **Quản trị tài khoản:** tìm kiếm/quản lý trạng thái và quyền, bảo vệ thao tác
  Admin và audit không chứa secret. Test danh mục hiện có không chứng minh các
  endpoint quản trị mới chưa tồn tại đã được phân quyền đúng.
- [ ] **Tri thức/thuốc:** CRUD, duyệt/ẩn/hiệu lực và quyền Admin. Đọc lại trạng thái
  sau trigger khi cần; public chỉ trả active + approved + public. Thuốc cần mục sử dụng
  đúng cặp cây–bệnh, đã duyệt/xác minh nhãn. Không coi `Disease.Medication` cũ là thuốc
  có nguồn/nhãn đã xác minh; rà endpoint đọc disease tránh lộ nội dung chưa duyệt.
- [ ] **Nội dung kết quả/snapshot:** nối nguồn tri thức phù hợp, giữ cảnh báo khi
  confidence ≤80%, chỉ thuốc khi >80% + có bệnh + nội dung hợp lệ đã duyệt; khỏe/
  thiếu dinh dưỡng không thuốc. Nội dung thiếu duyệt hiện thông báo đã chốt. Snapshot
  giữ nguyên kết quả từng thời điểm, không sửa lại lịch sử theo kho tri thức mới.
- [ ] **Workflow nhiều ảnh và kiểm tra đầu vào:** chỉ tổng hợp khi tất cả ảnh cùng
  cặp nhãn cây/tình trạng, confidence trung bình cộng; khác nhãn thì từ chối kết quả
  chung, từ chối ảnh không phải lá/ngoài nhóm cây. Tổng dung lượng dưới 30 MB theo
  quyết định đã chốt. Test 15 MiB của endpoint một ảnh hiện tại không nghiệm thu
  contract nhiều ảnh hoặc tự chốt quy đổi MB.
- [ ] **Guest và lỗi tích hợp:** giữ không hồ sơ/không history/không ảnh lâu dài;
  rate limit và xử lý lỗi dịch vụ ở luồng thực còn cần nghiệm thu. Các ca Guest
  đã pass trong QA là bằng chứng có phạm vi, không nghiệm thu toàn bộ US-05.
- [ ] **Storage và hết hạn:** xác minh truy cập Cloudinary private, hoàn thiện
  luồng lỗi giữa lưu DB/storage và cleanup định kỳ sau khi chốt lịch. Tiếp tục ẩn
  URL ảnh hết hạn, giữ kết quả/snapshot; chưa có scheduler. `--expire-images` là
  thao tác xóa ảnh thật, không dùng như health check.

## 3. Quyết định còn mở cho contract API/UI và vận hành

| Nhóm | Cần chốt trước phần triển khai liên quan |
|---|---|
| Lịch sử | Timezone, cách biểu diễn ngày đầu/cuối, contract sort/phân trang và giới hạn trang |
| Nhiều ảnh | MB sang byte, số ảnh tối đa, hợp đồng request/response nhiều ảnh và snapshot; số chữ số/cách làm tròn confidence |
| Xác thực | Hạn liên kết email/reset, chính sách mật khẩu, giới hạn đăng nhập sai, quyền tài khoản chưa xác minh |
| Google/email | Quy tắc liên kết tài khoản; lời nhắc đăng nhập trong luồng Guest. Lời mời tạo hồ sơ sau đăng nhập có thể bỏ qua đã chốt |
| Xóa lịch sử | Có xác nhận xóa bản ghi không; ảnh có bị xóa khỏi storage ngay khi xóa **bản ghi lịch sử** không. Không nhầm với gỡ/xóa **hồ sơ**, vốn đã chốt giữ lịch sử |
| Vận hành | Lịch cleanup, cấu hình backup/restore và cách phục hồi triển khai; migration hiện forward-only, không mặc định downgrade |

Đây không phải lý do thêm cột DB suy đoán vào AGRI-127. Không chốt lại những quyết
định đã có: hồ sơ tùy chọn, không chuyển kết quả, ảnh 30 ngày giữ lịch sử, duyệt lại
khi sửa nội dung và chính sách thu hồi phiên.

## 4. Kiểm thử mở rộng chưa thực hiện hoặc chưa đạt

- [ ] Nâng branch coverage từng component tới target 80% bằng test có ý nghĩa.
  Lần đo gần nhất theo component: backend **62,01%**, frontend **61,83%**, Python
  **47,12%**. Xem [README](../reports/AGRI-127/README.md) để phân biệt đợt chạy và nguồn bằng chứng;
  không loại production source để tăng điểm.
- [ ] Bổ sung coverage có ý nghĩa cho offline dataset scripts/training CLI Python
  và route/provider frontend. `validation.ts`/`gradcam.ts` chưa có caller hoạt động
  trong đợt rà source; xác minh mục đích sử dụng trước khi viết test, không tạo test
  giả hoặc loại source khỏi coverage. Nguồn: đợt [system QA](../reports/AGRI-127/system_qa.md).
- [x] Đánh giá accuracy/Macro-F1 trên test set v1.4 cố định trong ổ D, giữ split/metric.
  Hoàn tất 17.599 ảnh cho từng checkpoint plant (10 lớp) và disease (44 lớp);
  [kết quả và evidence](../reports/AGRI-127/fixed_test_evaluation.md). Đây là đánh giá hai classifier,
  chưa nghiệm thu metric toàn pipeline 59 cặp hoặc khả năng từ chối ảnh ngoài phạm vi.
- [x] Phân tích/sửa báo nhầm Khoe_manh → Dom_than_la: loss weighting đã sửa,
  loader/evaluator áp hiệu chỉnh chỉ cho checkpoint SHA đã xác minh. Test cố định:
  428 → 0; F1 lớp 0,030435 → 0,857143; disease Macro-F1 0,970392.
  [Bằng chứng và trade-off](../reports/AGRI-127/disease_false_positive_fix.md); không sửa dữ liệu/checkpoint gốc.
- [ ] Cải thiện các lớp ít mẫu bằng train/validation và đánh giá độc lập: Dom_than_la
  còn nhận đúng 6/8 (trước 7/8), Vang_lui F1 0,744186, Sau_gai_an_la 0,768293.
  Chưa huấn luyện lại với loss mới, chưa nghiệm thu GPU/khả năng khái quát thực tế;
  không tinh chỉnh tiếp theo test set hoặc tự đổi ngưỡng confidence 80% đã chốt.
- [ ] Nghiệm thu luồng thực xuyên CLI–HTTP–backend–web với checkpoint thật và
  storage thật. Đã có 6 test checkpoint và ca .NET gọi FastAPI thật pass local;
  storage trong ca .NET vẫn fake, frontend dùng jsdom/API doubles. Không gọi phần
  đã kiểm tra là chưa làm, cũng không suy rộng thành nghiệm thu toàn tuyến.
- [ ] E2E trình duyệt, responsive/visual/cross-browser thực — **để sau theo yêu cầu**.
- [ ] Tải đồng thời/performance và security scan đầy đủ OWASP/SAST/DAST/dependency;
  full mutation score chưa có. JWT negative tests và một kiểm tra độ nhạy JWT đã
  chạy không phải chứng nhận bảo mật toàn hệ thống. Phạm vi/công cụ cần xác định
  khi thực sự làm phần kiểm thử mở rộng.
- [ ] GPU diagnostic chỉ chạy tường minh khi có nhu cầu/môi trường; chưa chạy trong
  bộ CPU và không phải điều kiện hoàn tất thay đổi DB.
- [ ] Đánh giá khả năng skill QA tự chọn guide bằng thử nghiệm agent nếu cần; hiện
  mới xác minh cấu trúc/hash/link, chưa đo routing. Đây là tùy chọn của bộ skill,
  không phải yêu cầu nghiệp vụ database.

## 5. Hạng mục chưa nhận triển khai

| Hạng mục | Trạng thái và ranh giới |
|---|---|
| UUID v7 | **Tạm gác theo người dùng**. Mới dừng ở khảo sát; không đổi generator, ID, SQL import, migration hay image PostgreSQL |
| API khuyến nghị US-10 | Stretch goal, dùng dữ liệu có nguồn/đã duyệt; không phải điều kiện đóng phạm vi DB AGRI-127 |
| Hạ tầng registry/VPS/domain/CD | Chưa chốt nhà cung cấp/cấu hình trong confirmed decisions; không thuộc triển khai DB lần này |

## Cách cập nhật

Chỉ đánh dấu hoàn tất khi có source hoặc quyết định mới cùng bằng chứng phù hợp;
ghi đợt/lệnh/artifact và giới hạn vào báo cáo liên quan, bổ sung task log. Không
thay số liệu của lần chạy cũ bằng kết quả mới hoặc tự tạo Jira key/owner/deadline.
