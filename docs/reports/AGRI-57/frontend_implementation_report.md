# AGRI-57 — Báo cáo triển khai frontend LeafAI

## Tổng hợp hiện trạng ngày 2026-10-12

**Follow-up sau chuẩn bị commit:** user đổi quyết định, yêu cầu sửa blockers nhưng không ảnh hưởng main. Strict lint/format/typecheck/build và160/160tests đã PASS trong lượt mới; coverage654/1195=54.73% vượt floor25%, không chứng nhận target80% per component. Đã đồng bộ smoke brand AgriAI và kiểm tra HTML build, print/image delivery/map. Chưa chạy full Compose/GitHub CI/CD, chưa commit/push sửa mới. Xem [bằng chứng follow-up](agri_57_commit_readiness.md#follow-up-local-ci-remediation-2026-10-12); đoạn chuẩn bị commit bên dưới được giữ như lịch sử.

**Cập nhật chuẩn bị commit:** người dùng chọn commit không sửa các lỗi CI. Lượt mới test:coverage160/160 và branch coverage54.64% PASS, build/typecheck/commitlint/local secret scan PASS; lint49warnings và format62errors còn FAIL. Xem [preflight](agri_57_commit_readiness.md); không coi thông điệp commit chuẩn là CI/CD đã pass.

Nhánh đã đối chiếu: `AGRI-57-frontend-summary`. Phần này tổng hợp công việc đã ghi nhận trong task log mục 6–63 và các report liên kết; không phải một lần kiểm thử lại toàn hệ thống. Website hiện dùng tên **AgriAI**. Các mục đánh số 1–8 phía dưới là baseline lịch sử, không phải kiến trúc hoặc kết luận nghiệm thu hiện tại.

### Các nhóm công việc đã thực hiện

| Nhóm | Kết quả hiện tại và đường dẫn liên quan | Bằng chứng chi tiết |
| --- | --- | --- |
| Prediction UI và API | Upload/kéo thả/camera, preview/thay/xóa ảnh, validation, progress/loading/error/retry, hiển thị cây/bệnh/confidence và mapping Backend DTO. Mã nguồn: `frontend/src/views/DiagnosePage.tsx`, `frontend/src/services/predictionApi.ts`. Demo baseline không thay thế nghiệm thu checkpoint thật. | Các mục 1–8 bên dưới; [README tổng hợp](README.md). |
| Hệ thống thiết kế và auth | DESIGN.md, tokens xanh–kem, shadcn/Radix, navbar sticky, tinh chỉnh các màn hình; đăng nhập/đăng ký chuyển panel, ô nhập48px/focus/autofill; loading logo/tên/lời chào chờ startup requests thật, có retry khi lỗi. | [Rà soát UI](frontend_ui_refinement_audit.md), [auth fields](agri_57_auth_fields.md), [quality setup](agri_57_frontend_quality_setup.md). |
| Routing | App Router cho intro/home/diagnose/plants/detail/diseases/detail/history/about/profile; page sở hữu nội dung, route groups, features, provider/context và AppShell dùng chung; Next Link, deep-link/Back/Forward, metadata/loading/error/not-found. Mã nguồn: `frontend/src/app/(website)/`, `frontend/src/features/`, `frontend/src/providers/`. | [Routing ban đầu](agri_57_app_routing.md), [kiến trúc mở rộng](agri_57_routing_architecture.md). |
| Đồng bộ và Docker | Đã lấy upstream main và khôi phục WIP theo bản ghi riêng; sửa lỗi pnpm MUSL bằng Node24.15.0 Debian slim/glibc cho Docker frontend. Không đồng nghĩa các thay đổi UI mới đã được rebuild vào stack đang chạy. | [Main sync](agri_57_main_sync.md), [Docker runtime](agri_57_docker_node_runtime.md). |
| Ảnh thật và tổ chức asset | Thay crop/banner AI bằng ảnh user cung cấp, giữ logo và canopy map theo yêu cầu.14 ảnh banner trong `frontend/src/assets/banner/`, artwork trang trí trong `assets/banner-leaves/` ngang hàng; dùng registry chung cho home/catalog/detail/map info/film. Sửa matching tên cây backend, bổ sung nho đúng các bề mặt. Không tuyên bố artwork trang trí là ảnh thật hoặc bằng chứng bệnh. | [Ảnh thật toàn UI](agri_57_real_catalog_photos.md), [asset folders](agri_57_banner_asset_folder.md), [aliases](agri_57_catalog_photo_aliases.md), [nho](agri_57_grape_surfaces.md). |
| Banner và phim | Khung banner đồng nhất, cân hai mép, chỉnh focal/crop và crossfade; khôi phục một cụm lá/cành neo góc đúng cây, bông lúa và cụm ngô nhỏ hơn; nho có artwork trang trí riêng. Giữ pause theo visibility/offscreen, cleanup, reduced motion. Film có kéo/cuộn/bàn phím và loop chậm; nút pause thủ công bị bỏ theo user override. | [Banner consistency](agri_57_banner_consistency.md), [banner balance](agri_57_banner_balance.md), [anchored foliage](agri_57_banner_anchored_foliage.md), [nho](agri_57_grape_surfaces.md). |
| Ảnh lá và danh mục |71 ảnh/14 cây:57 ảnh bệnh/hại và14 healthy, gồm ảnh đạo ôn lúa mới. Healthy chỉ ở điều kiện cây; ảnh được ánh xạ theo tên file, chưa xác minh chuyên môn/quyền sử dụng. Bốn cây tham khảo không thay đổi model labels. Cây/bệnh phân trang9 mục, lọc/tìm trước phân trang, reset/clamp và focus summary. | [Leaf illustrations và đạo ôn](agri_57_leaf_illustrations.md), [pagination](agri_57_catalog_pagination.md). |
| Map và thông tin | Một map gốc ở cột phải; chọn ghim làm chữ/phim trái lùi để nhường bảng thông tin, đóng đảo chiều để trở lại. Ghim chọn phóng artwork, giữ target44px; mainland có bóng nổi, nhãn đảo nền trong suốt. Geometry Natural Earth1:10m dùng Web Mercator; lớp presentation riêng kéo Hoàng Sa/Trường Sa gần bờ theo yêu cầu, nên khoảng cách hiển thị không còn chính xác địa lý. Hai cột desktop bằng nhau; canvas hero512px từ640px màn hình,432px trên điện thoại/detail; chặn scrollbar dọc lúc entrance, giữ pan ngang khi hẹp. | [Map relief](agri_57_map_relief.md), [geographic source](agri_57_geographic_map.md), [map balance và scrollbar](agri_57_map_balance.md). |
| Rules và công cụ | Project rules/directory rules, command guides, DESIGN và skill boundaries đã được sử dụng trong các lượt triển khai; Impeccable chỉ review, không tự commit/push hoặc đổi Jira Done. | [Skills/shadcn](agri_57_skills_shadcn_setup.md), `.agents/skills/README.md`, task log. |

### Kiểm chứng gần nhất đã ghi nhận

Lượt sửa kích thước/scroll map ngày2026-10-12, trước lượt tổng hợp tài liệu này:

- `corepack pnpm exec vitest run --maxWorkers=1 --testTimeout=20000`: **160/160 tests,25 files PASS**,54.09s.
- `corepack pnpm run build`: **PASS**,76s compile,10 static pages và hai dynamic routes. Khôi phục Next dev-type imports sau build.
- `corepack pnpm run typecheck`: **PASS** sau khi khôi phục imports.
- Scoped Biome `CropMapCanvas.tsx`, whitespace và scoped Impeccable detector: **PASS/exit0**. Không suy diễn toàn-repo lint đã sạch.
- Chromium **4/4 PASS**:1900px normal motion và375/768/1280px reduced motion. Bắt mẫu ngay trong entrance, không còn frame tạo scrollbar dọc; kiểm tra canvas lớn hơn, equal columns,44px targets/non-overlap, không document overflow, mở/đóng/Escape/focus và pan bàn phím375px. Chi tiết ở [map follow-up](agri_57_map_balance.md#follow-up-map-entrance-scrollbar-and-larger-canvas-2026-10-12).

### Giới hạn và việc còn lại

- Chưa nghiệm thu inference checkpoint thật xuyên CLI–HTTP–API–web, Cloudinary private access và E2E toàn hệ thống; test fixtures/health checks không thay thế những việc này.
- Còn xác minh nguồn/quyền dùng ảnh và nhãn bệnh với chuyên môn; các mục mới chưa đủ nội dung bệnh học. Đồ họa lá trang trí có nguồn/generated history ghi riêng, không phải ảnh đối chiếu bệnh.
- Map hiện là minh họa compact, không bản đồ đo đạc/ranh giới hay đầy đủ mọi đảo. Geometry gốc và presentation offsets phải được phân biệt.
- Pagination là client-side/local state; SSR auth/cookie/BFF, HTTP404 cho ID catalog thiếu và URL persistence của trang danh mục chưa triển khai trong phạm vi đã ghi.
- Chưa có chứng nhận CI/coverage mới, toàn-repo lint, Lighthouse/FPS, physical touch, screen reader hoặc Safari/Firefox. Việc bỏ pause thủ công ở banner/film vẫn là đánh đổi accessibility theo yêu cầu.
- Lượt hiện tại chỉ cập nhật tài liệu, **không chạy lại application tests/build/browser**, không Docker rebuild/deploy, DB/volume operation, stage/commit/push/PR hay đổi trạng thái Jira. Các kết quả trên có thời điểm và nguồn riêng; DoD production/toàn hệ thống vẫn chưa được xác nhận.

---

> Bản ghi baseline ngày 2026-09-28, giữ lại để theo dõi lịch sử. Không dùng mô tả hiệu ứng logo/scan hoặc kết quả responsive bên dưới để nghiệm thu bản UI hiện tại. Các thay đổi thay thế nằm trong [báo cáo UI ngày 2026-10-07](frontend_ui_refinement_audit.md); cài skill và cấu hình shadcn nằm trong [báo cáo công cụ](agri_57_skills_shadcn_setup.md). Trạng thái tổng hợp hiện tại ở [README AGRI-57](README.md).

## 1. Phạm vi

AGRI-57 hoàn thiện frontend demo cho hệ thống chẩn đoán bệnh lá cây và mapping với Backend ASP.NET Core. Phạm vi bao gồm nền tảng Next.js, UI/UX, xác thực tài khoản, upload ảnh, prediction flow, lịch sử, danh mục cây/bệnh, responsive và kiểm thử tự động.

## 2. Kiến trúc frontend

### Nền tảng

- Next.js `16.3.6` với App Router.
- React `19.2.0` và TypeScript.
- pnpm `10.34.5` làm package manager.
- Tailwind CSS 4 cho giao diện responsive.
- Vitest, Testing Library và jsdom cho unit/integration test.

Các entry point và cấu hình chính:

- `frontend/src/app/layout.tsx`
- `frontend/src/app/page.tsx`
- `frontend/next.config.ts`
- `frontend/postcss.config.mjs`
- `frontend/vitest.config.mts`
- `frontend/package.json`

### Tổ chức chức năng

| Nhóm | Mã nguồn | Trách nhiệm |
|---|---|---|
| Điều phối ứng dụng | `frontend/src/App.tsx` | Session, điều hướng, history, modal và toast. |
| Màn hình | `frontend/src/views/` | Landing, trang chủ, kiểm tra lá, cây, bệnh, lịch sử, dự án và hồ sơ. |
| Thành phần dùng chung | `frontend/src/components/` | Navigation, modal, splash, kết quả và trực quan hóa. |
| API client | `frontend/src/services/` | Auth, catalog, prediction và history. |
| Validation | `frontend/src/utils/imageFileValidation.ts` | Kiểm tra file trước khi upload. |

## 3. Mapping Frontend–Backend

### Xác thực

- `POST /api/auth/register`: đăng ký với `fullName`, `email`, `password`.
- `POST /api/auth/login`: đăng nhập và nhận JWT cùng thông tin người dùng.
- `GET /api/auth/me`: khôi phục và xác minh phiên đã lưu.
- JWT được gửi bằng `Authorization: Bearer <token>` cho endpoint cần xác thực.

Mã nguồn: `frontend/src/services/authApi.ts`.

### Danh mục

- Client lấy cây trồng và bệnh từ Backend.
- DTO Backend được mapping sang type hiển thị của frontend.
- Có xử lý lỗi kết nối thay vì làm crash giao diện.

Mã nguồn: `frontend/src/services/catalogApi.ts`.

### Prediction

- Gửi ảnh qua `multipart/form-data` với field `file`.
- Theo dõi upload progress bằng `XMLHttpRequest`.
- Hỗ trợ timeout 60 giây và `AbortSignal`.
- Kiểm tra response theo `PredictionResultDto` trước khi render.
- Mapping tên cây, bệnh, confidence, Top-K, trạng thái khỏe/bệnh và timestamp sang `DiagnosisResult`.
- Hỗ trợ tải lịch sử, lấy chi tiết và xóa prediction có JWT.

Mã nguồn: `frontend/src/services/predictionApi.ts`.

## 4. Luồng trải nghiệm hoàn chỉnh

1. Người dùng mở landing page giới thiệu LeafAI.
2. Người dùng đăng nhập hoặc đăng ký; form kiểm tra dữ liệu trước khi gọi API.
3. Đăng nhập yêu cầu CAPTCHA demo; đăng ký yêu cầu chấp nhận điều khoản.
4. Sau xác thực, màn hình logo LeafAI xoay và tách lá trước khi vào ứng dụng.
5. Người dùng chọn, kéo thả hoặc chụp ảnh lá cây.
6. Frontend validation định dạng và dung lượng, sau đó hiển thị preview.
7. Khi nhấn phân tích, UI chuyển lần lượt qua Uploading và Analyzing.
8. Backend response được mapping và hiển thị tại trạng thái Success.
9. Nếu lỗi, UI hiển thị thông báo và cho phép retry mà không mất ảnh.
10. Kết quả được đưa vào lịch sử để xem chi tiết, xuất báo cáo hoặc xóa.

## 5. UI/UX đã hoàn thiện

- Landing page và hero giới thiệu sản phẩm.
- Trang chủ với banner cây trồng và CTA chẩn đoán.
- Màn hình kiểm tra lá với upload zone, scan state và result panel.
- Danh mục cây trồng, bệnh thường gặp và trang chi tiết.
- Mẫu đã lưu với tìm kiếm, lọc, grid/list và modal chi tiết.
- Trang về dự án và phần giải thích AI/Grad-CAM.
- Dashboard hồ sơ với thống kê từ lịch sử thật.
- Navbar desktop, navigation mobile, toast và các modal thao tác.
- Giao diện đồng nhất màu xanh nông nghiệp Việt Nam và responsive từ 320 px.

## 6. Xác thực file và trạng thái lỗi

`frontend/src/utils/imageFileValidation.ts` xử lý:

- Chấp nhận JPEG, PNG và WEBP.
- Từ chối file rỗng.
- Từ chối định dạng không hỗ trợ.
- Từ chối file lớn hơn 15 MB.
- Trả lỗi thân thiện để UI hiển thị mà không crash.

Prediction flow xử lý thêm lỗi mạng, timeout, hủy request, response sai contract và lỗi HTTP từ Backend.

## 7. Kiểm thử

Kết quả chạy ngày 2026-09-28:

```text
Test Files  6 passed (6)
Tests       20 passed (20)
```

Backend hỗ trợ luồng prediction cũng được xác minh cùng ngày: **8/8 unit tests** và **5/5 integration tests** đều đạt. Integration test sử dụng PostgreSQL Testcontainers và fake image/AI services để kiểm tra API cùng persistence mà không gọi dịch vụ cloud bên ngoài.

Phạm vi test:

- Unit test validation file.
- Unit test Prediction API client và mapping response.
- Integration test preview, thay ảnh và xóa ảnh.
- Integration test Uploading → Analyzing → Success.
- Integration test Error → Retry.
- Test abort request khi component unmount.
- Test CTA landing page.
- Test mode đăng ký, CAPTCHA và điều khoản.
- Test hiệu ứng logo tách trước khi vào app.

Lệnh xác minh:

```powershell
cd frontend
corepack pnpm lint
corepack pnpm test
corepack pnpm build
```

## 8. Đánh giá Definition of Done

Frontend demo đáp ứng toàn bộ acceptance criteria AGRI-47 đến AGRI-56 và không hard-code prediction result trong UI. Task được xem là hoàn thành trong phạm vi demo; các hạng mục CAPTCHA server-side, model AI production và kiểm thử E2E toàn hệ thống được ghi nhận là follow-up, không phải kết quả đã hoàn tất.
