# AGRI-57 — Frontend LeafAI và tích hợp Backend

Đây là điểm vào chính cho toàn bộ bằng chứng kỹ thuật của task AGRI-57.

Nhánh đã đối chiếu: `AGRI-57-frontend-summary`. Cập nhật tài liệu: 2026-10-12.

[Tổng hợp toàn bộ công việc và hiện trạng ngày2026-10-12](frontend_implementation_report.md#tổng-hợp-hiện-trạng-ngày-2026-10-12): chức năng, routing, ảnh/banner/lá, map, phân trang, kiểm chứng gần nhất và phần chưa nghiệm thu. Lượt tổng hợp chỉ sửa tài liệu, không chạy lại các kết quả lịch sử.

## Trạng thái Definition of Done

- **Sửa blockers local ngày2026-10-12, sau mục commit-only:** user cho phép sửa trên feature branch, không tác động main. Strict lint/format/typecheck/build PASS; test:coverage160/160 PASS, branch654/1195=54.73% vượt floor25% giữ nguyên. Smoke expectation đổi sang AgriAI, đối chiếu HTML build PASS; Chromium print/direct image delivery và map4/4 PASS. Chưa chạy full Compose/GitHub CI/CD, chưa commit/push các sửa mới. [Follow-up](agri_57_commit_readiness.md#follow-up-local-ci-remediation-2026-10-12).

- **Chuẩn bị commit ngày2026-10-12:** user chọn commit cả frontend/docs/skills/rules và không sửa lỗi CI. Fresh160/160tests, branch coverage654/1197=54.64% vượt floor25%, build/typecheck/commitlint và local secrets scans PASS. Lint49warnings và format62errors vẫn FAIL; Compose smoke còn tìm LeafAI. Không xác nhận GitHub CI/CD pass. [Preflight và giới hạn](agri_57_commit_readiness.md).

- **Scroll và kích thước map ngày2026-10-12:** bỏ thanh cuộn dọc tạm lúc entrance, tăng canvas hero lên512px từ640px màn hình; giữ hai cột cân và pan ngang trên điện thoại. Fresh build/typecheck,160/160tests và Chromium4/4 PASS, gồm lấy mẫu lúc entrance1900px normal motion. [Bằng chứng](agri_57_map_balance.md#follow-up-map-entrance-scrollbar-and-larger-canvas-2026-10-12).

- **Cân bố cục map ngày2026-10-12:** hai cột desktop bằng nhau, Hoàng Sa/Trường Sa dịch gần đất liền trong lớp trình bày riêng, giữ dữ liệu tọa độ gốc/ghim/motion. Hiển thị không còn đúng khoảng cách địa lý. Fresh160/160tests, typecheck/build và Chromium375/768/1280/1900 PASS. [Báo cáo](agri_57_map_balance.md).

- **Tọa độ bản đồ ngày2026-10-12:** đất liền/đảo/ghim dùng chung Web Mercator, Natural Earth1:10m, bỏ inset đảo kéo sát bờ/phóng lớn, mobile cuộn ngang; giữ canopy/ghim44px/motion. Fresh160/160tests, typecheck/build và Chromium4/4 PASS. Không chứng nhận đo đạc/ranh giới; nguồn đảo còn thiếu chi tiết. [Báo cáo](agri_57_geographic_map.md).

- **Nền nhãn đảo ngày2026-10-12:** bỏ ô nền khác màu trên nhãn đảo, đưa Trường Sa lên khoảng trống bằng offset chuẩn hiện có; giữ map/ghim/motion. Fresh157/157tests, typecheck/build và Chromium375/768/1280 PASS. [Bằng chứng](agri_57_map_relief.md#island-label-background-correction-2026-10-12).

- **Phân trang danh mục ngày2026-10-12:** cây/bệnh9 mục mỗi trang, Trước/Sau/số trang; tìm kiếm/lọc toàn bộ rồi reset trang1, chuyển trang focus/cuộn về đầu danh sách. Fresh157/157tests, typecheck/build và Chromium375/768/1280 PASS. Client-side, không API/URL persistence. [Báo cáo](agri_57_catalog_pagination.md).

- **Ảnh đạo ôn lúa bổ sung ngày2026-10-12:** PNG mới gắn vào `rice-blast` hiện có ở cây lúa/cẩm nang/chi tiết, không duplicate/new model label; inventory71ảnh. Fresh151/151tests, typecheck, build và Chromium3viewport ảnh/hash PASS. [Bằng chứng bổ sung](agri_57_leaf_illustrations.md#follow-up-rice-blast-illustration--2026-10-12).

- **Ảnh lá do user cung cấp ngày 2026-10-12:** tích hợp70 ảnh/14 cây vào điều kiện lá và cẩm nang; giữ riêng56 ảnh bệnh/hại và14 ảnh khỏe, thêm4 cây tham khảo không-model, không sửa nhãn/backend/ảnh gốc/banner. Ánh xạ theo tên file, chưa xác minh chuyên môn/licensing; mục chưa khớp vẫn thiếu ảnh, nội dung các mục mới chưa hoàn thiện. [Phạm vi, kiểm chứng và giới hạn](agri_57_leaf_illustrations.md).

- **Sửa Docker frontend ngày 2026-10-09:** tái hiện `ERR_PNPM_MUSL`; đổi hai stage sang Node24.15.0 Debian slim/glibc và copy workspace config trước frozen install, giữ pnpm10.34.5/local runtime. Fresh Docker build10/10, runtime smoke HTTP200/CSS/404/non-root và114/114 frontend tests PASS. Không khởi động lại stack hay thay volume/database. [Nguyên nhân và bằng chứng](agri_57_docker_node_runtime.md).

- **Cấu trúc routing mở rộng ngày 2026-10-09:** page sở hữu nội dung, route group tách intro/application shell, domain `features`, shared provider với bốn context và Next Link; thêm metadata/loading/error/custom404, giữ UI/API/session hiện có. Fresh114/114 tests/21 files, typecheck, lint/format46 file và build10/10 PASS; browser bốn viewport/motion và guest deep-link/404 PASS bằng API fixture. SSR auth/cookie và HTTP404 cho ID thiếu chưa nằm trong phạm vi. [Kiến trúc, kiểm chứng và giới hạn](agri_57_routing_architecture.md).

- **Routing ngày 2026-10-09:** Next App Router có URL riêng cho các màn hình và chi tiết cây/bệnh, shared layout giữ phiên; fresh107/107 tests, typecheck, targeted lint và build10/10 PASS. Browser375/768/1280 reduced và1280 normal PASS; sửa race login trả về deep link rồi kiểm tra lại PASS. API fixture, không phải backend/AI E2E thật. [Phạm vi và bằng chứng](agri_57_app_routing.md).

- **Ô nhập auth ngày 2026-10-09:**48px, viền/focus xanh, đồng bộ CAPTCHA/nút mắt và autofill surface paint, CSS scoped không sửa validation. Fresh101/101 tests/typecheck/build PASS; bốn ca browser PASS,11 warning print cũ còn nguyên. [Báo cáo và giới hạn](agri_57_auth_fields.md).

- **Bóng nổi bản đồ ngày 2026-10-09:** mainland có bóng mềm hai lớp theo semantic tokens; giữ đảo/ghim/địa lý. Fresh101/101 tests/build PASS và bốn ca browser PASS;11 warning print cũ còn nguyên. [Báo cáo và giới hạn](agri_57_map_relief.md).

- **Đồng bộ main ngày 2026-10-09:** fast-forward 60 commit tới `d34166d`, khôi phục WIP và giữ stash dự phòng; không commit/push. Fresh 101/101 tests và build PASS; backend/AI/E2E chưa chạy. [Chi tiết đồng bộ và conflict](agri_57_main_sync.md).

- **Thu khoảng trống map mở ngày 2026-10-09:** khoảng dưới navbar giảm92→44px, căn hai cột lên trên; đóng giữ bố cục cũ. Fresh90/90 tests/typecheck/build PASS, năm ca browser spacing PASS. [Bằng chứng và giới hạn](frontend_ui_refinement_audit.md#compact-map-exploration-top-spacing--2026-10-09).
- **Sửa luồng khám phá map ngày 2026-10-09:** giữ một bản đồ gốc bên phải, bảng thông tin thay chữ/cuộn phim trái bằng GSAP đảo chiều khi đóng; không modal/map thứ hai ở trang giới thiệu. Fresh90/90 tests, typecheck/build PASS, năm ca browser responsive/reduced và kiểm tra motion/pause phim PASS. [Phạm vi, bằng chứng và giới hạn](frontend_ui_refinement_audit.md#single-map-inline-exploration-correction--2026-10-09); không phải nghiệm thu toàn hệ thống.
- **Cài skill UI vào repo ngày 2026-10-08:** thêm Taste, 4 GSAP, React Best Practices và Impeccable vào `.agents/skills`; tổng 22 skill. Kiểm tra 7 metadata và 34 link local không lỗi; giữ giới hạn Impeccable review-only. [Nguồn, commit và kiểm chứng](agri_57_skills_shadcn_setup.md#7-cài-bộ-skill-ui-vào-dự-án-ngày-2026-10-08). Không chạy lại application tests/build trong lượt chỉ cài skill này.
- **Tinh chỉnh UI xanh lá ngày 2026-10-08:** tăng phân cấp và đồng bộ 10 màn hình theo DESIGN.md; sửa ảnh stock sai/hỏng bằng trạng thái thiếu ảnh trung thực. Kiểm tra trình duyệt cô lập 36 trạng thái ở 375/768/1280px; 79/79 tests, typecheck và build PASS. Lint còn 63 warnings, format còn 46 file; thư viện ảnh bệnh và backend E2E chưa hoàn tất. Xem [bằng chứng UI mới](frontend_ui_refinement_audit.md#leaf-green-refinement-and-browser-review--2026-10-08).
- **Nền tảng frontend ngày 2026-10-08:** bổ sung runtime/công cụ, test luật lint và xử lý 24 lỗi mức error. Lần chạy mới: 74/74 tests và build PASS; còn 69 cảnh báo lint và 52 file cần format nên quality gate chưa đạt. Xem [bằng chứng từng lượt và việc còn lại](agri_57_frontend_quality_setup.md); không coi đây là nghiệm thu toàn dự án lớn.
- **Baseline demo ngày 2026-09-28:** hoàn thành trong phạm vi đã ghi nhận; các kết quả bên dưới là lịch sử, không phải kiểm tra lại toàn hệ thống.
- **Lượt UI/banner ngày 2026-10-07:** chưa hoàn tất nghiệm thu trực quan ở 375px, 768px và 1280px. Kiểm thử tự động và build đã qua, nhưng không thay thế kiểm tra bằng trình duyệt. Việc bỏ nút dừng thủ công có đánh đổi về khả năng tiếp cận trong [báo cáo rà soát UI](frontend_ui_refinement_audit.md).
- **Lượt skill/shadcn ngày 2026-10-07:** hoàn thành phần cài skill và xác minh cấu hình, có bằng chứng trong [báo cáo công cụ](agri_57_skills_shadcn_setup.md). Không phải xác nhận sẵn sàng production, không thay đổi trạng thái Jira hoặc tạo PR.

### Phạm vi demo đã ghi nhận ngày 2026-09-28

- Upload, preview, xóa và chọn lại ảnh: hoàn thành.
- Validation định dạng, file rỗng và dung lượng tối đa 15 MB: hoàn thành.
- Gửi multipart request đến ASP.NET Backend và nhận JSON response: hoàn thành.
- Hiển thị cây trồng, bệnh, confidence, ảnh và trạng thái xử lý: hoàn thành.
- Idle, Uploading, Analyzing, Success, Error và retry: hoàn thành.
- Responsive desktop, tablet và mobile: hoàn thành.
- Unit test và integration test frontend: **20/20 PASS**.
- TypeScript check và Next.js production build: PASS.
- Prediction result không hard-code trong UI; dữ liệu được mapping từ Backend DTO.

## Kết quả baseline ngày 2026-09-28

| Kiểm tra | Kết quả | Nguồn bằng chứng |
|---|---:|---|
| Test files | 6/6 PASS | `corepack pnpm test` ngày 2026-09-28 |
| Test cases | 20/20 PASS | `corepack pnpm test` ngày 2026-09-28 |
| TypeScript | PASS | `corepack pnpm lint` ngày 2026-09-28 |
| Production build | PASS | `corepack pnpm build` ngày 2026-09-28 |
| Backend unit tests | 8/8 PASS | `dotnet test` ngày 2026-09-28 |
| Backend integration tests | 5/5 PASS | `dotnet test` với Testcontainers ngày 2026-09-28 |
| Static route | `/` | Output của Next.js build ngày 2026-09-28 |

## Các thay đổi bổ sung ngày 2026-10-07

| Nhóm | Thay đổi và bằng chứng |
| --- | --- |
| Hệ thống thiết kế và UI | `DESIGN.md`, semantic tokens, shadcn/Radix, tinh chỉnh các màn hình và khả năng tiếp cận; [chi tiết UI](frontend_ui_refinement_audit.md). |
| Banner | Khôi phục 13 bộ ảnh gốc; tự chuyển, lá chuyển động mạnh hơn, bỏ selector/mũi tên/nút dừng theo yêu cầu; giữ reduced motion và tự dừng khi khuất/ẩn tab. Nguồn: `frontend/src/data/bannerData.ts`, `BotanicalBanner.tsx` và các test được dẫn trong báo cáo UI. |
| Agent skills | Cài thêm 13 gói, giữ 2 skill cũ, tổng 15 skill trong repo; 7 skill UI cấp máy được ghi riêng, không giả định đã đi cùng repo. Nguồn: `.agents/skills/installed_skills.json`, `.agents/skills/README.md`. |
| shadcn | Xác nhận cấu hình có sẵn `radix-nova`, Tailwind 4, 16 primitive; thêm script `ui` và hướng dẫn dùng, không khởi tạo lại hoặc ghi đè component. [Chi tiết và lệnh kiểm chứng](agri_57_skills_shadcn_setup.md). |
| Report/task log | Đồng bộ các lượt trước vào đúng AGRI-57; bổ sung quy tắc cập nhật theo nhánh ở `AGENTS.md` và `.agents/rules/project_rules.md`. |

Kết quả gần nhất của lượt cấu hình shadcn: **63/63 tests, 12/12 test files**, typecheck và production build PASS ngày 2026-10-07. Đây là lần chạy đã ghi nhận trong [báo cáo công cụ](agri_57_skills_shadcn_setup.md), không phải một lần chạy mới trong lượt chỉ sửa tài liệu. Backend, AI và E2E toàn hệ thống không được chạy lại trong lượt đó.

## Tài liệu

- [Nền tảng công cụ và quality gate frontend ngày 2026-10-08](agri_57_frontend_quality_setup.md)
- [Báo cáo triển khai frontend](frontend_implementation_report.md)
- [Rà soát và tinh chỉnh UI ngày 2026-10-07–08](frontend_ui_refinement_audit.md)
- [Cài skill và xác minh cấu hình shadcn ngày 2026-10-07](agri_57_skills_shadcn_setup.md)
- [Task completion log](../../task-logs/AGRI-57/AGRI-57-trunthong09012005.md)
- Hướng dẫn tích hợp Backend–Frontend: đường dẫn cũ `docs/backend_frontend_integration_handbook.md` hiện không có trong workspace; chưa có tài liệu thay thế được xác nhận.

## Mã nguồn liên quan

- `frontend/src/App.tsx`
- `frontend/src/views/`
- `frontend/src/components/`
- `frontend/src/services/authApi.ts`
- `frontend/src/services/catalogApi.ts`
- `frontend/src/services/predictionApi.ts`
- `frontend/src/utils/imageFileValidation.ts`
- `frontend/src/**/*.test.ts`
- `frontend/src/**/*.test.tsx`
- `DESIGN.md`, `AGENTS.md`, `.agents/rules/project_rules.md`
- `frontend/components.json`, `frontend/src/index.css`, `frontend/package.json`, `frontend/README.md`
- `.agents/skills/README.md`, `.agents/skills/installed_skills.json`

Các lượt bổ sung này không sửa mã nguồn trong `ai/` hoặc `backend/`.

## Giới hạn còn lại

Nho ngày2026-10-12: supplied JPG dùng chung cho14-scene home/film/catalog/map info, thêm ghim vùng trồng Ninh Thuận và PNG trang trí nền trong suốt; giữ cơ chế sway/pause/reduced có sẵn. Fresh136 tests và build/typecheck PASS. [Phạm vi, nguồn vùng trồng, prompt/asset và giới hạn](agri_57_grape_surfaces.md).

Ảnh danh mục backend ngày2026-10-12: sửa exact alias tên canonical Cam/Che/Lua/Ngo/Ot… sang local crop ID để dùng JPEG thật từ assets/banner và metadata đúng cây. Fresh132 tests PASS; Nho chưa có ảnh trong bộ supplied, không gán ảnh cây khác. [Nguyên nhân, kiểm chứng và giới hạn](agri_57_catalog_photo_aliases.md).

Tổ chức ảnh ngày2026-10-12, theo user clarification:13 JPEG trong `frontend/src/assets/banner/`,14 PNG trong folder ngang hàng `frontend/src/assets/banner-leaves/`. Giữ byte/static import/UI/motion. [Phạm vi và bằng chứng từng lượt](agri_57_banner_asset_folder.md).

Follow-up ngô 2026-10-10: chỉ thu nhỏ foliage ngô30%, giữ neo góc/sway và mọi crop khác. Fresh118 tests PASS trước batch cuối chỉ đổi CSS; final build/typecheck/format và3 viewport Chromium PASS. [Bằng chứng và giới hạn](agri_57_banner_anchored_foliage.md#follow-up-thu-nhỏ-riêng-cụm-ngô-ngày-2026-10-10).

Lượt sửa cụm cây neo góc 2026-10-10: thay các cụm nhỏ bay riêng bằng một cụm cây đung đưa quanh gốc ở góc phải dưới; khôi phục thêm thân/bông lúa, chỉ lúa có lá nhỏ trôi. Giữ ảnh nền thật và khung cân đối. Fresh118 tests/build/typecheck và6 ca Chromium PASS; báo cáo giữ các lỗi lần đầu và kết quả rerun. Đây là treatment decoration hiện hành thay lượt khôi phục bên dưới. [Báo cáo cụm cây neo góc và bông lúa](agri_57_banner_anchored_foliage.md).

Lượt khôi phục lá động 2026-10-10:13 PNG decoration cũ được đưa vào src/assets/banner-leaves qua registry riêng, giữ ảnh thật toàn UI và khung cân đối. Scoped GSAP drift/pause/reduced-motion, next-image/error fallback; fresh117 tests,build/typecheck và6 ca Chromium PASS. Đây là ngoại lệ hẹp cho artwork trang trí, không khôi phục ảnh crop AI hoặc coi artwork là ảnh lá thật. [Báo cáo lá chuyển động và nguồn asset](agri_57_banner_leaf_motion.md).

Lượt cân đối banner 2026-10-10: stage desktop cùng max-width/gutter với menu, ảnh60% stage và alpha-blend hai mép, giữ crossfade1.2s/mobile3:2. Fresh build/typecheck,115 tests rerun và5 viewport kiểm tra lề PASS; giữ đầy đủ ghi nhận timeout worker ở lượt đầu. Đây là bố cục hiện hành thay thế full-bleed bên phải của lượt trước. [Báo cáo bố cục banner cân đối](agri_57_banner_balance.md).

Lượt sửa theo phản hồi 2026-10-10: thay contain bằng khung cover thống nhất, focal từng ảnh, chỉ hòa mép trái vào nền và crossfade1.2s. Fresh115/115 tests, final build/typecheck, scoped lint/format và5 ca Chromium frame/blend/reduced PASS. Đây là treatment hiện tại, thay thế framing dưới. [Báo cáo khung nhất quán và crossfade](agri_57_banner_consistency.md).

Lượt framing banner 2026-10-10: bỏ cover toàn chiều ngang và scrim rộng; giữ trọn ảnh trong nửa phải desktop, mobile ảnh dưới chữ, chừa mép cho zoom. Fresh 115/115 tests, typecheck/build, scoped lint/format và 5 ca Chromium framing/motion PASS. Không đổi logo/map/phim. [Báo cáo framing và giới hạn](agri_57_banner_photo_framing.md).

Lượt tiếp theo 2026-10-10: đồng bộ ảnh thật trên danh mục/chi tiết cây, preview trang chủ, thông tin ghim bản đồ và các ảnh lúa phụ trợ; xóa 28 PNG AI cũ. Giữ logo và texture bản đồ theo user clarification. Fresh 115/115 tests, typecheck/build và 4 ca browser responsive/reduced-motion PASS. [Báo cáo thay ảnh toàn giao diện và cleanup](agri_57_real_catalog_photos.md). Không dùng ảnh cây chung làm bằng chứng bệnh/lá khỏe; nguồn/quyền dùng ảnh còn cần xác minh. Đoạn dưới ghi lượt trước, không phải trạng thái asset hiện tại.

Lượt cập nhật 2026-10-10: thay đủ 13 ảnh banner/cuộn phim bằng JPEG người dùng cung cấp và đổi lớp lá AI sang zoom/chuyển ảnh nhẹ. Fresh 114/114 tests, typecheck, production build và 8 ca browser responsive/reduced-motion PASS; strict TS/TSX lint PASS, CSS còn 11 warning print cũ. [Báo cáo ảnh thật và giới hạn nguồn/quyền sử dụng](agri_57_real_banner_photos.md). Không thay ảnh catalog/map hay dữ liệu mô hình trong lượt này.

- CAPTCHA phía frontend chỉ phục vụ demo, chưa thay thế xác minh chống bot phía server.
- Grad-CAM và kết quả bệnh production phụ thuộc AI service/model thật.
- Nghiệm thu UI hiện tại, chuyển động banner, camera thật, in PDF và E2E đăng nhập/upload/lịch sử vẫn còn trong checklist của báo cáo UI.
- Chưa có Pull Request cho thay đổi hiện tại.
