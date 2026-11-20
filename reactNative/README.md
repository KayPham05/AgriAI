# AgriVision Mobile

Thư mục làm việc chính: `D:\Git\HK1N4\Project1\AgriAI\reactNative`.

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
  src/app/                  Expo Router: _layout.tsx, index.tsx
  src/features/
    onboarding/             WelcomeScreen hiện có
    auth/ account/ home/ diagnosis/ history/ profiles/ catalog/ notifications/ settings/
  src/components/ui/        shared native UI, chưa triển khai
  src/lib/api/ storage/     transport/persistence, chưa triển khai
  src/config/ hooks/ types/
  src/theme/tokens.ts        semantic colors/spacing/type
  assets/                   template assets; thay trước release
  tests/                    unit/component/integration/e2e; chưa có runner
  docs/                     architecture/development
  pnpm.ps1                  launcher Node/pnpm riêng cho mobile
  .tools/                   runtime local, không đưa vào Git
  app.json                  Expo config
  package.json              scripts/dependencies mobile riêng
  pnpm-lock.yaml            mobile lockfile
```

Chỉ có màn khởi động tĩnh, cuộn được với font hệ thống. Các feature khác mới có thư mục chuẩn bị, chưa login/camera/API/secure storage/model. Không có CTA chết hoặc kết quả giả.

## Nhánh mobile

Từ checkout sạch, thay Jira key thật:

```powershell
git switch -c AGRI-XXX-mobile-description AGRI-199-initial-mobile-app
```

Dùng nhánh này làm gốc/target tích hợp mobile, hạn chế tiếp xúc main. Không tự merge/push. [Quy tắc](AGENTS.md).

## API và dữ liệu

Chỉ gọi ASP.NET API, không DB/storage/FastAPI trực tiếp. `.env.example` chỉ chuẩn bị biến public, chưa có API code. Dùng host reachable và HTTPS cho release; không secrets trong EXPO_PUBLIC_*.

Guest/User, một ảnh/lượt, không admin. Xác minh email đăng ký/self-delete phụ thuộc contract/backend, không làm giả trong scaffold. Xem [architecture](docs/architecture.md), [development](docs/development.md).

## Kiểm tra cách ly runtime

Chạy `.\tests\tooling\LocalRuntime.Tests.ps1` bằng PowerShell: kiểm Node24/npm local, exit code của lệnh lỗi, khôi phục PATH/cache/thư mục và giữ nguyên Node/npm mặc định cùng User/Machine PATH. Đây là test tooling thực thi tiến trình, chưa phải test nghiệp vụ hay native-device acceptance.
