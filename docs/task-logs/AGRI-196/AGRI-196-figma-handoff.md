# AGRI-196 · Bàn giao F02 trên Figma

Ngày 22/11/2026 · Nhánh `AGRI-196-design-components-app-shell`

- Tạo file Figma riêng cho mobile gồm Light tokens, component library, gallery và prototype năm tab. Bổ sung S21 Thông tin cá nhân từ Tài khoản User, gồm trạng thái đổi avatar đang tải và lỗi.
- Đã đối chiếu 46 semantic variable, 9 text style, 25 component set, 99 instance gallery, các frame mẫu và liên kết prototype. Xem [bằng chứng và ma trận F02-T1–T3](../../reports/AGRI-196/README.md).
- DoD F02 còn mở. Ba test native chưa chạy. Cần triển khai Expo, tích hợp F01, kiểm thiết bị và review chéo.
- Bổ sung phản hồi nhấn tab 120 ms và chuyển cảnh 180 ms. Đã đọc lại đủ 28 liên kết Figma. Chưa xem playback vì trình duyệt yêu cầu đăng nhập Figma.
- Dựng page Sổ tay đồng ruộng gồm ba frame nối luồng chụp mẫu, xem trước và kết quả. Đã xem render, kiểm 4 image fill và 7 liên kết trong Figma.
- Đổi tên concept thành Sổ tay vườn nhà, lắp thanh điều hướng mới trên năm màn và xác minh 20 liên kết Figma.
- Implemented native Home, five-tab Expo Router shell and mock Login. Full test suite passed with 4 suites and 12 tests. Expo Doctor remained blocked by registry DNS.- Sửa route folder `(tabs)` tạo sai tên khiến Expo Router không nhận shell. Export Android và full test đã pass sau sửa.
- 27/11/2026: Hoàn thiện `ShellTabBar` theo Figma (`32:205`), `AppHeader`, `ListRow`, 13 icon PNG trong `assets/shell/` và 4 màn hình `CatalogScreen`, `DiagnosisScreen`, `HistoryScreen`, `AccountScreen`. `typecheck`, `lint`, `test` (6 suites / 17 tests) và `export:android` đã pass; iOS và thiết bị thật chưa chạy.

- 28/11/2026: Merge `origin/AGRI-199-initial-mobile-app` (`321dad7`), bổ sung `TextField`, `CodeField`, `StatePanel`, `MediaPreview`, `ResultSummary`, `FilterSheet`, `ConfirmDialog`, mở rộng `ActionButton`, dựng `ComponentGalleryScreen` (`/gallery`) và whitelist `resolveReturnTarget` cho tab được bảo vệ. Fresh checks: `typecheck`, `lint`, `test` (12 suites / 59 tests), `export:android` và `export:ios` đều pass; kiểm thử thiết bị thật (font scale/keyboard/TalkBack/VoiceOver) và bundle Manrope còn mở.
