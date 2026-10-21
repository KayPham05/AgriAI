# AGRI-57: Nền tảng công cụ và kiểm soát chất lượng frontend

- Ngày: 2026-10-08 (Asia/Bangkok).
- Nhánh xác minh: `AGRI-57-frontend-summary`.
- Phạm vi: cấu hình frontend Next.js/shadcn và xử lý lint theo nhóm; không đổi kiến trúc backend/AI, token thiết kế hoặc hợp đồng HTTP API.
- [Tổng hợp AGRI-57](README.md) · [Task log hiện có](../../task-logs/AGRI-57/AGRI-57-frontend-ui-and-integration.md).

## 1. Trạng thái

Đã bổ sung cấu hình công cụ, runtime riêng và kiểm tra ranh giới import. Lượt tiếp tục cùng ngày đã xử lý **24 lỗi lint mức error**; kết quả mới nhất còn **69 warnings, 7 infos và 52 file cần format**. **Chưa đạt quality gate toàn frontend** vì lệnh lint chặn cả warning. Không coi test/typecheck thành công là bằng chứng rằng mọi luật lint, giao diện hoặc production đã đạt.

Đây là bước chuẩn hóa frontend, không phải chứng nhận toàn dự án đã sẵn sàng vận hành quy mô lớn. Không bật workflow GitHub từ xa, branch protection, hook Git hoặc deployment.

## 2. Thay đổi và lý do

| File | Thay đổi |
| --- | --- |
| [package.json](../../../frontend/package.json) | Tách `typecheck` khỏi `lint`; thêm format/check/check:ci; chạy CLI shadcn local và pin `4.21.3`; thêm Biome `2.5.15`; khai báo runtime/pnpm. |
| [pnpm-lock.yaml](../../../frontend/pnpm-lock.yaml) | Đồng bộ công cụ mới, giữ pnpm `10.34.5` và kiểm tra frozen lockfile. |
| [pnpm-workspace.yaml](../../../frontend/pnpm-workspace.yaml) | Một package frontend; pnpm quản lý Node `24.15.0`, kiểm tra engine nghiêm ngặt và lưu phiên bản dependency mới chính xác. Không đưa backend/AI vào workspace. |
| [.node-version](../../../frontend/.node-version) | Cùng Node `24.15.0` cho version manager/editor. |
| [.editorconfig](../../../frontend/.editorconfig) | UTF-8, LF, thụt 2 dấu cách; chỉ áp dụng frontend. |
| [biome.json](../../../frontend/biome.json) | Recommended lint, hỗ trợ cú pháp Tailwind 4, format thống nhất, bỏ qua output/cache/assets; thêm luật import theo tầng. |
| [lintRules.test.ts](../../../frontend/src/test/lintRules.test.ts) | 4 test hành vi chạy linter thật; fixture riêng được tạo và dọn sau mỗi lần chạy. |
| [frontend README](../../../frontend/README.md) | Onboarding, runtime, kiểm tra trước bàn giao, phân lớp mã nguồn, workflow shadcn; sửa mô tả banner còn nhắc selector đã bỏ. |

Giữ `Next.js 16.3.6`, React `19.2.0`, TypeScript `7.0.2`, các dependency ứng dụng, `components.json`, 16 primitive, alias, palette/font và CSS của LeafAI. Không chạy lại shadcn init/preset/overwrite. Chỉ format file cấu hình/test thuộc lượt này, không format hàng loạt nguồn đang có thay đổi của người dùng.

### Lựa chọn công cụ có kiểm chứng

Bộ ESLint/Next được thử cài theo [hướng dẫn Next.js](https://nextjs.org/docs/app/api-reference/config/eslint), nhưng registry trả peer range của `typescript-eslint@8.71.1` là `>=4.8.4 <6.1.0`, không bao gồm TypeScript `7.0.2` đang dùng. ESLint 9 cũng báo deprecated. Đã gỡ đúng 4 gói vừa thử (`eslint`, `eslint-config-next`, `eslint-config-prettier`, `prettier`), không hạ compiler hoặc nâng framework để ép tương thích. Dependency cuối cùng dùng Biome, không để song song hai bộ lint/format.

Khi bật kiểm tra engine, `jsdom@30.1.1` có sẵn báo cần Node `^22.22.2 || ^24.15.0 || >=26.0.0`, trong khi host đang là `24.14.1`. Dùng [runtime theo dự án của pnpm 10](https://pnpm.io/10.x/settings#usenodeversion) để tải Node `24.15.0` vào cache của pnpm, không thay Node toàn máy và không tắt engine check. Lần tải đầu mất thời gian do mạng; đây không phải benchmark ứng dụng.

### Ranh giới được cưỡng chế

- Bên ngoài `src/components/ui`, cấm import/re-export trực tiếp `radix-ui` và `@radix-ui/*`; dùng primitive chung qua `@/components/ui`.
- Trong primitive, cấm các import `@/services/**`, `@/views/**`, `@/components/features/**`, `@/components/modals/**` để không phụ thuộc vào nghiệp vụ.
- Cấm gọi hook có điều kiện bằng `useHookAtTopLevel`.
- Đây là ranh giới import được cấu hình qua [noRestrictedImports](https://biomejs.dev/linter/rules/no-restricted-imports/javascript/), không phải kiểm tra dependency graph toàn diện; đường dẫn tương đối vẫn cần review.

## 3. Bằng chứng lượt cấu hình ban đầu

Working directory: `E:\AgriAI\frontend`. Kết quả lượt cấu hình đầu ngày 2026-10-08, không tái sử dụng lần chạy 2026-10-07. Giữ nguyên bản ghi này; kết quả sau sửa lint nằm ở mục 6.

| Kiểm tra | Kết quả |
| --- | --- |
| `node --version` / `corepack pnpm node --version` | Host `v24.14.1`; runtime dự án `v24.15.0`. |
| `corepack pnpm install --frozen-lockfile` | Exit 0; lockfile up to date, không cần resolve lại. |
| `corepack pnpm typecheck` | Exit 0. Đây mới là lệnh TypeScript; `lint` không còn là alias của tsc. |
| Test âm tính của luật lint | Với 3 luật mới chưa bật, 3 test từ chối code sai thất bại đúng kỳ vọng, 1 test cho phép import hợp lệ pass. |
| `corepack pnpm test src/test/lintRules.test.ts` | Sau khi bật luật, 4/4 pass. |
| `corepack pnpm test` | Exit 0: 67/67 tests, 13/13 files. |
| `corepack pnpm build` | Exit 0; Next.js 16.3.6 compile và TypeScript thành công, tạo static pages 3/3 cho `/` và `/_not-found`. |
| `corepack pnpm lint --reporter=summary` | Exit 1: 24 errors, 93 warnings, 8 infos; 77 files được kiểm tra, không tự sửa. |
| `corepack pnpm format:check --reporter=summary` | Exit 1: 71 file cần format; không tự sửa các file đó. |
| `corepack pnpm ui info --json` | Exit 0; CLI local nhận Next.js, Radix/Nova, Tailwind 4, alias và 16 component như trước. |

Test harness ban đầu dùng stdin nhưng không nhận diagnostics cần kiểm tra trong chế độ đó. Đã thay bằng fixture file riêng và chạy lại chu kỳ âm tính/dương tính trên linter thật; không tính các thất bại do harness là bằng chứng TDD hợp lệ. Fixture chỉ chứa đoạn code thử nghiệm, không chứa dữ liệu người dùng; cleanup chỉ xóa đúng file mới tạo và thư mục rỗng của nó.

Trích output full suite:

```text
Test Files  13 passed (13)
     Tests  67 passed (67)
```

Build hoàn tất thực tế, không thay thế nghiệm thu UI. `next-env.d.ts` được build tự đổi sang đường dẫn `.next/types`; đã trả lại `.next/dev/types` có trước lượt này để bảo toàn trạng thái dev của người dùng. `git diff --check` không có lỗi whitespace, chỉ cảnh báo LF/CRLF của một số file đã thay đổi trước đó. Không còn thư mục `lint-probe-*` sau full suite.

## 4. Diagnostics ban đầu trước khi xử lý

| Nhóm diagnostics | Số lượng | Hướng xử lý cần review |
| --- | ---: | --- |
| `useIterableCallbackReturn` | 12 errors | Xem callback forEach/map và test fixture, tránh sửa ngữ nghĩa của callback. |
| `useAriaPropsSupportedByRole` | 5 errors | Đối chiếu role/ARIA của điều khiển thực tế và khả năng tiếp cận. |
| `noArrayIndexKey` | 3 errors | Dùng định danh ổn định phù hợp dữ liệu, không tạo ID ngẫu nhiên. |
| `useExhaustiveDependencies`, `noUnsafeOptionalChaining`, `noStaticElementInteractions`, `useAltText` | 1 error mỗi rule | Review effect, điều kiện null và hành vi keyboard/ảnh. |
| `useImportType` | 46 warnings | Chuẩn hóa import kiểu dữ liệu trong lượt riêng. |
| `noImgElement` | 24 warnings | Phân biệt ảnh preview/blob/camera với ảnh có thể dùng next/image; không thay máy móc. |
| `noImportantStyles`, `noNonNullAssertion`, unused imports/variables | 23 warnings | Review CSS in PDF và giả định null trước khi sửa. |

Nguồn ví dụ: `BotanicalBanner.tsx` và test cùng tên, `CameraCaptureModal.tsx`, `LoginModal.tsx`, các trang catalog/history, `predictionApi.test.ts` và `src/index.css`. Diagnostics cần được xem xét, không mặc định mọi cảnh báo là lỗi runtime. Không tắt recommended rules hoặc che cảnh báo bằng baseline để tuyên bố gate đạt.

## 5. Việc còn lại

- Xử lý diagnostics và format theo từng nhóm, giữ diff nhỏ; chạy lại test/build sau mỗi nhóm có ảnh hưởng hành vi.
- `check`/`check:ci` hiện sẽ dừng tại lint; chưa thể tuyên bố pipeline xanh. Chưa thêm workflow GitHub hoặc tự kích hoạt remote CI.
- Nghiệm thu responsive/accessibility bằng trình duyệt và E2E backend vẫn còn nguyên như báo cáo UI.
- Không thay đổi backend, Docker, AI/model/dataset, không commit/push/tạo PR hoặc sửa Jira.

## 6. Lượt tiếp tục: sửa lint và bổ sung kiểm thử ngày 2026-10-08

### Thay đổi

- `LoginSuccessScreen.tsx`: dùng section có tên truy cập; giữ copy, Button, token và bố cục.
- `LoginModal.tsx`, `PlantsPage.tsx`, `DiseasesPage.tsx`, `HistoryPage.tsx`: nhóm CAPTCHA/bộ lọc/chế độ xem dùng `fieldset` có tên, thêm `min-w-0` để không áp min-content width mặc định. Không viết lại primitive shadcn.
- `DiagnosePage.tsx`: vùng thả ảnh là nhóm có tên truy cập, giữ nút chọn ảnh dùng bàn phím. Test tích hợp kiểm tra focus, Enter mở input và thả ảnh tạo preview.
- `CameraCaptureModal.tsx`: callback dừng track không trả giá trị. Giữ dependency `attempt` với ngoại lệ lint đúng một effect, giải thích nó chủ động khởi động lại camera khi người dùng thử lại. Test xác nhận lỗi quyền truy cập rồi thử lại có stream và bật nút chụp; không bỏ dependency chỉ để qua lint.
- `BotanicalBanner.tsx` và test: callback pause/listener không trả giá trị; giữ nguyên 13 cảnh, timing, token chuyển động, reduced motion, pause khi khuất/ẩn tab và cleanup theo GSAP. Native img chỉ được miễn cảnh báo trong **test double** của Next Image, không tắt rule ảnh cho ứng dụng.
- `src/types/index.ts`, `src/services/predictionApi.ts`: giữ `className` có sẵn trong DTO vào `TopPrediction` để phân biệt các lớp có cùng tên dịch như “Khỏe mạnh”. Thuộc tính optional giữ tương thích mẫu demo cũ; không đổi response backend. `HistoryDetailModal.tsx`, `ReportModal.tsx` dùng `className`, fallback label cho mẫu cũ. Fallback không thể khôi phục danh tính lớp đã mất trong dữ liệu cũ có nhãn trùng.
- `DiseaseDetailPage.tsx`: dùng nội dung mục thay index cho key của danh sách mô tả. Test API bỏ optional-chain cast không an toàn; test camera/banner thay non-null assertion bằng truy vấn/kiểm tra rõ ràng.
- `biome.json`: dùng `rules.preset: recommended` thay khóa deprecated; giữ toàn bộ luật và ranh giới import. Chỉ sửa type-only import và format 21 file đang được xử lý; không format cả frontend hoặc ghi đè primitive.
- Test mới `src/views/CatalogAccessibility.test.tsx`; bổ sung test trong `LoginModal.test.tsx`, `LoginSuccessScreen.test.tsx`, `CameraCaptureModal.test.tsx`, `DiagnosePage.integration.test.tsx`, `predictionApi.test.ts`.

Hướng bảo toàn của Taste và React Best Practices được áp dụng: không đổi palette/font/layout có chủ đích, không thêm hiệu ứng hay thư viện. Đây là sửa kỹ thuật/accessibility, không phải lượt redesign hoặc nghiệm thu Impeccable bằng trình duyệt.

### Kiểm chứng riêng cho lượt tiếp tục

| Kiểm tra | Kết quả |
| --- | --- |
| Test trước khi sửa | 7 fail đúng kỳ vọng: 6 thiếu nhóm/region truy cập và 1 mất class identity; 17 pass, gồm test giữ hành vi camera thử lại. |
| Test nhóm sau sửa | 44/44 pass trong 7 file, gồm banner. |
| `corepack pnpm typecheck` | PASS, chạy lại sau khi trả `next-env.d.ts` về đường dẫn dev. |
| `corepack pnpm test` | 74/74 tests, 14/14 files PASS. |
| `corepack pnpm build` | PASS; Next.js compile, TypeScript và static pages 3/3 thành công. |
| `corepack pnpm lint --reporter=summary` | Exit 1: **0 errors, 69 warnings, 7 infos**, kiểm tra 78 file. Gate vẫn đỏ vì `--error-on-warnings`. |
| `corepack pnpm format:check --reporter=summary` | Exit 1: **52 file** còn cần format, kiểm tra 78 file. Các file vừa xử lý đã format. |
| Liên kết tài liệu / `git diff --check` | 43 liên kết local hợp lệ; diff check exit 0, chỉ cảnh báo LF/CRLF. |

Lần đo lint/format chạy đồng thời với test đã thấy fixture `lint-probe-*` tồn tại ngắn hạn; không dùng số liệu đó làm kết quả cuối. Bảng trên lấy lần chạy tuần tự sau khi full suite kết thúc và fixture đã dọn. Script `check`/`check:ci` vốn chạy tuần tự. Sau build, trả đường dẫn trong `next-env.d.ts` về `.next/dev/types` có trước lượt này.

Warnings còn lại: 32 type-only imports, 23 native img, 11 `!important` trong CSS, 1 non-null assertion của API, 1 import không dùng, 1 biến không dùng. Infos: 6 template string và 1 fragment dư. Ảnh blob/camera/Grad-CAM và CSS in PDF cần review theo ngữ cảnh; chưa chuyển máy móc hoặc tắt luật toàn cục.

Chưa kiểm tra trình duyệt ở 375/768/1280, camera thiết bị thật, in PDF hoặc backend E2E. Những giới hạn nghiệm thu trước đó vẫn giữ nguyên. Chưa stage/commit/push/PR/Jira; không sửa backend, Docker, AI hoặc bộ skill.
