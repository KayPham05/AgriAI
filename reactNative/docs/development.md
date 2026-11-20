# Mobile development

Mobile source/config/assets/tests/docs mới đặt dưới reactNative; báo cáo/task log Jira là ngoại lệ theo root rules. Không nâng dependencies web/backend/AI trong task mobile.

Base/target tích hợp: AGRI-199-initial-mobile-app. Nhánh task mới tách từ đây với Jira key thật. Không ép checkout/reset khi dirty; dùng worktree riêng để giữ dữ liệu.

Windows dùng `..\pnpm.ps1` từ docs hoặc `reactNative/pnpm.ps1` từ project root; launcher đọc Node24 trong .nvmrc và pnpm trong packageManager, tải vào .tools/ được ignore. Không cài global hoặc thay Node mặc định. Lockfile mobile riêng. EXPO_PUBLIC_* được nhúng vào bundle nên không secrets. Chưa có API URL mặc định hay signing/production ID giả.

Kiểm tối thiểu: typecheck/lint/expo install --check/expo-doctor/export Android+iOS. Bundle pass không thay device test; native smoke cần emulator/device/toolchain. Chưa cấu hình test runner nên không có script test giả tự pass. Khi thêm feature, chọn runner Expo/React Native phù hợp và viết behavior tests theo TESTING.md, đặt tập trung trong tests.

Chưa cấu hình CI mobile/EAS/signing/camera/secure storage/query client/test runner. Bổ sung khi có implementation thật. Template icon chưa phải brand asset release.

Launcher cho tiến trình con thấy cả Node24 và npm đi kèm Node portable, nên chạy `./pnpm.ps1 dlx expo-doctor` từ reactNative, không cần npm11 tạm bổ sung. Các lệnh typecheck/lint/install/start/export cũng đi qua launcher. Ngoài launcher, terminal tiếp tục dùng Node/npm cũ.

Test cách ly: `./tests/tooling/LocalRuntime.Tests.ps1`. Test chạy lệnh từ ngoài thư mục mobile, kiểm exit code thất bại và xác nhận PATH/cache/cwd cùng Node/npm mặc định không thay đổi. Không sửa PowerShell profile, User/Machine PATH hay runtime của frontend/backend/các dự án khác.
