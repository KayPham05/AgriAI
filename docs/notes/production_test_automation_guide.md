# Hướng dẫn Vận hành và Chuyển đổi Automation Test chuẩn Production

Tài liệu này quy định kiến trúc, quy trình vận hành và giải pháp kỹ thuật nhằm lưu trữ, cập nhật tự động các ca kiểm thử (testcase) lên 3 Google Sheets của dự án AgriVision theo đúng định dạng biểu mẫu (Living Test Specification) và đạt chuẩn kiểm thử chuyên nghiệp (/qa-testing, TESTING.md).

---

## 1. Hiện trạng thực tế của 3 Google Sheets

Dữ liệu xác nhận trực tiếp từ hệ thống Google Sheets của dự án:

### 1.1. Sheet 1: Testcase API
- ID: 1BBHMgQMQMMFzrMlxzjRHDd73QATmPVUvqpf6gKkjsUg
- Tab tổng hợp: "Report bug" (Bảng dashboard tổng hợp trạng thái, dòng Total ở hàng 10).
- Tab mẫu: "Template"
- Các tab chi tiết hiện có: "API-HEALTH-01 GET /api/health", "API-PRED-01 POST /api/predictions" và các tab nghiệp vụ cũ ([API001] Voucher, [API002] KhachHang, [API003] SanPham).
- Cấu trúc cột dữ liệu chi tiết (từ dòng 16):
  - Cột A: ID (Mã testcase duy nhất, ví dụ: API-HEALTH-01)
  - Cột B: Item (Hạng mục chức năng, ví dụ: Prediction)
  - Cột C: Testcase Name (Tên ca kiểm thử)
  - Cột D: Precondition Test Case (Điều kiện tiên quyết)
  - Cột E: Test data (Dữ liệu kiểm thử)
  - Cột F: Request params
  - Cột G: Request body
  - Cột H: Expected Status code
  - Cột I: Expected Body
  - Cột J: Expected Database
  - Cột K: Result (Passed / Failed / Blocked / Not run)
  - Cột L: Execution (Automation / Manual / N/A)
  - Cột M: Note / Evidence (Bằng chứng thực thi, mã run_id, stderr nếu có lỗi)

### 1.2. Sheet 2: Testcase Screen
- ID: 1p1CN5KM1PVFcYvPD_rvfziO8rxcYgljG56LUb0DSCIQ
- Tab tổng hợp: "Report" (Bảng dashboard tổng kết tỷ lệ kiểm thử màn hình, hàng Total nằm ở dòng 12).
- Tab mẫu thực tế: "Template " (Lưu ý: Có ký tự khoảng trắng không ngắt ở cuối tên tab).
- Các tab chi tiết hiện có: "WEB-DIAG-01 Diagnosis" và 5 tab màn hình cũ (SR_001 đến SR_005).
- Cấu trúc cột dữ liệu chi tiết (từ dòng 15):
  - Cột A: No. (Mã kiểm thử hoặc số thứ tự, ví dụ: WEB-PRED-01)
  - Cột B: Main Category
  - Cột C: Sub Category
  - Cột D: Type (UI / Function)
  - Cột E: Pre-Conditions
  - Cột F: Test Descriptions
  - Cột G: Steps
  - Cột H: Expected Result
  - Cột I: Testing result Chrome (Passed / Failed / Blocked / Not run)
  - Cột J: Execution (Automation / Manual / N/A)
  - Cột K: Remarks (Bằng chứng, lỗi và ghi chú)

### 1.3. Sheet 3: Test viewpoint
- ID: 1wFM32VTHADjP-DnB3yLTZ5WjbPwDEs2HDOgnvcN0TbA
- Tab tổng hợp: "Overview" (Danh sách dạng bảng phẳng: No., Sheet name, Screen, Status, Remarks).
- Tab mẫu: "Template"
- Các tab chi tiết hiện có: "VP-API-01 Prediction Upload" và các tab SR_001 đến SR_005.
- Cấu trúc cột dữ liệu chi tiết (từ dòng 3):
  - Cột A: No.
  - Cột B: Tên bộ phận / Tên hệ thống chức năng
  - Cột C: Đối tượng test - Mục lớn
  - Cột D: Đối tượng test - Mục trung
  - Cột E: Đối tượng test - Mục nhỏ
  - Cột F: Mục xác nhận
  - Cột G: Ghi chú (Chứa mã ID định danh, ví dụ: VP-API-01)

---

## 2. Giải pháp khắc phục các điểm kỹ thuật then chốt

Trạng thái trong tài liệu này được hiểu như sau:

- **Đã có:** đã được kiểm chứng trong mã nguồn hiện tại.
- **Cần triển khai:** yêu cầu mục tiêu, chưa được xem là đã có chỉ vì đã mô tả ở đây.
- **Cần xác minh:** phụ thuộc Google Sheets, GitHub Actions hoặc môi trường bên ngoài.

### Điểm 1: Khớp chính xác tên Tab Template giữa Config và Live Sheets
- Vấn đề: Tab mẫu trên Screen Sheet thực tế có ký tự đặc biệt ("Template "). Nếu cấu hình sai tên, lệnh nhân bản duplicateSheet sẽ báo lỗi HTTP 400.
- Giải pháp: Cập nhật tệp tools/testcase-workflow/config/sheets.json để template_tab khớp chính xác chuỗi ký tự trên Sheet. Script dùng hàm kiểm tra tồn tại tự động trước khi gọi lệnh nhân bản.

### Điểm 2: Tính lũy kế an toàn (Idempotency) và khóa ID ổn định
- Vấn đề: Tránh việc chạy CI nhiều lần làm nhân đôi dòng (duplicate rows) hoặc chèn đè vào dữ liệu nhập tay của QA.
- Giải pháp:
  - Cột khóa chính (Primary Key): Cột A đối với API/Screen và Cột G đối với Viewpoint.
  - Hàm upsert_row quét toàn bộ giá trị của cột khóa. Nếu ID đã tồn tại: Chỉ cập nhật các cột trạng thái kết quả (Result, Execution, Note/Evidence), giữ nguyên các cột mô tả nghiệp vụ đã có.
  - Nếu ID chưa tồn tại: Tìm dòng trống đầu tiên bên dưới vùng dữ liệu mẫu để điền dòng mới, không bao giờ chèn đè lên các dòng tiêu đề header.

### Điểm 3: Bảo toàn dữ liệu lịch sử và công thức trên Tab tổng hợp
- Vấn đề: Các tab "Report bug", "Report", "Overview" đang chứa dữ liệu của các màn hình cũ ([API001]..[API003], SR_001..SR_005) và các công thức tổng kết ở dòng Total.
- Giải pháp:
  - Tuyệt đối không xóa hoặc ghi đè toàn bộ bảng tổng kết.
  - Script xác định chính xác vị trí của dòng "Total" (dòng 10 trên Report bug, dòng 12 trên Report).
  - Các dòng dữ liệu mới của AgriVision chỉ được chèn vào trước dòng Total hoặc cập nhật vào dòng đã tồn tại của chính tab đó.
  - Sau khi cập nhật các dòng chi tiết, tính toán lại tổng số case của AgriVision và cập nhật giá trị vào các ô Total tương ứng, không làm lệch hàng của các dự án trước.

### Điểm 4: Tối ưu gọi Google Sheets API bằng Batch Update và Backoff
- Vấn đề: Giới hạn Quota của Google Sheets API là 60 requests/phút/user và 300 requests/phút/project. Gọi API theo từng cell hoặc từng row sẽ gây lỗi HTTP 429 khi số lượng testcase tăng lên.
- Giải pháp:
  - Gom toàn bộ các dòng cần cập nhật của một tab vào một request batchUpdate duy nhất.
  - Áp dụng cơ chế Exponential Backoff: Khi gặp mã lỗi HTTP 429 hoặc 503, tự động chờ lũy kế (2s, 4s, 8s, tối đa 3 lần thử lại) trước khi báo lỗi.
  - Trạng thái: **Đã triển khai và kiểm thử cục bộ**. `sheets_client.py` có batch value writes và retry HTTP/network; production sync đã dùng batch cho detail, summary và dashboard.

### Điểm 5: Khóa tuần tự hóa đồng thời (Concurrency Lock) trên CI
- Vấn đề: Khi 2 PR được merge liên tiếp vào nhánh main, 2 job sync chạy song song cùng đọc và ghi vào Google Sheets cùng lúc sẽ gây xung đột dữ liệu (Race Condition).
- Giải pháp: Cấu hình concurrency ở cấp độ job trong GitHub Actions:
  ```yaml
  concurrency:
    group: sheets-sync-main
    cancel-in-progress: false
  ```
  Tham số cancel-in-progress: false đảm bảo lần chạy trước hoàn tất đầy đủ trước khi lần chạy tiếp theo bắt đầu.

### Điểm 6: Chính sách xử lý testcase bị xóa hoặc đổi tên (Deprecation Policy)
- Vấn đề: Khi một testcase bị xóa trong code hoặc đổi mã ID, nếu xóa dòng trên Google Sheets sẽ làm mất bằng chứng lịch sử và vỡ các liên kết công thức của QA.
- Giải pháp:
  - Áp dụng nguyên tắc Không xóa dòng vật lý (No Physical Deletion).
  - Khi một ID có trên Sheet nhưng không còn trong cases.json: Script tự động chuyển giá trị cột Result thành "Deprecated", ghi chú ngày gỡ bỏ vào cột Note/Remarks và không tính vào tổng số ca kiểm thử đang hoạt động.

### Điểm 7: Kiểm thử tính nhất quán giữa Code và Metadata (Guard Consistency Test)
- Vấn đề: Lập trình viên đổi tên hàm test trong code nhưng quên cập nhật trường selector trong cases.json làm test bị bỏ sót.
- Giải pháp: Thêm test kiểm tra tính nhất quán trong tools/testcase-workflow/test_workflow.py:
  - Quét toàn bộ selector và source_test trong cases.json.
  - Xác thực phương thức test hoặc file test tương ứng bắt buộc phải tồn tại trong mã nguồn thật của repository.
  - Nếu phát hiện selector bị lệch (stale selector), build sẽ thất bại ngay tại bước workflow-smoke.

### Điểm 8: Hợp đồng kết quả giữa các GitHub Actions job
- Mỗi job test phải tạo một file kết quả chuẩn, ví dụ `artifacts/test-results/results.json`, gồm `run_id`, commit SHA, tên job, testcase ID, status, execution, exit code, duration và evidence reference.
- Job test phải upload file kết quả và evidence bằng `actions/upload-artifact@v4` với `if: ${{ always() }}`.
- Job tổng hợp phải download toàn bộ artifact, kiểm tra schema, phát hiện thiếu hoặc trùng testcase ID và quyết định trạng thái workflow cuối cùng.
- `sheets-sync` chỉ được chạy sau job tổng hợp và chỉ sử dụng result artifact của cùng commit/workflow run; không đọc `state.json` local của job khác.
- Lệnh `import-results artifacts` đọc đúng result artifact của workflow run hiện tại trước khi `sync --sheets`.
- Trạng thái: **Đã triển khai**. Các job upload `results.json`; `test-result-summary` validate artifact; `sheets-sync` download rồi chạy `import-results` trước `sync --sheets`. Không dùng `state.json` của job khác để suy diễn kết quả.

### Điểm 9: Policy cho Failed, Blocked, Skipped và Deprecated
- `Passed`: assertion đạt và có evidence.
- `Failed`: test đã chạy nhưng assertion hoặc expected behavior không đạt; làm workflow cuối cùng thất bại.
- `Blocked`: không thể thực thi do môi trường, dependency, service hoặc credential; không được coi là Passed và phải làm workflow thất bại nếu là required check.
- `Skipped`: chỉ dùng khi có điều kiện rõ ràng và phải ghi lý do.
- `Deprecated`: testcase không còn trong `cases.json`; không xóa dòng lịch sử và không tính vào active dashboard.
- PR không ghi vào Google Sheets production. Run trên `main` ghi kết quả sau khi policy kiểm tra hoàn tất.
- Trạng thái: **Đã chốt trong validator và runner**. `Passed`/`Failed`/`Blocked` được ghi rõ; `Failed` và `Blocked` làm gate trả exit khác 0; `Skipped`/`Deprecated` được giữ trong schema và lịch sử.

---

## 3. Quy trình vận hành chuẩn Production (4 Bước)

### Bước 1: Lập trình viên viết mã kiểm thử trong Git
- Kiểm thử được viết trực tiếp bằng các framework tiêu chuẩn của dự án:
  - Backend API: xUnit tại backend/tests/AgriVision.ApiTests/ (sử dụng WebApplicationFactory, FluentAssertions).
  - Frontend Screens: Vitest tại frontend/tests/integration/ (kiểm tra render, xử lý lỗi API).
  - Browser E2E: Playwright tại frontend/tests/browser/ (kiểm tra luồng người dùng trên trình duyệt thật).
- Mã kiểm thử tuân thủ chặt chẽ mẫu Arrange - Act - Assert (AAA), kiểm tra sâu kết quả nghiệp vụ (deep assertion), không chỉ kiểm tra HTTP 200 hoặc phần tử DOM tồn tại.

### Bước 2: Định nghĩa Metadata trong tools/testcase-workflow/config/cases.json
- Mỗi ca kiểm thử được cấp một ID định danh duy nhất không đổi (ví dụ: API-HEALTH-01, API-PRED-01, WEB-PRED-01).
- Khai báo đầy đủ các trường thông tin phục vụ việc điền tự động lên Google Sheets:
  - id: Mã ca kiểm thử.
  - kind: "api", "screen", hoặc "viewpoint".
  - tab: Tên Tab chi tiết đích trên Google Sheets.
  - item: Hạng mục nghiệp vụ.
  - test_name: Tên chi tiết của ca kiểm thử.
  - precondition: Điều kiện tiên quyết của môi trường.
  - expected: Kết quả mong đợi chi tiết.
  - runner: Bộ thực thi tương ứng ("dotnet", "vitest", "playwright", "health").
  - selector: Bộ lọc phương thức test cụ thể để chạy độc lập.

### Bước 3: CI chạy kiểm thử trên GitHub Actions
- Khi mở Pull Request hoặc push code lên nhánh `main`, GitHub Actions kích hoạt các job kiểm thử tương ứng.
- Các job bắt buộc gồm:
  - `backend-tests`: restore dependency, chuẩn bị database/service cần thiết, chạy `dotnet test` và xuất TRX.
  - `frontend-tests`: cài Node/pnpm theo lockfile, chạy Vitest và xuất report.
  - `playwright-tests`: khởi động frontend/backend cần thiết, chờ readiness check, chạy browser test và lưu screenshot/trace/log.
- Các job có thể chạy song song để giảm thời gian. Không dừng sớm đến mức làm mất evidence của job khác.
- Mỗi job phải upload result và evidence bằng `if: ${{ always() }}`.
- `test-result-summary` download toàn bộ artifact, kiểm tra tính đầy đủ và trả exit code khác 0 nếu có `Failed`, `Blocked`, result thiếu hoặc artifact không hợp lệ.
- Workflow chỉ được coi là pass khi job tổng hợp pass.

### Bước 4: Tự động cập nhật Google Sheets (Chỉ chạy khi merge vào nhánh main)
- Sau khi code đã được review, kiểm thử pass hoàn toàn và được merge vào nhánh main (hoặc kích hoạt thủ công qua workflow_dispatch):
  - Job `sync-sheets-log` chỉ chạy sau `test-result-summary` và được tuần tự hóa bằng concurrency group.
  - Job này download result artifact của chính workflow run hiện tại; không suy diễn kết quả từ `state.json` của runner khác.
  - Kiểm tra Tab chi tiết trên Google Sheets tương ứng:
    - Nếu Tab chi tiết chưa tồn tại: Tự động gọi lệnh nhân bản từ Tab Template chuẩn, xóa vùng dữ liệu mẫu của Template và đổi tên thành tên Tab mới theo cấu hình.
    - Nếu Tab chi tiết đã tồn tại: Xác thực cấu trúc tiêu đề (Header Schema Validation).
  - Điền chính xác dữ liệu của từng ca kiểm thử vào các cột tương ứng:
    - Cột thông tin nghiệp vụ: ID, Item, Testcase Name, Precondition, Expected.
    - Cột kết quả thực thi: Result (Passed), Execution (Automation), Note (Mã run_id và bằng chứng thực thi).
  - Cập nhật số liệu thống kê lên Tab tổng hợp (Report bug, Report, Overview): Tự động tính lại tổng số lượng testcase, số lượng Passed, tỷ lệ hoàn thành mà không chạm vào dữ liệu của các dự án cũ.

---

## 4. Hướng dẫn quy trình cho Developer tại máy Local

Developer không cần quyền ghi vào Google Sheets và không cần file Service Account key vẫn có thể kiểm tra trước khi tạo Pull Request:

1. Chạy kiểm tra cú pháp và tính toàn vẹn của config:
   ```bash
   python -m py_compile tools/testcase-workflow/workflow.py tools/testcase-workflow/sheets_client.py tools/testcase-workflow/validate_results.py
   python -m unittest tools.testcase-workflow.test_workflow tools.testcase-workflow.test_sheets_client -v
   ```

2. Chạy thử nghiệm Dry-run:
   ```bash
   python tools/testcase-workflow/workflow.py sync --dry-run
   ```
   Lệnh này đọc cases.json, đối chiếu với state hiện tại và in ra toàn bộ thay đổi dự kiến (case mới, case di chuyển) dưới dạng JSON mà không thực hiện bất kỳ lệnh gọi mạng nào.

3. Chạy từng ca kiểm thử cục bộ:
   ```bash
   python tools/testcase-workflow/workflow.py run-case API-HEALTH-01
   python tools/testcase-workflow/workflow.py run api
   ```

---

## 5. Cấu hình GitHub Actions hiện tại

`.github/workflows/testcase-workflow.yml` là nguồn chuẩn. Workflow hiện có 7 job:

- `workflow-smoke`: compile, test Python workflow/sheets, dry-run và kiểm tra credential không bị Git track.
- `playwright-contract`: cài frontend, build/start, readiness check, chạy `workflow.py run playwright`, upload `RUN-playwright` và evidence.
- `backend-tests`: restore .NET, chạy `workflow.py run api`, upload `RUN-api`.
- `live-contract`: khởi động PostgreSQL/AI/backend bằng Docker, chạy `API-HEALTH-01` và `API-PRED-GUEST-01`, upload result per-case.
- `frontend-tests`: cài pnpm, chạy `workflow.py run screen`, upload `RUN-screen`.
- `test-result-summary`: download artifact, validate đủ `RUN-api`, `RUN-screen`, `RUN-playwright`, `API-HEALTH-01`, `API-PRED-GUEST-01`; Failed/Blocked làm job fail.
- `sheets-sync`: chỉ chạy sau summary thành công trên push `main` khi bật `AGRIVISION_WRITE_SHEETS`; có concurrency lock, import artifact hiện tại rồi mới `sync --sheets`.

Mọi test job upload result với `if: ${{ always() }}`. Hợp đồng artifact là `results.json` do wrapper tạo, gồm `run_id`, job, testcase ID, status, exit code, duration và evidence. Không dùng ví dụ raw `dotnet test` hoặc raw `vitest` làm nguồn kết quả cho Sheets.

`workflow_dispatch` hiện có trong file local; GitHub Actions chỉ xác minh được sau khi revision này được push.
## 6. Bảo mật và An toàn hệ thống

1. Quản lý Khóa xác thực:
   - File khóa JSON của Service Account (angelic-tracer-477405-b6-4e7d814654bf.json) được đưa vào .gitignore và không bao giờ được commit lên repository.
   - Trên GitHub Actions, khóa được mã hóa thành Secret GCP_SA_KEY_BASE64. Khi chạy, chỉ giải mã tạm thời vào thư mục $RUNNER_TEMP và bắt buộc xóa bỏ ở bước dọn dẹp bằng if: always().
2. Lọc bỏ dữ liệu nhạy cảm (Sanitization):
   - Trước khi bất kỳ chuỗi văn bản nào được gửi lên Google Sheets, bắt buộc phải đi qua hàm redact_sensitive() để lọc bỏ token Bearer, JWT, chuỗi kết nối cơ sở dữ liệu và khóa riêng tư.
   - Trường Note chỉ nhận tối đa 400 ký tự tóm tắt lỗi, không dump toàn bộ bộ nhớ hoặc body response lớn.
3. Giới hạn quyền tối thiểu (Least Privilege):
   - Service Account chỉ được cấp quyền thao tác trên đúng 3 file Google Sheets của dự án. Không cấp quyền quản trị GCP IAM trên Google Cloud Console.

---

## Trạng thái kiểm chứng AGRI-145 (2026-11-14)

- 22 test Python workflow/sheets pass; YAML parse được với 7 job.
- Docker Compose healthy; frontend/backend health HTTP 200.
- API 294 pass; Vitest 9 pass; Playwright pass với exit code 0.
- Sheets sync protected pass; lần chạy lặp lại 7/7 `unchanged`.
- GitHub Actions run `43570450037` pass toàn bộ jobs, gồm `sheets-sync`. Viewpoint chưa có runner tự động.
