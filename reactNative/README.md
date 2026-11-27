# AgriVision Mobile

Thư mục ứng dụng: `reactNative/` trong checkout hiện tại của dự án.

React Native trong `reactNative/`, khởi tạo cho **AGRI-199 — Initial Mobile App** từ main tại `b3b5d312d49beb3800c803fecfaeb137f000f2d9`.

## Bắt đầu

Node **24.22.3** và pnpm **10.34.5** được chuẩn bị riêng trong `reactNative/.tools/` bằng launcher Windows. Không cần đổi Node mặc định, chạy nvm use, cài global pnpm hoặc corepack enable. Chạy trong reactNative:

```powershell
.\pnpm.ps1 install --frozen-lockfile
.\pnpm.ps1 start
```

Lần đầu cần mạng để tải bản Node portable chính thức (kiểm SHA256) và pnpm local; các lần sau dùng lại runtime. `.tools/` được Git bỏ qua. Launcher chỉ thay PATH/cache cho lệnh con rồi khôi phục khi thoát, kể cả khi lệnh lỗi. Lệnh `node` gõ trực tiếp vẫn dùng Node mặc định của máy; dùng launcher cho mọi lệnh mobile.

Expo Go cần tương thích SDK58. `.\pnpm.ps1 android` mở emulator/device; `.\pnpm.ps1 ios` cần macOS/iOS simulator. Thiết bị phải truy cập được Metro; localhost trên điện thoại không phải PC.

```powershell
.\pnpm.ps1 typecheck
.\pnpm.ps1 lint
.\pnpm.ps1 exec expo install --check
.\pnpm.ps1 dlx expo-doctor
.\pnpm.ps1 export:android
.\pnpm.ps1 export:ios
```

Export chỉ bundle JS, không tạo APK/IPA hoặc chứng minh native chạy được. `.\pnpm.ps1 run:android`/`.\pnpm.ps1 run:ios` sinh native project và build local; cần Android SDK/JDK hoặc macOS/Xcode. Generated android/ios được ignore. Chưa cấu hình EAS/signing/store ID giả.

## Cấu trúc

```text
reactNative/
  src/app/                  Expo Router: startup và Home có bảo vệ
  src/features/
    onboarding/             WelcomeScreen hiện có
    auth/ account/ home/ diagnosis/ history/ profiles/ catalog/ notifications/ settings/
  src/components/ui/        ActionButton native dùng chung
  src/lib/storage/          SecureStore cho token phiên
  src/config/ hooks/ types/
  src/theme/tokens.ts        semantic colors/spacing/type
  assets/                   template assets; thay trước release
  tests/                    Jest Expo/component; unit/integration/e2e chuẩn bị cho task sau
  docs/                     architecture/development
  pnpm.ps1                  launcher Node/pnpm riêng cho mobile
  .tools/                   runtime local, không đưa vào Git
  app.json                  Expo config
  package.json              scripts/dependencies mobile riêng
  pnpm-lock.yaml            mobile lockfile
```

Màn chào S02 áp dụng phong cách Sổ tay vườn nhà từ Figma: ảnh ruộng lúa gốc, mảng xanh đậm, tiêu đề lớn và ba CTA native. Dùng font hệ thống dự phòng, safe area và nội dung cuộn được. `ActionButton` là primitive native đầu tiên. `WelcomeScreen` cung cấp boundary `onNavigate(intent)` cho phần điều hướng tương lai; khi chưa có handler, các nút bị khóa có giải thích. S03/S11/S26 và nền tảng điều hướng chưa triển khai nên chưa nghiệm thu điều hướng thực tế. Figma chưa có frame S02 riêng. Xem [bàn giao Welcome](docs/welcome-handoff.md).

AGRI-158 kiểm tra token lưu trong SecureStore khi khởi động. Guest mở Welcome, User đã xác thực mở Home, 401 xóa token và mạng lỗi cho thử lại. Login, camera và model nằm ở các task riêng. Chạy `./pnpm.ps1 test` cho component và `./pnpm.ps1 test:session` cho logic phiên. [Hướng dẫn kiểm thử](tests/README.md).

## Nhánh mobile

Từ checkout sạch, thay Jira key thật:

```powershell
git switch -c AGRI-XXX-mobile-description AGRI-199-initial-mobile-app
```

Dùng nhánh này làm gốc/target tích hợp mobile, hạn chế tiếp xúc main. Không tự merge/push. [Quy tắc](AGENTS.md).

## API và dữ liệu

Khi có token, app gọi `GET /api/auth/me` của ASP.NET. Đặt origin thiết bị truy cập được qua `EXPO_PUBLIC_API_URL` theo `.env.example`. Release yêu cầu HTTPS. Chỉ đặt cấu hình công khai trong `EXPO_PUBLIC_*`.

Guest/User, một ảnh/lượt, không admin. Xác minh email đăng ký/self-delete phụ thuộc contract/backend, không làm giả trong scaffold. Xem [architecture](docs/architecture.md), [development](docs/development.md).

## Kiểm tra cách ly runtime

Chạy `.\tests\tooling\LocalRuntime.Tests.ps1` bằng PowerShell: kiểm Node24/npm local, exit code của lệnh lỗi, khôi phục PATH/cache/thư mục và giữ nguyên Node/npm mặc định cùng User/Machine PATH. Đây là test tooling thực thi tiến trình, chưa phải test nghiệp vụ hay native-device acceptance.
