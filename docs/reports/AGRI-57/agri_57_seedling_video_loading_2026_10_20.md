# AGRI-57 — Loading theo video người dùng (2026-10-20)

Nhánh xác minh: `AGRI-57-frontend-summary`. Đây là yêu cầu mới sau khi người dùng đã yêu cầu gỡ thử nghiệm trước. Giữ nguyên các sửa responsive/bản đồ/nguồn vùng trồng chưa commit. DoD local có kiểm chứng bên dưới; còn review của người dùng/CI, chưa commit/push hoặc cập nhật PR/Jira.

## Tham khảo và thiết kế

Đã đọc video `Screen Recording 2026-10-20 081623.mp4` do người dùng cung cấp, không suy diễn nội dung từ tên file:5.2333s,488×350. Trích frame bằng Chromium video decoding vì máy không có ffmpeg; phân tích khung trắng400×300 bên trong, bỏ viền tối của bản ghi. Mẫu là mầm hai lá xanh nhạt, thân cao/thấp ba nấc, sáu chấm đất xám và LOADING với1–3 chấm màu cam. Đo26 thời điểm cho thấy các trạng thái rộng59/65/79px, cao43/71/110px, chu kỳ khoảng0.9s. Dựng SVG/CSS thay vì thêm ảnh/thư viện, không khôi phục ảnh/dải nền hoặc demo đã gỡ.

Ngoại lệ màu theo yêu cầu tham khảo ghi tại `DESIGN.md`: nền trắng, xanh nhạt, xám và cam chỉ trong token `--seed-loading-*`. Logo gốc, tên AgriAI và Manrope giữ nguyên. Lời chào dùng `loginPendingSession.user.fullName` sau xác minh; trim tên, chưa biết tài khoản thì “Xin chào.”. Không tự đặt tên user, không có thanh/phần trăm giả.

## Mã nguồn

- `frontend/src/components/common/SeedlingLoadingScreen.tsx`: component độc lập fullscreen/section, SVG hai lá/thân/đất, greeting và error/retry/cancel; recovery20s, visibility pause và cleanup timer/listener.
- `frontend/src/index.css`: chu kỳ ba nấc0.9s. Thân scaleY30/60/100%, canopy dịch theo đỉnh thân và scale đều75/82/100%, tránh lá rời thân/bị ép dẹt. Dots thay đổi cùng chu kỳ; reduced motion bỏ animation, hiện cây hoàn chỉnh.
- `frontend/src/providers/AppProvider.tsx`: user dùng component mới và vào app khi dữ liệu thật sẵn sàng, không đợi finite brand entrance; giữ admin entrance cũ và timeout/error/retry/cancel có sẵn. Không sửa service/backend/DB.
- `frontend/src/components/common/AppSplashScreen.tsx` và `frontend/src/app/(website)/(application)/loading.tsx`: reuse component, route variant không phủ navbar. Next quản lý removal của fallback; không thêm thời gian chờ giả.
- `frontend/tests/component/common/SeedlingLoadingScreen.test.tsx`:5 ca greeting/brand/indeterminate không có progressbar, tên chưa biết, lỗi/retry/cancel, recovery và cleanup. Cập nhật kỳ vọng greeting trong `frontend/tests/integration/app/App.startup.test.tsx`.

## Kiểm chứng mới

| Kiểm tra | Kết quả |
|---|---|
| TDD | Shell component khiến4/5 ca fail đúng hành vi thiếu; cleanup ban đầu đã pass. Sau triển khai focused2 tệp10/10 đạt. |
| Full coverage | `corepack pnpm test:coverage --pool=forks --maxWorkers=2`:220/220,35 tệp,66.92s. Branch950/1522=62.41% vượt floor60%; component18/19=94.73%, vượt mục tiêu80%. Không nói toàn frontend đạt80%. Nguồn `.cache/coverage/frontend/coverage-summary.json`. |
| Static/build | Typecheck đạt; lint167 tệp đạt sau sửa selector specificity và aria-hidden SVG. Format7 tệp sửa đạt. Production build cuối compile4.7s/TypeScript1029ms,11 trang static; chỉ recreate frontend localhost3000 với `--no-deps`. |
| Browser | Chromium320×568,375×667,667×375,768×900,1280×900: nền trắng, đúng greeting, không tràn ngang/chồng label; chữ200% tại375px đạt. Thả API fixture thì loader gỡ, menu xuất hiện, chỉ1 plant request. |
| Motion | Đã xem ảnh desktop/mobile và các pha50/400/750ms. Khoảng cách canopy joint–đỉnh thân tối đa0.4px, dưới1px; static reduced motion đạt, page errors rỗng. |

Lần kiểm tra lint đầu phát hiện noDescendingSpecificity và SVG thiếu accessible exclusion trực tiếp; sửa trong phạm vi component/CSS rồi lint lại đạt. Lệnh format từng chạy nhầm cwd gốc gây nested config error; chạy đúng `frontend/`, không sửa config. Chỉ các lần kiểm tra đạt sau sửa được coi là kết quả cuối.

Bằng chứng cục bộ bị Git bỏ qua: `.cache/video-reference-2026-10-20/frame-*.png`, `implemented-*.png`, `phase-*.png`, `verify.py`, `verification.json`. Video gốc không copy vào Git. Browser dùng fixture API cô lập, không ghi dữ liệu thật; chưa kiểm chứng Safari/thiết bị thật/CI hoặc tuyên bố khớp từng pixel với video nén. Không thêm demo route/dependency hay thay backend, không phục hồi thử nghiệm đã bỏ.

## Bổ sung: lời tạm biệt khi đăng xuất

Theo yêu cầu tiếp theo, `SeedlingLoadingScreen.tsx` thêm mode logout: “Tạm biệt, [tên].” và HẸN GẶP LẠI, aria-busy false, không chạy recovery timeout cho xác nhận đã hoàn tất. Loading/login mặc định giữ “Xin chào”. Tên trống dùng “Tạm biệt.”, không đoán danh tính. Animation và reduced motion giữ nguyên.

`AppProvider.tsx` chụp tên từ authSession đã xác minh, xóa session/profile/history tài khoản theo luồng logout có sẵn ngay khi bấm, bỏ private content khỏi cây render. Tên tạm biệt chỉ giữ trong bộ nhớ để hiển thị; không giữ token hoặc khôi phục phiên. Guard điều hướng tránh hiện generic welcome/capture return path trong logout. Khi pathname đã về `/`, xác nhận hiển thị1200ms rồi gỡ; đây là thông điệp logout ngắn do người dùng yêu cầu, không phải thời lượng loading dữ liệu giả. Timer cleanup khi đổi route/unmount. Admin flow/backend/dependency không sửa.

Kiểm tra mới sau bổ sung:

- Hai ca component mới và hai ca integration trong `frontend/tests/integration/app/App.logout.test.tsx`: ba ca fail trước sửa, tổng9/9 đạt sau sửa. Kiểm tra xóa phiên ngay, private content biến mất, tên tạm biệt, tự trở về nội dung public, không refetch catalog và dọn timer khi unmount. Test cleanup sẵn có vốn đã pass nên không gán là regression red mới.
- Fresh full `corepack pnpm test:coverage --pool=forks --maxWorkers=2`:224/224,36 tệp,66.07s; branches969/1542=62.84% vượt floor60%, component29/30=96.66% vượt mục tiêu80%. Nguồn `.cache/coverage/frontend/coverage-summary.json`. Kết quả220/220 ở trên thuộc lượt trước.
- Typecheck và lint168 tệp đạt; lint đầu báo thiếu button type trong test harness, đã thêm type=button rồi chạy lint lại đạt. Format4 tệp sửa đạt; Docker production build compile4.9s/TypeScript1572ms,11 trang static. Chỉ recreate frontend localhost3000.
- Chromium thực hiện nút Đăng xuất ở `/profile` tại1280×900 normal,375×667 normal và375×667 reduced. Cả ba hiện đúng tên, local/session storage đã xóa ngay, aria-busy false, không tràn ngang, không xuất hiện h1 Xin chào trong suốt điều hướng, cuối cùng về `/`/trang giới thiệu và gỡ màn hình xác nhận. Page errors rỗng; đã xem screenshot mobile.

Bằng chứng `.cache/video-reference-2026-10-20/logout_verify.py`, `logout-verification.json`, `farewell-*.png` bị Git bỏ qua. Browser dùng API fixture và session giả cô lập; không đăng xuất tài khoản thật hoặc ghi backend. `DESIGN.md`/task log cập nhật; diff-check đạt. Chưa kiểm chứng Safari/thiết bị thật/CI; chưa commit/push/PR/Jira.
