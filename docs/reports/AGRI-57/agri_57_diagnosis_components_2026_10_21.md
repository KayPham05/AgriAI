# AGRI-57 — Diagnosis stepper and result card (2026-10-21)

## Cập nhật lượt138 — Phân biệt chờ chọn ảnh và đang thực hiện

`AnalysisStepper.tsx` nhận thêm `hasImage`: bước1 chưa có ảnh hiện “CHỌN ẢNH”, chỉ hiện
“ĐANG THỰC HIỆN” sau khi người dùng chọn ảnh/đang chuẩn bị ảnh. `DiagnosePage.tsx` truyền
selectedFile/isPreparing; bấm Phân tích ngay vẫn chuyển bước2, API success chuyển bước3
“ĐÃ HOÀN TẤT”, xóa ảnh trở về chọn ảnh. Đổi tên bước2 “Phân tích AI” thành “Phân tích”.
Giữ trạng thái lỗi/cảnh báo, API, inference semantics, token và shared UI.

Tests: `tests/component/diagnosis/AnalysisStepper.test.tsx`,
`tests/integration/diagnosis/DiagnosePage.integration.test.tsx` và
`tests/browser/diagnosis/analysis_components.py`. RED2cases trước sửa. Biome4TSX và
host TypeScript đạt. Lượt fullcoverage bị gián đoạn với “The device is not ready”;
kiểm tra lại đường dẫn/tệp/branch vẫn tồn tại đúng. Lượt focused mặc định tiếp theo
không tiến triển và được dừng. Rerun focused qua `vitest ... --pool=threads --maxWorkers=1`
đạt **18/18,2files**, raw start12:22:57,28.63s. Không có fullsuite/coverage mới được xác nhận.

Docker build compile4.2s/TypeScript759ms đạt; recreate riêng frontendlocalhost3000.
Final Chromium6viewports/upload/error/retry/Top3/success/reset/reduced-motion đạt:
idle không có badge đang thực hiện, có ảnh vẫn ở bước1/đang thực hiện, bấm phân tích
ở bước2 với tên mới, thành công ở bước3/hoàn tất, reset về chọn ảnh. Pageerrors rỗng;
API fixture không phải real-model acceptance. Không backend/global/shared/CI/commit/push.

## Cập nhật lượt125 — Bỏ phần tiêu đề đầu trang

Xóa header “Kiểm tra ảnh lá cây”, mô tả và border dưới theo ảnh người dùng; giữ h1 sr-only “Chẩn đoán ảnh lá” cho ngữ nghĩa trợ năng. AnalysisStepper bỏ margin-top7, chỉ giữ margin-bottom7 để đầu trang không còn khoảng trống cũ. Giữ upload/stepper/result/API. Regression RED trước sửa do heading cũ còn hiện, sau sửa focused **25/25**,4 tệp lúc02:46:45 (6,56s), gồm component/diagnosis, flow và App.routing (cập nhật heading semantic). Biome4 tệp/build compile4,5s/TypeScript886ms đạt; cập nhật riêng frontendlocalhost3000. Browser6 kích thước và luồng upload/error/retry/success/reset đạt, xác nhận title/copy cũ đã xóa. Không full suite/coverage mới; chưa commit/push.

## Cập nhật lượt124 — Bỏ AI trong nhãn nút

Theo yêu cầu, đổi CTA trong DiagnosePage và lời hướng dẫn trong AnalysisResultCard thành “Phân tích ngay”; giữ nguyên tiêu đề bước Phân tích AI và luồng xử lý. Cập nhật kỳ vọng component/integration/browser test tương ứng. Fresh focused18/18,3 tệp lúc02:43:51 (10,65s), Biome4 tệp và Docker build compile4,6s/TypeScript1060ms đạt. Cập nhật riêng frontendlocalhost3000, browser6 kích thước/upload/error/retry/success/reset đạt. Không chạy lại full suite/coverage cho thay đổi copy; không coi254 lượt123 là bằng chứng mới. Chưa commit/push.

## Cập nhật lượt123 — Hiển thị hoàn tất khi đã có kết quả

Người dùng phát hiện kết quả đã hiện nhưng Stepper3 vẫn ghi ĐANG THỰC HIỆN. Truy nguồn: DiagnosePage chỉ truyền currentStep3 sau status success, nhưng Stepper xem mọi currentStep là đang chạy và completed chỉ khi index nhỏ hơn currentStep. Sửa cục bộ AnalysisStepper: currentStep3 đánh dấu cả ba bước completed, current vẫn ở bước3 cho ngữ cảnh trợ năng, circle cuối có Check và Badge ĐÃ HOÀN TẤT. Step1/2 vẫn có nhãn đang thực hiện. Không đổi API/trạng thái request/Result Card/global/shared.

Regression component RED trước sửa1failed/2passed lúc02:37:38 (1,27s); mở rộng integration khi resolve API thành công phải hết nhãn đang thực hiện/có ba check. Browser test cũng kiểm tra nhãn/check3 và xóa ảnh xóa nhãn hoàn tất; sáu viewport/error/retry/success/reset/reduced-motion đạt, pageerrors rỗng, đã xem screenshot stepper-complete.png. Evidence ignored `.cache/diagnosis-components/`. Biome3 tệp và Docker build compile4,8s/TypeScript747ms đạt; cập nhật riêng frontendlocalhost3000. Fresh full **254/254 test,43 tệp**,02:38:05,106,41s đạt. Không coverage/CI/real-inference mới; chưa commit/push.

## Cập nhật lượt122

Theo yêu cầu nâng cấp hai UI component trang Chẩn đoán AI, giữ palette/font/radius/icon/component system và luồng API hiện có. Nhánh xác minh `AGRI-57-frontend-summary`. Không commit/push/PR/Jira mutation; giữ unrelated worktree.

## Triển khai

- `frontend/src/components/diagnosis/AnalysisStepper.tsx`: props `currentStep: 1 | 2 | 3`; Card full-width, border/shadow-sm/rounded-card16px, ba cột desktop từ1024px với đường chia dọc; dưới1024px xếp dọc, chia ngang. Circle40px, active primary/ring secondary và Badge secondary, completed Check SVG có nhãn trợ năng, pending muted. Description truncate với title; aria-current chỉ ở bước hiện tại, không tạo nút giả.
- `frontend/src/components/diagnosis/AnalysisResultCard.tsx`: props analysisResult (PredictionResponse|null), isLoading, isUploading, error, onRetry. Compose Card/Header/Title/Description/Content, Activity/ScanEye từ lucide, accent bar4px gradient primary→accent dùng token có sẵn. Empty box nền nhạt, icon56px, lời hướng dẫn có strong CTA. Loading/error ưu tiên trước dữ liệu cũ; lỗi chỉ hiện retry khi có callback.
- Success hiển thị crop/disease/confidence và tối đa3 xác suất thực từ diagnosis.top_predictions; không chuẩn hóa lại Top-3 hay tạo lớp còn thiếu. Triệu chứng/treatment đọc nguyên văn từ DTO disease; null/rỗng ghi chưa có dữ liệu. Giữ giải thích xác suất không phải mức chắc chắn mắc bệnh và lời nhắc đối chiếu thực địa.
- `frontend/src/views/DiagnosePage.tsx`: ghép hai component, currentStep1 idle/error,2 uploading/analyzing,3 success. CTA đổi thành “Phân tích AI ngay” cho khớp hướng dẫn. Giữ chọn/thả/đổi/xóa ảnh, preview validation, upload progress thực, abort/cleanup/retry, onPredictionCreated và GSAP/reduced motion. Không sửa API/provider/shared/global CSS/token/backend/dependency.
- Mô tả bước2 dùng “Trích xuất đặc trưng và phân loại ảnh lá”, bước3 dùng “khuyến nghị xử lý”, tránh hứa khoanh vùng/phác đồ tự động khi luồng hiện tại chỉ phân loại. Gradient và inner box là ngoại lệ thiết kế cục bộ được yêu cầu rõ trong brief; không đổi DESIGN.md.

## Test và bằng chứng mới

- TDD hai component: stub null trước, **8 test RED** lúc02:27:40, sau triển khai GREEN; bổ sung2 ca metadata thật/một dự đoán và lỗi không có ảnh. Component tests ở `frontend/tests/component/diagnosis/`; fixture đầy đủ dùng chung ở `frontend/tests/helpers/prediction.ts`.
- Integration ở `frontend/tests/integration/diagnosis/DiagnosePage.integration.test.tsx` giữ kiểm tra drop/keyboard, replace/remove, file lỗi, upload/analyze/success, backend error/retry và abort. Cập nhật tên CTA/empty và kỳ vọng probability xuất hiện cả summary/lớp Top-3; fixture chuyển ra helpers. Lần chạy đầu5 test lỗi do tên CTA cũ; sau cập nhật focused **16/16**,3 tệp,02:30:39,11,86s. Không xem các lần lỗi là đạt.
- Fresh full `corepack pnpm test:coverage --pool=threads --maxWorkers=2`: **254/254 test,43 tệp**,02:31:47,123,23s, exit0. Branch **1041/1634 =63,70%**, vượt floor60% giữ nguyên. Statements1534/2521=60,84%, functions510/747=68,27%, lines1399/2250=62,17%. Hai component mới branch Stepper14/14, Result21/21=100%; DiagnosePage64,93%, không đạt target80% cho toàn view. Nguồn `.cache/coverage/frontend/coverage-summary.json`; không đổi coverage gate/exclusion.
- TypeScript noEmit và Biome7 tệp đạt sau chỉnh sửa cuối. Lint ban đầu bắt index làm React key trong ranking; đổi sang className/label ổn định, không suppress rule.
- Production `docker compose build frontend` exit0: compile4,7s/TypeScript835ms,11 trang tĩnh/hai route động. Recreate riêng frontend `--no-deps`, không tác động backend/DB/volume.
- Browser regression lưu tại `frontend/tests/browser/diagnosis/analysis_components.py`, có hướng dẫn trong tests README. Chromium API/auth fixture:1440×1100,1024×900,768×900,375×812,320×568,667×375 không tràn; desktop stepper3 cột. Chuỗi upload pending→503→retry→201→Top-3→xóa ảnh trở về1 đạt; completed checks1/2, aria-busy/status, fallback metadata, reduced motion và pageerrors rỗng. Script chạy lại sau chỉnh screenshot cũng đạt. Đã xem ảnh desktop stepper/empty/success và mobile empty.
- Evidence screenshot/JSON ignored `.cache/diagnosis-components/`; không đưa artifact vào Git.

## Giới hạn

Kiểm tra browser dùng fixture, không chứng nhận suy luận checkpoint/API production/storage. Chưa Safari/Firefox/thiết bị thật/kiểm toán WCAG toàn diện. Top-3 và metadata hiển thị theo dữ liệu API, không sinh triệu chứng hoặc hướng dẫn điều trị. Không thêm sample picker hoặc Grad-CAM giả. Chưa commit/push/PR/Jira Done.
