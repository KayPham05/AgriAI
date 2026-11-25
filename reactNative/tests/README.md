# Mobile tests

Jest Expo 58 + Jest 30 + React Native Testing Library 14 chạy component native bằng Test Renderer, không dùng DOM. Tests nằm trong `tests/{unit,component,integration,e2e}`; các thư mục chưa có case không được tính là coverage nghiệp vụ.

Từ `reactNative/`:

```powershell
.\pnpm.ps1 test
.\pnpm.ps1 test:coverage
.\pnpm.ps1 test:session
.\pnpm.ps1 typecheck
```

`WelcomeScreen.test.tsx` kiểm các intent Guest diagnosis/login/catalog, trạng thái chưa có navigation owner, lỗi ảnh và không gọi API. `ActionButton.test.tsx` kiểm hai variant khi handler được thêm rồi gỡ: nút chỉ tương tác khi có handler. Safe-area metrics dùng mock của thư viện; các component và Pressable giữ thật. Setup nạp sớm các lazy export React Native để thời gian biên dịch Jest/Babel không nằm trong timeout của ca đầu. Không tăng timeout hoặc nới assertion. Đây là component tests, không chứng minh navigation tới S03/S11/S26 hoặc layout trên thiết bị. Kết quả/giới hạn theo Jira xem [AGRI-159](../../docs/reports/AGRI-159/README.md).

Jest dùng chế độ CI, không tự cập nhật snapshot và không cho zero-test pass. TypeScript kiểm cả source và test; coverage lấy toàn bộ production `src/`, output ở ignored `dist/coverage`. Chưa thêm job CI mobile hoặc thay đổi gate của web/backend/AI.

Khi thêm feature: unit cho validation/transform, component cho native interactions, integration cho API/session, e2e cho device flows; theo root TESTING.md. Không test hằng số/cấu trúc file để giả coverage. API/model/storage thật cần evidence riêng.

## Session startup (AGRI-158)

`test:session` chạy bộ Node 24 với storage và HTTP có kiểm soát. `StartupStatus.test.tsx` kiểm nhãn và trạng thái khóa nút thử lại khi chờ. Để kiểm tra hợp đồng với ASP.NET và PostgreSQL, dùng một backend test chuyên dụng trỏ tới DB dùng một lần:

```powershell
$env:AGRI158_QA_API_URL = 'http://127.0.0.1:5048'
.\pnpm.ps1 test:session:integration
```

Ca integration tạo một User QA, dùng token do server cấp, thu hồi phiên qua endpoint logout rồi kiểm tra client xóa token. Dùng `e2e/startup_guest_smoke.py` với Metro cổng 8083 và emulator riêng để kiểm cold launch không có token. [Bằng chứng tích hợp AGRI-158](../../docs/reports/AGRI-158/README.md).

## Android native layout smoke

`e2e/welcome_layout_smoke.py` là kiểm tra riêng trên Android emulator với Expo Go tương thích SDK58, không nằm trong lệnh Jest hoặc CI. Dùng emulator dành riêng cho test, không có override kích thước/density trước khi chạy. Script từ chối serial điện thoại thật, dùng Python standard library và ADB đã cài; không gọi backend.

Chạy Metro qua launcher trong một terminal, rồi kết nối emulator và chạy smoke trong terminal khác:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\pnpm.ps1 start --go --localhost --port 8082
```

```powershell
$adbPath = "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe"
& $adbPath -s emulator-5586 reverse tcp:8082 tcp:8082
& $adbPath -s emulator-5586 shell am start -a android.intent.action.VIEW -d exp://127.0.0.1:8082 host.exp.exponent
# Đóng phần giới thiệu/developer menu của Expo Go trước khi chạy.
python -X utf8 tests/e2e/welcome_layout_smoke.py --adb $adbPath --serial emulator-5586 --output dist/agri159-native-final
```

Thay serial bằng emulator riêng thực tế. Sáu scenario dùng chiều rộng 320/390dp và font 100/150/200%. Script xác minh foreground Welcome bằng accessibility tree mới và framebuffer, kiểm các CTA có tên/trạng thái đúng, chiều cao tối thiểu theo font và cuộn tới được; lưu PNG/XML/JSON dưới output ignored rồi khôi phục display/font. Ảnh vẫn cần xem trực quan để kết luận không cắt chữ. Đây là layout smoke, không phải kiểm navigation end-to-end, TalkBack hoặc iOS. Kết quả thật theo [report AGRI-159](../../docs/reports/AGRI-159/README.md).


Tooling Windows: chạy `./tooling/LocalRuntime.Tests.ps1` từ thư mục tests (hoặc `./tests/tooling/LocalRuntime.Tests.ps1` từ reactNative). Script kiểm runtime thật và cách ly môi trường, không cần Pester/JS runner. Chưa có coverage nghiệp vụ.
