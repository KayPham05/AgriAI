# AGRI-145 — Kế hoạch tách module testcase workflow (Level 2)

Tách workflow theo trách nhiệm để dễ review và bảo trì. Giữ hợp đồng CLI, các hàm được gọi trực tiếp, định dạng artifact, kết quả sync và các kiểm tra hiện có. Lấy working tree đã có bản sửa snapshot Sheets và bộ lọc `[Deprecated]` làm nguồn baseline.

## Cấu trúc đích

| File | Trách nhiệm |
| --- | --- |
| `registry_state.py` | Registry, cấu hình, `CaseResult`, đọc ghi JSON, khóa state, mốc Git khởi tạo và ghi artifact cục bộ. |
| `sheets_sync.py` | Điều phối sync, snapshot, journal và archive vị trí cũ sau khi ghi đích. |
| `sheets_rows.py` | Nhận dạng ID, dựng dòng testcase, kiểm tra schema và upsert. |
| `sheets_formulas.py` | Đếm kết quả và dựng công thức theo locale và schema. |
| `sheets_summary.py` | Ghi dashboard và Viewpoint Overview, đánh số, áp style và hyperlink. |
| `sheets_client.py` | Giao tiếp Sheets API, nhân bản tab mẫu và lưu/đọc snapshot. |
| `case_runners.py` | Thực thi API, Vitest, Playwright và điều phối `run_all`. |
| `http_checks.py` | Xác minh HTTP contract của database health và guest prediction. |
| `runner_reports.py` | Đọc report và đối chiếu kết quả thực thi với testcase ID đã cấu hình. |
| `verify_publish_revision.py` | Kiểm tra SHA trên `main` trước khi CI cấp thông tin xác thực để ghi Sheets. |
| `workflow.py` | CLI, dưới dạng script như hiện tại, cùng re-export tường minh các entrypoint trong baseline. |
| `test_*.py` | Test theo trách nhiệm, gồm các suite riêng cho dòng Sheets, summary, sync, client, runner, CLI và revision. |

CLI re-export từ module sở hữu. Runner gọi parser report và sync. Sync gọi các module dòng, công thức và summary. Summary dùng công thức và các hàm định vị dòng. `compileall` và unittest discovery tự kiểm tra module và suite mới.

## Giai đoạn 1 — Tách cơ học

- [x] Chốt baseline từ working tree hiện hành, gồm cả thay đổi chưa commit. Đối chiếu chữ ký các callable công khai do `workflow.py` định nghĩa và các import thực tế. Dùng danh sách này cho re-export tường minh.
- [x] Dời nhóm registry/state trước. Dời từng test và cập nhật `patch` đến tên được tra cứu khi chạy. Ví dụ, nếu runner gọi `registry_state.emit_result`, patch `registry_state.emit_result`. Nếu `sheets_sync` giữ binding `SheetsClient` riêng, patch `sheets_sync.SheetsClient`.
- [x] Dời xử lý Sheets. Giữ thứ tự journal → ghi đích → archive nguồn → cập nhật dashboard → xác nhận snapshot. Giữ lọc `[Moved]` và `[Deprecated]`, phục hồi ID khi quay lại tab cũ, bảo toàn tab legacy và các guard chống ghi trong dry-run.
- [x] Dời runner và parser. Giữ trường hợp subprocess lỗi, timeout, report thiếu hoặc cũ, test không chạy, testcase thiếu ID và exit code khác 0. Giữ đường dẫn report tường minh của Playwright và kết quả từng case của API/Vitest.
- [x] Chạy suite sau mỗi nhóm di chuyển. Sau khi đặt xong facade, cập nhật compile list và dùng discovery trong job `workflow-smoke` để thu đủ các suite đã tách.

## Giai đoạn 2 — Kiểm tra tương đương

| Kiểm tra | Điều kiện đạt |
| --- | --- |
| API Python và CLI | Chữ ký khớp baseline. Các lệnh từ repo root và `frontend/` giữ nguyên cách gọi và exit code. |
| Unit tests | Từng hành vi cũ vẫn có assertion tương ứng. Ghi đối chiếu test theo tên trước/sau khi dời file. |
| `sync --dry-run` | JSON khớp khi dùng cùng registry và state cục bộ. |
| `run screen` từ hai thư mục | Validator nhận đủ `WEB-PRED-01`, `WEB-PRED-02`, `RUN-screen`. So ID, trạng thái, selector, evidence và loại evidence theo case. Chuẩn hóa các trường thay đổi theo lượt chạy như timestamp, run ID và thời lượng trước khi so. |
| Sheets fixture | Thứ tự lệnh ghi, vùng A1, công thức, payload snapshot và state cuối khớp baseline. Bao phủ lần ghi bị ngắt rồi registry quay về, chuyển tab, xóa ID và tab nguồn hết case active. |

Artifact baseline nằm trong `.cache/agri145-level2-baseline/`. Giữ bộ `after-*.json` của đợt chuẩn bị làm mốc và dùng thư mục artifact riêng cho lượt chạy sau. Nếu dời test hoặc harness, cập nhật namespace `patch` theo module sở hữu rồi so lại output với mốc đã lưu.

```powershell
python -B -m unittest discover -s tools/testcase-workflow -p 'test_*.py' -v
python -B tools/testcase-workflow/workflow.py sync --dry-run
$env:AGRIVISION_RESULT_DIR = Join-Path $PWD '.cache/level2-refactor-root'
python -B tools/testcase-workflow/workflow.py run screen
python -B tools/testcase-workflow/validate_results.py $env:AGRIVISION_RESULT_DIR --expected-id RUN-screen --expected-id WEB-PRED-01 --expected-id WEB-PRED-02
$env:AGRIVISION_RESULT_DIR = Join-Path $PWD '.cache/level2-refactor-frontend'
Push-Location frontend
try { python -B ../tools/testcase-workflow/workflow.py run screen } finally { Pop-Location }
python -B tools/testcase-workflow/validate_results.py $env:AGRIVISION_RESULT_DIR --expected-id RUN-screen --expected-id WEB-PRED-01 --expected-id WEB-PRED-02
git diff --check
```

Xác minh API .NET, Live System E2E và ghi–đọc lại Sheets ở lượt nghiệm thu phù hợp. Ghi rõ phần bị chặn hoặc chưa chạy trong report và task log AGRI-145.

## Giai đoạn 3 — Dọn code sau khi đạt tương đương

- Đã rà toàn workspace và bỏ `first_column()` cùng `first_column_with_rows()`. Tìm kiếm chỉ thấy hai định nghĩa, lời gọi nội bộ giữa hai helper và ghi chú về kế hoạch.
- Giữ fallback `default_cell_refs`, migration conditional-format ô `I8` và các key mô tả trong đợt tách. Thay fallback bằng cấu hình bắt buộc là thay đổi hợp đồng và cần diff riêng. [Test dùng fallback](../../tools/testcase-workflow/test_workflow.py)
- Đã tách parser khỏi runner, và tách cập nhật dòng, công thức, summary khỏi sync. Dùng chung logic đánh số, tạo yêu cầu style/hyperlink và ghi nhận batch trong fixture summary. Giữ các guard cấm append, cấm đọc conditional format ngoài phạm vi và mô phỏng lỗi batch Update.
- Sau phần tách, xác minh hồi quy cho report lỗi, rerun cũ của CI và gián đoạn lúc nhân bản tab mẫu. Chi tiết chạy lại nằm trong [report AGRI-145](../reports/AGRI-145/README.md).
