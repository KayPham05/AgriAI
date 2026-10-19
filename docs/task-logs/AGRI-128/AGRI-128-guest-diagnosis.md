# AGRI-128 / AGRI-118 — Guest diagnosis backend

- Ngày: 2026-10-19.
- Task được giao: AGRI-118, story AGRI-110, hạng mục S3-05.
- Nhánh: `AGRI-128-guest-diagnosis`.
- Nhánh đích PR: `AGRI-128-backend-improvement`.
- Owner/reviewer: chưa xác minh tài khoản, không tự gán.
- Trạng thái: backend đã kiểm chứng local; chưa PR/CI approval.

## 1. Phạm vi đã chốt

Người dùng xác nhận chỉ làm backend; frontend Guest sẽ giao sau. Guest dùng
chẩn đoán như tài khoản đăng ký nhưng không lưu ảnh/lịch sử. Không thêm quota
riêng cho Guest; giữ phân quyền API cá nhân/quản trị. Kế hoạch chi tiết tại
[guest diagnosis plan](../../plans/AGRI-128-guest-diagnosis-plan.md).

## 2. Khảo sát và môi trường

- Tách nhánh con từ `0fa664a`, giữ nguyên hai file local untracked
  `Dockerfile.ai`, `docker-compose.ai.yml`.
- Đọc rules AGRI-128 và pipeline; không thay schema hoặc migration. Source hiện
  chưa có các API hồ sơ nông nghiệp được mô tả trong kế hoạch tích hợp.
- Docker ban đầu chưa chạy; khởi động Docker Desktop để chạy DB test cô lập.
  Docker đồng thời khởi động lại container PostgreSQL ứng dụng theo cấu hình
  sẵn có; không migrate, sửa hoặc xóa volume/dữ liệu ứng dụng.
- Restore dependency bằng cấu hình hiện có; ReportGenerator 5.5.4 cài vào cache.
  Lần test trong sandbox không cung cấp kết quả; dùng lần chạy ngoài sandbox
  có TRX và số test đầy đủ làm bằng chứng.

## 3. Thay đổi và RED/GREEN

Baseline đạt 33 unit + 33 integration; coverage 207/358 = 57.82%.
Năm regression test xác nhận token lỗi/hết hạn/subject lỗi trả 200 như Guest.
Sửa controller kiểm tra trạng thái xác thực trước khi xác định user ID; năm
test chạy lại đạt. Giữ Guest không token nhận 200 và User hợp lệ nhận 201.

Bổ sung kiểm thử HTTP/DB cho response Guest đầy đủ, không ghi các bảng liên
quan, không gọi storage, không thay lịch sử User, chặn API cá nhân/quản trị,
lỗi input/AI/mapping. Bổ sung unit tests hủy request, thiếu file và ID kết quả
Guest không có trong history. Các test bảo vệ hành vi có sẵn không được trình
bày như đã từng thất bại trước triển khai.

## 4. Kết quả và bằng chứng

- Baseline: `.cache/agri128-guest/baseline/`, `baseline-merged/`.
- RED: `.cache/agri128-guest/red/guest-red.trx`, 5 fail đúng lỗi.
- GREEN: `.cache/agri128-guest/green/guest-green.trx`, 5 pass.
- Full verification: `.cache/agri128-guest/verification/`, 36 unit + 54 integration
  đạt; failed/skipped 0. ReportGenerator 5.5.4 gộp coverage thành
  `.cache/agri128-guest/verification-merged/Cobertura.xml`: 228/364 = 62.64%.
  Script kiểm coverage của repository xác nhận PASS với ngưỡng 60%.
  Mục tiêu 80% chưa đạt; không thay ngưỡng hoặc exclusions.
- [Báo cáo kỹ thuật, contract và ma trận kiểm chứng](../../reports/AGRI-128/guest_diagnosis.md).
- Commitlint regression: 1/1 đạt ngoài sandbox (sandbox chặn spawn với EPERM).
  Subject dự kiến đạt commitlint; `git diff --check` đạt. Gitleaks v8.24.2
  quét 133 commit trước thay đổi, không phát hiện leak.
- Staged diff gồm đúng 7 file của task; Gitleaks không phát hiện leak. Liên kết
  local trong 4 tài liệu mới hợp lệ; hai file Docker local không được stage.

## 5. Việc còn lại

Full-suite/coverage đã chốt; tiếp tục review diff và tạo PR theo yêu cầu. GitHub CLI portable
được tải từ bản phát hành chính thức và kiểm SHA-256 vào `.cache/tools/gh/`;
hiện chưa có phiên đăng nhập. Đã đề nghị người dùng đăng nhập bằng trình duyệt,
không gửi token/mật khẩu qua chat. UI Guest, API hồ sơ tương lai, inference thật
và reviewer/CI được theo dõi riêng; chưa đổi Jira Done.

Bộ kiểm duyệt tự động từ chối thử lấy credential từ Git Credential Manager
để dùng cho GitHub CLI vì nguồn credential chưa được người dùng cho phép.
Không tiếp tục cách này; dùng `gh auth login --hostname github.com --web`.
Reviewer backend theo rules là Tran Trung Thong, cần xác minh GitHub login
trước khi gửi review request.

## 6. Bàn giao local và remote ngày 2026-10-19

- Commit code/tài liệu `4096da5` đã push lên `origin/AGRI-128-guest-diagnosis`.
  Script commitlint trên commit thực tế đạt; Gitleaks sau commit quét 134 commit,
  không phát hiện leak. Hai file Docker local tiếp tục giữ nguyên, không commit.
- Trang compare xác nhận base `AGRI-128-backend-improvement`, head
  `AGRI-128-guest-diagnosis`, 1 commit và 7 file của task ở thời điểm kiểm tra.
- PR chưa tạo vì cả GitHub CLI và trình duyệt khả dụng đều chưa đăng nhập.
  Nội dung PR theo template đã chuẩn bị tại `.cache/agri128-guest/pr-body.md`
  (artifact local, không có trong checkout mới).
- Chờ phiên đăng nhập chính thức để tạo PR, gán reviewer đã xác minh và kiểm
  GitHub Actions. Không tuyên bố CI đạt hoặc task AGRI-118 hoàn tất toàn bộ.
