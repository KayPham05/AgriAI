# AGRI-196 · F02 Design components và app shell

- Ngày xác minh 22/11/2026 · Nhánh `AGRI-196-design-components-app-shell` · HEAD `f631185`.
- Bàn giao Figma Design đã có. DoD của F02 vẫn mở, chờ triển khai và nghiệm thu trên Android/iOS.
- Nguồn phạm vi [design system](../../plans/mobile/design-system.md), [F02](../../plans/mobile/jira-tasks.md#f02), [đặc tả màn hình](../../plans/mobile/screen-specs.md) và [workflow](../../plans/mobile/workflows.md). Mã tham chiếu hiện có trong [theme scaffold](../../../reactNative/src/theme/tokens.ts) và [Expo root layout](../../../reactNative/src/app/_layout.tsx).

## Kết quả Figma

| Hạng mục | Bằng chứng kiểm tra ngày 22/11/2026 |
| --- | --- |
| Foundations | Figma Plugin API đếm 33 primitive, 46 semantic variable có alias và scope, 9 text style Manrope. Collection ngữ nghĩa chỉ có mode Light. Specimen tiếng Việt có token màu, kích thước và hướng dẫn fallback hệ thống. [Foundations](https://www.figma.com/design/ibSKbIbZ2yHdo9HQH3Qz5S?node-id=3-2) |
| Component library và gallery | Figma Plugin API xác nhận 25 component set, gồm các alias được thể hiện bằng một component duy nhất. Gallery có 99 instance trực tiếp trong 5 nhóm (28 điều hướng/thao tác, 22 form/danh sách, 17 phản hồi, 20 ảnh/kết quả, 12 lọc/xác nhận). Đã xem render 5 nhóm, gồm pressed, disabled, loading, lỗi OTP, ảnh hết hạn và xác nhận xóa. Glyph từ `lucide-react` 0.546.0 trong workspace, giấy phép ISC theo gói. [Components](https://www.figma.com/design/ibSKbIbZ2yHdo9HQH3Qz5S?node-id=2-92) · [Gallery](https://www.figma.com/design/ibSKbIbZ2yHdo9HQH3Qz5S?node-id=2-93) |
| App shell | Figma Plugin API xác nhận đủ Home, Catalog, Diagnosis, History, Account và 46 liên kết prototype tại lần lắp ráp. Đọc lại mỗi tab trên 5 root frame 390 logical cho thấy nút rộng khoảng 71,6 và cao 64–84; thanh tab chừa 24 cho bottom inset thiết kế. Mỗi frame có vùng cuộn dọc. [App Shell](https://www.figma.com/design/ibSKbIbZ2yHdo9HQH3Qz5S?node-id=2-94) · [Guest entry](https://www.figma.com/design/ibSKbIbZ2yHdo9HQH3Qz5S?node-id=10-1702) |
| Review màn đại diện | Đã xem render của [Đăng nhập](https://www.figma.com/design/ibSKbIbZ2yHdo9HQH3Qz5S?node-id=10-2063), [Xem trước ảnh](https://www.figma.com/design/ibSKbIbZ2yHdo9HQH3Qz5S?node-id=10-1803), [kết quả 75,0%](https://www.figma.com/design/ibSKbIbZ2yHdo9HQH3Qz5S?node-id=10-2121), [lịch sử ảnh hết hạn](https://www.figma.com/design/ibSKbIbZ2yHdo9HQH3Qz5S?node-id=10-2160) và [chi tiết tài liệu](https://www.figma.com/design/ibSKbIbZ2yHdo9HQH3Qz5S?node-id=10-2199). Nội dung và placeholder là fixture thiết kế. Các biến thể khung ảnh khóa tỷ lệ 4:3. |
| Hồ sơ tài khoản mobile theo yêu cầu bổ sung | Đã xem render [S21](https://www.figma.com/design/ibSKbIbZ2yHdo9HQH3Qz5S?node-id=10-1960) và các biến thể [đang tải avatar](https://www.figma.com/design/ibSKbIbZ2yHdo9HQH3Qz5S?node-id=10-1992), [lỗi avatar](https://www.figma.com/design/ibSKbIbZ2yHdo9HQH3Qz5S?node-id=10-2024). Đọc lại link từ [Tài khoản User](https://www.figma.com/design/ibSKbIbZ2yHdo9HQH3Qz5S?node-id=10-1615) đến S21 và link Quay lại. Email chỉ đọc, lưu tên và đổi ảnh có hành động riêng. |

Tính lại tỷ lệ tương phản sRGB từ mã màu Light trong [đặc tả](../../plans/mobile/design-system.md#2-color-tokens) cho các cặp đã dùng. Chữ chính/nền 14,23:1, chữ trên primary 7,16:1 và primary pressed 9,49:1, chữ disabled/surfaceMuted 4,63:1, chữ trên destructive 5,45:1, viền input/surface 5,22:1, focus/surface 5,33:1, icon warning/surfaceMuted 4,00:1. Số đo là phép tính từ token.

## Trạng thái nghiệm thu F02

| Case | Bằng chứng Figma | Native |
| --- | --- | --- |
| F02-T1 · Chữ lớn và bàn phím | Đã xem render [320 logical, chữ 200%, bàn phím mô phỏng](https://www.figma.com/design/ibSKbIbZ2yHdo9HQH3Qz5S?node-id=10-2213). CTA ở trên vùng bàn phím, form có vùng cuộn dọc 403 logical cho nội dung dài 468 logical. | **Not run**. Cần keyboard, safe area và font scale 100/150/200% của thiết bị. |
| F02-T2 · Screen reader và OTP | Đã xem [TextField và CodeField](https://www.figma.com/design/ibSKbIbZ2yHdo9HQH3Qz5S?node-id=8-658). OTP có một trường nhìn thấy với nhãn 8 số, thông báo lỗi và trạng thái đang xác minh. | **Not run**. Cần TalkBack/VoiceOver, traversal/focus, paste/autofill và thông báo lỗi trên bản build. |
| F02-T3 · Guest mở protected tab | Đã đọc lại liên kết [Lịch sử khách](https://www.figma.com/design/ibSKbIbZ2yHdo9HQH3Qz5S?node-id=10-1510) → [Đăng nhập để tiếp tục đến Lịch sử](https://www.figma.com/design/ibSKbIbZ2yHdo9HQH3Qz5S?node-id=10-2063). | **Not run**. Sau khi có integration F01, kiểm whitelist, từ chối đích ngoài danh sách và quay lại đúng đích sau đăng nhập thật. |

## Phụ thuộc còn lại

- Chuyển các mẫu Figma vào Expo và nghiệm thu native. Cần bundle Manrope với giấy phép, kiểm glyph tiếng Việt và fallback hệ thống, layout/keyboard/inset thật, screen reader và reduce motion. Typecheck, lint, Expo dependency check, bundle và build thiết bị chưa chạy trong lượt bàn giao Figma.
- Nối F01 cho auth, session, whitelist, API và ảnh riêng. Tiếp tục kiểm S21 trên bản build với API lưu tên và tải avatar qua xác thực, gồm lỗi từng thao tác. F03 thu bằng chứng thiết bị, F04 kiểm tra model/storage thật và F05 nghiệm thu candidate.
- Gallery giữ trạng thái chờ cho S05 xác minh email đăng ký và S25 xóa tài khoản. Hai luồng còn chờ contract theo [API audit](../../plans/mobile/api-audit.md). Review chéo và GitHub Actions chưa có bằng chứng cho lượt này.

[Task log AGRI-196](../../task-logs/AGRI-196/AGRI-196-figma-handoff.md)

## Bổ sung hiệu ứng chuyển tab · 22/11/2026

- Tab chưa chọn có hiệu ứng đổi nền khi nhấn trong 120 ms. Biến thể giữ nhãn và biểu tượng tùy theo tab, đồng thời giữ kích thước vùng chạm. Gallery có thêm [mẫu Tra cứu đang nhấn](https://www.figma.com/design/ibSKbIbZ2yHdo9HQH3Qz5S?node-id=15-1360), nâng tổng mẫu lên 100.
- Đọc lại Figma Plugin API xác nhận 28 liên kết trên 7 frame Guest/User dùng Dissolve 180 ms, giữ đúng đích và có phản hồi nhấn kế thừa. Bảy tab đang chọn giữ trạng thái chọn khi chạm lại. [Prototype từ Trang chủ](https://www.figma.com/design/ibSKbIbZ2yHdo9HQH3Qz5S?node-id=10-1702)
- Đã xem render biến thể nhấn. Figma Present yêu cầu đăng nhập trong trình duyệt kiểm tra, nên chưa xác minh chuyển động bằng phát trực tiếp. Reduce Motion và thời lượng khi chạy Expo còn chờ kiểm trên thiết bị.

## Concept Sổ tay đồng ruộng · 22/11/2026

Theo hướng người dùng chọn, bổ sung page Figma riêng cho [Trang chủ](https://www.figma.com/design/ibSKbIbZ2yHdo9HQH3Qz5S?node-id=26-2), [Xem trước ảnh](https://www.figma.com/design/ibSKbIbZ2yHdo9HQH3Qz5S?node-id=26-56) và [Kết quả](https://www.figma.com/design/ibSKbIbZ2yHdo9HQH3Qz5S?node-id=26-80). Màn chụp dùng nền xanh đậm và kết quả dùng nền khoáng. Prototype bắt đầu ở Trang chủ, qua nút Chụp ảnh lá, rồi Phân tích ảnh.

- Xem render cả ba frame 390 × 844 logical sau khi gắn ảnh. Figma Plugin API đọc lại 7 liên kết prototype với transition 180 ms, điểm bắt đầu và 4 image fill.
- Ảnh đồng lúa lấy từ `frontend/src/assets/banner/lúa banner.jpg`. Preview, kết quả và thumbnail dùng chung `frontend/src/assets/Bệnh lá/Lúa/Đốm nâu.jpg`. Preview và kết quả dùng FIT, giữ mã nguồn 5390485 thấy trên ảnh. Bản mẫu dùng độ tin cậy 75,0% để minh họa cảnh báo.
- Ba màn dùng dữ liệu mẫu Figma. Camera, phân tích, lưu thật và phát prototype trực tiếp chưa chạy trong lượt này. Điều kiện nghiệm thu native F02 giữ như ma trận trên.

## Sổ tay vườn nhà và thanh điều hướng · 22/11/2026

Đổi tên concept trên page, màn, tiêu đề và điểm bắt đầu prototype. Bản minh họa hiện dùng ảnh lá lúa. Tên mới dùng được nếu phạm vi sau này chuyển sang lá cà chua. [Sổ tay vườn nhà](https://www.figma.com/design/ibSKbIbZ2yHdo9HQH3Qz5S?node-id=26-2)

Thanh điều hướng mới dùng nền xanh rừng, nút Chẩn đoán làm điểm nhấn trong thanh và dấu gạch dưới cho tab đang chọn. Dùng chung 6 biến thể cho 5 màn tab. Đã xem render trên Trang chủ và Chẩn đoán, đọc lại 20 liên kết, 5 trạng thái đang chọn và kích thước vùng chạm nhỏ nhất 68 logical. Cấu hình xác nhận phản hồi nhấn 120 ms và chuyển cảnh 180 ms. Playback và thiết bị chưa kiểm trong lượt này. [Thanh điều hướng](https://www.figma.com/design/ibSKbIbZ2yHdo9HQH3Qz5S?node-id=32-205)
## Native Home and mock login · 25/11/2026

- Added Expo Router tab shell with Home, Catalog, Diagnosis, History and Account routes. Home follows S10 with guest prompt, mock recent result for authenticated state and diagnosis CTA.
- Added S03 mock Login with accessible email/password fields. Any non-empty values return the local mock user `Minh Kha` and route to Home.
- Verification: `pnpm test` 4 suites / 12 tests passed. Targeted Home/Login tests 2 suites / 4 tests passed. `typecheck` and `lint` passed. `expo install --check` used the local dependency map because networking was disabled and reported dependencies up to date. `expo-doctor` was blocked by registry DNS.## Fix Login route and Expo tabs · 25/11/2026

- Sửa thư mục Expo Router `(tabs)` bị tạo sai tên có dấu nháy thừa. Các route Home, Catalog, Diagnosis, History và Account hiện nằm dưới `reactNative/src/app/(tabs)`.
- `export:android` đã bundle thành công sau khi sửa route. Typecheck passed. Full test suite passed với 4 suites và 12 tests.
- Khi chạy Metro cũ, cần dừng server và chạy lại `.\pnpm.ps1 start -- --clear` để xóa route cache.

## Shell tab bar và các màn hình còn thiếu từ Figma · 27/11/2026

- Cập nhật `reactNative/src/theme/tokens.ts` bổ sung token `accent`, kiểu chữ `headerTitle`, `section`, `subtitle`, `caption` và kích thước `shell` theo Figma Foundations (`3:2`) và Thanh điều hướng (`32:205`).
- Xuất 13 icon PNG từ SVG Figma vào `reactNative/assets/shell/` và dựng bộ thành phần shell dùng chung (`AppHeader.tsx`, `ListRow.tsx`, `ShellTabBar.tsx`) gắn vào `reactNative/src/app/(tabs)/_layout.tsx`.
- Thay thế các `PlaceholderScreen` bằng `CatalogScreen` (`10:1875`), `DiagnosisScreen` (`10:1754`), `HistoryScreen` (`10:1510`) và `AccountScreen` (`10:1556`) nối với `catalog.tsx`, `diagnosis.tsx`, `history.tsx`, `account.tsx`; giữ các hành động chưa nối API/camera ở trạng thái disabled có `accessibilityHint`.
- Kiểm thử ngày 27/11/2026: `pnpm typecheck`, `pnpm lint`, `pnpm test` (6 suites / 17 tests, gồm `ShellTabBar.test.tsx` và `ShellScreens.test.tsx`) và `pnpm export:android` (bundle 1158 modules và 41 assets) đều pass. iOS export và kiểm thử thiết bị thật chưa chạy trong lượt này.


## Merge AGRI-199 và hoàn thiện Design Components + Gallery · 28/11/2026

- Merge `origin/AGRI-199-initial-mobile-app` vào `AGRI-196-design-components-app-shell` (commit merge `321dad7`), giữ lại luồng F01 (`StartupScreen`, `LoginRoute`, `LoginScreen` kèm OTP/lockout/password recovery) và bảo toàn phần shell 5 tab (`ShellTabBar`, `AppHeader`, `ListRow`, `CatalogScreen`, `DiagnosisScreen`, `HistoryScreen`, `AccountScreen`) cùng tokens.
- Bổ sung bộ tokens còn thiếu trong `reactNative/src/theme/tokens.ts` (`controlOutline`, `success`, `scrim`, `confidence`, `spacing.xxl`/`xxxl`, `fieldMinHeight`, `multilineMinHeight`).
- Mở rộng `ActionButton` (thêm variant `ghost`, `destructive`, trạng thái `loading` giữ nhãn và chống double submit, alias `Button`) và triển khai đủ bộ primitive dùng chung trong `reactNative/src/components/ui/`: `TextField` (`Input`), `CodeField` (`OtpInput`), `StatePanel` (`LoadingState`, `EmptyState`, `ErrorState`), `MediaPreview` (`PhotoFrame`), `ResultSummary`, `FilterSheet`, `ConfirmDialog`.
- Tạo internal gallery `ComponentGalleryScreen` và route `reactNative/src/app/gallery.tsx` hiển thị đủ các nhóm component và state.
- Thêm `resolveReturnTarget` whitelist trong `reactNative/src/features/auth/returnTarget.ts` và nối vào `login.tsx`, `(tabs)/home.tsx`, `(tabs)/history.tsx`, `(tabs)/account.tsx`, `_layout.tsx`.
- Kiểm thử ngày 28/11/2026: `pnpm typecheck`, `pnpm lint`, `pnpm test` (12 suites / 59 tests passed, gồm `DesignSystemComponents.test.tsx`), `pnpm export:android` (1190 modules, 47 assets) và `pnpm export:ios` (1196 modules, 44 assets) đều pass.
- Còn lại: kiểm thử thực tế trên thiết bị Android/iOS (font scaling 150%/200% với bàn phím thật, TalkBack/VoiceOver và bundle Manrope sau kiểm tra license/glyph).
