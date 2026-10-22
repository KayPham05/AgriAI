# AGRI-57 — Loading khi mở lại trang (2026-10-20)

## Cập nhật lượt115 — Logout có sóng, không thanh tiến trình (2026-10-21)

Theo yêu cầu, bỏ điều kiện chặn GSAP ripple ở mode logout trong SeedlingLoadingScreen; hai vòng sóng chạy cùng nhịp như login. Chỉ tạo tween fill khi có phần tử progress, nên logout không có target rỗng. Bỏ track trang trí đầy trước đây ở logout/lỗi; progress chỉ hiện khi thực sự loading. Giữ cây cũ/Tạm biệt/tên/HẸN GẶP LẠI, reduced motion/tabẩn/cleanup và thời gian4s.

Browser regression RED trước vì còn visible progress track, GREEN sau: logout có2 vòng đổi transform/opacity, không có track/progressbar, reduced motion tĩnh, về trang công khai sau thông báo; đã xem mobile375 và chụp desktop1440. Evidence ignored `.cache/loading-reference-2026-10-20/verify_logout_ripples.py`, `logout-ripples-verification.json`, `logout-ripples-*.png`. Component logout test bổ sung không progressbar và nhãn farewell. Fresh focused component/authTiming/logout **13/13 test,3 tệp,8,64s** lúc01:10:27; Biome2 tệp và production build compile4,3s/TypeScript812ms đạt; cập nhật riêng frontendlocalhost3000. Không chạy full suite/coverage mới cho thay đổi cục bộ này; full241 lượt114 là lịch sử. Không global CSS/Provider/backend/dependency, chưa commit/push/CI/thiết bị thật.

## Cập nhật lượt114 — Splash cây ba khối và vòng sóng (2026-10-21)

Người dùng cung cấp bố cục mới cho màn cây: thương hiệu phía trên, cây trong nền tròn và hai vòng sóng ở giữa, lời chào/tên/thanh tải/nhãn phía dưới. Chỉ sửa SeedlingLoadingScreen và các test liên quan; không sửa Design System/global CSS/Provider/timer4s/reload squares/backend/dependency.

- Dùng nền background ấm, logo lá hiện có; Agri màu primary, AI và nhãn ĐANG TẢI dùng ring làm sắc nhấn đọc được. Không dùng accent sáng cho chữ nhỏ vì tương phản thấp; accent dùng cho viền sóng. Không gradient/emoji/placeholder.
- Ba khối có gap bằng nhau40px desktop/tablet,32px mobile và16px khi chiều cao<=500px. Circle secondary/60, bo tròn, tên lấy từ userName thực và wrap khi dài. H1 có accessible name giữ đầy đủ lời chào để không mất ngữ nghĩa khi chia dòng. Logout tiếp tục hiển thị Tạm biệt/HẸN GẶP LẠI và không giả vờ còn tải.
- Giữ path/animation cây cũ. Hai GSAP ripple scale1→1,5/opacity0,5→0 trong2,4s, vòng thứ hai trễ1,2s. Thanh indeterminate scale0,06→0,92 rồi mờ/reset, role progressbar có aria-label Đang tải, không aria-valuenow hoặc phần trăm giả. useGSAP/matchMedia cleanup, dừng khi tab ẩn/lỗi và tĩnh khi reduced motion. UI error/retry/cancel/recovery20s giữ nguyên.
- Sau kiểm tra ảnh thấy viewBox cũ cắt ngọn ở một pha, đổi thành24/8/112/136 để chứa đầy đủ cây trong mọi pha đã quan sát; không thay hình cây.

Tests component cập nhật kiểm tra progressbar accessible/indeterminate/tên tách dòng/nhãn tiếng Việt: RED trước vì chưa có progressbar, GREEN sau. Fresh focused component+integration/app28/28 lúc01:00:34 (27,68s). Fresh full **241/241 test,40 tệp,105,75s**, bắt đầu01:02:25 với threads2worker đạt. Sau đó chỉ đổi viewBox, focused component7/7 lúc01:05:13 (1,44s) và Biome3 tệp đạt; không chạy full lần nữa cho khung SVG. Typecheck đạt; production build cuối compile3,9s/TypeScript1047ms đạt, cập nhật riêng frontendlocalhost3000.

Chromium/API fixture kiểm tra1440/768/375/320/667px: ba gap bằng nhau, toàn bộ nội dung và SVG bounds nằm trong màn/khung, không tràn ngang; sóng/thanh tải có transform thay đổi, reduced motion tĩnh, pageerrors rỗng. Đã xem ảnh desktop/mobile và xem lại mobile cuối. Tương phản chữ trên nền đo được: Agri6,67:1, AI/ĐANG TẢI4,97:1, Xin chào4,87:1, tên14,23:1. Evidence ignored `.cache/loading-reference-2026-10-20/verify_seedling_three_blocks.py`, `seedling-three-blocks-verification.json`, `seedling-three-blocks-*.png`. Chưa full coverage/CI/Safari/thiết bị thật, chưa commit/push.

## Cập nhật lượt113 — Căn lại màn chào cây (2026-10-21)

Theo ảnh phản ánh bố cục rời rạc, chỉ sửa layout trong `frontend/src/components/common/SeedlingLoadingScreen.tsx`: một cụm flex-column căn giữa tối đa24rem, logo lá40×56px cạnh tên30px, lời chào16px cách8px, nhóm cây cách24px. Thu gọn vùng SVG bằng viewBox32/28/96/112 để bớt khoảng trắng bên trong, giữ nguyên path/chuyển động. Nhãn trạng thái chuyển sang chữ12px màu primary hiện có thay chữ cam24px. Error/retry/cancel vẫn giữ. Không sửa global CSS, Design System, reload squares, API hoặc timer4s.

Fresh component Seedling/authTiming/logout **13/13 test,3 tệp,90,60s**, lúc00:52:10 đạt; Biome1 tệp và production build compile5,3s/TypeScript1395ms đạt. Cập nhật riêng frontendlocalhost3000. Chromium/API fixture đo cụm nội dung cao270px ở1440×900 và667×375,254px ở375×667 và320×568, căn giữa ngang/không tràn; đã xem mobile375. Đo thực đăng nhập4,281s/đăng xuất4,783s từ thao tác, giữ mốc tối thiểu4s. Evidence ignored `.cache/loading-reference-2026-10-20/verify_seedling_layout.py`, `seedling-layout-verification.json`, `seedling-layout-*.png`. Không chạy full suite/coverage mới cho layout; full241 lượt111 là lịch sử. Chưa commit/push/CI/thiết bị thật.

## Cập nhật lượt112 — Reload chỉ còn hoạt ảnh

Theo yêu cầu, bỏ heading Xin chào/userName và dòng Đang chuẩn bị trang trong ReloadLoadingScreen; giữ tên trạng thái qua aria-label cho trình đọc màn hình, UI lỗi/retry khi cần. Không sửa màn đăng nhập thành công/đăng xuất, timer4s hay animation. Cập nhật tests component và integration restore sang truy vấn loading status thay vì chữ bị xóa; fresh login vẫn kiểm tra lời chào cũ.

Component regression RED trước/GREEN sau. Fresh targeted component+integration/app **24/24 test,6 tệp,43,37s**, lúc20:41:36 đạt; Biome4 tệp và production build compile5,0s/TypeScript838ms đạt. Cập nhật riêng frontendlocalhost3000. Browser/API fixture xác nhận reload thật có4 ô, không chữ trong vùng content, vẫn chờ dữ liệu rồi tắt, animation thay đổi/pause tabẩn/reduced motion và5 kích thước đạt, pageerrors rỗng. Evidence `.cache/loading-reference-2026-10-20/verify_reload_loader.py`, `reload-loader-verification.json`, `reload-loader-*.png` local ignored. Không chạy full suite/coverage lại cho việc bỏ copy; full241 lượt111 là lịch sử. Chưa commit/push/CI/thiết bị thật.

## Cập nhật lượt111 — Thông báo đăng nhập/đăng xuất tối thiểu4 giây

Kết quả full mới: **241/241 test,40 tệp,95,28s**, bắt đầu20:36:10; `corepack pnpm test --pool=threads --maxWorkers=2` đạt. Không chạy coverage mới/CI; chưa commit/push.

Người dùng yêu cầu màn thông báo đăng nhập thành công và đăng xuất thành công phải chạy4 giây. AppProvider dùng AUTH_NOTICE_DURATION_MS=4000: fresh User chờ đủ thời gian cùng dữ liệu thiết yếu; fresh Admin chờ cả4 giây và callback hoàn tất entrance cũ trước chuyển/admin. Phiên khôi phục bằng loader reload mới bỏ qua thời gian chờ này. Logout xóa xác thực ngay, giữ màn Tạm biệt ít nhất4 giây trên trang đích rồi hiện giới thiệu, không đưa khách đã đăng xuất vào Home. Timer cleanup khi pending session thay đổi/unmount; dữ liệu chậm hơn4s vẫn phải chờ, lỗi vẫn giữ UI phục hồi.

Test mới `frontend/tests/integration/app/App.authTiming.test.tsx` kiểm tra ranh giới3999/4000ms choUser/Admin, data>4s và cleanup; logout test kiểm tra tương tự trước/sau4s. RED trước sửa ở3 trường hợp (User/Admin vào quá sớm và logout tắt sớm), GREEN sau. Tests form đăng nhập cũ dùng thời gian thực với timeout riêng10s vì cửa sổ4s cộng thao tác biểu mẫu vượt timeout cũ5s; các thử nghiệm fake clock trộn userEvent không kết thúc đã thay bằng form test thời gian thực, không xem là bằng chứng thành công. Test fake timer độc lập vẫn giữ kiểm tra đúng mốc.

Fresh focused integration/app **21/21 test,5 tệp,32,72s** lúc20:35:02 đạt. Typecheck/Biome5 tệp và production build compile4,8s/TypeScript962ms đạt; cập nhật riêng frontendlocalhost3000. Browser với API fixture đo từ click: đăng nhập4,696s (bao gồm request/render), đăng xuất4,629s; ở3s vẫn thấy lời chào/Tạm biệt, sau đó vào Home/về giới thiệu đúng. Evidence ignored `.cache/loading-reference-2026-10-20/verify_auth_notice_timing.py`, `auth-notice-timing-verification.json`. Full mới241/241 đạt như trên; các số237 ở dưới là lịch sử lượt109. Không thay animation/global CSS/backend/dependency; chưa commit/push.

## Phạm vi

Lượt109: người dùng yêu cầu loader theo video `Screen Recording 2026-10-20 201228.mp4` và màu Design System; sau đó xác nhận giữ loading cũ làm màn chào đăng nhập thành công. Đã xem video cục bộ4,766633s,1144×634 bằng Chromium, trích nhiều khung hình đầu/giữa/cuối: bốn ô thu/phóng, đổi chỗ theo hàng rồi xoay cả cụm. Bản triển khai dựng lại nhịp chuyển động bằng GSAP có sẵn, không tuyên bố khớp từng frame.

## Thay đổi

- `frontend/src/components/common/ReloadLoadingScreen.tsx`: component riêng với bốn ô dùng primary/accent/ring/secondary và background hiện có. Timeline chỉ animate transform (x/scale/rotation), lặp trong thời gian tải. Không có phần trăm giả hoặc thời lượng tối thiểu bắt người dùng chờ.
- `frontend/src/components/common/AppSplashScreen.tsx`: dùng loader mới khi khôi phục phiên.
- `frontend/src/providers/AppProvider.tsx`: phân biệt phiên vừa khôi phục và đăng nhập mới. Reload giữ loader mới xuyên suốt restoreAuthSession và dữ liệu thiết yếu; admin khôi phục không phải chạy lại màn đăng nhập thành công. Đăng nhập mới User vẫn SeedlingLoadingScreen, Admin vẫn LoginSuccessScreen; đăng xuất vẫn màn Tạm biệt cũ. Reset cờ restore sau hoàn tất/cancel.
- Loader phản ánh lỗi dữ liệu thực, hỗ trợ Thử lại/Quay lại; nếu khôi phục phiên chờ quá20s thì hiện phục hồi thay vì chỉ animation vô hạn. Không hủy/thay đổi API. `prefers-reduced-motion` hiển thị ô tĩnh; animation dừng khi document.hidden; useGSAP/matchMedia/timer/listener đều cleanup.
- Không sửa global CSS, Design System, màn cây cũ, backend hay dependency. Next page-level fallback section hiện có giữ nguyên.

## Tests và kiểm tra

- Test component mới tại `frontend/tests/component/common/ReloadLoadingScreen.test.tsx`: loading status/name, không phần trăm giả, lỗi/retry/cancel, phục hồi20s/timer cleanup. RED với component rỗng trước triển khai.
- `frontend/tests/integration/app/App.startup.test.tsx`: RED trước/GREEN sau cho loader xuyên suốt restore và data rồi tắt ngay khi dữ liệu sẵn sàng. Kiểm tra đăng nhập User mới vẫn dùng màn cây và lời chào; không dùng thông báo reload.
- `frontend/tests/integration/app/App.adminEntrance.test.tsx`: điều chỉnh kỳ vọng restored admin sang reload gate, giữ kiểm tra fresh admin phải hoàn tất màn chào cũ. Logout tests cũ vẫn đạt.
- Focused cuối trước full:11/11 test,3 tệp,14,22s lúc20:18:31; Admin entrance riêng2/2,3,48s lúc20:21:09. Typecheck/Biome7 tệp đạt. Production build compile5,0s/TypeScript1145ms đạt; cập nhật riêng frontendlocalhost3000.
- Lượt full đầu:235 đạt/2 thất bại trong237 test,39 tệp,97,37s lúc20:19:17. Hai thất bại là kỳ vọng màn admin restore cũ và expected tên ảnh sầu riêng cũ trong `frontend/tests/unit/services/catalogApi.test.ts`. Đã sửa hai expectation theo hành vi/tên ảnh hiện có, không thay backend/ảnh. **Fresh full sau sửa:237/237 test,39 tệp,85,15s lúc20:21:38 đạt**, lệnh `corepack pnpm test --pool=threads --maxWorkers=2`.

## Bằng chứng browser

Chromium với API fixture chờ có điều khiển xác nhận: loader hiện trước khi restore xong, tiếp tục trong lúc chờ data, có bốn ô và transform thay đổi theo thời gian, dừng khi tab ẩn, tĩnh khi reduced motion, biến mất sau data sẵn sàng; reload thật hiển thị lại. Kiểm tra1440/768/375/320/667px không tràn ngang; pageerrors rỗng. Đã xem screenshot desktop.

Evidence local ignored: `.cache/loading-reference-2026-10-20/verify_reload_loader.py`, `reload-loader-verification.json`, `reload-loader-*.png`, `frame-*.png`, `end-*.png`. Không đưa video/khung hình sinh ra vào Git.

## Giới hạn

Mạng nhanh có thể chỉ thấy loader rất ngắn vì không chèn chờ giả. Các route chuyển trong app không chủ động bật loader mới nếu không khởi động lại provider. Chưa xác nhận Safari/thiết bị thật/GitHub Actions/full coverage mới. Chưa commit/push.
