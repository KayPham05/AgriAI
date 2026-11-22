# AGRI-145 — Kiểm tra lại 7 vấn đề PR #64

Bản sửa cục bộ ngày 2026-11-22 trên head `f1892daa252cbdd6c19bd7ff8156f48ccc9e7506`. Kết quả dưới đây được chạy lại từ bản sửa. Báo cáo có JSON từng ca browser, live và kết quả hai lần chạy workflow trong gói bằng chứng.

| Finding | Thay đổi và bằng chứng sau review lại |
|---|---|
| **R1 · P1 · Overview** | [Sheets summary](../../../tools/testcase-workflow/sheets_summary.py) chỉ ghi cột được mapping trên dòng tab đã đăng ký. Fixture tái hiện Reviewer notes, Manual review evidence, cột xen giữa, công thức Screen trả chuỗi rỗng và header bị chèn lệch. Ngoài mapping không có lệnh ghi, xóa hay sửa format. Dòng legacy giữ nguyên, sai schema dừng trước khi ghi. |
| **R2 · P1 · E2E** | [Runner live](../../../frontend/tests/browser/e2e/run_live_suite.py) báo kết quả từ từng test, dùng 13 ID `LIVE-*`. Runner browser vẫn thực thi 40 ID trong registry. `E2E-ADM-04` kiểm phân trang, tìm kiếm và bốn request khóa/khôi phục/cảnh báo/logout-all trong ApiStub. Ca live Admin kiểm quyền truy cập, điều hướng và tìm kiếm. `LIVE-DIAGNOSIS-HEALTHY` kiểm Healthy từ checkpoint, danh sách thuốc rỗng, `medication=null` và UI cảnh báo độ tin cậy thấp. Bốn ca catalog thử truy vấn rỗng kết quả rồi tìm bản ghi hợp lệ và mở đúng chi tiết. Stack không seed thuốc/bài cẩm nang cho kết quả Failed ở đúng hai catalog đó. |
| **R3 · P2 · Cleanup** | [Live resource helper](../../../frontend/tests/browser/e2e/live_resources.py) lưu UUID từ POST của browser và dùng đúng UUID khi DELETE. Regression test mô phỏng assertion fail sau tạo, kiểm URL DELETE và lỗi 403. Trên PostgreSQL riêng, sau các lượt live còn đủ 1 cây và 2 hồ sơ mang prefix của lượt khác, không còn cây/hồ sơ của lượt vừa chạy và bảng predictions có 0 dòng. History thao tác trên chính bản ghi vừa tạo. |
| **R4 · P2 · Trigger** | [Workflow YAML](../../../.github/workflows/testcase-workflow.yml) bỏ bộ lọc path cho cả pull request và push. Regression kiểm cấu hình event, actionlint pass. Do trigger không lọc theo path, PR chỉ sửa TSX, C#, AI hoặc Compose đều thuộc phạm vi. Điều kiện ghi Sheets vẫn ở job publish. |
| **R5 · P2 · Viewpoint** | [Detail merge](../../../tools/testcase-workflow/sheets_rows.py) chỉ đổi ô business còn khớp giá trị tự sinh từ snapshot hoặc journal của đúng tab/ID. Regression kiểm confirmation đổi, nội dung manual và công thức, reactivation giữ ghi chú trong ID, retry A→B→C sau publish gián đoạn. Fixture xác nhận baseline C chỉ publish sau detail và summary. |
| **R6 · P2 · Schema** | Hai producer dùng [StructuredResult](../../../frontend/tests/browser/e2e/browser_results.py) cho `id/test/status/detail`. Regression chạy hai CLI qua parser production, gồm ca live lỗi và tên command trong kết quả group. Kết quả browser và live thật cũng được đọc qua parser. |
| **R7 · P2 · Rerun** | [Artifact lifecycle](../../../tools/testcase-workflow/registry_state.py) khởi tạo theo lượt CLI, khóa thư mục khi chạy, thay bản ghi cùng testcase trong một lượt. Regression kiểm `run-all` nhiều nhóm, rerun thất bại không để lại bản ghi cũ, CI attempt mới reset metadata và job live-contract cộng dồn hai lệnh. Hai lần `run-case API-HEALTH-01` dùng cùng thư mục vẫn còn đúng 1 kết quả hợp lệ. Hai adapter health/guest thực thi với metadata CI giả lập để lại đúng 2 kết quả hợp lệ. |

## Kiểm tra đã chạy

| Kiểm tra | Kết quả |
|---|---|
| `python -m unittest discover -s tools/testcase-workflow -p 'test_*.py' -v` | **95/95 pass**. Môi trường Git sạch cho test tạo repo tạm. |
| `workflow.py sync --dry-run` | **47 ca**, exit 0. Sheets được kiểm bằng fixture và dry-run. |
| Browser `run_suite.py --base-url http://127.0.0.1:3199 --with-server` | **40/40 pass**, 0 skip, **91.543 s**. Chromium headless, Next.js 16.4.5 production build, ApiStub, viewport 1280×900 và ca responsive 768×900/375×812. |
| Live `run_live_suite.py --json-report …` | **13/13 pass trong cả 3 lượt**, 0 skip. Thời gian ba process 72.387, 71.252, 70.407 giây. Mỗi lượt tạo fixture riêng trong DB test, sau đó kiểm lại ba sentinel của lượt khác và số predictions còn lại. |
| Build và kiểm tra tĩnh | Docker build backend/frontend, `pnpm typecheck`, `pnpm lint`, `compileall`, actionlint và `git diff --check` pass. |

Live chạy trên stack `pr64verify` với PostgreSQL, backend, frontend production và Mailpit riêng. Object storage là S3 cục bộ qua TLS, với port 443, DNS và chứng chỉ chỉ cấu hình trong stack test. Dịch vụ FastAPI dùng image AgriAI đã có và checkpoint mount read-only. SHA-256 plant `d071c13d14ef573430b38674647e5ebfce0b5d3f4bd7099d7e815549073178ea`, disease `d21d8d6efd3c66e36ce166bfdb03bf0f017a0452ee07508df82e49ca42d429b9`. Các lượt trước cấu hình storage/seed có Failed thật trong JSON. Lượt đầu có test Healthy mới cũng fail vì fixture có độ tin cậy 23.26%, nên UI hiển thị cảnh báo và Top-3 sau khi người dùng bấm mở đối chiếu. Bản cuối kiểm đường đi đó, giữ nguyên assertion Healthy và không cấp thuốc.

Review độc lập tái hiện hai trường hợp thêm: header Overview lệch vị trí và baseline Viewpoint chỉ nằm trong pending snapshot. Cả hai có regression ở bản cuối. GitHub Actions trên bản sửa, ghi–đọc Google Sheets thật và dịch vụ Cloudflare R2 thật còn chờ xác minh.


## Sửa các lỗi tái hiện trong vòng kiểm tra lại

| Vấn đề | Cách sửa và bằng chứng hồi quy |
|---|---|
| **P1 · Lệch cột Report và Report bug** | Kiểm tra header theo đúng vị trí cột trước khi ghi dashboard. Fixture chèn cột ghi chú vào giữa phần tổng hoặc các cột kết quả. Cả hai dashboard dừng trước insert, clear, batch update và sửa format. |
| **P2 · Total vượt dòng 60** | Đọc toàn chiều cao của các cột dashboard đã cấu hình. Fixture thử trên cả hai dashboard, đưa Total từ dòng 60 xuống 61 rồi đồng bộ lần hai. Dòng còn ghi chú dù chưa có tên tab được giữ nguyên. |
| **R3 · Lỗi UI sau POST** | Khi action đã gửi POST, tiếp tục chờ phản hồi của chính request đó và đăng ký cleanup trước khi trả lại lỗi UI. Probe Chromium nhận POST 201 rồi phát sinh lỗi: gọi cleanup đúng một lần cho UUID nhận được. Lỗi xảy ra trước POST: giữ lỗi gốc và không gọi cleanup. |
| **R5 · Kiểu ô Viewpoint** | Khớp số và boolean do Sheets chuyển đổi trước đây với biểu diễn chuẩn trong baseline. Nội dung detail mới được ghi RAW để giữ văn bản như `001`. Fixture xác nhận số `1` cập nhật sang `3`, số khác và công thức sửa tay được giữ nguyên. Giá trị cũ đã mất cách viết gốc như `01 → 1` được giữ để tránh ghi đè khi không xác định được nguồn. |
| **R7 · Khóa sau khi tiến trình bị buộc dừng** | Khóa file bằng hệ điều hành. Test hai process xác nhận lượt thứ hai bị chặn khi lượt đầu đang chạy và khởi tạo artifact mới sau khi process đầu bị kill. Hành vi đã được kiểm trên Windows và Linux. |

Workflow **102/102** test, dry-run **47 ca**, `compileall`, actionlint và `git diff --check` pass. Chromium browser **40/40**, 80.639 giây. Docker live **13/13 trong cả 3 lượt** (74.946, 70.342, 69.940 giây), qua parser production. Kiểm tra PostgreSQL sau từng lượt còn nguyên cả 3 bản ghi của lượt khác, predictions còn 0. Google Sheets thật được kiểm bằng token chỉ đọc: header và dòng Total hợp lệ trên cả Report và Report bug, mô phỏng tạo kế hoạch cập nhật 10 và 2 dòng.

Bản sửa trên working tree. GitHub Actions đúng revision và ghi–đọc Google Sheets thật còn chờ xác minh.


## Review lại các đường lỗi sau vòng sửa tiếp theo

| Phát hiện | Bản sửa và bằng chứng |
|---|---|
| Tab chi tiết chấp nhận header lệch | Xác thực từng cột trong bố cục API, Screen và Viewpoint. Probe trước sửa cho thấy header chèn `Reviewer notes` vẫn qua kiểm tra. Fixture sau sửa dừng cả ba bố cục ngay tại cột D. |
| Thêm ca hoặc cập nhật dòng có thể đè nội dung thủ công | Bỏ qua dòng còn ghi chú hoặc công thức dù thiếu ID. Khi sửa ca hiện có, chỉ gửi giá trị đã thay đổi. Regression giữ nguyên văn bản `001`, công thức và cột ngoài mapping. |
| Lệnh chèn có thể chạy hai lần khi mất phản hồi | Không phát lại lệnh cấu trúc khi chưa biết máy chủ đã áp dụng hay chưa. Fixture timeout, lỗi truyền tải và HTTP 503 xác nhận chỉ gửi một lần. Lần sync tiếp theo đọc lại và tái sử dụng hàng được chèn trước khi mất phản hồi. |
| Kết quả mới bị mất khi sync đang chạy | Ghi kết quả và cập nhật state dưới khóa. Sau khi ghi Sheets, đọc lại state mới nhất rồi merge metadata. Fixture ghi kết quả ngay trong bước summary xác nhận vẫn còn run ID sau khi sync kết thúc. |
| Hai đường có thể báo xanh thiếu bằng chứng | Validator dùng status đã chuẩn hóa, yêu cầu Passed cho ID bắt buộc. Fixture `" Failed "` bị tính Failed và `Skipped` hoặc `Deprecated` của ID bắt buộc đều chặn gate. Live runner trả exit 1 nếu có journey bị skip. |

Kết quả mới **109/109** test workflow, dry-run **47 ca**, `compileall`, actionlint và `git diff --check` pass. Chromium **40/40** trong **83.070 giây**. Docker live **13/13** trong **75.531 giây**. Parser production chấp nhận cả hai báo cáo. Sau live, PostgreSQL giữ đủ 3 bản ghi đánh dấu của lượt khác và 0 prediction. Probe lỗi UI sau POST trả đúng lỗi gốc, cleanup đúng UUID. Kiểm process kill trên Windows và Linux pass.

Đối chiếu chỉ đọc với cả ba Google Sheets thật: **15 tab chi tiết/template** khớp vị trí header. Hai dashboard đều tìm thấy Total và dựng được kế hoạch ghi trong bộ nhớ. Kiểm chứng ghi–đọc Sheets thật và GitHub Actions trên bản sửa còn chờ. Mã nằm trong working tree của nhánh AGRI-145.


## Kiểm tra trước commit và push

Kiểm tra lại phát hiện khi chuyển testcase sang Deprecated, thông báo lưu trữ thay thế nội dung bằng chứng trong ô cũ. Bản sửa giữ bằng chứng bên dưới dấu lưu trữ và phục hồi nguyên văn khi testcase trở lại mà chưa có bằng chứng mới. Fixture kiểm tra cả giá trị có số 0 đầu và ghi chú nhiều dòng.

Workflow **109/109**, Vitest chẩn đoán **25/25** trong 3 file, hook **9/9**, dry-run **47 ca**, `compileall`, actionlint và `git diff --check` pass. Bằng chứng Chromium **40/40** và Docker live **13/13** nằm ở lượt review trước. Bước tiếp theo là kiểm CI trên revision được push và xác minh ghi–đọc Sheets.
