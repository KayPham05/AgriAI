# AGRI-57 — Hoàn thiện frontend demo và tích hợp Backend

- **Owner:** trunthong09012005
- **Completion date (baseline demo):** 2026-09-28
- **Last documentation update:** 2026-10-12
- **Branch:** `AGRI-57-frontend-summary`
- **Pull request:** Chưa tạo

Các mục 1–5 giữ kết quả baseline ngày2026-09-28; mục6–63 ghi lịch sử triển khai và kiểm chứng từng lượt đến2026-10-12. Mục64 ghi lượt tổng hợp tài liệu. Hiện trạng và phần còn lại ở [report tổng hợp](../../reports/AGRI-57/frontend_implementation_report.md#tổng-hợp-hiện-trạng-ngày-2026-10-12). Không coi test lịch sử là lần kiểm chứng mới, không suy diễn nghiệm thu production/E2E hoặc tự chuyển Jira sang Done.

## 1. Completed Work

- Chuyển frontend từ React/Vite sang Next.js 16, React 19 và pnpm; bổ sung cấu hình build, test và biến môi trường.
- Hoàn thiện toàn bộ luồng chọn ảnh, preview, validation, upload, phân tích, hiển thị kết quả, retry và xử lý lỗi từ Backend API.
- Kết nối đăng ký, đăng nhập, khôi phục phiên, JWT, danh mục cây/bệnh và lịch sử dự đoán với ASP.NET Core Backend.
- Nâng cấp giao diện giới thiệu, trang chủ, kiểm tra lá, cây trồng, bệnh thường gặp, mẫu đã lưu, về dự án và hồ sơ theo một hệ thống thiết kế LeafAI thống nhất.
- Bổ sung responsive UI, màn hình chào sau đăng nhập, CAPTCHA demo, điều khoản sử dụng và bộ unit/integration test frontend.

## 2. Main Changes

### Các sub-task đã thực hiện

| Jira | Hạng mục | Kết quả |
|---|---|---|
| AGRI-44 | Demo UX/UI | Hoàn thiện hệ thống giao diện LeafAI và luồng demo trực quan. |
| AGRI-47 | Tạo project frontend | Chuyển sang Next.js 16, React 19, TypeScript, Tailwind CSS 4 và pnpm. |
| AGRI-48 | Xây dựng màn hình upload | Hỗ trợ chọn file, kéo thả, mở camera và thay ảnh. |
| AGRI-49 | Image preview | Preview đúng ảnh đã chọn, hiển thị metadata và cho phép xóa/chọn lại. |
| AGRI-50 | Validation file | Kiểm tra JPEG/PNG/WEBP, file rỗng và giới hạn 15 MB mà không làm crash UI. |
| AGRI-51 | Prediction API client | Xây dựng client multipart, upload progress, timeout, abort và kiểm tra response contract. |
| AGRI-52 | Kết nối Backend Demo | Mapping với ASP.NET API, JWT Bearer, trường multipart `file` và DTO dự đoán thật. |
| AGRI-53 | Hiển thị prediction result | Hiển thị cây, bệnh, confidence, ảnh, Top-K và trạng thái sức khỏe. |
| AGRI-54 | Xử lý loading/error | Hoàn thiện Idle, Uploading, Analyzing, Success, Error và retry. |
| AGRI-55 | Responsive UI | Tối ưu desktop, tablet, mobile và thanh điều hướng di động. |
| AGRI-56 | Demo flow hoàn chỉnh | Luồng từ landing page → xác thực → vào app → phân tích → lưu/xem lại kết quả hoạt động hoàn chỉnh. |

### Nâng cấp bổ sung

- Landing page giới thiệu sản phẩm với nhận diện LeafAI và CTA đăng nhập/đăng ký.
- Form đăng nhập/đăng ký kết nối API thật, lưu phiên theo lựa chọn người dùng và khôi phục bằng `/api/auth/me`.
- CAPTCHA nhập tay ở đăng nhập; checkbox bắt buộc và nội dung điều khoản sở hữu trí tuệ ở đăng ký.
- Màn hình đăng nhập thành công với logo tròn, hiệu ứng xoay và tách lá trước khi vào ứng dụng.
- Dashboard hồ sơ với dữ liệu lịch sử thật, tỷ lệ lá khỏe/bệnh, cây kiểm tra nhiều nhất và trạng thái hệ thống.
- Làm mới các trang cây trồng, bệnh thường gặp, mẫu đã lưu và giới thiệu AI; dùng tài nguyên nội bộ, không phụ thuộc ảnh nóng từ nguồn ngoài.
- Dọn các comment thiết kế cũ không liên quan đến nhận diện LeafAI.

## 3. Results and Verification

Kết quả lịch sử ngày 2026-09-28, không phải lần chạy lại sau tinh chỉnh UI:

- **TypeScript:** `corepack pnpm lint` → PASS, không có lỗi type.
- **Automated tests:** `corepack pnpm test` → **20/20 PASS**, 6/6 test files.
- **Production build:** `corepack pnpm build` → PASS, Next.js tạo static route `/` thành công.
- **Backend unit tests:** `dotnet test tests/AgriVision.UnitTests/AgriVision.UnitTests.csproj --no-restore` → **8/8 PASS**.
- **Backend integration tests:** `dotnet test tests/AgriVision.IntegrationTests/AgriVision.IntegrationTests.csproj --no-restore` → **5/5 PASS** với PostgreSQL Testcontainers.
- **Diff validation:** `git diff --check` → không có lỗi whitespace; chỉ có cảnh báo chuyển LF sang CRLF trên Windows.
- **Happy path:** upload ảnh hợp lệ → preview → uploading → analyzing → nhận JSON Backend → hiển thị kết quả.
- **Error path:** chặn file sai loại/quá dung lượng/rỗng; hiển thị lỗi Backend; retry giữ lại ảnh; abort request khi unmount.

Các test chính:

- `frontend/src/utils/imageFileValidation.test.ts`
- `frontend/src/services/predictionApi.test.ts`
- `frontend/src/views/DiagnosePage.integration.test.tsx`
- `frontend/src/views/IntroPage.test.tsx`
- `frontend/src/components/modals/LoginModal.test.tsx`
- `frontend/src/components/common/LoginSuccessScreen.test.tsx`

## 4. Issues or Blockers

- CAPTCHA hiện được kiểm tra ở frontend, phù hợp demo nhưng chưa phải cơ chế chống bot production; cần endpoint xác minh phía server hoặc dịch vụ CAPTCHA chuyên dụng.
- Kết quả cuối phụ thuộc Backend ASP.NET và AI service đang hoạt động đúng cấu hình `NEXT_PUBLIC_API_BASE_URL`.
- Grad-CAM hiện có phần trực quan hóa giao diện; chất lượng heatmap production phụ thuộc dữ liệu trả về từ model AI thật.

## 5. Remaining Work or Follow-up

- Tạo Pull Request từ `AGRI-57-frontend-summary` và gán reviewer frontend theo quy định dự án.
- Chạy kiểm thử E2E với đầy đủ PostgreSQL, ASP.NET Backend, Cloudinary và AI service trong môi trường tích hợp.
- Chuyển CAPTCHA sang xác minh phía server trước khi triển khai production.
- Nhờ pháp lý rà soát nội dung Điều khoản sử dụng và Chính sách quyền riêng tư trước khi phát hành công khai.

## 6. Các lượt bổ sung ngày 2026-10-07

### UI, design system và banner

- Bổ sung `DESIGN.md`, đưa palette/font/radius về semantic tokens trong `frontend/src/index.css`, dùng shadcn/Radix cho các primitive và tinh chỉnh màn hình, navigation, modal, feedback. Taste và React Best Practices dùng cho sửa UI; Impeccable chỉ review.
- Bỏ các trang trí scan/glow và độ chính xác giả trong phạm vi đã rà soát; điều chỉnh progress accessibility, camera cleanup, focus khi xác nhận xóa và thông báo sửa hồ sơ chỉ lưu trong phiên. Hiệu ứng logo bắt buộc trong baseline đã được bỏ.
- Khôi phục đủ 13 banner gốc qua `frontend/src/data/bannerData.ts` và `BotanicalBanner.tsx`; tự chuyển sau khoảng nghỉ 6.5 giây, fade 0.65 giây; token lá 20px / 5 độ / 6 giây. Bỏ selector, mũi tên và nút pause theo yêu cầu; giữ reduced motion, pause khi offscreen/ẩn tab và cleanup.
- Không có cơ chế dừng thủ công trên trang: đây là đánh đổi accessibility đã ghi rõ, không được coi là đạt WCAG nhờ test tự động. Mã nguồn, các giai đoạn trung gian và giới hạn nằm trong [báo cáo UI](../../reports/AGRI-57/frontend_ui_refinement_audit.md).

### Skills và shadcn

- Cài thêm 13 gói skill bằng bộ cài chính thức, giữ `coding-standards` và `git-commit`: tổng 15 skill trong `.agents/skills`. Nguồn/commit được ghi trong `installed_skills.json`; giới hạn theo dự án nằm trong README của skills. 7 skill UI cấp máy được ghi riêng, không nằm trong gói repo.
- Xác nhận cấu hình shadcn đã có: `radix-nova`, Radix, Tailwind 4, alias `@/`, CSS tại `src/index.css`, 16 primitive; không chạy lại init hoặc đổi preset.
- Thêm script `ui` trong `frontend/package.json` và hướng dẫn `info`, `docs`, `add --dry-run`/`--diff` trong `frontend/README.md`. Dry-run Button cảnh báo ghi đè nên không áp dụng.
- Không cài runtime Docker/PyTorch, chạy training, đổi Backend/AI, commit, push hoặc tạo PR trong các lượt bổ sung này. Chi tiết và bằng chứng: [báo cáo công cụ](../../reports/AGRI-57/agri_57_skills_shadcn_setup.md).

### Kết quả kiểm chứng đã ghi nhận

- Lượt cấu hình shadcn ngày 2026-10-07, từ `frontend/`: `corepack pnpm lint` PASS; `corepack pnpm test` **63/63 PASS, 12/12 files**; `corepack pnpm build` PASS. Trích output và phạm vi có trong báo cáo công cụ, không suy ra backend/E2E đã pass.
- Các lượt cài skill kiểm tra metadata, file nguồn và giấy phép theo phạm vi ghi trong báo cáo công cụ; không phải audit bảo mật toàn bộ các gói.
- Đối chiếu cấu hình/theme/component sau lượt shadcn không có ghi đè; file `next-env.d.ts` tự sinh bởi build được trả về trạng thái đầu lượt.
- Lượt đồng bộ report/task log này chỉ sửa tài liệu và rules. Không chạy lại frontend/backend tests hay build; kiểm tra liên kết tài liệu, nhánh, tính nhất quán nguồn và whitespace trước khi bàn giao.

### Quy tắc ghi nhận cho các lần sau

- `AGENTS.md` và `.agents/rules/project_rules.md` yêu cầu cập nhật report và task log trước mỗi lần bàn giao thay đổi, theo Jira key được xác minh từ nhánh hiện tại.
- Mỗi mục ghi ngày, lý do, file/phạm vi sửa, lệnh và kết quả thực chạy, giới hạn và việc còn lại. Giữ kết quả cũ với ngày cũ; không tự đặt owner/Jira/PR hay đánh dấu đã nghiệm thu.
- Reuse task log AGRI-57 hiện có trong thư mục này theo ngoại lệ đường dẫn được ghi ở rules, không tạo thêm bản flat trùng nội dung.

### Việc còn lại

- Kiểm tra UI ở 375px, 768px, 1280px, keyboard/focus/contrast, reduced motion và chuyển động banner bằng trình duyệt kết nối.
- Kiểm tra camera thiết bị thật, in PDF và E2E authenticated upload/history với backend; chưa có bằng chứng mới cho các hạng mục này.
- Các follow-up production và PR ở mục 5 vẫn giữ nguyên; không xem việc cài thêm skill là hoàn thành các follow-up đó.

## 7. Chuẩn hóa nền tảng frontend ngày 2026-10-08

- Nhánh kiểm tra: `AGRI-57-frontend-summary`; giữ owner đã ghi trong log này.
- Tách `typecheck`, `lint`, format, `check` và `check:ci` trong `frontend/package.json`. Thêm Biome `2.5.15`, pin shadcn CLI local `4.21.3` và đồng bộ lockfile; giữ phiên bản React/Next/TypeScript hiện có.
- Thêm `frontend/biome.json`, `.editorconfig`, `.node-version`, `pnpm-workspace.yaml`. pnpm dùng Node `24.15.0` riêng cho frontend vì jsdom hiện có không hỗ trợ Node host `24.14.1`; không thay runtime toàn máy. Bộ ESLint/Prettier thử cài đã được gỡ vì peer range không hỗ trợ TypeScript 7.
- Thêm `frontend/src/test/lintRules.test.ts`: kiểm tra import Radix theo tầng, import ứng dụng từ primitive và conditional hook. Test fixture được tạo riêng/dọn đúng file; chu kỳ âm tính 3 fail/1 pass, bật luật thì 4/4 pass.
- Kiểm tra mới: frozen install PASS, typecheck PASS, full suite **67/67 tests, 13/13 files PASS**, production build PASS (static pages 3/3), CLI shadcn info PASS. Không dùng kết quả `lint` cũ (chỉ tsc) thay cho linter mới. Trả `next-env.d.ts` về đường dẫn dev có trước lượt build; không còn fixture lint tạm.
- Lint ở lượt cấu hình ban đầu **FAIL: 24 errors, 93 warnings, 8 infos**; format check **FAIL: 71 file cần format**. Giữ bản ghi này; kết quả sau sửa ở mục 8. Không tắt luật toàn cục để làm xanh hoặc tự format hàng loạt UI đang có thay đổi của người dùng.
- Bổ sung onboarding và ranh giới source trong `frontend/README.md`; sửa mô tả banner cũ còn nhắc selector. Không đổi UI/tokens, backend, AI, Docker hay hợp đồng API; không stage/commit/push/PR/Jira.
- Bằng chứng và danh sách việc còn lại: [báo cáo quality setup](../../reports/AGRI-57/agri_57_frontend_quality_setup.md).
- Follow-up: review/sửa lint và format theo nhóm rồi chạy lại gate; chỉ sau đó nối remote CI. Nghiệm thu UI/E2E và các follow-up production trước đó vẫn chưa hoàn tất.

## 8. Tiếp tục sửa lint ngày 2026-10-08

- Xác minh lại nhánh `AGRI-57-frontend-summary`; giữ owner hiện có.
- Sửa ngữ nghĩa nhóm điều khiển trong `LoginModal`, `PlantsPage`, `DiseasesPage`, `HistoryPage`, vùng upload `DiagnosePage` và region `LoginSuccessScreen`; giữ primitive shadcn, token, ảnh và nội dung hiện có.
- `CameraCaptureModal` giữ retry dependency có giải thích và test. `BotanicalBanner` chỉ sửa callback/listener; giữ autoplay, chuyển động lá và cleanup GSAP. Không thêm lại nút pause/selector.
- `TopPrediction` và `predictionApi` giữ định danh `className` có sẵn từ backend; modal chi tiết/bản in dùng key ổn định thay index. Giữ fallback cho mẫu demo cũ. Không đổi nhãn/metric hoặc HTTP API.
- Sửa assertion trong các test đang chạm tới, thêm `CatalogAccessibility.test.tsx`; đổi khóa Biome deprecated; chỉnh import type và format chỉ các file thuộc nhóm sửa.
- Test trước sửa: 7 fail/17 pass đúng nguyên nhân. Sau sửa: nhóm 44/44 PASS; full suite **74/74 tests, 14/14 files PASS**; production build PASS, static pages 3/3. Sau khi trả `next-env.d.ts` về đường dẫn dev, chạy lại typecheck và full suite đều PASS. Kiểm tra 43 liên kết local hợp lệ; `git diff --check` exit 0 (chỉ cảnh báo LF/CRLF).
- Đo lại tuần tự sau khi test dọn fixture: lint **0 errors, 69 warnings, 7 infos**, exit 1 do warning; format **52 file cần format**, exit 1. Không dùng số đo khi fixture còn tồn tại làm kết quả cuối.
- Quality gate vẫn chưa xanh. Còn review ảnh native/blob, CSS print, imports và assertion API; browser responsive, camera thật, PDF và backend E2E chưa kiểm tra lại. Không stage/commit/push/PR/Jira.
- Chi tiết paths, ngoại lệ lint có lý do và bằng chứng tại [mục 6 báo cáo quality setup](../../reports/AGRI-57/agri_57_frontend_quality_setup.md#6-lượt-tiếp-tục-sửa-lint-và-bổ-sung-kiểm-thử-ngày-2026-10-08).

## 9. Tinh chỉnh UI xanh lá và kiểm tra trình duyệt ngày 2026-10-08

- Xác minh nhánh `AGRI-57-frontend-summary`; giữ owner hiện có. Người dùng yêu cầu tiếp tục cải thiện UI, giữ màu phù hợp lá cây và đồng ý dùng Playwright cô lập.
- Taste + React Best Practices hướng dẫn chỉnh 10 view trong `frontend/src/views/`: tiêu đề xanh rừng, bố cục intro/home, tiến trình và vùng upload/result, catalog/filter/detail, hồ sơ và empty history. `src/index.css` thêm màu selection semantic; giữ nguyên palette, banner 13 cảnh, motion, nhãn và limitation copy theo DESIGN.md. Không thêm thư viện hoặc sửa backend/AI.
- Phát hiện ảnh cẩm nang sai chủ thể/hỏng. `src/data/plantData.ts` gỡ 36 tham chiếu stock chưa xác minh, không xóa file ảnh. Thêm `src/components/common/ReferenceImage.tsx` và trạng thái “Chưa có ảnh đối chiếu”; không giả ảnh cây khỏe thành ảnh bệnh. Ảnh cây/banner local giữ nguyên.
- Thêm `CatalogImages.test.tsx`: 4 test đỏ trước sửa, 4/4 xanh sau sửa. Mở rộng kiểm thử empty-history và tiến trình. Full suite mới **79/79 tests, 15/15 files PASS**; typecheck và production build PASS (static pages 3/3). Trả route imports trong `next-env.d.ts` về đường dẫn dev có trước build.
- Playwright kiểm tra 12 màn hình/trạng thái × 3 viewport 375/768/1280: không tràn ngang hoặc ảnh hỏng trong vùng kiểm tra cuối; nút/combobox đo được đạt 44px trong sai số làm tròn; không ghi nhận page error/hydration. Đã quan sát banner tự chuyển và đứng yên 8 giây khi reduced motion. Dữ liệu auth/history giả lập, mọi API bị chặn; không phải xác nhận E2E backend.
- Impeccable chỉ đọc, detector trả `[]`. Lint mới **63 warnings, 7 infos**, exit 1; format **46 file**, exit 1. Chưa đạt quality gate. Không dùng các kết quả lịch sử ở mục 7–8 thay cho lần chạy này.
- Còn bổ sung ảnh bệnh đúng nguồn/quyền sử dụng, xử lý lint/format và kiểm tra backend/camera/PDF, populated history, accessibility đầy đủ. Bỏ nút pause vẫn là đánh đổi theo yêu cầu cũ. Không commit/push/PR/Jira.
- Phạm vi, paths và giới hạn chi tiết: [lượt UI xanh lá trong báo cáo](../../reports/AGRI-57/frontend_ui_refinement_audit.md#leaf-green-refinement-and-browser-review--2026-10-08). Ảnh/script QA ở `tmp/` được Git bỏ qua.

## 10. Cài bộ skill UI vào folder dự án ngày 2026-10-08

- Xác minh nhánh `AGRI-57-frontend-summary`, giữ owner hiện có. Người dùng yêu cầu cài các skill đang dùng cấp máy vào folder của dự án.
- Cài 7 gói bằng helper skill-installer chính thức, pin commit: `.agents/skills/taste-skill`, `gsap-core`, `gsap-react`, `gsap-performance`, `gsap-scrolltrigger`, `react-best-practices`, `impeccable`. Giữ nguyên các thư mục/bản cấp máy và 15 skill repo có trước; tổng hiện tại 22.
- Bổ sung license/notice gốc, cập nhật `.agents/skills/installed_skills.json`, README skills và báo cáo. Nguồn/path/ref cụ thể nằm trong [mục 7 báo cáo skill](../../reports/AGRI-57/agri_57_skills_shadcn_setup.md#7-cài-bộ-skill-ui-vào-dự-án-ngày-2026-10-08).
- Kiểm chứng thực: 4 lệnh cài exit 0; 7 metadata hợp lệ, 34 local links không thiếu, 150 file mới kể cả license; 6 SKILL.md khớp SHA-256 bản máy. Impeccable upstream cùng version 4.5.0 có một dòng nguyên tắc bổ sung đã review bằng diff.
- Không thực thi launcher/engine/hooks của gói mới, không sửa app hoặc dependency. Không chạy lại app tests/build; không sử dụng kết quả test UI ở mục 9 làm bằng chứng mới cho cài skill.
- Taste/React triển khai, GSAP theo DESIGN.md, Impeccable review-only. Client nhận skill từ lượt sau hoặc sau khi mở lại session; không commit/push/PR/Jira.

## 11. Chuyển động phân tích lá và chuyển tab ngày 2026-10-08

- Xác minh nhánh `AGRI-57-frontend-summary`; giữ owner hiện có. Người dùng yêu cầu hiệu ứng khi phân tích ảnh lá và chuyển tab, đồng thời nhắc tuân thủ rules/DESIGN.md.
- Thêm `ViewEntrance.tsx` cho chuyển cảnh nội dung; cập nhật `App.tsx`, `DiagnosePage.tsx`, token motion trong `index.css` và test tích hợp. Ảnh xem trước, bước hiện tại và các phần phản hồi tải ảnh/phân loại/kết quả xuất hiện theo nhịp ngắn bằng GSAP scoped `useGSAP`, cleanup và reduced-motion. Chỉ hiển thị phần trăm upload thật; không tạo tia quét hoặc tiến độ AI giả.
- Test mới đỏ đúng nội dung busy panel cũ rồi xanh. Kiểm tra mới: integration 8/8, full suite 79/79, typecheck PASS, build PASS; Impeccable read-only detector `[]`. Targeted lint còn 15 warnings có sẵn, exit 1, không có lỗi mới được báo. Browser cô lập tại 375/768/1280px: không tràn ngang/page error, chuyển cảnh kết thúc về trạng thái tĩnh; reduced-motion tĩnh ngay. Chi tiết paths, bằng chứng và giới hạn ở [báo cáo UI](../../reports/AGRI-57/frontend_ui_refinement_audit.md#purposeful-diagnosis-and-view-motion--2026-10-08).
- Chưa test inference backend thật, thiết bị cảm ứng, screen reader hay hiệu năng frame-rate. Nợ lint/format cũ và đánh đổi nút pause banner vẫn còn. Không stage/commit/push/PR/Jira.
## 12. Chuyển động khi chọn cây và lọc danh mục ngày 2026-10-09

- Nhánh đã xác minh: `AGRI-57-frontend-summary`. Tiếp tục phần UI theo DESIGN.md, giữ màu xanh lá, shadcn và phạm vi phân loại. Không thêm dependency, không đổi backend/AI/banner.
- Thêm `frontend/src/components/common/SelectionFeedback.tsx`; cập nhật `HomePage.tsx`, `PlantsPage.tsx`, `DiseasesPage.tsx` và motion tokens trong `frontend/src/index.css`. Hiệu ứng GSAP chỉ xuất hiện khi đổi cây hoặc bộ lọc, có cleanup và reduced-motion. Hover/focus ảnh danh mục phóng nhẹ; không animate mỗi ký tự tìm kiếm.
- Kiểm tra browser Playwright cô lập tại 375/768/1280px: preview, bộ lọc cây/bệnh và hover desktop qua; không tràn ngang/page error; reduced-motion tĩnh ngay. Script và ảnh QA trong `tmp/ui-review/` được Git bỏ qua. Chưa kiểm tra backend inference thật, touch, screen reader hay FPS.
- `corepack pnpm build` PASS (3/3 static pages), `corepack pnpm typecheck` PASS. Lần đầu full test có 1 timeout tại test quy tắc Radix (78/79), chạy riêng 4/4 PASS; lần cuối full suite 79/79 PASS trong 15 files. Trả `next-env.d.ts` về đường dẫn dev trước build.
- Targeted Biome lint exit 1 vì 13 warnings và 2 infos đã có sẵn; không có diagnostic motion mới. Đã format 3 view vừa sửa. Impeccable read-only detector trả `[]`. Quality gate toàn repo vẫn còn nợ lint/format. Chi tiết tại [báo cáo UI](../../reports/AGRI-57/frontend_ui_refinement_audit.md#catalog-selection-feedback--2026-10-09). Không stage/commit/push/PR/Jira.

## 13. Bản đồ cây trồng Việt Nam ngày 2026-10-09

- Xác minh nhánh `AGRI-57-frontend-summary`. Thêm bản đồ tương tác vào trang Cây trồng, 6 điểm vùng cho đủ 13 cây đang hỗ trợ. Chọn điểm/vùng rồi chọn cây để xem ảnh, tên khoa học, địa phương, nội dung ngắn, nguồn và mở chi tiết cẩm nang. Đây là ví dụ vùng trồng, không phải dữ liệu phân bố đầy đủ hay bản đồ ranh giới hành chính/biển đảo.
- Paths: `frontend/src/data/{vietnamOutline,cropRegions}.ts`, `frontend/src/components/common/CropMap.tsx`, `frontend/src/views/{PlantsPage,CropMap.test}.tsx`, `frontend/src/index.css`, `DESIGN.md`. Dùng hình cây local, shadcn Button/Badge, màu semantic hiện có; không thêm dependency, API, chẩn đoán giả hay route mới. Taste và React Best Practices hướng dẫn code; Impeccable chỉ review đọc‑chỉ.
- Test bản đồ đỏ trước implementation rồi xanh; bản cuối 2/2, full suite **81/81** trong 16 files, typecheck PASS, build PASS (3/3 static pages). Biome lint nhóm file TS/TSX exit 0 với 1 warning và 1 info có sẵn ở `PlantsPage.tsx`; format nhóm không cần đổi. Impeccable detect `[]`; `git diff --check` exit 0, chỉ có cảnh báo line ending.
- Playwright cô lập tại 375/768/1280px: 6 marker, vùng chạm >=44px, không trùng marker/tràn ngang/page error; chọn Đắk Lắk và sầu riêng, kiểm tra nguồn và nút chi tiết không bị nav mobile che khi cuộn. Script/ảnh QA ở `tmp/ui-review/` bị Git bỏ qua. Chưa kiểm tra touch thiết bị thật, screen reader, backend hay độ đầy đủ địa lý; lint/format toàn repo còn nợ. Chi tiết tại [báo cáo UI](../../reports/AGRI-57/frontend_ui_refinement_audit.md#interactive-vietnam-crop-map--2026-10-09). Không stage/commit/push/PR/Jira.

## 14. Chuyển bản đồ sang trang giới thiệu ngày 2026-10-09

- Nhánh đã xác minh: `AGRI-57-frontend-summary`. Theo yêu cầu mới, chuyển bản đồ từ `PlantsPage.tsx` sang `IntroPage.tsx`; khách chưa đăng nhập vẫn xem được điểm vùng, thông tin cây và nguồn. Trang Cây trồng chỉ còn tìm kiếm/danh sách. `CropMap.tsx` ẩn nút mở cẩm nang khi không có callback, tránh mở app âm thầm ngoài luồng đăng nhập. Không đổi dữ liệu vùng, ranh giới bản đồ, token, route hay backend.
- Test trang giới thiệu đỏ trước sửa rồi xanh; cập nhật `IntroPage.test.tsx` và `CropMap.test.tsx`. Focused 5/5 PASS. Lần full suite chạy đồng thời với các gate khác có 1 timeout ở test ranh giới Radix (82 pass, 1 fail); chạy lại riêng full suite **83/83 PASS** trong 16 files. Typecheck PASS, build PASS (3/3 static pages). Targeted Biome lint exit 0 với 2 warning và 1 info sẵn có; Impeccable chỉ review đọc‑chỉ, detector `[]`.
- Playwright cô lập trang giới thiệu tại 375/768/1280px: 6 marker đủ 44px, không chồng nhau/tràn ngang/page error; chọn cà phê và thấy nguồn. Script/ảnh QA ở `tmp/ui-review/` bị Git bỏ qua. Chưa kiểm tra touch thiết bị thật, screen reader hoặc backend; nợ lint/format toàn repo vẫn giữ. Chi tiết tại [báo cáo UI](../../reports/AGRI-57/frontend_ui_refinement_audit.md#crop-map-on-introduction-page--2026-10-09). Không stage/commit/push/PR/Jira.

## 15. Thay banner ảnh trang giới thiệu bằng bản đồ ngày 2026-10-09

- Nhánh đã xác minh: `AGRI-57-frontend-summary`. Theo ảnh chú thích của người dùng, `IntroPage.tsx` bỏ sử dụng `BotanicalBanner`; giữ chữ, hai CTA và câu giới hạn bên trái, đặt `CropMap.tsx` bên phải ở màn hình từ 1280px. Dưới 1280px xếp dọc đúng thứ tự đọc. Bỏ bản đồ lặp phía dưới; bản đồ có bố cục điểm vùng/thông tin gọn hơn và marker 44px. Banner trang chủ và tất cả tài sản ảnh vẫn giữ, không xóa file.
- Test mới đỏ trước sửa vì hero chưa có bản đồ; sau sửa focused 5/5 PASS, full suite **83/83 PASS** trong 16 files, typecheck PASS, build PASS (3/3 static pages). Targeted Biome lint exit 0 với một warning ảnh logo `<img>` có sẵn; format nhóm file đạt. Impeccable chỉ review đọc‑chỉ, detector `[]`.
- Playwright cô lập tại 375/768/1024/1280px: không còn vùng banner ảnh ở trang giới thiệu, bản đồ nằm trong hero, 6 marker đủ 44px và không chồng nhau, chọn cà phê có nguồn, không tràn ngang/page error. Lượt đầu ở 1024px phát hiện marker chồng nhau; điều chỉnh breakpoint và chạy lại bốn cỡ đều qua. Script/ảnh ở `tmp/ui-review/` bị Git bỏ qua. Chưa kiểm tra touch thiết bị thật, screen reader hay backend. Chi tiết tại [báo cáo UI](../../reports/AGRI-57/frontend_ui_refinement_audit.md#introduction-hero-map-replaces-photographic-banner--2026-10-09). Không stage/commit/push/PR/Jira.

## 16. Bản đồ chất liệu tán cây và ba cụm đảo ngày 2026-10-09

- Nhánh đã xác minh: `AGRI-57-frontend-summary`. Theo ảnh tham chiếu, dùng chất liệu tán cây nhìn từ trên xuống bên trong đường viền đất liền đã có; thêm cụm đảo minh họa có nhãn Hoàng Sa, Trường Sa, Côn Đảo. Nhãn/vị trí tham khảo danh mục địa danh biển đảo của Bộ Nông nghiệp và Môi trường và thông tin Vườn quốc gia Côn Đảo; đường viền đất liền vẫn từ Natural Earth. Cụm đảo được phóng lớn, không theo tỷ lệ hoặc thể hiện ranh giới biển.
- Paths: `frontend/src/components/common/CropMap.tsx`, `frontend/src/data/vietnamOutline.ts`, `frontend/src/index.css`, `frontend/src/views/CropMap.test.tsx`, `frontend/public/images/vietnam-canopy-texture.webp`, `DESIGN.md`. Imagegen built-in chỉ tạo texture, không tạo hình địa lý; WebP cuối 632.168 byte sau nén bằng Sharp sẵn có. Bản PNG tạm trong public đã gỡ, ảnh gốc do imagegen tạo vẫn được giữ. Không thêm dependency hay thay dữ liệu cây, marker, banner hoặc auth.
- Test nhãn đảo đỏ trước sửa rồi xanh; focused 6/6, full suite **84/84** trong 16 files, typecheck PASS, build PASS (3/3 static pages). Targeted Biome lint/format exit 0 không diagnostic; Impeccable chỉ đọc, detector `[]`.
- Playwright cô lập ở 375/768/1024/1280px: WebP tải/giải mã, ba nhãn đảo hiện rõ và không che điểm bấm, 6 marker đủ 44px/không chồng nhau, không tràn ngang/page error. Có sửa nhãn Trường Sa sau khi xem ảnh chụp vì màu chìm vào tán cây. Chưa chứng nhận hình đảo đúng bờ thực địa, ranh giới pháp lý, touch thiết bị thật hoặc screen reader. Nợ lint/format toàn repo vẫn còn. Chi tiết và prompt ảnh ở [báo cáo UI](../../reports/AGRI-57/frontend_ui_refinement_audit.md#forest-textured-map-and-island-insets--2026-10-09). Không stage/commit/push/PR/Jira.

## 17. Đổi điểm cây trồng thành ghim bản đồ ngày 2026-10-09

- Nhánh xác minh: `AGRI-57-frontend-summary`. `frontend/src/components/common/CropMap.tsx` dùng icon Lucide MapPin, giữ ảnh cây trong đầu ghim và badge số cây bổ sung. Giữ shadcn Button, vùng bấm 44px, trạng thái chọn và chức năng xem thông tin. Dùng màu token hiện có; không đổi dữ liệu, hình bản đồ hay dependency.
- Kiểm tra mới: targeted Biome PASS, typecheck PASS, test map/intro 6/6 PASS, production build PASS (3/3 trang). Playwright 375/768/1024/1280px: ghim không chồng nhau/che nhãn đảo, chọn cây hoạt động, không tràn ngang/page error; đã xem ảnh desktop/mobile. Khôi phục đường dẫn type Next về trạng thái dev sau build. Chưa kiểm tra touch thật/screen reader. Chi tiết ở [báo cáo UI](../../reports/AGRI-57/frontend_ui_refinement_audit.md#crop-markers-use-map-pins--2026-10-09). Không stage/commit/push/PR/Jira.

## 18. Thay đảo bầu dục bằng đường bờ có nguồn ngày 2026-10-09

- Nhánh: `AGRI-57-frontend-summary`. Dùng polygon đất và đường rạn san hô Natural Earth 1:10m thay ellipse trong `frontend/src/data/vietnamOutline.ts` và `frontend/src/components/common/CropMap.tsx`. Giữ hình dáng đường bờ, phóng lớn đảo nhỏ để thấy rõ; chỉ chọn một số đảo tiêu biểu, Côn Đảo đại diện bằng Côn Sơn. Không tự tạo đảo hoặc suy luận ranh giới biển từ dữ liệu vật lý.
- `frontend/src/index.css` và `DESIGN.md`: nét bờ đảo 0.6px, bỏ bóng đảo, nét rạn không tô nền dùng màu accent sẵn có. Giữ texture đất liền, ghim, thông tin cây và chức năng hiện tại; không thêm dependency. UI có liên kết nguồn và ghi rõ giới hạn.
- Full suite 84/84 PASS trước lần tăng kích thước nét đảo cuối; final map/intro 6/6 PASS sau đó; typecheck PASS; targeted Biome TS/TSX PASS. Check kèm CSS exit 0 với 11 warning `!important` của phần print đã có, không sửa ngoài phạm vi. Playwright cuối 375/768/1024/1280px PASS, ảnh đã xem, Impeccable chỉ đọc `[]`. Production build PASS (3/3 trang); khôi phục đường dẫn type Next về trạng thái dev sau build. Chưa bổ sung tất cả đảo nhỏ Côn Đảo hoặc đầy đủ rạn/đảo, không chứng nhận độ chính xác bản đồ đo đạc. [Báo cáo chi tiết](../../reports/AGRI-57/frontend_ui_refinement_audit.md#sourced-island-silhouettes-replace-oval-placeholders--2026-10-09). Không stage/commit/push/PR/Jira.

## 19. Chuyển động bản đồ theo thao tác ngày 2026-10-09

- Nhánh xác minh: `AGRI-57-frontend-summary`. `frontend/src/components/common/CropMap.tsx`: GSAP xuất hiện một lần khi bản đồ vào viewport, ghim lần lượt từ Bắc xuống Nam; chọn vùng nhấc/hạ hình ghim nhẹ, chọn cây chuyển ảnh/chữ bằng `SelectionFeedback` hiện có. Giữ vùng bấm/neo địa lý cố định, tách lớp animation khỏi transform của Button. `DESIGN.md` ghi lại chuyển động hữu hạn, dùng token cũ; không thêm dependency, loop hay parallax.
- Scope/cleanup qua useGSAP, matchMedia và observer disconnect; reduced-motion giữ giao diện tĩnh và revert animation khi đổi tùy chọn. Có sửa ảnh cây bị lệch tâm do thêm wrapper sau khi xem screenshot.
- Full suite 84/84 PASS trước sửa căn tâm; final map/intro 6/6 PASS, targeted Biome PASS, build PASS (3/3 trang). Typecheck đạt; khôi phục type Next dev rồi kiểm tra lại trước bàn giao. Script QA motion tại 375/1280px, normal/reduced đều PASS; responsive 375/768/1024/1280px PASS, không tràn ngang/page error. Đã xem ảnh cuối, Impeccable chỉ đọc `[]`. Script QA ở tmp bị Git bỏ qua. Chưa kiểm tra thiết bị thật/screen reader. [Báo cáo](../../reports/AGRI-57/frontend_ui_refinement_audit.md#finite-crop-map-motion--2026-10-09). Không stage/commit/push/PR/Jira.

## 20. Bấm ghim mở cửa sổ thông tin giữa trang ngày 2026-10-09

- Nhánh: `AGRI-57-frontend-summary`. `frontend/src/components/common/CropMap.tsx` bỏ bảng bên cạnh, bấm ghim mở shadcn/Radix Dialog giữa trang; giữ thông tin cây, chọn cây, ảnh và nguồn. Mở lại ghim đặt lại cây đầu của vùng; callback cẩm nang nếu có sẽ đóng popup trước khi gọi. Trang giới thiệu vẫn không mở cẩm nang ngoài luồng đăng nhập.
- Dialog có title/description, body cuộn, header/nút đóng luôn hiện, Escape/bấm ngoài để đóng và trả focus về đúng ghim. Giữ animation/reduced-motion đang có. `frontend/src/index.css` và `DESIGN.md` thêm token giới hạn chiều cao theo viewport; không thêm dependency/dữ liệu địa lý.
- Test `CropMap.test.tsx`/`IntroPage.test.tsx` đỏ trước sửa (3 fail/4 pass), xanh 7/7 sau sửa; full suite **85/85 PASS**, targeted Biome PASS, typecheck PASS, build PASS (3/3 trang). Khôi phục type Next dev sau build và kiểm tra lại. Diff check exit 0 với thông báo line-ending; Impeccable chỉ đọc `[]`.
- QA mới tại 375×700, 768×850, 1280×850 và reduced-motion 375×480: popup đúng giữa/không vượt viewport, chọn cây/đóng/mở lại đúng, cuộn tới nguồn, close 44px luôn thấy, focus trap/Escape/overlay/focus return đạt, không tràn ngang/page error. Đã xem ảnh. Lần QA đầu lỗi phương thức Playwright Python không tồn tại; sửa script đo bounds rồi chạy lại đủ bốn ca PASS. Script/ảnh trong tmp bị Git bỏ qua. Chưa kiểm tra touch thật/screen reader/backend. [Báo cáo](../../reports/AGRI-57/frontend_ui_refinement_audit.md#pin-activated-centered-crop-dialog--2026-10-09). Không stage/commit/push/PR/Jira.

## 21. Bỏ chữ phía trên/dưới bản đồ ngày 2026-10-09

- Nhánh `AGRI-57-frontend-summary`. Theo hai ảnh chỉ định, bỏ tiêu đề/mô tả và chú thích nguồn dưới map trong `CropMap.tsx`; giữ nhãn đảo, ghim, animation, tên vùng truy cập và Dialog/thông tin/nguồn cây. `DESIGN.md` ghi ngoại lệ người dùng yêu cầu bỏ chú thích; nguồn địa lý vẫn giữ trong code và báo cáo. `CropMap.test.tsx` bỏ assertion heading không còn phù hợp.
- Kiểm tra mới: targeted Biome PASS, map/intro 7/7 PASS, typecheck PASS, build PASS (3/3 trang), QA dialog 375×700/768×850/1280×850/reduced 375×480 PASS, Impeccable chỉ đọc `[]`. Khôi phục type Next dev rồi kiểm tra lại. Không chạy lại full suite cho lần xóa chữ này; kết quả full suite trước là lịch sử. [Báo cáo](../../reports/AGRI-57/frontend_ui_refinement_audit.md#remove-map-heading-and-caption--2026-10-09). Không stage/commit/push/PR/Jira.

## 22. Chuyển động trang giới thiệu theo video tham chiếu ngày 2026-10-09

- Nhánh xác minh `AGRI-57-frontend-summary`. `IntroPage.tsx` dùng GSAP để hero hiện theo thứ tự và các nhóm tiêu đề/ảnh lúa/các bước/nguyên tắc/CTA hiện một lần khi vào viewport. Giữ bố cục, nội dung, màu/token, Button và bản đồ. `DESIGN.md` ghi treatment hữu hạn, không parallax/scrub/loop; không thêm dependency.
- Có cleanup observer/timeline, reduced-motion tĩnh. Browser phát hiện lỗi Context.getTweens stack overflow dù unit test xanh; nguyên nhân callback context cha chạy bên trong media context tạo chu trình. Sửa ownership bằng callback có tên trên chính media context. Typecheck trung gian lỗi overload null đã sửa; một build trùng bị lock, chạy lại tuần tự.
- Final full suite 85/85 PASS, targeted Biome exit 0 với warning logo img sẵn có, format PASS, typecheck PASS. QA motion thực tế normal/reduced ở 375/768/1280px và QA popup bốn ca; Impeccable chỉ đọc `[]`, đã xem screenshot. Kết quả rerun build/motion cuối ghi bổ sung sau khi hoàn tất. Chưa kiểm tra touch/screen reader/FPS thiết bị yếu. [Báo cáo](../../reports/AGRI-57/frontend_ui_refinement_audit.md#reference-video-introduction-motion--2026-10-09). Không stage/commit/push/PR/Jira.

- Xác nhận cuối: build PASS (3/3 trang), QA motion final đủ sáu ca normal/reduced PASS; khôi phục type Next dev và typecheck lại trước bàn giao.

## 23. Thanh điều hướng bo góc và bám khi cuộn ngày 2026-10-09

- Nhánh `AGRI-57-frontend-summary`. `IntroPage.tsx`/`Navbar.tsx` dùng thanh 72px bo góc theo card token, surface/border và shadow xanh nhẹ; sticky phía trên với gutter/spacing chuẩn. Giữ nút, nhãn, menu Sheet và bottom navigation mobile. `App.tsx` đổi overflow-x-hidden thành clip để không phá viewport sticky. `index.css` thêm navigation shadow token, `DESIGN.md` ghi treatment; giữ offset neo 6rem và lớp modal phía trên.
- Kiểm tra mới: Navbar/Intro 4/4 PASS, typecheck PASS, build PASS (3/3 trang). Full suite đầu 84 pass/1 timeout test ranh giới Radix 5 giây; final rerun riêng 85/85 PASS. Targeted lint exit 0 với 4 warning đã có; diff check exit 0/line-ending, Impeccable chỉ đọc `[]`. Khôi phục type Next dev rồi typecheck lại PASS.
- Browser intro/app cô lập ở 375/768/1280px đủ sáu ca PASS: thanh không mất khi cuộn, không tràn ngang, menu/navigation/login hoạt động, không page error; đã xem ảnh. Lần đầu script sai locator heading catalog, sửa theo heading thực rồi rerun đủ. QA ở tmp bị Git bỏ qua. Chưa kiểm tra touch/screen reader thật. [Báo cáo](../../reports/AGRI-57/frontend_ui_refinement_audit.md#rounded-sticky-navigation--2026-10-09). Không stage/commit/push/PR/Jira.

## 24. Đổi tên web thành AgriAI và xóa hai đoạn chữ ngày 2026-10-09

- Nhánh `AGRI-57-frontend-summary`. Đổi LeafAI thành AgriAI trong tên hiển thị, metadata, alt/aria, navbar, intro/about/profile, splash/login/login success, thông báo app và catalog fallback; cập nhật test liên quan. Giữ logo ảnh, màu, routes và nội dung điều khoản ngoài tên thương hiệu. Paths đầy đủ trong báo cáo.
- Xóa đúng disclaimer hero minh họa và disclaimer footer intro trong hai ảnh; giữ các giới hạn phân loại ở nơi khác. `DESIGN.md` ghi tên mới và ngoại lệ explicit này. Không đổi khóa leafai_auth_session/leafai_history hay package leafai-frontend để bảo toàn dữ liệu/đăng nhập.
- Fresh full suite 85/85 PASS, typecheck PASS, build PASS (3/3 trang); restore Next type dev rồi typecheck PASS. Targeted lint 5 file exit 0 với warning logo img sẵn có; diff check exit 0/line-ending, Impeccable chỉ đọc `[]`. Browser brand/metadata/copy/login 375/1280 PASS, navigation intro/app 375/768/1280 đủ sáu ca PASS, không overflow/page error, đã xem ảnh. QA tmp bị Git bỏ qua. [Báo cáo](../../reports/AGRI-57/frontend_ui_refinement_audit.md#agriai-visible-brand-and-requested-copy-removal--2026-10-09). Không stage/commit/push/PR/Jira.

## 25. Xóa dải thông tin nền xanh trang chủ ngày 2026-10-09

- Nhánh `AGRI-57-frontend-summary`. `HomePage.tsx` xóa toàn bộ aside trong ảnh: tiêu đề Một bức ảnh là điểm bắt đầu và đoạn disclaimer bên cạnh. Giữ nội dung/chức năng khác, giới hạn kết quả phân loại; `DESIGN.md` ghi ngoại lệ explicit.
- Fresh HomePage 2/2 PASS, typecheck PASS, build PASS (3/3 trang), restore Next type dev rồi typecheck PASS. Targeted lint exit 0 với warning img cũ, diff check exit 0/line-ending. Browser intro/app 375/768/1280 đủ sáu ca PASS, đã xem screenshot home không còn dải xanh; Impeccable chỉ đọc `[]`. Không chạy lại full suite cho deletion này. [Báo cáo](../../reports/AGRI-57/frontend_ui_refinement_audit.md#remove-home-informational-strip--2026-10-09). Không stage/commit/push/PR/Jira.

## 26. Logo/tên web/lời chào xuất hiện sau đăng nhập ngày 2026-10-09

- Nhánh `AGRI-57-frontend-summary`. Đã xem video 21,54 giây và áp dụng nhịp logo → chữ AgriAI lần lượt → lời chào tài khoản trong `LoginSuccessScreen.tsx`. Dùng Next Image cho logo thật, GSAP scoped/useGSAP cleanup, reduced-motion tĩnh; giữ nút vào app luôn hiện/enabled, không fake progress hoặc tự điều hướng. Không đổi splash khôi phục phiên khi chưa biết tên user.
- `index.css` thêm token auth-brand-stagger 0.08; `DESIGN.md` ghi ngoại lệ reveal từng chữ thương hiệu trên màn hình này. Giữ màu/font, screen reader đọc một tên thương hiệu, không thêm dependency/asset.
- Targeted 1/1, final full suite 85/85 PASS, typecheck/Biome/build PASS (3/3 trang). Sửa hai diagnostic lint aria-label paragraph và index key trước final check. Restore type Next dev rồi typecheck lại. QA normal/reduced 375/1280 đủ bốn ca PASS với API fixture, kiểm tra animation thật, tên user, nút bấm/keyboard/unmount, không overflow/page error; ảnh đã xem, Impeccable chỉ đọc `[]`. Chưa kiểm tra auth backend thật/touch/screen reader. [Báo cáo](../../reports/AGRI-57/frontend_ui_refinement_audit.md#post-login-logo-brand-and-account-greeting--2026-10-09). Không stage/commit/push/PR/Jira.

## 27. Loading thật tự động vào homepage ngày 2026-10-09

- Nhánh `AGRI-57-frontend-summary`. Theo yêu cầu làm rõ, `LoginSuccessScreen.tsx` chỉ giữ logo/tên AgriAI/lời chào user; bỏ chữ dài/nút vào app. GSAP hữu hạn theo video, reduced-motion tĩnh. Chỉ khi lỗi mới hiện báo lỗi/thử lại/về intro.
- `App.tsx` chờ song song dữ liệu cây/bệnh/lịch sử tài khoản và kết thúc entrance rồi tự vào home, cả đăng nhập mới và restore phiên. Bỏ các request catalog/history trùng trước đó, không fallback âm thầm sang demo. Có timeout 15 giây, cleanup/ignore phản hồi muộn, retry và cancel; cancel xóa phiên đã lưu. Fetch chưa abort ở tầng transport. `DESIGN.md` thay rule manual-enter bằng loading gate được user yêu cầu.
- Test startup mới đỏ 2/2 trước sửa, sau sửa kiểm tra chờ dữ liệu/tự vào/retry; cập nhật test màn hình tối giản và recovery. Final full suite 88/88 PASS trong 17 files, component/test Biome và App lint PASS, typecheck PASS. Có sửa diagnostic retry dependency trước final check; build/typecheck sau build ghi xác nhận bổ sung.
- QA final 375/1280 normal, 375 reduced và 1280 reduced/retry đủ bốn ca PASS: giữ trang khi history pending, tự vào khi dữ liệu trả về, không nút/đoạn chữ dài/overflow/page error; đã xem ảnh. Impeccable chỉ đọc `[]`. Lần QA đầu locator alert trùng Next announcer, scope vào loader rồi rerun đạt. Chưa kiểm tra backend thật/touch/screen reader/timeout branch. [Báo cáo](../../reports/AGRI-57/frontend_ui_refinement_audit.md#automatic-authenticated-loading-gate--2026-10-09). Không stage/commit/push/PR/Jira.

- Xác nhận cuối: build PASS (3/3 trang), restore Next type dev và typecheck PASS; scoped diff check exit 0 với line-ending notice.

## 28. Sửa chữ g bị cắt đuôi ngày 2026-10-09

- Nhánh `AGRI-57-frontend-summary`. `LoginSuccessScreen.tsx` bỏ overflow-hidden trên wrapper mỗi chữ đang cắt descender chữ g; giữ animation và startup gate.
- Fresh focused 4/4 PASS, typecheck PASS, Biome PASS sau format, build PASS (3/3 trang), browser bốn ca loading PASS; đã xem ảnh xác nhận đuôi g đầy đủ. Restore type Next dev rồi typecheck lại. Không rerun full suite cho visual fix. [Báo cáo](../../reports/AGRI-57/frontend_ui_refinement_audit.md#brand-descender-clipping-fix--2026-10-09). Không stage/commit/push.

## 29. Đăng nhập/đăng ký chuyển panel theo video ngày 2026-10-09

- Nhánh `AGRI-57-frontend-summary`. Đã xem video 20,15 giây; `LoginModal.tsx` làm hai panel form/lời chào đổi bên bằng GSAP từ 768px, mobile một cột với transition nhẹ. Chỉ có một form thật, giữ Tabs/Button/Dialog shadcn, validation/CAPTCHA/terms/API/busy guards. Không thêm social login giả/dependency/neumorphism, không sửa backend.
- `index.css` định nghĩa vị trí panel cuối và token auth-dialog-max-height; `DESIGN.md` ghi treatment được yêu cầu. Scope/cleanup/reduced-motion qua useGSAP/matchMedia; tween reset pixel x để tránh cộng hai lần CSS transform.
- Focused 4/4 PASS, full suite 88/88 PASS, typecheck PASS, build PASS (3/3 trang). Biome có format diff sau tween adjustment đã format lại; còn warning logo img/info nối chuỗi đã có. Restore type Next dev rồi typecheck. Browser 375/768/1280 normal và1280 reduced đủ bốn ca PASS: vị trí đổi bên, giữ email, đổi liên tục/tab/nút bên, CAPTCHA và lỗi terms, không overflow/page error, Escape đóng; đã xem ảnh. Impeccable chỉ đọc `[]`. Chưa kiểm tra backend auth thật/touch/screen reader. [Báo cáo](../../reports/AGRI-57/frontend_ui_refinement_audit.md#sliding-loginregistration-panels--2026-10-09). Không stage/commit/push/PR/Jira.

## 30. Đưa nội dung hero giới thiệu lên cao ngày 2026-10-09

- Nhánh `AGRI-57-frontend-summary`. Chỉ làm ý 2 theo lựa chọn user, không thêm link navbar. `IntroPage.tsx` dùng xl:self-start/xl:pt-16 để khối chữ bên trái lên cao trên desktop; giữ bản đồ, chữ, CTA, animation và bố cục mobile/tablet. Taste chỉnh spacing, React Best Practices giữ thay đổi CSS-only đúng DESIGN.md.
- Fresh typecheck PASS, IntroPage 2/2 PASS, build PASS (3/3 trang), Biome exit 0 còn warning logo img cũ. Restore type Next dev rồi typecheck PASS. Browser 375/768/1280/1920 reduced-motion bốn ca PASS: desktop lên cao, màn hình nhỏ giữ nguyên, không overflow/page error; đã xem ảnh desktop/mobile. Impeccable detector chỉ đọc `[]`. Không rerun full suite hoặc kiểm tra backend/device/screen reader cho spacing-only change. [Báo cáo](../../reports/AGRI-57/frontend_ui_refinement_audit.md#introduction-copy-alignment--2026-10-09). Không stage/commit/push.

## 31. Dải ảnh cây trồng dạng phim kéo ngang ngày 2026-10-09

- Nhánh `AGRI-57-frontend-summary`. User duyệt ngoại lệ DESIGN.md 6.2. Thêm `CropFilmStrip.tsx` dưới CTA của IntroPage, dùng 13 ảnh banner hiện có: 4 khung desktop/tablet, 2 khung mobile. Viền phim xanh lá/lỗ phim/cong bằng transform GSAP; không autoplay/ảnh generated/dependency mới. `index.css` lưu tokens hình học và chiều cao responsive. Taste chỉ đạo hình thức, React Best Practices giữ DOM/state gọn; Impeccable chỉ review.
- Kéo chuột có pointer capture/settle, native touch/trackpad, bàn phím trái/phải/Home/End và giới hạn hai đầu; hint/alt/focus. Scoped useGSAP/matchMedia cleanup listener/RAF/observer; reduced-motion phẳng, cuộn tức thời. Không chiếm cuộn dọc. Đã sửa mobile clipping, overflow từ caption tuyệt đối và bỏ native snap xung đột với bounds transform.
- Test keyboard mới đỏ đúng do chưa có region, sau triển khai focused 3/3 PASS. Final full suite 89/89 PASS, typecheck/Biome PASS, build PASS 3/3 trang. Browser final 375/768/1280 normal và1280 reduced bốn ca PASS: 13 ảnh/đủ số khung, ảnh tải được, kéo chuột/bàn phím/capture và touch mô phỏng375, không overflow/page error; đã xem screenshot. Impeccable detector `[]`; restore Next type dev cho handoff. Chưa kiểm tra thiết bị thật/screen reader. [Báo cáo](../../reports/AGRI-57/frontend_ui_refinement_audit.md#introduction-draggable-crop-film-strip--2026-10-09). Không stage/commit/push/PR/Jira.

## 32. Bỏ hint và kéo dải ảnh lặp vô tận ngày 2026-10-09

- Nhánh `AGRI-57-frontend-summary`. `CropFilmStrip.tsx` bỏ dòng hướng dẫn nhìn thấy, giữ hướng dẫn bàn phím sr-only. Ba bản sao giới hạn của 13 cây nối vòng/rebase scroll hai chiều, điều chỉnh baseline khi đang kéo; đo chiều rộng fractional để tránh lệch seam. Chỉ 13 ảnh giữa accessible, hai bản sao aria-hidden/alt rỗng. Giữ 4/2 khung, màu, reduced-motion; không tự chạy. `DESIGN.md` cập nhật ngoại lệ user yêu cầu.
- Test bàn phím cập nhật đỏ đúng trên logic End cũ rồi focused 3/3 PASS. Fresh full suite 89/89 PASS, typecheck/Biome/build PASS (3/3 trang); restore Next type dev rồi typecheck PASS. Impeccable chỉ đọc `[]`, diff check exit 0/line-ending notice.
- QA mới bốn ca 375/768/1280 normal và1280 reduced PASS: mỗi ca 12 lượt kéo mỗi chiều qua seam, keyboard wrap/Home/End, rebase/capture, 39 khung giới hạn nhưng13 accessible, hint đã ẩn, không page overflow/error; touch mô phỏng qua seam ở375. Đã xem ảnh desktop/mobile. Chưa kiểm tra thiết bị thật/screen reader/performance máy yếu; QA bounded cũ không dùng làm evidence mới. [Báo cáo](../../reports/AGRI-57/frontend_ui_refinement_audit.md#continuous-user-driven-crop-film-loop--2026-10-09). Không stage/commit/push/PR/Jira.

## 33. Thu gọn khoảng trống phía trên hero ngày 2026-10-09

- Nhánh `AGRI-57-frontend-summary`. Theo yêu cầu thu hẹp và ảnh bố cục tham chiếu mới, `IntroPage.tsx` giảm top padding hero về pt-8, offset chữ desktop pt-16→pt-12, giữ bottom padding. Desktop chữ lên48px/bản đồ32px; màn nhỏ lên16px. Giữ navbar, bản đồ, CTA, dải ảnh cong lặp vòng và DESIGN.md, không thêm hiệu ứng/chức năng.
- Fresh IntroPage 3/3 PASS, typecheck PASS, build PASS3/3, Biome exit0 còn warning logo img cũ. Restore Next type dev rồi typecheck PASS. QA375/768 reduced và1280/1920 normal bốn ca PASS: khoảng trống giảm, không chạm navbar/overflow/page error, đã xem ảnh desktop. Impeccable detector chỉ đọc `[]`. Không rerun full suite/thêm test behavior cho spacing-only; chưa device/screen reader. [Báo cáo](../../reports/AGRI-57/frontend_ui_refinement_audit.md#compact-introduction-top-spacing--2026-10-09). Không stage/commit/push.

## 34. Dải ảnh tự chạy chậm ngày 2026-10-09

- Nhánh `AGRI-57-frontend-summary`. Theo yêu cầu user, `CropFilmStrip.tsx` thêm GSAP tự cuộn vòng tốc độ16px/giây, token `index.css`, ngoại lệ autoplay riêng trong DESIGN.md6.2. Giữ kéo/vuốt, curvature; cộng dồn phần lẻ tránh scrollLeft làm tròn mất chuyển động. Dừng khi hover/focus/tương tác/offscreen/document-hidden và có Button shadcn dừng/tiếp tục nhỏ. Reduced-motion không autoplay/ẩn control nhưng vẫn điều hướng. Scope cleanup tween/listener/observer/RAF, giữ phase khi đổi preference/resize.
- Test control mới đỏ do chưa có nút rồi focused4/4 PASS; fresh full suite90/90 PASS, typecheck/Biome/build PASS3/3 trang, restore Next type dev rồi typecheck PASS. Impeccable chỉ đọc `[]`, diff check exit0/line-ending notices.
- QA final375/768/1280 normal và1280 reduced bốn ca PASS:36px/2,2giây ở normal, zero ở reduced; hover/focus/control/seam/offscreen-return/đổi preference/manual keyboard, không overflow/page error; đã xem ảnh desktop/tablet. Ca offscreen đầu đo trước smooth scroll trang kết thúc, sửa QA cuộn tức thời/chờ ra viewport rồi rerun đạt. Chưa browser-test document-hidden riêng/thiết bị thật/screen reader/performance máy yếu. [Báo cáo](../../reports/AGRI-57/frontend_ui_refinement_audit.md#slow-automatic-crop-film-movement--2026-10-09). Không dependency/asset/backend/stage/commit/push.

## 35. Xóa nút tạm dừng dải ảnh ngày 2026-10-09

- Nhánh `AGRI-57-frontend-summary`. User yêu cầu xóa nút; `CropFilmStrip.tsx` bỏ Button/icon/state/ref/toggle không còn dùng, giữ autoplay chậm/vòng lặp/kéo/vuốt/bàn phím và auto pause/reduced-motion. Bỏ test riêng của nút đã xóa. DESIGN.md ghi override và trade-off accessibility: không còn nút dừng chủ động lâu dài; không thêm overlay thay thế.
- Fresh focused3/3 PASS, Biome/typecheck/build PASS3/3 trang; restore Next type dev và typecheck PASS. QA375/768/1280 normal và1280 reduced bốn ca PASS: không nút, autoplay còn chạy/reduced tĩnh, focus/hover dừng và keyboard dùng được, không overflow/page error; đã xem ảnh desktop. Impeccable chỉ đọc `[]`. Không rerun full suite/chưa device/screen reader. [Báo cáo](../../reports/AGRI-57/frontend_ui_refinement_audit.md#remove-crop-film-pause-control--2026-10-09). Không stage/commit/push.

## 36. Cửa sổ thông tin mở rộng trái, bản đồ phải và ghim được chọn ngày 2026-10-09

- Nhánh `AGRI-57-frontend-summary`. `CropMap.tsx` giữ Dialog shadcn, đổi hai cột thông tin trái/map phải từ768px; mobile xếp dọc/body scroll, header/close cố định. GSAP scoped portal mở scaleX từ cạnh phải và các panel cùng lúc bằng transform/opacity; reduced-motion hiện ngay trạng thái cuối, không animate width.
- `CropMapCanvas.tsx` tái sử dụng địa lý/đảo/ghim cho hero và dialog, useId riêng cho mỗi pattern. Ghim chọn scale1.3 ở artwork, giữ44px hit area/anchor, aria-pressed; chọn ghim trong dialog đổi vùng/cây tại chỗ, đóng trả focus về ghim mở đầu. `index.css`/DESIGN.md thêm tokens/quy tắc, giữ lề16px trên tablet và tránh ghim che nhãn Trường Sa trong map nhỏ. Không đổi dữ liệu địa lý/nguồn/backend/dependency/asset.
- Test region-switch/focus mới đỏ đúng trước code rồi focused9/9 PASS; fresh full90/90 PASS, typecheck/Biome/build PASS3/3 trang. Restore Next type dev cho handoff; Impeccable chỉ đọc `[]`, diff check exit0/line-ending.
- Browser five cases375x700/768x850/1280x850 normal,1280x600/375x480 reduced PASS: animation thật, cột/stack/bounds, ghim lớn/ghim cũ trở thường, hit44, đổi vùng, pattern IDs riêng/ba nhãn đảo, trap/Escape/focus, không overflow/page error; đã xem ảnh. Sửa QA threshold artwork42px vsbutton44 và locator tên dialog thay đổi; sửa tablet width từ phát hiện browser. Chưa thiết bị touch thật/screen reader/backend live. [Báo cáo](../../reports/AGRI-57/frontend_ui_refinement_audit.md#expanding-map-detail-dialog-with-selected-pin--2026-10-09). Không stage/commit/push/PR/Jira.

## 38. Thu khoảng trống phía trên khi mở thông tin bản đồ ngày 2026-10-09

- Nhánh `AGRI-57-frontend-summary`. Theo xác nhận user, `CropMap.tsx` chỉ khi mở thông tin desktop: bỏ offset pt-12 của chữ và căn grid hai cột lên trên. Giữ pt-8, mobile và trạng thái chữ/cuộn phim lúc đóng; không đổi map/ảnh/màu/GSAP/ghim chọn. DESIGN.md ghi refinement; Taste/React chỉ đạo, Impeccable detector chỉ đọc `[]`.
- Browser regression đỏ trước sửa với gap92px; final năm ca1920/1280/768/375 normal và1280 short reduced PASS: desktop gap44px, hai cột cùng mép trên, đóng trở về vị trí cũ trong1px, map gốc/một pattern, mobile close dưới navbar, không overflow/page error; đã xem screenshot desktop. Focused9/9, full90/90/17 files, typecheck/Biome/build3/3 PASS; restore Next dev types. Không kiểm tra device thật/screen reader/backend. [Báo cáo](../../reports/AGRI-57/frontend_ui_refinement_audit.md#compact-map-exploration-top-spacing--2026-10-09). Không stage/commit/push/PR/Jira.

## 37. Sửa đúng luồng một bản đồ, thông tin thay chữ bên trái ngày 2026-10-09

- Nhánh đã kiểm tra `AGRI-57-frontend-summary`. User sửa lại ý ở mục36: không popup lớn/không thêm bản đồ mới. `IntroPage.tsx`/`CropMap.tsx` giữ nguyên map phải; chữ/CTA/cuộn phim trái lùi và ẩn để Card shadcn thông tin xuất hiện tại cùng cột trái. Đóng đảo chiều cùng timeline GSAP để nội dung cũ trở lại, không remount/reset phim. Giữ địa lý/ảnh/nguồn/màu và ghim chọn1.3; `CropMapCanvas.tsx` bỏ nền vuông expanded. Dialog standalone vẫn hỗ trợ, không được render ở IntroPage.
- `index.css`/DESIGN.md thêm token recede0.94 và ghi rõ override inline theo yêu cầu user. Hidden content aria-hidden/inert; phim tự dừng khi inert, observer có cleanup. Nút đóng/Escape trả focus về ghim mở đầu, chọn điểm khác đổi panel tại chỗ; focus sau một frame GSAP hiện panel. Mobile cuộn header panel xuống dưới navbar6rem. Reduced-motion hiện ngay và giữ state khi đổi preference. Taste/React chỉ đạo sửa; Impeccable chỉ kiểm tra, detector `[]`.
- Test IntroPage cập nhật đỏ đúng trước code; focused9/9 PASS, fresh final full90/90 PASS/17 files, build3/3 PASS, restore Next dev type rồi typecheck PASS; Biome bốn file PASS. Broad check trước đó còn12 warning cũ print !important/logo img và một tên escape mới (đã sửa); không thay code ngoài phạm vi để xử lý warning cũ.
- Browser mới năm ca375/768/1280 normal và hai ca short reduced PASS: cùng DOM map/phim, một pattern, info trái/map phải desktop, đổi vùng/cây, pin lớn/hit44, đóng/Escape/focus, rapid open/close, mobile close không bị navbar che, ba nhãn đảo, không overflow/page error. Kiểm tra chức năng riêng PASS cho chuyển động mở/đảo chiều thật, pause phim khi inert và đổi reduced-motion lúc đang mở. Đã xem screenshot desktop/mobile; chưa device thật/screen reader/performance máy yếu/backend live. [Báo cáo](../../reports/AGRI-57/frontend_ui_refinement_audit.md#single-map-inline-exploration-correction--2026-10-09). Không stage/commit/push/PR/Jira; kiểm chứng modal cũ là lịch sử.

## 39. Đồng bộ main, bảo toàn công việc chưa commit ngày 2026-10-09

- Nhánh xác minh `AGRI-57-frontend-summary`. Theo yêu cầu user, fetch origin, stash tracked/untracked, fast-forward 60 commit từ `a437e86` tới `d34166d`, rồi apply WIP. Không tạo commit mới/push/rebase/PR hay đổi Jira. Giữ stash `7eeb6012c161a9798892eea50934f4842aa4e8df` làm backup.
- Hòa giải bốn file `AGENTS.md`, `frontend/README.md`, `frontend/pnpm-lock.yaml`, `frontend/src/services/predictionApi.test.ts`, giữ quy tắc/công cụ/UI local và phần coverage/proxy/test mới từ main. 607 file untracked khớp stash, không thiếu; 39 file tracked không bị upstream chạm tới (trừ type sinh bởi Next) cũng khớp. Trả index về unstaged như trước khi thực hiện.
- Fresh lockfile-only online/frozen offline PASS; offline lần đầu thiếu metadata coverage. Test mặc định và lần truyền flag qua dấu `--` bị timeout lint/worker; rerun đúng bằng `pnpm exec vitest run --maxWorkers=2 --testTimeout=20000` đạt 101/101 test, 18/18 file. Build PASS, static 3/3; khôi phục Next dev type sau build. Conflict marker/unmerged index không còn, diff check bốn file PASS.
- Không chạy backend/AI/Docker/migration/E2E/coverage/CI hoặc nghiệm thu lại toàn bộ UI. WIP còn nguyên để tiếp tục; không pop/apply stash lần nữa. [Báo cáo và giới hạn](../../reports/AGRI-57/agri_57_main_sync.md).
- Kiểm tra TypeScript sau khi khôi phục Next dev type: `corepack pnpm typecheck` PASS, exit 0.

## 40. Tăng bóng nổi bản đồ ngày 2026-10-09

- Nhánh `AGRI-57-frontend-summary`. `frontend/src/index.css` tăng bóng mainland thành hai lớp sát mép/cast mềm xuống phải, lấy màu từ primary-hover/foreground; DESIGN.md ghi tokens/treatment. Giữ hình dáng/ảnh/bố cục/ghim/đảo/nhãn/motion; đảo nhỏ không shadow theo rule hiện có. Taste/React chỉ đạo, Impeccable review-only.
- Browser regression đỏ trước sửa vì chỉ một bóng cũ; sau sửa375/768/1280 normal và1280 reduced bốn ca PASS, đủ nhãn/đảo không filter/không overflow/page error/ghim và mở đóng thông tin; đã xem screenshot desktop/mobile. Focused9/9, full101/101/18 files, typecheck/build3/3 PASS. Biome ban đầu fail formatting, format CSS rồi check exit0 với11 warning print !important cũ; không sửa warning ngoài scope. Impeccable detector CSS `[]`.
- Không backend/E2E/coverage/CI/device thật/screen reader/FPS; không stage/commit/push/thay stash. Khôi phục Next dev type sau build. [Báo cáo](../../reports/AGRI-57/agri_57_map_relief.md).

## 41. Tinh chỉnh ô nhập auth ngày 2026-10-09

- Nhánh `AGRI-57-frontend-summary`. `index.css` thêm auth-field tokens và scoped CSS cho Input shadcn48px/surface/viền dịu/focus xanh/error đỏ, CAPTCHA cùng chiều cao và nút mắt căn giữa; autofill inset paint giữ focus/error ring. DESIGN.md ghi treatment. Không sửa LoginModal/shared Input/validation/API/session/terms/GSAP/dependency hoặc form khác. Taste/React giữ incumbent; Impeccable review-only.
- Browser regression đỏ input44px trước sửa; QA thêm chờ dialog entry kết thúc để không đo giữa animation. Final375/768/1280 normal và1280 reduced bốn ca PASS: nhập/Tab/ẩn hiện password/giữ email/CAPTCHA sai-refresh/terms error/Escape/overflow/page errors; simulated autofill CSS qua CDP giữ inset paint và focus ring. Đã xem desktop login/mobile register. Dữ liệu test, không dùng account thật.
- Fresh101/101 tests/18 files, typecheck/build3/3 PASS. CSS format PASS, targeted Biome exit0 với11 warning print cũ; detector CSS `[]`. Khôi phục Next dev type. Không backend/E2E/CI/coverage/autofill thật/Safari/Firefox/device/screen reader; không stage/commit/push/thay stash. [Báo cáo](../../reports/AGRI-57/agri_57_auth_fields.md).

## 42. Chuyển màn hình sang Next.js App Router ngày 2026-10-09

- Nhánh `AGRI-57-frontend-summary`. Root page chuyển vào route group dùng layout App chung; thêm home/diagnose/plants/detail/diseases/detail/history/about/profile. App đọc pathname và điều hướng bằng Next router, giữ state phiên/catalog/history, bảo toàn deep link khi restore/login và về intro khi logout. Detail dùng ID URL và có trạng thái không tìm thấy. Giữ auth/history dialogs, UI/token/GSAP/API và dữ liệu; DESIGN.md ghi thay đổi được user duyệt.
- TDD đỏ ba ca trên App cũ, focused4/4 rồi fresh full107/107/19 files PASS; typegen/typecheck và targeted Biome lint PASS. Browser375/768/1280 reduced và1280 normal PASS cho direct/reload/Back/Forward/detail/missing/all screens; guest login return ban đầu fail do redirectHome ghi đè replace bất đồng bộ, giữ return-path tới khi URL commit rồi rerun PASS. Unknown route404 PASS. Build10/10 static pages PASS, hai detail routes dynamic; khôi phục Next dev type rồi final typecheck PASS. Whitespace diff check PASS với warning LF/CRLF. Không backend/AI/migration/CI/coverage/commit/push; API fixture không phải E2E thật. [Báo cáo](../../reports/AGRI-57/agri_57_app_routing.md).

## 43. Tách routing thành cấu trúc mở rộng ngày 2026-10-09

- Nhánh xác minh `AGRI-57-frontend-summary`. Theo yêu cầu user, thay screen switch trong App bằng các server page sở hữu nội dung, domain adapter `src/features`, `AppProvider`/bốn context typed và `AppShell` dùng chung trong route groups website/application. Dynamic page nhận params ID rõ ràng; navbar/mobile/footer dùng Next Link, action callback dùng hook điều hướng. Giữ views, UI/tokens/GSAP, API/session/history/startup và WIP không liên quan; không đổi dependency/backend.
- Thêm page/detail metadata với fallback an toàn, noindex cho các màn hình yêu cầu đăng nhập, loading/error/global-error/custom404 và missing-item với link quay lại. Cập nhật `frontend/README.md` và DESIGN.md. Root fallback retry/không lộ lỗi có test; global error chỉ được compile, chưa fault-inject.
- TDD đỏ hai ca page ownership/native link và hai ca metadata trước khi sửa; focused routing/startup/Navbar12/12 và fallback characterization2/2 PASS. Final full114/114 tests/21 files PASS, TypeScript PASS, build10/10 PASS với hai detail route dynamic; khôi phục Next dev type sau build. Lint/format46 file PASS không warning. Windows cmd shim lỗi dấu ngoặc route group trước khi chạy Biome; chạy trực tiếp entry Node của Biome rồi PASS. Một lần focused worker bị stall, chỉ dừng session test của tác vụ rồi isolated/rerun PASS; không suy diễn lỗi app.
- Browser rerun375/768/1280 reduced và1280 normal PASS cho direct/reload/Back/Forward/list/detail/missing/các màn hình, title detail, guest redirect/login trả về deep link và unknown-page HTTP404; không page error/overflow trong luồng kiểm tra. API fixture, không tài khoản thật/AI E2E. Targeted tracked diff whitespace PASS với LF/CRLF notices.
- Giới hạn: JWT vẫn trong browser storage, client gate không thay quyền truy cập ASP.NET; SSR auth/cookie/BFF là thay đổi hợp đồng riêng. ID catalog thiếu vẫn là client missing-state, không cam kết HTTP404 tài nguyên. Chưa backend/AI/migration/CI/coverage/bundle benchmark/device/screen reader; không stage/commit/push/PR/Jira hay thay stash. [Báo cáo kiến trúc](../../reports/AGRI-57/agri_57_routing_architecture.md).

## 44. Sửa lỗi MUSL khi Docker build frontend ngày 2026-10-09

- Nhánh xác minh `AGRI-57-frontend-summary`. Tái hiện Docker build cũ thất bại với `ERR_PNPM_MUSL`: pnpm `useNodeVersion` muốn tải Node24.15.0 nhưng image Alpine dùng musl. Đổi build/runtime trong `frontend/Dockerfile` sang `node:24.15.0-bookworm-slim`/glibc, copy `pnpm-workspace.yaml` trước frozen install để cài và build cùng cấu hình. Cập nhật `frontend/README.md`; giữ phiên bản Node/pnpm, source UI, API/session và dependency. Trade-off Debian slim lớn hơn Alpine.
- Fresh Docker frontend build PASS/exit0: frozen install507 packages, Next16.3.6 compile/TypeScript/generation10/10, image standalone được export. Có warning tốc độ tải package thấp; không lỗi build. Fresh full114/114 frontend tests/21 files PASS; Compose config quiet và targeted diff whitespace PASS.
- Container smoke riêng `--network none`/không cổng host PASS: Node24.15.0/glibc/UID không root, server thật trả rootHTTP200/AgriAI, CSS200 và missingURL404. Script QA ở ignored tmp, chỉ dừng child server của nó; `--rm` chỉ xóa container kiểm tra tạm. Không restart stack, build backend, migration, chỉnh secret hay xóa/recreate volume; chưa E2E backend/AI/CI/vulnerability scan. Không stage/commit/push/PR/Jira/thay stash. [Báo cáo](../../reports/AGRI-57/agri_57_docker_node_runtime.md).

## 45. Thay ảnh thật cho banner và cuộn phim ngày 2026-10-10

- Nhánh xác minh `AGRI-57-frontend-summary`. Đọc rules, DESIGN và skills liên quan; Taste/React/GSAP chỉ đạo triển khai, Impeccable review-only. `bannerData.ts` import tĩnh 13 JPEG mới trong `src/assets`, giữ crop/order, thêm alt tiếng Việt và focal position dùng chung cho banner/phim. `BotanicalBanner.tsx` bỏ toàn bộ foliage/rice-leaf AI overlay, thay bằng zoom nhẹ 1.03/12s và crossfade 0.65s theo chu kỳ cũ 6.5s; giữ active+next/readiness/load-failure/pause/cleanup/reduced motion. `CropFilmStrip.tsx` dùng cùng ảnh/focal, giữ loop16px/s và tương tác hiện có. CSS/DESIGN ghi token/override. Không sửa/xóa ảnh gốc/ảnh public cũ, catalog/map/địa lý/backend/model/dependency.
- TDD đỏ mapping13 ảnh và hai ca banner trước code; wider red có lỗi setup token cũ, narrow rerun giữ token cũ xác nhận lỗi đúng, green sửa URI-encoding assertion. Fresh full114/114 tests/21 files PASS, typecheck trước/sau build PASS, build10/10 static PASS; restore Next dev types. Format6 file và strict lint5 TS/TSX PASS; CSS strict lint còn11 warning print !important cũ, không sửa ngoài scope. Detector ba target `[]`, không agent critique.
- Browser production Chromium8/8 ca `/` và `/home` ở375/768/1280 normal và1280 reduced PASS: 13 ảnh phim load, Next optimized images, banner2 cảnh/không overlay, zoom/crossfade/static-reduced, autoplay/focus pause/keyboard, không overflow/page error. Xem desktop/mobile screenshots. Ca bổ sung kéo chuột/hover pause/loop hai chiều/offscreen pause PASS. API fixture, không account thật/inference E2E. Dev trong sandbox timeout120s khi compile; dừng dev của lượt, build/production QA ngoài sandbox PASS; không tự kết luận nguyên nhân dev. `pnpm start` có warning standalone cũ, không đổi deployment.
- Report mới ghi rõ nguồn ảnh/quyền dùng chưa kiểm chứng, ba ảnh nhỏ có thể mờ khi phóng banner; manual pause vẫn bị bỏ theo user override. Không backend/AI/Docker/migration/CI/coverage/Lighthouse/device thật/screen reader/FPS. Bằng chứng generated ở ignored tmp; không stage/commit/push/PR/Jira/thay stash. [Báo cáo](../../reports/AGRI-57/agri_57_real_banner_photos.md).

## 46. Thay ảnh thật toàn giao diện và dọn asset ngày 2026-10-10

- Nhánh xác minh `AGRI-57-frontend-summary`. User yêu cầu xóa/thay ảnh AI rồi làm rõ giữ logo và bản đồ; thay ảnh thông tin khi chọn ghim và banner/crop AI ở nơi khác. Giữ `CropMapCanvas`/texture/outline/đảo/shadow/motion, không generated image. Tách registry 13 ảnh thật `cropPhotos.ts`, dùng chung qua `bannerData.ts`/`plantData.ts`; danh mục/chi tiết/home/map info/pin dùng ảnh đúng cây. Intro/history/about thay ảnh lúa phụ trợ và alt phù hợp. Next Image responsive cho catalog/detail/home/about; không đổi animation/auth/routes/dependencies. Bỏ tám ảnh minh họa lá khỏe chưa xác minh, giữ missing-image UI thay vì dùng stock crop làm bằng chứng bệnh. DESIGN ghi override; Taste/React giữ bố cục và tối ưu ảnh, Impeccable chỉ đọc.
- Xóa 28 PNG crop/foliage cũ sau inventory Git và validate resolved path trong đúng `frontend/public/images`; tracked files khôi phục được từ Git. Thư mục còn logo và canopy WebP theo user; source JPEG/datasets/checkpoints/uploads/history không bị sửa/xóa. Search source không còn path crop/cutout bị xóa, giữ tài liệu lịch sử. Không destructive Git.
- TDD đỏ14/15 do catalog còn URL cũ và condition references; focused green15/15. Fresh final full115/115 tests/21 files PASS; typecheck trước/sau build PASS, final build10/10 static PASS, restore Next dev types. Format9 files PASS; strict scoped lint7 files exit0 có1 info concat cũ, không lint toàn repo. Scoped diff whitespace PASS với LF/CRLF notices. Detector3 targets `[]`.
- Browser production Chromium4/4 ca375/768/1280 normal và1280 reduced PASS: sáu marker/info ảnh thật, map DOM/texture/logo giữ nguyên, close trả heading, 13 catalog ảnh và detail/about/history load, không overflow/page error. Xem desktop/mobile screenshots. Lượt đầu script kiểm tra quá sớm trong authenticated entrance nên count0; đợi page heading rồi confirmation PASS, không sửa auth. API/session fixtures, test server riêng3100; standalone warning cũ, dừng server của lượt sau kiểm tra.
- Nguồn/licensing/locality/provenance ảnh chưa independently verified; ảnh nhỏ và thiếu ảnh leaf-condition thật còn hạn chế. Không backend/AI/Docker/migration/CI/coverage/Lighthouse/device thật/screen reader/FPS, không stage/commit/push/PR/Jira/stash. [Báo cáo](../../reports/AGRI-57/agri_57_real_catalog_photos.md).

## 47. Giảm cắt và che ảnh banner ngày 2026-10-10

- Nhánh xác minh `AGRI-57-frontend-summary`. Theo screenshots/yêu cầu user, `BotanicalBanner.tsx` dùng contain trong nửa phải desktop, giữ chữ riêng bên trái/mobile trên ảnh; bỏ scrim. CSS chừa inset2% cho centered zoom1.03; DESIGN ghi override. Taste/React giữ màu/copy/Button/13 nguồn và thứ tự; GSAP playback/readiness/pause/reduced/cleanup không đổi. Không sửa map/logo/phim/API/dependency hoặc WIP khác.
- Browser TDD đỏ trước sửa tại1920: cover chỉ giữ52.6% khung nguồn. Green Chromium production5/5 ca375/768/1280/1920 reduced và1920 normal PASS: nguyên khung, không chữ đè/overflow/page error, chuyển lúa→cà chua thật với hai scene. Xem desktop/mobile screenshots; fixture không phải backend/model E2E. QA artifacts trong ignored tmp, dừng riêng server3100 sau kiểm tra.
- Fresh115/115 tests/21 files PASS sau rerun ngoài sandbox (lượt trong sandbox không tiến triển, dừng riêng session); build10/10 static/two dynamic PASS; khôi phục dev types rồi typecheck PASS. Scoped Biome lint1 TSX/format2 UI PASS; detector2 target `[]`; scoped diff whitespace PASS với LF/CRLF notice. Không dùng kết quả lịch sử làm evidence mới.
- Khoảng nền có thể xuất hiện theo aspect ratio; nguồn ảnh nhỏ không tự sắc nét hơn, chưa browser-cycle đủ13 scene/device/screen reader/FPS/CI/coverage/Lighthouse/backend/AI/Docker/migration. Không stage/commit/push/PR/Jira/stash. [Báo cáo](../../reports/AGRI-57/agri_57_banner_photo_framing.md).

## 48. Đồng nhất khung và làm mềm chuyển cảnh ngày 2026-10-10

- Nhánh `AGRI-57-frontend-summary`. User không chấp nhận hình contain của lượt47 và muốn kích thước thống nhất/crossfade mượt. Component dùng cover/focal từng cây trong cùng media bounds; CSS mobile3:2, desktop widthmin56vw/60rem và heroheightclamp28rem/37.333vw/40rem; chỉ alpha-blend mép trái, bỏ inset/letterbox/scrim rộng. Fade tăng1.2s, giữ timer6.5s/zoom1.03/readiness/pause/reduced/cleanup. DESIGN ghi override; không đổi13 ảnh gốc, map/logo/phim/Button/API/dependency/WIP khác.
- Browser RED chứng minh hai source painted bounds khác nhau và fade10%-90%383.6ms. Final Chromium5/5 ca1920/1280 normal,768/375 reduced và375 normal PASS: cùng bounds theo viewport, blend715-717ms, không overflow/page error. Một batch inspection và một confirmation: bỏ feather trên/dưới sau khi thấy hơi mờ; không polish thêm. API fixtures, server3100 riêng và QA ignored tmp, dừng sau kiểm tra.
- Fresh full115/115 tests/21 files PASS; final build10/10 static/two dynamic PASS; restore dev types rồi typecheck PASS. Scoped lint1 component/format2 UI PASS, detector2 targets `[]`, whitespace PASS với LF/CRLF notice. Lần full tests chạy trước batch cuối chỉ đổi CSS mask, không sửa logic.
- Cover có trade-off cắt rìa nhẹ; không cam kết100% ảnh gốc. Chưa visual đủ13 scene/FPS/device thật/screen reader/CI/coverage/Lighthouse/backend/AI/Docker/migration; không stage/commit/push/PR/Jira/stash. [Báo cáo](../../reports/AGRI-57/agri_57_banner_consistency.md).

## 49. Cân đối hai mép banner ngày 2026-10-10

- Nhánh xác minh `AGRI-57-frontend-summary`. User duyệt căn banner cùng khung menu nhưng không thành card ảnh. `BotanicalBanner.tsx` thêm desktop stage max-w-7xl/outer px-12 và chỉnh Next sizes; CSS ảnh60% stage, height clamp28rem/32vw/32rem, alpha mask opaque24%-92% hòa hai mép vào canvas. Không blur/bóng/viền/bo góc/scrim toàn ảnh. DESIGN ghi override; Taste/React/coding-standards giữ thay đổi nhỏ, Impeccable chỉ review. Giữ copy/Button/13 nguồn/order/GSAP fade1.2s/pause/reduced/readiness/cleanup, mobile full-width3:2, map/logo/phim/API/routes/dependencies/WIP khác.
- Browser RED trước code ở1920: nav lề320px hai bên, media lề phải0px. GREEN Chromium production5/5 viewport1920/1280/1024/768/375 PASS: desktop media lề phải khớp nav320/48/48px, không overflow; mobile giữ bố cục cũ. Xem desktop1280/mobile375 screenshots trong một batch, không polish thêm. Regression frame/blend5/5 ca PASS: bounds768x512/710x448/375x250, blend10%-90%711/718.2/717ms; reduced tĩnh, không page error. QA fixtures/ignored tmp, không real backend/model E2E.
- Fresh build10/10 static/two dynamic PASS, restore Next dev types rồi typecheck PASS. Full test lượt đầu chạy cùng build có105 tests/19 files PASS nhưng2 forks-worker startup timeout tại LoginModal/CropMap, exit1; giữ ghi nhận này. Rerun toàn bộ sau build PASS115/115 tests/21 files,17.63s, không đổi test/config. Scoped Biome component check/format2 files PASS; detector2 targets `[]`, whitespace PASS với LF/CRLF notice. Không dùng kết quả cũ làm bằng chứng mới.
- Dừng server3100 riêng sau QA. Chưa Docker rebuild/backend/AI/migration/CI/coverage/Lighthouse/FPS/device thật/screen reader/visual đủ13 scene; cover có thể cắt rìa và ảnh nguồn nhỏ/licensing/manual pause vẫn là giới hạn trước đó. Không stage/commit/push/PR/Jira/stash. [Báo cáo](../../reports/AGRI-57/agri_57_banner_balance.md).

## 50. Khôi phục lá trang trí chuyển động ngày 2026-10-10

- Nhánh xác minh `AGRI-57-frontend-summary`. User muốn lại artwork lá động cũ và đặt trong src/assets; đã thông báo chỉ khôi phục decoration, giữ mọi photo thật. Sao13 PNG từ HEAD vào `frontend/src/assets/banner-leaves/`,13 hash khớp byte; không khôi phục public path/ảnh crop AI/rice-stalk, tạo ảnh mới hoặc đổi index/history Git. `bannerLeaves.ts` registry riêng; `BotanicalBanner.tsx` render3/2 leaf desktop/mobile aria-hidden/alt rỗng, active-only GSAP x/y/rotation20px/5/6s. Shared scene crossfade1.2s/readiness/pause/reduced/cleanup, optional leaf lỗi ẩn riêng và không kẹt slideshow; photo lỗi vẫn giữ scene. CSS/DESIGN ghi ngoại lệ/tokens; Taste/React/GSAP/coding-standards hướng dẫn triển khai, Impeccable review-only. Không thay khung/copy/Button/map/logo/phim/API/dependency/WIP khác.
- TDD RED8/22 do thiếu leaf, GREEN21/22 có lỗi fixture spy getter tác động mọi ảnh; sửa test dùng own getter cho một leaf, thêm kiểm tra đúng PNG qua13 cảnh. Focused22/22 và final full117/117 tests/21 files PASS17.55s. Production build10/10 static/two dynamic PASS; restore dev types rồi typecheck PASS. Scoped Biome check3 files/format CSS PASS, detector3 targets `[]`; whitespace PASS với LF/CRLF notice.
- Chromium production fixtures6/6 ca1920/1280/768/375 normal và1280/375 reduced PASS: đúng leaf count/load/accessibility, transform động/tĩnh, không overflow/page error, khung menu giữ cân đối, lúa→cà chua đổi cả artwork, offscreen pause. Test lượt đầu dùng viewport900 còn thấy banner khi scroll hết nên pause assertion fail; giảm viewport thử500 và xác nhận banner ngoài viewport, rerun PASS; không sửa production. Xem screenshots desktop/mobile trong batch, không polish thêm. QA/scripts ignored tmp; PowerShell binary-restore cần process-only execution-policy escalation, không đổi policy lâu dài; dừng server3100 riêng.
- Artwork generated cũ có cả cành/quả, không phải photo thật/bằng chứng bệnh; provenance/licensing/accuracy chưa verified. Chưa visual13 scene/FPS/device thật/screen reader/Safari/Firefox/CI/coverage/Lighthouse/backend/model E2E/Docker/migration. Không stage/commit/push/PR/Jira/stash. [Báo cáo](../../reports/AGRI-57/agri_57_banner_leaf_motion.md).

## 51. Cụm cây neo góc và bông lúa ngày 2026-10-10

- Nhánh xác minh `AGRI-57-frontend-summary`. User bác bỏ cụm nhỏ bay riêng ở lượt50 và duyệt kiểu cũ sau đối chiếu Git HEAD: một cụm cây lớn góc phải dưới xoay quanh gốc, chỉ lúa có lá nhỏ. Thêm rice-stalk vào src/assets/banner-leaves, hash khớp blob nguồn; tổng14 decoration PNG, không phục hồi public paths/ảnh crop AI. Registry BANNER_FOLIAGE/RICE_LEAF riêng; component giữ một foliage mỗi cảnh, Image fill trong khung4:3, right-1.5%/bottom-13%/pivot94%-95%, sway-2.5→3 độ/7s không x/y; lúa3/2 lá desktop/mobile drift20px/5 độ/13s. CSS/DESIGN ghi override. Giữ13 ảnh thật, khung cân đối/copy/Button/map/logo/phim/GSAP crossfade/readiness/pause/reduced/cleanup/API/dependencies và WIP khác; skills coding-standards/Taste/React/GSAP hướng dẫn, Impeccable review-only.
- TDD RED9/23, focused GREEN23/23. Full đầu113/118,5 fail và3 unhandled Next Image exceptions do PNG mock thiếu metadata; sửa khung cố định/Image fill không nới test. Final full118/118 tests/21 files PASS18.60s. Typecheck đầu chạy đồng thời tests gặp lint Probe tạm bị xóa; chạy tuần tự lại PASS. Build trước sửa ảnh dừng chủ động, final build10/10 static/two dynamic PASS; restore dev types rồi typecheck PASS. Scoped Biome3 files/format CSS PASS; detector3 targets `[]`, scoped whitespace PASS với LF/CRLF notice.
- Chromium production fixtures6/6 ca1920/1280/768/375 normal và1280/375 reduced PASS: stalk/foliage load, một cụm cây/đúng lá lúa/accessibility, vị trí neo trong media ổn định, normal sway/reduced tĩnh, menu cân đối/không overflow/page error, lúa→cà chua chỉ còn một foliage và offscreen pause. Assertion đầu đo viewport bbox fail1280; đổi phép đo sang local offset trong media để kiểm tra hợp đồng neo, rerun toàn batch PASS không sửa production. Xem1920 lúa/1280 cà chua/375 lúa screenshots, không polish thêm. Scripts/evidence ignored tmp, server3100 riêng đã dừng; warning standalone cũ không sửa deployment.
- Artwork generated cũ chỉ trang trí theo yêu cầu user, không phải photo thật/bằng chứng bệnh; licensing/provenance/accuracy chưa verified. Chưa visual đủ13 scene/FPS/device thật/screen reader/Safari/Firefox/CI/coverage/Lighthouse/backend/model E2E/Docker/migration. Không stage/commit/push/PR/Jira/stash. [Báo cáo](../../reports/AGRI-57/agri_57_banner_anchored_foliage.md).

## 52. Thu nhỏ riêng cụm ngô ngày 2026-10-10

- Nhánh xác minh `AGRI-57-frontend-summary`. Theo user, modifier corn tại BotanicalBanner và token CSS widthmin63%/25.2rem giảm30% so với trước; giữ aspect/neo/sway/fade/ảnh nền/crop khác. DESIGN ghi ngoại lệ. Không sửa asset/API/map/phim/dependency hoặc unrelated WIP. Coding-standards/Taste/React hướng dẫn sửa hẹp; Impeccable chỉ review.
- Regression13-crop RED1/23 rồi full GREEN118/118 tests/21 files19.30s. Scoped Biome2 files/CSS format/typecheck PASS. Lượt giảm20% build/browser PASS nhưng screenshot còn lá chạm mặt; batch correction giảm30%, không đổi logic. Final build10/10 static/two dynamic/typecheck/CSS format PASS; full unit run trước batch CSS cuối.
- Chromium production fixtures375/768/1280 PASS3/3, measured width236.25/403.1875/403.1875px bằng70% cũ, no overflow/page error/ảnh load. Xem desktop/mobile một inspection và một confirmation, mặt người thoáng hơn; không khẳng định toàn thân/mọi pha motion không bị chồng. QA artifacts ignored tmp, server3100 riêng dừng. Không Docker rebuild/CI/coverage/Lighthouse/real backend/model E2E/stage/commit/push/PR/Jira/stash. [Báo cáo](../../reports/AGRI-57/agri_57_banner_anchored_foliage.md#follow-up-thu-nhỏ-riêng-cụm-ngô-ngày-2026-10-10).

## 53. Gom banner asset vào folder ngày2026-10-12

- Nhánh xác minh `AGRI-57-frontend-summary`. Theo user,13 JPEG vào src/assets/banner và14 PNG vào banner/banner-leaves, hash27/27 không đổi; native moves đã kiểm tra resolved targets/no collisions. Cập nhật imports cropPhotos/bannerLeaves và JPEG fixture path/bannerData.test, DESIGN vị trí hiện hành; không sửa visual/component/CSS/motion/API/dependency/unrelated WIP. Coding-standards hướng dẫn tổ chức tối thiểu.
- Test đường dẫn mới trước move RED13/15 ENOENT, sau move/import full GREEN118/118 tests/21 files59.34s; scoped Biome3 files PASS. Build đầu fail do fetch Manrope/Google Fonts, rerun quyền mạng PASS10/10 static/two dynamic; restore Next dev types rồi typecheck PASS, không sửa font/config.
- Không browser/screenshot mới do chỉ relocation, không coi bằng chứng cũ là fresh; chưa Docker rebuild/CI/coverage/Lighthouse/backend/model E2E. Không stage/commit/push/PR/Jira/stash/xóa dữ liệu. [Báo cáo](../../reports/AGRI-57/agri_57_banner_asset_folder.md).

## 54. Banner-leaves ngang hàng banner ngày2026-10-12

- Nhánh `AGRI-57-frontend-summary`. Theo clarification user, chuyển14 PNG về src/assets/banner-leaves ngang hàng src/assets/banner chứa13 JPEG. Validated resolved paths/no collisions;14/14 hash unchanged. Cập nhật14 static imports bannerLeaves và DESIGN, không UI/motion/API/dependency/unrelated WIP.
- Fresh typecheck/scoped Biome1 file PASS; focused banner/photo tests38/38 PASS,2 files41.69s. Không build/full suite/browser/Docker/CI/coverage/backend E2E/commit/push ở lượt correction; không tái dùng kết quả lượt53 như fresh. [Báo cáo](../../reports/AGRI-57/agri_57_banner_asset_folder.md).

## 55. Ghép ảnh thật với tên cây backend ngày2026-10-12

- Branch verified AGRI-57-frontend-summary. Screenshot Cam dùng logo; traced getPlants template matching không hiểu canonical Vietnamese key/full display mismatch. Đối chiếu migration DatasetV14Catalog, thêm exact normalized alias→local ID trong catalogApi, giữ DTO overrides/backendId/active filtering/disease behavior; reuse13 JPEG assets/banner qua registry hiện có. Không component/CSS/motion/asset/backend/DB/route/dependency/unrelated WIP change. Coding-standards/debugging/TDD hướng dẫn sửa nguyên nhân.
- New service tests RED7/14 fail cho Cam/Che/Lua/Ngo/Ot/Pepper/Buoi; GREEN full132/132 tests22 files29.50s. Typecheck PASS, scoped Biome2 files exit0 với1 pre-existing useImportType warning, format2 files PASS. Fresh build10/10 static/two dynamic PASS với network permission/font có sẵn; restore Next dev imports rồi typecheck PASS. Chromium production fixture375/768/1280 reduced PASS3/3,9 canonical plants đúng JPEG/load/no overflow/page errors; xem desktop/mobile một batch, không visual edits. QA artifacts ignored tmp, server3100 riêng dừng; warning standalone cũ không sửa.
- Nho/Grape từ backend chưa có ảnh thật trong supplied folder, unknown-template logo fallback giữ nguyên; không gán nhầm ảnh cây khác/không sửa dataset hoặc active plants. Không real backend/model E2E/CI/coverage/Docker/migration/commit/push. [Báo cáo](../../reports/AGRI-57/agri_57_catalog_photo_aliases.md).

## 56. Ảnh nho trên banner, map và phim ngày2026-10-12

- Branch verified AGRI-57-frontend-summary. User thêm nho banner.jpg và yêu cầu home/map/info/film cùng decoration động. Shared cropPhotos/plantData/alias Nho→grape, giữ ảnh thật gốc;14-scene order giữ13 cũ rồi thêm nho. CropRegions thêm geographic Ninh Thuận/nguồn IP Vietnam; Canvas/token leader nối display marker lệch north-east24/48px về anchor thật, không đổi outline/islands/relief/các ghim cũ. BANNER_FOLIAGE thêm một PNG grape-cutout, reuse sway7s/pause/reduced/fade/cleanup. DESIGN ghi ngoại lệ; giữ API/classifier/dataset/DB/dependency/unrelated WIP. Coding-standards/TDD/React/Taste/GSAP/imagegen triển khai, Impeccable review-only.
- Imagegen built-in edit từ ảnh supplied, copy PNG1448x1086 vào src/assets/banner-leaves; true alpha corner0/sample253 bằng System.Drawing, hash copy khớp. Pillow check đầu thiếu PIL, không cài package. PNG reconstructed decoration, không ảnh đối chiếu bệnh; JPG không chỉnh. Prompt/hash/nguồn recorded trong report.
- Targeted RED5/42; full đầu135/136, lỗi fixture alt map Nho thay vì existing Ảnh minh họa cây Nho; sửa fixture. Final full136/13622 files16.39s PASS; typecheck trước/sau build PASS, scoped Biome10 files exit0 có1 existing warning, format11 files PASS. Build10/10 static/two dynamic PASS với quyền font network, restore Next dev imports; whitespace PASS. Final Chromium fixture4/4 ca375/768/1280 normal và1280 reduced PASS: film/map/info/catalog/home ảnh nho load, ghim không che Lâm Đồng, open/Escape, one grape PNG sway/static, no overflow/page errors. Hai harness attempts cài clock sau GSAP không tới grape, đổi install trước page code; screenshot batch đầu chụp trước timeline map hoàn tất, confirmation run1.5s/assert opacity>.99 và full4/4 rerun PASS. Virtual-time banner test không là FPS/timing benchmark. Xem home/map desktop/mobile một batch+confirmation, không visual polish thêm; ignored tmp evidence, server3100 riêng dừng. Không sửa production để chiều harness.
- Không disease-count claims/new labels/real backend-model E2E/CI/coverage/Lighthouse/FPS/device thật/Safari/Firefox/screen reader/Docker/migration/volume/stage/commit/push/PR/Jira/stash. [Báo cáo](../../reports/AGRI-57/agri_57_grape_surfaces.md).

## 57. Bộ ảnh minh họa bệnh lá ngày2026-10-12

- Branch verified AGRI-57-frontend-summary. User thêm folder assets/Bệnh lá; inventory70 ảnh/14 cây,56 bệnh/hại và14 healthy. Explicit static imports/typed adapters trong leafPhotos, plantData giữ template cũ và gắn photo/append entries thiếu; healthy chỉ ở điều kiện cây, disease listing57 gồm56photo+đạo ôn cũ chưa có file đúng nhãn. Không sửa/move/delete ảnh gốc, banner/map/logo/phim/motion, backend/classifier/dataset/dependency/routes/DB hay WIP khác. Generic cháy lá/vàng lụi không tự chứng nhận blast/Tungro. New draft category/status chưa phân loại/chưa xác minh, không tự tạo nội dung triệu chứng/nguyên nhân/điều trị hay severity. DESIGN ghi giới hạn ảnh theo tên file, annotation hiện trên UI; source/license/expert approval pending.
- catalogApi chuẩn hóa đ, exact photo-name/canonical aliases, chặn empty-label match, giữ qualification khi backend override description;4 cây tham khảo ngoài model v1.4 (bưởi/khoai tây/chuối/dưa hấu) được hiển thị nếu thiếu, không backendId/model-support count/active-row mutation. Coding-standards/TDD/React static paths/debugging/verification/webapp-testing dùng trong phạm vi data integration, không redesign/primitives mới.
- Data TDD RED9/10; first implementation9 fail do Vite URL không có .src, reuse boundary URL-or-metadata rồi10/10. Service RED2, guard RED1, reference crop RED1 rồi green. First full147/148, test banner cũ cấm mọi ảnh lá; đổi thành cấm banner/decor substitutions, không nới ràng buộc đó. Final full150/150 tests23 files18.49s PASS; scoped Biome6files clean. Final build10/10 static/two dynamic PASS13.7s compile; Next dev type imports restored, fresh post-build tsc checked separately. Whitespace PASS với LF/CRLF notices. SHA256 duplicate-group over70files không có identical byte duplicates, không là chứng nhận chẩn đoán.
- Chromium production fixtures375/768/1280 reduced PASS3/3:56 disease list photos decode, desktop14 plant routes đủ70conditionphotos load, grape Esca detail/annotation và healthy/reference potato reachable, no tested overflow/pageerror. Xem catalog desktop và detail desktop/mobile; sections thiếu medical content vẫn trống. QA trước pass chỉ đổi tên biến import, không visual/behavior. Ignored tmp screenshots/script, own QA server3100 stopped; standalone-start warning cũ không đổi deployment.
- Chưa source/licensing/expert/AI-authenticity verification; ảnh có thể là insects/branches/wholeplants không phải tất cả closeup singleleaf. Chưa fullmedicalcontent/CI/coverage/Lighthouse/FPS/physicaldevice/Safari/Firefox/screenreader/realbackend-model E2E/Docker rebuild/migration/volume/stage/commit/push/PR/Jira/stash. [Báo cáo](../../reports/AGRI-57/agri_57_leaf_illustrations.md).

## 58. Bổ sung ảnh đạo ôn lúa ngày2026-10-12

- Branch verified AGRI-57-frontend-summary. User thêm assets/Bệnh lá/Lúa/bệnh đạo ôn lúa.png (578818bytes); viewed, original SHA256 EF5E76627F4FE23600B153EA45FAFC973811353CBBF83157EFD59B117D6D36C2 giữ nguyên. leafPhotos thêm một static import và entry rice-blast, reuse existing adapters/condition/detail không duplicate. Tổng71photo57non-healthy14healthy; disease listing giữ57, nay đạo ôn không còn missing photo. Không sửa model labels/backend/DB/content/visual/motion/banner/dependency/unrelated WIP. Annotation unverified theo tên file vẫn giữ; coding-standards/TDD/React static-import guidance áp dụng.
- TDD RED2/12 do chưa gắn PNG; final full151/151 tests23files82.64s PASS, scoped Biome2files clean, final build10/10static/two dynamic PASS compile2min/TS7.3s, restored Next dev-type imports rồi fresh tsc PASS. Whitespace PASS. Browser production fixtures375/768/1280 reduced3/3 PASS: rice-blast detail và rice plant condition load/decode PNG, served bytes hash-match original, no tested overflow/pageerror; xem desktop/mobile screenshots, QA artifacts ignoredtmp và server3100 riêng dừng. Standalone-start warning cũ không sửa deployment.
- Chưa expert/source/license/realbackend-model E2E/CI/coverage/physicaldevice/SafariFirefox/screenreader; không Docker rebuild/migration/volume/stage/commit/push/PR/Jira/stash. [Bằng chứng](../../reports/AGRI-57/agri_57_leaf_illustrations.md#follow-up-rice-blast-illustration--2026-10-12).

## 59. Phân trang cây trồng và bệnh ngày2026-10-12


- Branch verified AGRI-57-frontend-summary. Thêm9 mục/trang PlantsPage/DiseasesPage bằng shared hook/domain pager, reuse shadcn Button/Lucide/tokens. Lọc/tìm toàn bộ trước slice, reset trang1 khi filter/search, clamp data shrink; changePage focus live summary/instant scroll offset6rem. Prev/Next disabled, aria-current,3 số bounded mobile, hide zero/onepage. Không ảnh/data/API/labels/motion/dependency/routes/backend/DB/WIP khác thay đổi. Coding-standards/TDD/React/Taste triển khai; Impeccable review-only.
- TDD6 RED; GREEN đầu3/6 vì testtextbox thay searchbox, sửa harness. Final157/157tests24files32.40s PASS. Build đầu lỗi TS fixture category/role exact; sửa test, build cuối PASS12.7s10static/two dynamic; restore Next dev imports/fresh tsc PASS. Scoped Biome5files exit0 với2 existing infos; testformat đã sửa. Whitespace exit0/CRLF notices. Docs CLI EACCES/fallback officialdocs; detector exit0/no stdout.
- Chromium production fixtures375/768/1280 reduced3/3 PASS cả2catalog: boundaries/partial last/search/crop reset/focus/44px/no overflow/pageerror. Harness nhầm Lúa/Lúa nước và count3 thay8, kiểm tra source/sửa harness; production không đổi để chiều test. Xem mobile/desktop một batch; ignoredtmp, riêng QA3100 stopped, standalone warning cũ giữ. Client-side/localstate, chưa serverpaging/URL-Back persistence/historypaging/realbackend E2E/CI/coverage/device/SafariFirefox/screenreader. Không Docker/migration/volume/stage/commit/push/PR/Jira/stash. [Báo cáo](../../reports/AGRI-57/agri_57_catalog_pagination.md).

## 60. Bỏ nền riêng nhãn đảo ngày2026-10-12

- Verified branch AGRI-57-frontend-summary. CropMapCanvas nhãn đảo bg-transparent thay nền đặc; chữ/màu/geography/ghim/motion giữ. Review thấy Trường Sa đè canopy, áp offset chuẩn -translate-y-12 hiện có cả hero; DESIGN ghi correction. Không ảnh/dependency/API/WIP khác thay đổi. Coding-standards/Taste/React hướng dẫn, Impeccable review-only.
- Browser RED nền computed đặc; final Chromium375/768/1280 reduced3/3 PASS transparent/no overflow, xem desktop/mobile một batch và một confirmation offset. Full cuối157/157tests24files41.13s maxWorkers1 PASS; initial run concurrent build bị2 startup worker timeouts CatalogPagination/LoginModal, không claim đạt, retry riêng PASS. Build cuối38.7s compile10static/two dynamic PASS; restore Next dev imports/fresh tsc PASS. Scoped Biome1file exit0 (root cwd attempt không resolve tool; rerun frontend), whitespace PASS. Ignoredtmp QA; riêng server3100 stopped. Chưa realbackend/CI/coverage/device/screenreader/FPS; không Docker/migration/volume/stage/commit/push. [Bằng chứng](../../reports/AGRI-57/agri_57_map_relief.md#island-label-background-correction-2026-10-12).

## 61. Đồng bộ vị trí địa lý bản đồ ngày2026-10-12

- Verified AGRI-57-frontend-summary. User yêu cầu chính xác vị trí: thay mainland50m/inset đảo bằng Natural Earth10m, shared spherical Mercator extent101.5-118E/6-24N cho tất cảpaths/ghim.25rings/1478vertices mainland simplification0.008degree; selected Hoàng Sa18land/7reef, Trường Sa21land/14reef, Côn Sơn1land. Giữ tọa độ/tỷ lệ đảo, không fabricate features; loại9coastal neighbors Palawan/northBorneo bắt được khi review broad selection. Hash3source trong report. Native horizontal viewport với focus/keyboard giữ canvas576px,44px controls; Đông Bắc east leader chống chạm Sơn La, giữgeoanchor/nho leader. Bỏ offsetnhãn đảo cũ, transparent, giữcanopy/relief/GSAP/single-map/info/API/dataset/dependency/WIP khác. DESIGN ghi superseding treatment; coding-standards/TDD/React/Taste triển khai, Impeccable review-only.
- TDD2 RED projection/island sourcebounds, thêm1 RED Balabac inclusion rồi GREEN. Focused13 PASS, full cuối160/16025files37.86s maxWorkers1 PASS. Build cuối13.9s10static/two dynamic PASS, restoredevimports/fresh tsc PASS. ScopedBiome4 exit0; wrapperlint ban đầu sửasemanticsection với exceptionkeyboardnative scroll có lý do. Whitespace PASS; detector exit0/no stdout. Sandboxdownload fail, networkauthorized source download succeeded; không secret/service writes.
- Chromium final4/4:375/768/1280 reduced +1280normal,7pins44px/no overlap/nativepan/keyboardArrowRight375/labels/Escapefocus/no overflow/pageerrors. Initial pin overlap sửa bằngleaderpreservinganchor; harness printcp1252 lỗi đổi ASCIIJSON. Review desktop/mobile batch vàconfirmation sau coastalfilter/focus; focusoutline khôngborder thường. Ignoredtmp QA, riêng3100server stopped. Không exhaustive geography/GISexpert/satellite/legalcertification/physicaltouch/device/screenreader/SafariFirefox/FPS/CI/coverage/realbackend E2E; không Docker/migration/volume/stage/commit/push. [Nguồn và giới hạn](../../reports/AGRI-57/agri_57_geographic_map.md).

## 62. Cân hai cột và đưa đảo gần hơn ngày2026-10-12

- Verified AGRI-57-frontend-summary. User override khoảng cách địa lý để giao diện cân: CropMap equal desktop columns; mapPresentation riêng480wide/Hoàng Sa-80/Trường Sa-128/Côn Đảo0 SVG units. Canvas432px centered, projected height giữ, same0.9scale/nhãn dịch theo nhóm. Recalculate percentageghim theo displaywidth, giữ anchors/44px/leaders/inline/GSAP/phim/API/data/geometry/dependency/WIP khác. DESIGN ghi compact illustration không còn same-distance geographic display. Taste/React/coding-standards triển khai, Impeccable review-only.
- Browser RED Hoàng Sa gap86.11>60; final4/4 reduced375/768/1280/1900 PASS compactgroups/equal desktopcols/44px/non-overlap/no documentoverflow/Escape focus. Xem1900/375 một batch không remediation. Full160/16025files60.36s PASS; build14.6s10static/two dynamic PASS, restoredevimports/fresh tsc PASS. ScopedBiome3exit0 sau bỏunused import; whitespace PASS, detectorexit0/no stdout. Ignoredtmp, QA3100 stopped, standalonewarning giữ. Chưa normalmotion/FPS/device/screenreader/browserkhác/backendE2E/CI/coverage; không Docker/migration/volume/stage/commit/push. [Bằng chứng](../../reports/AGRI-57/agri_57_map_balance.md).

## 63. Bỏ scrollbar lúc mở trang và tăng map ngày2026-10-12

- Verified AGRI-57-frontend-summary. Reproduced normal entrance1900px: overflow-y:auto, frame654px/scroll670px,10 sampled overflow frames. CropMapCanvas thêm overflow-y-hidden; giữ native pan ngang. Hero432 lên512px từ breakpoint640px, điện thoại/detail giữ432px, hai cột equal giữ. Không sửa GSAP, geometry/metadata/anchors/44px/leaders/labels/relief/phim/API/dependencies/WIP khác. DESIGN ghi narrow sizing correction; Taste/coding-standards/React triển khai, Impeccable review-only.
- Fresh build PASS76s compile10static/two dynamic; restore dev imports rồi tsc PASS. Full160/160tests25files54.09s PASS, scopedBiome1file exit0, whitespace exit0, detector exit0/no findings. Browser4/4 PASS1900normal +375/768/1280reduced: zero verticaloverflowframes137/130/132/125 samples, canvas enlarged/equal columns/no desktop map or document horizontaloverflow/44px nonoverlap/open/Escapefocus/375 keyboardpan. Xem desktop/mobile một batch; ignored QA script/screenshots, own3100 stopped, standalonewarning giữ.
- Chưa mọi screen/motion combinations/physicaltouch/device/FPS/SafariFirefox/screenreader/Lighthouse/coverage/CI/backend-model E2E. Không Docker rebuild/deploy/DB/volume/stage/commit/push/PR/Jira. [Bằng chứng](../../reports/AGRI-57/agri_57_map_balance.md#follow-up-map-entrance-scrollbar-and-larger-canvas-2026-10-12).

## 64. Tổng hợp task log và report ngày2026-10-12

- Đối chiếu branch AGRI-57-frontend-summary và bản ghi các lượt trước; bổ sung phần tổng hợp hiện trạng vào frontend_implementation_report.md, liên kết từng nhóm chức năng tới report chi tiết. Bao gồm prediction/auth/UI, routing, main sync/Docker, ảnh thật/asset/aliases/nho, banner/phim/lá trang trí,71 ảnh lá/đạo ôn, pagination, nguồn địa lý/map compact/bóng/ghim/inline information, scrollbar và canvas lớn hơn. Không viết lại/xóa lịch sử hoặc khôi phục thiết kế cũ.
- Đồng bộ ngày cập nhật và điểm vào của report README/task-log README; phân biệt baseline với hiện trạng, tài liệu tổng hợp với lần chạy mới. Kiểm chứng ứng dụng gần nhất vẫn là lượt63:160/160tests25files, build/typecheck và Chromium4/4 PASS; không chạy lại những checks này trong lượt chỉ sửa Markdown.
- Ghi rõ việc còn lại: checkpoint inference/Cloudinary private/E2E thật, source/license/expert image verification, nội dung bệnh mới, giới hạn compact geography, client pagination/SSR auth, CI/coverage/full-repo lint/device/browser/a11y chưa chứng nhận. Không đổi code/asset, Docker/DB/volume, stage/commit/push/PR/Jira. Kiểm tra whitespace và đường dẫn liên kết local của tài liệu cập nhật trước bàn giao; [report tổng hợp](../../reports/AGRI-57/frontend_implementation_report.md#tổng-hợp-hiện-trạng-ngày-2026-10-12).
- Kiểm tra phát hiện link cũ tới docs/backend_frontend_integration_handbook.md không có file; đổi thành ghi chú tài liệu thiếu, không tự tạo hoặc đoán tài liệu thay thế. Whitespace và local file targets của bốn Markdown cập nhật PASS sau correction; không kiểm tra external links/anchor fragments.

## 65. Chuẩn bị commit chuẩn Jira và ghi lỗi CI ngày2026-10-12

- Verified AGRI-57-frontend-summary. Đọc project/directory rules, Git command/commitlint guide, git-commit skill và skill boundaries; user duyệt cả frontend/assets/docs và skills/rules, chọn không sửa CI failures. Stage theo explicit approved paths, loại cache %SystemDrive%, duplicate agents/, secrets/generated artifacts/User Story drafts. Chia runtime/tooling, integrated frontend feature tree, agent skills/rules và tài liệu; bốn subject Conventional Commits có AGRI-57 và commitlint0problems/0warnings.
- Fresh frozen installs root/frontend PASS sau network authorization; không upgrade/sửa lockfile. Initial coverage thiếu local provider, rerun exact test:coverage160/16025files39.27s PASS; validator654/1197branch54.64%>=25% PASS, không đạt/certify target80% per component. Fresh build87scompile10static/two dynamic PASS, restoredevimports/tsc PASS. Commitlint regression1/1 PASS sau initial incomplete-install failure. Gitleaks staged5.61MB và existing109commits50.17MB noleaks; scanning container networknone.
- Lint exactCI FAIL49warnings/7infos, formatcheck FAIL62errors; full staged whitespace có vendor skill trailing whitespace/report blankline, giữ nguyên user no-fix. Compose smoke stillgrepLeafAI là source finding, chưa chạy fullstack. Không sửa workflow/code/thresholds, không hooks bypass. Backend/Python/Compose/GitHubCI/CD/browser/realinference chưa chạy ở lượt này. [Preflight](../../reports/AGRI-57/agri_57_commit_readiness.md). Commit hashes/history được đối chiếu sau khi tạo và báo lúc bàn giao; không tự push/PR/Jira/deploy/DB/volume operation.
