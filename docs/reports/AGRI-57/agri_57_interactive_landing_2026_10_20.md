# AGRI-57 — Landing tương tác ngày 2026-10-20

## Cập nhật lượt144 — Đồng bộ chuyển cảnh ảnh và lá (2026-10-21)

User báo giật/lệch nhịp, cung cấp video12,0333s. Đọc frame qua Chromium local video
(không ffmpeg/cv2), lưu ignored `.cache/banner-transition/video-*.png`. Source xác nhận
ảnh dùng fade riêng nhưng lá chỉ render theo active với key mới: đổi cây là gỡ lá cũ
ngay, mount lá mới chưa preload. Cảnh cũ giữ lại lâu còn cho phép lớp lá vượt stacking.

Sửa HomeBannerSlideshow: mỗi scene chứa ảnh, hai gradient overlay và lá tương ứng;
fade duy nhất ở scene cha, isolate/z-index giữ đúng thứ tự. Pre-render next scene gồm
foliage eager, chờ ảnh nền và toàn bộ lá load trước timer6s. Lá lỗi được ẩn và đánh dấu
ready để decoration không chặn slideshow; ảnh nền lỗi vẫn giữ banner hiện tại.
HomeBannerLeaves nhận active/onReady, preload không chạy sway, cảnh cũ giữ nguyên pose
khi fade và không remount lá đang hiển thị. onAnimationEnd của scene active gỡ previous;
reduced-motion đổi giữa chừng cũng dọn previous. HomeLandingHero chuyển overlay vào
scene nhưng giữ caption/CTA/layout. Không đổi asset, size, copy, API, dependencies/tokens.

Affected source: `frontend/src/components/home/{HomeBannerSlideshow,HomeBannerLeaves,
HomeLandingHero}.tsx`. Regression component mới RED trước sửa vì thiếu scene/preload;
final10/10 hai tệp đạt1,21s, runner09:31:49UTC, container exit0 verified. JSDOM không có
AnimationEvent nên React nghe webkitAnimationEnd: test cleanup đã phát đúng event đó;
Chromium xác minh animationend thật. Existing14-banner loop/readiness/errors/reduced/
hidden/navigation tests retained. Logs `.cache/banner-sync-{red,final}.log` ignored.

Browser `banner_transition.py` lấy24mẫu/50ms qua chuyển cảnh desktop1280 vàphone375:
opacity photo/foliage sai khác<0,001; fade tăng liên tục từ<0,8 tới>0,95; tất cả ảnh decode
trước hiển thị, cảnh cũ còn trong fade với pose không nhảy và được gỡ sau fade. Pageerrors
rỗng; JSON thực tế `.cache/banner-transition/opacity-{1280,375}.json`, screenshotssettled
đã xem. Phép so sánh screenshot hide/show cảnh cũ ở bản thử vẫn khác pixel, nên không
tuyên bố kiểm tra đó pass; implementation cuối gỡ hẳn cảnh sau fade và browser kiểm tra
DOM removal thay vì giữ cảnh cũ vô hạn. `banner_leaves.py` regression cuối đạt5widths,
size/no-overlap/buttonhit/decoding/sway/hidden-offscreenpause/staticreduced/cropsync.

Final Biome4files đạt; Docker build compile4,4s/TypeScript1690ms đạt và chỉ recreate
frontendlocalhost3000. Earlier detector review-only[]; không fullsuite/coverage/CI mới.
Một lệnh diagnostic bị automatic review usage-limit chặn; user yêu cầu tiếp tục, lượt
chạy sau được thực thi bình thường, không bypass review. Không commit/push/DB operations.

## Cập nhật lượt143 — Khôi phục lá động trên banner Home (2026-10-21)

User yêu cầu đưa banner-leaves cũ trở lại đúng banner `/home` và căn size phù hợp.
Thêm `frontend/src/components/home/HomeBannerLeaves.tsx`; slideshow giữ plantId từ
CROP_PHOTOS để chọn đúng BANNER_FOLIAGE cho từng ảnh, remount animation khi đổi slide.
Dùng lại toàn bộ asset tách nền hiện có; rice thêm hai lá rời (một trên mobile).
Không chỉnh slideshow interval, ảnh/copy, gradient overlay, CTA hay Introduction.

Cụm chính rộng160px trên phone (tối đa45%viewport),320px tablet,384px desktop,
448px màn lớn; corn scale75% như cách xử lý asset trước. Desktop neo góc phải dưới;
phone đặt tại nửa chiều cao để tránh caption và bottom navigation. GSAP scoped useGSAP,
sine/yoyo rotation/y dùng token banner sẵn có, cleanup/revert và remount theo crop.
IntersectionObserver/documentvisibility pause; reduced-motion giữ tĩnh. Decoration
aria-hidden/pointer-events-none, ảnh lỗi được ẩn. Không dependency/global CSS/token/API mới.

Regression trước sửa: test decoration matching FAIL vì không có layer lá. Sau sửa,
final focused9/9 hai tệp HomeBannerSlideshow/HomeLandingHero đạt1,08s, runner07:23:41UTC,
actual container exit0. PowerShell redirection reported commandexit1 from existing Next
Image stderr warnings in jsdom (fill parent geometry absent); test summary and container
exit verified independently, không sửa/hạ assertions. Log ignored `.cache/home-banner-leaves-tests.log`.
Các test cũ vẫn chạy14banners/loop, readiness/error/reduced/hidden và navigation.

Browser mới `frontend/tests/browser/home/banner_leaves.py` đạt1920/1280/768/375/320:
ảnh decorative decode, không overlap bounding boxes với h1/CTA/caption, button hit-testing,
no horizontal overflow, thực sự sway khi visible, hidden/offscreen pause/resume,
staticreduced và chuyển tea→rice kèm3ảnhlá. Pageerrors rỗng. Đã xem screenshotsdesktop,
mobile vàrice ởignored `.cache/home-banner-leaves/`. Test fixture ban đầu thiếu paged
predictions shape vàcreatedAt gây lỗi; sửa fixtures đúng contract, không sửa production.

Biome3files đạt, detector review-only[]; final Docker build compile4,8s/TypeScript918ms
đạt. Chỉ recreate frontendlocalhost3000. Không fullsuite/coverage/CI/device/backend/model
acceptance mới; không chứng nhận target80%coverage. Không commit/push/DB/volume operations.

## Cập nhật lượt121 — Tăng kích thước thẻ và nhấc nhẹ (2026-10-21)

Mở khung danh mục Home từ max-w-6xl sang max-w-7xl, grid gap6; giữ responsive1/2/4 cột. Heading3xl/4xl, Card mặc định spacing4, tên cây20px, khoa học/mô tả/link14px, ảnh16:9 (640×360) thay dải32:9. Giữ asset/data/callback/tab/footer. Mỗi Card hover/active/focus-within nhấc4px/bóng, transition translate/box-shadow200ms ease-out; motion-safe vô hiệu hóa hiệu ứng khi reduced motion. Không shared/global CSS/Design System/dependency.

Mở rộng test `frontend/tests/browser/home/plant_catalog_layout.py` trước sửa: RED trên hover translate none; GREEN sau cập nhật frontend. Kiểm tra đủ4 thẻ hover/bóng/return, focus nút, reduced motion, tỷ lệ ảnh16:9, ảnh cao>=150px và heading>=20px ởdesktop1440; không tràn1440/768/375/320. Kiểm tra tổng thể6 kích thước/tabs/keyboard/card/catalog navigation đạt và pageerrors rỗng; đã xem screenshotdesktop. README test cập nhật. Chưa chứng nhận chạm thiết bị thật.

Biome1 tệp đạt; Docker build compile3,8s/TypeScript1031ms đạt, cập nhật riêng frontendlocalhost3000. Fresh full **244/244 test,41 tệp**, bắt đầu02:09:04,104,14s đạt. Browser thêm trạng thái giữ chuột/rời hover vẫn nhấc do active, nhả trở về đạt. Chưa coverage/CI/Safari/thiết bị thật; chưa commit/push.

## Cập nhật lượt120 — Danh mục cây dạng thẻ ảnh ngang (2026-10-21)

Theo mẫu mới, HomePlantGuide dùng Card size sm có ảnh đầu thẻ phủ ngang tỷ lệ32/9 thay thumbnail tròn; Next Image640×180 với sizes responsive. Tên cây, tên khoa học italic, badge nhóm và số bệnh cẩm nang gọn bên dưới; footer nền nhạt/nút liên kết giữ component có sẵn. Giữ dữ liệu/ảnh thật hiện có, thứ tự featured, tabs và callback. Không sửa shared/global CSS/Design System/dependency.

Browser test lưu `frontend/tests/browser/home/plant_catalog_layout.py`: bản production cũ RED do ảnh không phủ ngang thẻ; bản mới GREEN4 featured cards ở1440/768/375/320px, ảnh sát mép trên/phủ ngang/tỷ lệ rộng và không tràn. Test viết sau source edit nhưng chạy RED với bản cũ trước khi cập nhật container; không gọi đây là test-first toàn bộ triển khai. README test cập nhật cách chạy local fixture, không thêm CI/runtime dependency. Kiểm tra tổng thể6 kích thước/tabs/keyboard/card/catalog navigation đạt, pageerrors rỗng; đã xem screenshot desktop. Evidence bổ sung ignored `.cache/landing-2026-10-20/home-guide-catalog-*.png` và JSON.

Biome1 tệp đạt; Docker build compile4,4s/TypeScript859ms đạt và cập nhật riêng frontendlocalhost3000. Fresh full **244/244 test,41 tệp**, bắt đầu02:02:58,127,25s đạt. Đã xem thêm ảnh mobile375px. Chưa coverage/CI/Safari/thiết bị thật; chưa commit/push.

## Cập nhật lượt119 — Nhấc nhẹ từng ô lưu ý (2026-10-21)

Theo yêu cầu, thêm motion-safe hover/active translate-y-1 (4px) và shadow-md cho từng li trong HomePlantGuide. Transition chỉ translate/box-shadow200ms ease-out; khi rời/nhả trở về, reduced motion không nhấc/bóng. Không JS/timer/listener mới, không thay kích thước layout hoặc biến thẻ nội dung thành button, không shared/global CSS/token/dependency.

Browser regression RED trên production trước sửa: hover vẫn transform none. Sau sửa Tailwind v4 dùng thuộc tính translate, test kiểm tra computed translate và bóng thực tế; ba thẻ hover/return, pressed và reduced-motion GREEN. Fixture đầu thiếu cấu trúc predictions nên chưa vào Home; sửa fixture rồi mới xác nhận RED đúng nguyên nhân. Lưu test ở `frontend/tests/browser/home/photo_tip_motion.py`, hướng dẫn chạy và giới hạn tại `frontend/tests/README.md`; không thêm browser vào CI hay dependency. Đây là kiểm tra Chromium/API fixture, chưa phải nghiệm thu chạm trên thiết bị thật.

Fresh focused6/6 hai tệp lúc01:57:18 (26,67s), Biome1 tệp đạt. Production Docker build đạt (compile4s/TypeScript813ms), cập nhật riêng frontendlocalhost3000; bản test đã lưu chạy lại đạt. Fresh full **244/244 test,41 tệp**, bắt đầu01:58:53,93,27s đạt. Chưa coverage/CI/Safari/thiết bị thật; chưa commit/push.

## Cập nhật lượt118 — Bỏ cụm chọn cây phía trên lưu ý (2026-10-21)

Theo ảnh người dùng, xóa heading “Bạn đang trồng cây gì?”, lời mô tả, FilterSelect và CTA “Tìm hiểu cây” khỏi HomePlantGuide; bỏ state/options/import không còn dùng và margin-top của panel để không để khoảng trống cũ. Giữ ba lưu ý, danh mục/tab/thẻ và callback mở cây từ thẻ. Chỉ sửa component Home và hai test, không shared/global CSS/Design System.

Regression RED1/2passed trước sửa; HomePlantGuide kiểm tra cụm đã biến mất và vẫn có3 lưu ý/4 featured. HomePage test chuyển từ selector đã xóa sang mở cây Cà phê bằng card. Full fresh **244/244 test,41 tệp**,01:51:01,124,02s đạt. Typecheck/Biome3 tệp đạt. Lượt build đầu bị chặn bởi tùy chọn `exact` không hợp lệ trong Testing Library ByRoleOptions ở test mới; bỏ tùy chọn dư (string name đã exact mặc định), typecheck và Docker build chạy lại đạt (compile4,2s/TypeScript880ms). Không xem build lỗi là thành công.

Cập nhật riêng frontendlocalhost3000. Chromium/API fixture6 kích thước1440/1024/768/375/320/667px xác nhận selector/heading bị xóa,3 lưu ý/4 featured còn đủ, không tràn ngang, tab bàn phím/card Nho/danh mục điều hướng đúng và pageerrors rỗng. Script/JSON/screenshot ignored ở `.cache/landing-2026-10-20/`; bỏ kiểm tra selector-navigation cũ vì tính năng đã xóa. Chưa coverage mới/CI/thiết bị thật; chưa commit/push.

## Cập nhật lượt117 — Khung ba lưu ý theo mẫu (2026-10-21)

Đổi riêng phần lưu ý trong `frontend/src/components/home/HomePlantGuide.tsx`: panel surface bo media, header camera/tiêu đề/phụ đề/badge, đường chia và ba thẻ01–03. Mỗi thẻ có số trái, SVG ScanLine/Sun/ShieldCheck phải, tiêu đề và mô tả bên dưới; desktop ba cột, mobile một cột. Dùng token primary/warning/ring/surface/border hiện có, không đổi global CSS/Design System/shared component/dependency. Giữ nguyên lời khuyên, selector, danh mục và các callback. Tiêu đề selector tách thành “Bạn đang trồng cây gì?”. Không sao chép tuyên bố98% chưa được kiểm chứng từ ảnh mẫu.

TDD: assertion heading mới trong `frontend/tests/component/home/HomePlantGuide.test.tsx` RED trước triển khai (1 failed/2 passed), cập nhật kỳ vọng liên quan trong `frontend/tests/component/views/HomePage.test.tsx`; GREEN focused **6/6**, hai tệp, bắt đầu01:46:29,5,85s. Fresh Typecheck/Biome3 tệp đạt. Production Docker build đạt (compile3,9s, TypeScript886ms); cập nhật riêng frontendlocalhost3000, không thay backend/DB.

Chromium/API fixture qua `verify_home_plant_guide.py`:1440/1024/768/375/320/667px không tràn ngang, ba lưu ý/bốn featured cards, bàn phím tab/nhóm/chọn cây/điều hướng danh mục đạt, pageerrors rỗng. Đã xem screenshot desktop1440 và mobile320; evidence ignored `.cache/landing-2026-10-20/home-plant-guide-verification.json`, `home-guide-tips-*.png`. Không chạy lại full suite/coverage/CI; kết quả244 của lượt116 là lịch sử. Chưa chứng nhận thiết bị thật/Safari/WCAG toàn diện; chưa commit/push.

## Cập nhật lượt116 — Phần dưới Home theo mẫu hướng dẫn/danh mục (2026-10-21)

Người dùng gửi mẫu ba thẻ bước và danh mục dạng tab/thẻ nhỏ. Áp dụng bố cục đó cho nội dung nông nghiệp, giữ nguyên hero/banner/loading/Nav. Thêm `frontend/src/components/home/HomePlantGuide.tsx`, HomePage chỉ ghép hero và guide. Không thay Design System/global CSS/shared component/backend/dependency.

- Vùng nền surface-muted: tiêu đề giữa, bộ chọn cây hiện có và CTA mở đúng cây được chọn; ba thẻ01–03 giữ nội dung lưu ý chụp ảnh/đối chiếu trước xử lý từ Home cũ.
- Vùng surface bên dưới: heading giữa, Tabs line dùng component có sẵn (Nổi bật/Cây công nghiệp/Cây lương thực/Cây ăn trái). Nổi bật hiện4 cây theo thứ tự ưu tiên CORE_PLANT_IDS cũ; nhóm lấy từ SUPPORTED_PLANTS, không tạo danh mục/giá/số liệu tài chính giả.
- Card composition có ảnh thật hiện có, tên/khoa học/nhóm và số bệnh trong cẩm nang tính từ conditions không healthy; không gọi đây là độ chính xác/khả năng model. Nút từng thẻ mở cẩm nang cây tương ứng, nút cuối tới/ plants. Responsive1/2/4 cột; tab wrap và hỗ trợ bàn phím bằng Radix.
- Bỏ preview lớn Home cũ theo bố cục mới nhưng giữ luồng chọn cây và điều hướng. Test chọn cây cập nhật kiểm tra giá trị selector/callback, không còn đòi heading của preview đã thay.

Tests mới `frontend/tests/component/home/HomePlantGuide.test.tsx` RED3/3 với component rỗng trước, GREEN sau: ba lưu ý/bốn featured cards, lọc nhóm/mở cây, bàn phím tab/đi danh mục. `frontend/tests/component/views/HomePage.test.tsx` giữ kiểm tra hero/CTA/selector. Focused6/6 lúc01:23:42 (12,23s), Typecheck/Biome4 tệp đạt. Fresh full **244/244 test,41 tệp,105,92s**, bắt đầu01:25:10 với threads2worker đạt. Production build compile4,4s/TypeScript912ms đạt, cập nhật riêng frontendlocalhost3000.

Chromium/API fixture: kiểm tra1440/1024/768/375/320/667px không tràn ngang/card vượt khung; có3 lưu ý và4 featured, tab ArrowRight đổi nhóm, chọn Cây ăn trái rồi Nho mở/plants/grape, selector Nho cũng mở đúng/plants/grape, xem tất cả tới/plants; pageerrors rỗng. Đã xem screenshot cả hai vùng ởdesktop. Evidence ignored `.cache/landing-2026-10-20/verify_home_plant_guide.py`, `home-plant-guide-verification.json`, `home-guide-tips-*.png`, `home-guide-catalog-*.png`. Chưa coverage mới/CI/Safari/thiết bị thật, chưa commit/push.

## Cập nhật lượt110 — Bỏ viền focus bao quanh main khi reload

Người dùng yêu cầu bỏ đường viền mờ toàn chiều ngang dưới Navbar khi reload. Truy nguồn bằng Chromium: main không focus có outline-style none, khi focus chuyển thành auto1px màu ring/50; border thực0px, shadow none. Đây là viền focus main chứ không phải gradient banner. Chỉ thêm outline-none vào main trong `frontend/src/components/layout/AppShell.tsx`, giữ id/tabIndex=-1 và skip link; không đổi global CSS, Navbar, focus feedback nút/link hoặc slideshow/loading.

Browser regression RED trước sửa/GREEN sau, reload thật1904/375px xác nhận main focus được nhưng outline-style none; Tab tới nút/link vẫn có outline/box-shadow focus và không tràn ngang. Evidence ignored `.cache/landing-2026-10-20/inspect_main_outline.py`, `verify_main_outline.py`, `focused-main-before.png`, `focused-main-after-*.png`. Lượt inspect đầu timeout networkidle; đổi sang domcontentloaded và đợi main visible, không xem timeout là kết quả thành công.

Fresh `App.routing.test.tsx` **7/7 test,2,86s** lúc20:26:34; Biome1 tệp và production build compile4,3s/TypeScript813ms đạt. Cập nhật riêng frontendlocalhost3000. Không chạy lại full suite/coverage cho class focus; full237 lượt109 là lịch sử. Chưa commit/push/thiết bị thật/CI.

## Cập nhật lượt108 — Banner tràn viền phủ nền hero

Người dùng đề nghị ảnh phủ toàn vùng landing, phía trên nhạt rồi rõ dần xuống dưới. Chỉ sửa HomeLandingHero: section relative/isolate, figure absolute inset0 bỏ margin/bo góc, tiêu đề/CTA ở lớp trên. Lớp phủ dùng background semantic hiện có (đậm phía trên,90% ở30% chiều cao, trong suốt từ75%); gradient tối chỉ ở nửa dưới giữ caption trắng dễ đọc. Giữ khoảng chiều cao tối thiểu để caption không chồng CTA khi màn hình thấp/chữ tăng; caption mobile nâng theo khoảng5rem+safe-area đang dùng ở app shell để không bị bottom navigation che. Slideshow14 ảnh và Navbar/global CSS/Design System/shared/backend không thay đổi.

Browser layout regression RED trước sửa (hero x0/y96/1904×851, figure x32/y374,80/1840×572,20); GREEN sau sửa figure trùng toàn bộ bounds hero ở1904/768/375/320/667px, không còn radius/tràn ngang, CTA cách caption, caption mobile không bị bottom navigation che ở viewport phù hợp; pageerrors rỗng. Đã xem ảnh desktop/mobile, phát hiện caption bị che ở lượt đầu và sửa cục bộ như trên. Evidence ignored `.cache/landing-2026-10-20/verify_full_bleed_home.py`, `full-bleed-home-verification.json`, `full-bleed-home-*.png`.

Fresh focused Home/Hero cuối **11/11 test,3 tệp,8,17s**, lúc20:06:05; Biome1 tệp đạt. Docker production build cuối đạt (compile5,0s, TypeScript1131ms); cập nhật riêng frontendlocalhost3000 và kiểm tra browser lại thành công. Không chạy full suite/coverage mới cho layout, full233 lượt105 là lịch sử. Chưa CI/Safari/thiết bị thật/commit/push.

## Cập nhật lượt107 — Sửa import ảnh sầu riêng sau đổi tên

Log người dùng cung cấp báo Docker frontend Module not found ở cropPhotos.ts:12. Kiểm tra workspace thấy file tracked `sầu riêng.jpg` đã bị xóa và có file mới `sầu riêng banner.jpg`; Dockerignore không loại ảnh. Cập nhật duy nhất import durian trong frontend/src/data/cropPhotos.ts theo file mới, giữ nguyên các ảnh người dùng đã thay/đổi tên (kể cả bưởi). Cập nhật expected filename tại frontend/tests/unit/data/bannerData.test.ts.

Fresh targeted bannerData/Home đạt **24/24 test,3 tệp,26,54s**, lúc20:00:06. Biome2 tệp đạt sau chuẩn hóa format test. Docker compose build frontend đạt (compile4,3s, TypeScript1286ms), cập nhật riêng frontendlocalhost3000. Không cần build lại backend/AI vì lỗi nằm ở import frontend; không sửa backend/Docker config/asset người dùng. Chưa chạy full suite/coverage mới, chưa commit/push. Log lỗi là bằng chứng trước sửa; kết quả các lượt cũ không thay thế lượt này.

## Cập nhật lượt106 — Bỏ nút điều khiển banner

Browser sau cập nhật localhost: xác nhận figure không còn button, ảnh vẫn tự chuyển bằng thời gian thực, reduced-motion và320/375/768/1904px đạt, pageerrors rỗng. Evidence ignored `.cache/landing-2026-10-20/verify_banner_without_controls.py`, `banner-without-controls-verification.json`, `banner-without-controls-*.png`.

Theo yêu cầu xóa nút Pause trong ảnh, bỏ nút Play/Pause và imports liên quan khỏi HomeBannerSlideshow. Giữ tự chuyển14 ảnh, load trước/crossfade, reduced motion, hidden tab và cleanup. State dừng do lỗi ảnh đổi tên loadFailed cho đúng ý nghĩa; không có control resume thủ công nữa. Bỏ khoảng padding caption đã chừa cho nút trong HomeLandingHero. Cập nhật test bỏ điều khiển, giữ vòng lặp/ảnh lỗi/reduced motion/visibility; tests README đổi mô tả.

Test không có nút RED trước/GREEN sau; focused Home/Hero fresh **11/11 test,3 tệp,14,06s** lúc19:54:12 đạt. Lần chạy đầu bị kẹt RUN đã dừng, chạy riêng test RED và chạy lại targeted thành công. Biome4 tệp đạt sau format. Production build đạt; không chạy full suite/coverage lại cho việc bỏ control, full233 lượt105 là lịch sử. Chưa commit/push.

## Cập nhật lượt105 — Tự động luân phiên toàn bộ banner cây trồng

Người dùng xác nhận đưa tất cả banner vào khung lớn và tự động chuyển lần lượt. Thêm `frontend/src/components/home/HomeBannerSlideshow.tsx`, tích hợp trong HomeLandingHero. Dùng đủ14 ảnh CROP_PHOTOS có sẵn, bắt đầu chè rồi lúa/cà chua/ngô/khoai/ớt/cà phê/chuối/dưa hấu/cam/xoài/sầu riêng/bưởi/nho và lặp lại. Sau khi ảnh kế tiếp tải xong, chờ6s rồi crossfade1s bằng opacity/CSS animation hiện có. Chỉ giữ ảnh hiện tại, trước và kế tiếp trong DOM; không tải14 ảnh cùng lúc. Giữ crop từng ảnh, lớp fade/caption, góc trên vuông và layout hiện tại. Nút tạm dừng/tiếp tục ở góc phải; dừng khi tab ẩn hoặc prefers-reduced-motion. Timer/media/visibility listeners được cleanup. Nếu ảnh kế tiếp lỗi, giữ ảnh hiện tại và dừng chuyển; không có retry tự động. Không thay global/shared/Design System/backend/dependency.

Tests mới tại `frontend/tests/component/home/HomeBannerSlideshow.test.tsx`: vòng đủ14 ảnh và lặp, đợi tải trước chuyển, pause/resume, reduced motion, ảnh lỗi, hidden tab, timer cleanup. Test RED với component rỗng trước triển khai; lần đầu GREEN chậm do Next Image decode bất đồng bộ, sửa test để await load thực tế rồi đạt. Focused Home/Hero11/11 lúc19:46:15 (10,28s); Typecheck/Biome4 tệp đạt. Fresh full **233/233 test,38 tệp,104,74s**, lúc19:46:56 với threads2worker đạt. Sau đó chỉ tăng chặt chẽ await trong test reduced-motion và cập nhật tests README; không thay production. Docker production build đạt (compile5,7s, TypeScript836ms), cập nhật riêng frontendlocalhost3000.

Chromium với API fixture và thời gian thực xác nhận nhiều lần tự chuyển ảnh đã tải, pause/resume, reduced motion,320/375/768/1904px không tràn ngang/góc trên vẫn vuông, pageerrors rỗng; đã xem ảnh mobile. Hai lần kiểm tra với clock giả thất bại do không quan sát được chuyển ảnh tại thời điểm assert; chuyển sang kiểm tra thời gian thực và đạt, không xem đó là bằng chứng thành công. Evidence ignored `.cache/landing-2026-10-20/verify_rotating_banner.py`, `rotating-banner-verification.json`, `rotating-banner-*.png`. Full coverage chưa chạy lại; không tuyên bố target80% hay CI/Safari/thiết bị thật. Chưa commit/push.

## Cập nhật lượt104 — Bỏ bo góc trên banner

Chỉ đổi `rounded-media` thành `rounded-b-media` trên figure trong HomeLandingHero, bỏ hai góc trên để banner nối với nền, giữ góc dưới20px. Docker production build và Biome1 tệp đạt, cập nhật riêng frontendlocalhost3000. Chromium320/375/768/1904px đo computed radius đúng0/0/20/20px, không tràn ngang/cắt chữ/pageerror. Evidence ignored `.cache/landing-2026-10-20/verify_square_banner_top.py`, `square-banner-top-verification.json`, `square-banner-top-*.png`.

Focused Vitest pool forks không trả kết quả sau khi báo RUN, đã dừng và thử lại pool threads1worker: fresh **6/6 test,2 tệp,27,01s**, lúc19:40:00, đạt. Không sử dụng6/6 lượt trước làm bằng chứng mới. Full suite/coverage không chạy lại cho class bo góc. Chưa commit/push.

## Cập nhật lượt103 — Thu sát cụm hero thêm

Chỉ giảm spacing trong HomeLandingHero theo yêu cầu tiếp: padding trên12/16px, dưới16px, bỏ margin8px trước CTA; viewBox cao195 thay210 để loại phần trống dưới chữ. Giữ nguyên hai đường cong/font/màu và chức năng. Desktop1904px banner y422,39→374,80 (lên47,59px), cao thêm tương ứng.

Fresh focused Home/Hero lúc16:55:38 đạt **6/6 test,2 tệp,2,79s**; Biome1 tệp đạt. Docker production build thành công và cập nhật riêng frontendlocalhost3000. Chromium320/375/768/1904px không tràn ngang, chữ nằm trong viewBox195, pageerrors rỗng; đã xem desktop. Evidence ignored `.cache/landing-2026-10-20/verify_closer_headline.py`, `closer-headline-verification.json`, `closer-headline-*.png`. Không chạy lại full coverage cho spacing, chưa commit/push/thiết bị thật.

## Cập nhật lượt102 — Thu gọn vùng tiêu đề

Theo phản ánh vùng đầu thưa, chỉ sửa HomeLandingHero: padding trên từ40/56/64px về24/32px; khoảng cách hai đường chữ từ95 về80 đơn vị; viewBox cao240→210 bỏ khoảng trống dưới chữ. Giữ font/màu/độ cong/CTA. Desktop1904px banner lên thêm63,20px (y485,59→422,39), ảnh cao thêm tương ứng và giữ đáy viewport.

Fresh focused Home/Hero **6/6 test,2 tệp,2,66s** lúc16:52:50; Biome1 tệp và Docker production build đạt (compile4,6s, TypeScript875ms). Recreate riêng frontendlocalhost3000. Chromium320/375/768/1904px không tràn ngang, các vùng chữ nằm trong viewBox210 không cắt dấu, pageerrors rỗng; đã xem desktop. Evidence ignored `.cache/landing-2026-10-20/verify_tight_headline.py`, `tight-headline-verification.json`, `tight-headline-*.png`. Không chạy lại full coverage cho spacing; chưa commit/push hoặc kiểm tra thiết bị thật.

## Cập nhật lượt101 — Đưa CTA và mép banner lên

Chỉ sửa spacing HomeLandingHero: margin trên CTA từ6 xuống2, padding dưới khối tiêu đề về6. Desktop hai nút lên16px, mép banner lên32px và ảnh cao thêm32px; giữ đáy banner chạm cuối viewport. Mobile giảm khoảng cách theo khung, nút vẫn wrap khi hẹp. Không đổi nội dung/chức năng/global/shared.

Fresh focused Home/Hero **6/6 test,2 tệp,2,52s** lúc16:47:54; Biome1 tệp và Docker production build đạt. Recreate riêng frontendlocalhost3000. Chromium so trước/sau1904px xác nhận CTA y433,59→417,59; banner y517,59→485,59, height tăng32px. Kiểm tra thêm768/375/320px không tràn hoặc cắt chữ, pageerrors rỗng. Evidence ignored `.cache/landing-2026-10-20/verify_compact_hero.py`, `compact-hero-before.json`, `compact-hero-after.json`. Không chạy lại full coverage cho spacing; các lượt trước là lịch sử. Chưa commit/push hoặc kiểm tra thiết bị thật.

## Cập nhật lượt100 — Chữ tiêu đề uốn thành vòng cung

Theo lựa chọn rõ ràng của người dùng, hai dòng tiêu đề Home uốn cong lên bằng SVG textPath trong `frontend/src/components/home/HomeLandingHero.tsx`. Giữ màu semantic/font hiện có, một h1 có nội dung đọc được, SVG ẩn với trình đọc màn hình; useId tránh trùng đường dẫn. Không thêm dependency, timer, animation tự chạy, global CSS hay thay đổi shared component. SVG co theo khung; CTA và banner giữ chức năng.

Thêm kiểm tra hai dòng cong trong `frontend/tests/component/home/HomeLandingHero.test.tsx`: RED vì chưa có textPath, sau triển khai focused Home/Hero **6/6 test,2 tệp,2,84s**, lúc16:43:42. Typecheck và Biome2 tệp đạt sau format. Docker production build đạt (compile4,3s, TypeScript956ms); recreate riêng frontendlocalhost3000. Chromium kiểm tra320/375/768/1904px không tràn ngang, cả hai vùng chữ nằm trong viewBox (không cắt dấu), không pageerror; đã xem screenshot desktop. Evidence ignored `.cache/landing-2026-10-20/verify_curved_headline.py`, `curved-headline-verification.json`, `curved-headline-*.png`. Không chạy lại full suite/coverage cho thay đổi hiển thị cục bộ này; các số full trước là lịch sử. Chưa commit/push, chưa Safari/thiết bị thật.

## Cập nhật lượt99 — Bỏ ba dấu chấm cuối dòng

Xóa dấu chấm cuối hai dòng heading và caption ảnh trong `frontend/src/components/home/HomeLandingHero.tsx` theo ảnh người dùng. Cập nhật kỳ vọng nội dung trong `frontend/tests/component/home/HomeLandingHero.test.tsx` và `frontend/tests/component/views/HomePage.test.tsx`. Không đổi bố cục, màu hoặc chức năng. Fresh focused Vitest lúc16:38:20: **5/5 test,2 tệp,2,42s** đạt; Biome check3 tệp đạt. Docker production build đạt (compile4,7s, TypeScript874ms). Không chạy lại full coverage cho chỉnh sửa dấu câu; kết quả các lượt trước là lịch sử. Chưa commit/push.

## Hiện trạng lượt98 — Logo lá trong suốt, bỏ khung kép

Người dùng phản ánh logo có nền chữ nhật đặt trong khung xanh bo tròn tạo hai viền. Sửa wrapper logo trong Navbar thành vùng đặt ảnh trong suốt32×44px, không background/border/radius/padding/overflow clip. Giữ link Home, tên thương hiệu, fallback Leaf và focus feedback. Tạo bản tách nền từ ảnh lá người dùng bằng built-in image_gen theo skill imagegen, giữ ngôn ngữ các nhánh lá; đầu ra được duyệt bằng mắt, không tuyên bố byte-identical ảnh gốc. Thay7 URL logo hiện có sang `/images/agriai-leaf-mark.png` để không dính cache ảnh nền cũ. Không sửa global CSS/Design System hoặc logic của các nơi dùng logo.

Asset cuối: `frontend/public/images/agriai-leaf-mark.png`, copy từ generated_images/exec-f0610ba9-90e1-4820-8fc5-60c69f920063.png. SHA256 **C5F1AA16386B9833AC9C1304525C992693BDF18E9CC50A1B869243417B5D9083**. Tool dùng **built-in image_gen**, không CLI/API key. Prompt cuối:

> Precise background extraction of the supplied STYLIZED LOGO, not a natural leaf. The logo has FOUR SEPARATE tapered green ribbon/blade regions divided by THREE BROAD WHITE CURVED CHANNELS. Those white channels are negative space and MUST BECOME FULLY TRANSPARENT. Remove the pale surrounding background AND the pale channels between every green blade. Keep each green blade pixel appearance, position, silhouette and leaf-vein texture from the original. Do not fill channels green, do not join blades into a natural leaf, do not redesign. Exact original stylized cutout only, on true transparent alpha with all three curving gaps visibly open. Tight framing with small padding.

Navbar test URL mới RED trước/GREEN sau; cập nhật expected asset Intro/Login/Loading, không sửa tests để bỏ kiểm tra logo. Lần targeted đầu1 test Loading còn kỳ vọng basename logo.png thất bại, sửa đúng expected mark rồi fresh targeted **23/23 test,6 tệp,7,62s** lúc16:30:19 đạt. Typecheck/lint170 tệp/Biome đạt; production build compile5,3s/TypeScript2,2s,11 trang tĩnh/hai route động đạt, chỉ recreate frontendlocalhost3000. Không chạy lại full coverage cho asset/wrapper; full227 lượt97 là lịch sử.

Chromium đo4 góc PNG tối ưu alpha0 và có pixel lá opaque; wrapper computed background rgba0/0/0/0, radius0px, border0px, padding0px. Đã xem crop logo thực tế: chỉ còn chiếc lá cạnh AgriAI, không nền vuông/khung xanh.8 kích thước320–1920/landscape/chữ200%/bannerfullheight/CTA đạt, page errors rỗng. Evidence ignored `.cache/landing-2026-10-20/verify_transparent_logo.py`, `transparent-logo-verification.json`, `logo-bare-brand.png`, `home-transparent-logo-*.png`. Chưa commit/push/CI/Safari/thiết bị thật/backend E2E. Dưới đây là lịch sử.

## Lịch sử lượt97 — URL logo lá riêng để tránh ảnh cũ trong cache

Người dùng chụp Navbar còn logo cũ. File public/images/logo.png tại workspace và bản server kiểm tra trước đó đã đúng PNG lá, nên cache của cùng URL là một khả năng (không trực tiếp đọc cache phiên người dùng). Thêm `frontend/public/images/agriai-leaf-logo.png` nguyên byte ảnh lá, cập nhật7 reference logo trong Navbar/Intro/LoginModal/LoginSuccessScreen/SeedlingLoadingScreen/AdminCrmPage/catalog fallback sang URL riêng mới; giữ logo.png như alias tương thích. Không chỉnh hình ảnh hoặc business logic.

Đây là sửa logo theo yêu cầu trực tiếp:5 tệp trong snapshot bảo vệ có thay đổi URL duy nhất; chuẩn hóa URL mới về URL cũ thì hash trùng snapshot, không có sửa ngoài logo. Intro cũng chỉ đổi URL logo; không còn tuyên bố byte-identical với snapshot. Không sửa Design System/global CSS, routing hoặc styles shared. Test Intro/Login cập nhật kỳ vọng, Navbar.test.tsx kiểm tra URL logo mới: RED trước sửa/GREEN sau.

Fresh full `corepack pnpm test:coverage --pool=forks --maxWorkers=2` bắt đầu16:17:11 đạt **227/227test,37 tệp,65,91s**; branch **968/1542=62,77%**, giữ floor60%, chưa target80% mọi component. Typecheck/lint170 tệp/Biome Navbar test đạt. Build compile5,3s/TypeScript1213ms,11 trang tĩnh/hai route động đạt; recreate riêng frontendlocalhost3000.

Chromium/API fixture xác nhận img Navbar dùng query URL `/images/agriai-leaf-logo.png`, raw file mới khớp hash PNG người dùng cung cấp, ảnh tải thật. Hồi quy banner full-height/8 kích thước/chữ200%/CTA đạt, page errors rỗng. Evidence ignored `.cache/landing-2026-10-20/verify_leaf_url.py`, `leaf-url-verification.json`, `home-leaf-url-*.png`. Chưa commit/push/CI/Safari/thiết bị thật/backend E2E. Dưới đây là lịch sử.

## Lịch sử lượt96 — Banner phủ hết màn hình đầu

Người dùng phản ánh phần hướng dẫn ló lên dưới banner ở màn hình1904×947. Chỉ sửa class của HomeLandingHero: section flex-column có min-height `calc(100svh - 6rem)` theo chiều cao navbar hiện có, figure flex1/min-h72 thay chiều cao48svh/max36rem. Ảnh lấp phần chiều cao còn lại, nội dung tiếp theo nằm dưới fold; không dùng overlay che mất nội dung, giữ cuộn và bố cục tự tăng chiều cao khi màn hình thấp/chữ lớn. Không sửa shared/global/design/token/asset.

Fresh Home/Hero focused **5/5 test,2 tệp,2,93s** lúc16:08:32; Biome check/format đạt. Build compile4,7s/TypeScript946ms,11 trang tĩnh/hai route động đạt; chỉ recreate frontendlocalhost3000. Không chạy lại full coverage cho class layout;227/227 lượt94 là lịch sử.

Browser regression script đo figure bottom và heading đầu section sau phải >= viewport height: bản trước RED tại1904×947 (figure y418 + height454,55 =872,55 <946), bản mới GREEN ở1904×947,1920×1080,1440×1000,1280×900,768×900,375×667,320×568,667×375. Không tràn ngang, chữ200%/logo/CTA diagnosis-diseases vẫn đạt, page errors rỗng; đã xem screenshot1904. Script/evidence ignored `.cache/landing-2026-10-20/verify_full_height_home.py`, `full-height-home-verification.json`, `home-full-height-*.png`. Chưa commit/push/CI/Safari/thiết bị thật/backend E2E. Dưới đây là lịch sử.

## Lịch sử lượt95 — Xóa ba dòng phụ và thay logo lá do người dùng gửi

Theo ba screenshot đánh dấu, xóa nhãn “Phân loại bệnh lá cây từ ảnh”, mô tả “Chọn một ảnh lá rõ nét…” và hướng dẫn phía phải trên ảnh “Chụp rõ bề mặt lá…” trong HomeLandingHero. Giữ heading,2 CTA và caption trái. Bỏ margin đầu của h1 để khoảng trống sau nhãn không còn. Cập nhật test hero khẳng định3 dòng không được render; RED trước sửa/GREEN sau.

Người dùng yêu cầu đổi logo sang ảnh lá mới: thay nguyên byte `frontend/public/images/logo.png` bằng `Screenshot 2026-10-20 155649.png` (404×341,129929 byte), không chỉnh hình/màu/crop. SHA256 **FE012E9ACF126B402953AC271FD8E1ABC801387BF1A1B969C981FD8362479237** trùng file cung cấp. Vì logo dùng chung đường dẫn này, Navbar/Intro/login/loading/admin và fallback ảnh catalog hiện có cùng dùng logo mới; không sửa source/luồng của các nơi đó. Đây là thay asset logo được người dùng yêu cầu trực tiếp, không thay Design System/global CSS/shared component code. Backup logo cũ chỉ ở ignored `.cache/landing-2026-10-20/logo-before-leaf.png`.

Fresh targeted `corepack pnpm test tests/component/home tests/component/views/HomePage.test.tsx tests/component/layout/Navbar.test.tsx tests/component/modals/LoginModal.test.tsx tests/component/common/SeedlingLoadingScreen.test.tsx tests/component/views/IntroPage.test.tsx --pool=forks --maxWorkers=2` bắt đầu16:03:02 đạt **23/23 test,6 tệp,6,70s**. Typecheck/lint170 tệp/Biome2 tệp đạt. Không chạy lại full coverage cho text/asset;227/227 lượt94 là lịch sử. Production build compile6,2s/TypeScript888ms,11 trang tĩnh/hai route động đạt; chỉ recreate frontendlocalhost3000.

Chromium/API fixture: raw `/images/logo.png` trùng hash file được cung cấp, header logo mới tải thật; hero chỉ còn1 p caption trái,3 dòng đã gỡ.7 kích thước320–1920/landscape/chữ200% không tràn ngang, heading giữa/CTA diagnose-diseases đúng; page errors rỗng. Đã xem desktop. Evidence ignored `.cache/landing-2026-10-20/verify_leaf_logo.py`, `leaf-logo-verification.json`, `home-leaf-logo-*.png`.49 tệp bảo vệ source SHA không đổi. Chưa commit/push/CI hoặc chứng nhận Safari/thiết bị thật/backend E2E. Dưới đây là lịch sử.

## Lịch sử lượt94 — Thay toàn bộ hero Home theo bố cục ảnh tham khảo

Người dùng xác nhận thay phần đầu HomePage `/home`, xóa toàn bộ hiệu ứng landing cũ và làm theo screenshot tiêu đề giữa/ảnh nông nghiệp rộng. Thêm `frontend/src/components/home/HomeLandingHero.tsx`, HomePage gọi hero mới thay HomeMotionHero. Giữ Navbar/footer/mobile navigation, CTA diagnose/diseases và hai section hướng dẫn chụp/chọn cây phía dưới. Intro không đổi.

- Hero mới dùng logo/font/theme hiện có, nhãn phân loại lá, tiêu đề60px desktop/36px mobile căn giữa, mô tả và2 nút. Dùng ảnh đồi chè thật có sẵn từ CROP_PHOTOS, khung rộng phía dưới, chuyển tiếp ảnh–nền bằng các semantic token và caption ở mép dưới. Không lấy thương hiệu, ảnh sân golf hoặc copy của mẫu; không thêm asset/dependency/token. Hero không có animation chủ động, overlay tương tác hay tỷ lệ tiến trình giả.
- Xóa5 source chỉ dùng cho Home cũ: HomeMotionHero, HomePhotoPreview, HomePointerTrail, HomeWatermark, HomeBannerFoliage; xóa5 test file tương ứng (36 ca kiểm tra tính năng đã bị loại bỏ). Không xóa GSAP/ảnh cây/shared CSS vì còn dùng ở các phần khác. Không còn import/reference5 component trong src/tests. Không thay shared/global/design/provider/service;49 tệp bảo vệ SHA vẫn nguyên và Intro byte-identical snapshot đầu landing.
- Thêm2 ca tại `frontend/tests/component/home/HomeLandingHero.test.tsx` về nội dung/1 ảnh/không hiệu ứng cũ và callback CTA. Sửa ca nội dung ở `tests/component/views/HomePage.test.tsx` cho region mới, giữ kiểm tra navigation/chọn cây. RED trước triển khai, GREEN sau. Cập nhật tests/README.md đúng nhóm home.
- Fresh full `corepack pnpm test:coverage --pool=forks --maxWorkers=2` bắt đầu15:47:51 đạt **227/227 test,37 tệp,54,19s**; branch **968/1542=62,77%**, giữ floor60%. Hero mới không có nhánh điều kiện (0/0=100% trong báo cáo), không diễn giải thành độ phủ mọi đường đi toàn app; HomePage branch vẫn50%, chưa target80%. Nguồn `.cache/coverage/frontend/coverage-summary.json`. Số test261 của lượt93 là lịch sử, không so sánh như cùng một scope chức năng. Typecheck/lint170 tệp/Biome format4 tệp đạt.
- Production build compile5,4s/TypeScript1425ms,11 trang tĩnh/hai route động đạt; chỉ recreate frontendlocalhost3000. Chromium production/API fixture:1920×1080,1440×1000,1280×900,768×900,375×667,320×568,667×375 không tràn ngang; heading giữa, CTA trong viewport theo chiều ngang, ảnh tải thật.375px/chữ200% không tràn ngang (shared header/mobile nav vẫn nguyên, không chứng nhận audit trợ năng tổng thể). Reduced motion đọc được nội dung; CTA đi đúng `/diagnose` và `/diseases`; không còn rail/canvas/watermark/foliage/preview trên Home, page errors rỗng. Đã xem ảnh desktop/mobile/chữ200%. Evidence ignored `.cache/landing-2026-10-20/verify_centered_home.py`, `centered-home-verification.json`, `home-centered-*.png`.

Chưa commit/push/PR/Jira/CI hoặc chứng nhận Safari/thiết bị thật/Core Web Vitals/backend E2E. Các lượt dưới là lịch sử đã được thay thế, không phải UI Home hiện hành.

## Lịch sử lượt93 — Khôi phục cây động trên ảnh banner Home

Người dùng yêu cầu đưa lại cây động trên banner. Tái sử dụng `BANNER_FOLIAGE` và `RICE_LEAF` hiện có trong component mới `frontend/src/components/home/HomeBannerFoliage.tsx`, gắn vào cả5 figure HomeMotionHero và ảnh mở lớn HomePhotoPreview qua cropId của selection. Lúa/cà chua/ngô/cà phê/chè dùng đúng ảnh cây tách nền tương ứng; lúa có thêm2 lá trôi. Giữ ảnh nền gốc, lớp cây ở góc phải dưới, decorative aria-hidden/inert/pointer-events-none; không chặn bấm/kéo và không coi artwork là ảnh tham chiếu bệnh. Không sửa shared/global/design hoặc thêm asset/dependency.

- GSAP sway hai chiều dùng token angle/duration/drift có sẵn. Pause theo gallery Space, preview mở (dừng các card phía sau), IntersectionObserver và hidden tab. Preview có chuyển động riêng; reduced motion giữ cây tĩnh. Cleanup observers/listeners/tweens; lỗi tải artwork ẩn riêng ảnh trang trí. Không tạo tween cho danh sách lá rỗng.
- Thêm **8 ca** tại `frontend/tests/component/home/HomeBannerFoliage.test.tsx`: đúng asset của5 loại cây, pause/resume, reduced/error, offscreen/hidden/cleanup. RED trước khi có component; sửa kỳ vọng asset do Vitest import ảnh trả string trong khi Next build trả StaticImageData, rồi GREEN. Fresh full `corepack pnpm test:coverage --pool=forks --maxWorkers=2` bắt đầu15:15:24 đạt **261/261 test,41 tệp,78,88s**; branch **1112/1787=62,22%**, component mới **23/24=95,83%**. Nguồn `.cache/coverage/frontend/coverage-summary.json`; không đổi threshold/exclusion.
- Một lượt focused trước full có test flip cũ bị lệch thời điểm (poll bỏ qua peak ngắn khi CPU bận). Sau full pass, ổn định2 test trong HomePhotoPreview.test.tsx bằng seek/progress timeline GSAP thật tới peak/end trong act, không mock animation hoặc tăng timeout. Fresh focused sau sửa test **39/39 test,6 tệp,7,22s** lúc15:19:24; không coi full261 là chạy sau sửa test này. Typecheck/lint178 tệp/Biome đạt. Production build compile10,2s/TypeScript3,6s,11 trang tĩnh/hai route động đạt; chỉ recreate frontendlocalhost3000.
- Chromium production/API fixture:5 lớp cây/2 lá lúa, asset tải thật, transform cây thay đổi theo thời gian; Space dừng/phục hồi. Preview có đúng1 lớp cây; hồi quy click mở/click đóng/X/Escape/bấm nền/interrupt/flip/drag không mở/responsive320–667/reduced motion/vệt chấm/autoplay-focus đạt; page errors rỗng. Đã xem screenshot desktop. Evidence ignored `.cache/landing-2026-10-20/verify_banner_foliage.py`, `home-banner-foliage-desktop.png`, `preview-verification.json`.

SHA49 tệp bảo vệ không đổi; chưa commit/push/PR/Jira/CI, chưa chứng nhận Safari/thiết bị thật/FPS/Core Web Vitals/backend E2E. Dưới đây là lịch sử.

## Lịch sử lượt92 — Tăng cường độ biến dạng chữ

Theo phản hồi hiệu ứng quá nhẹ, chỉ chỉnh HomeWatermark: biên độ dịch Y nhân3, stretch tối đa52% thay16%, radius từ9 lên12 lần token drift-distance; thời lượng phản hồi bằng65% token entrance hiện có. Giữ màu/font/gate media/cleanup và phần chữ ở xa. Không đổi global/shared/design/dependency.

Cập nhật test cũ tại `frontend/tests/component/home/HomeWatermark.test.tsx` yêu cầu stretch>1,3 và lát gần dịchY>20px; RED trên mức cũ1,1576, GREEN sau sửa. Fresh focused Home **31/31 test,5 tệp,5,82s** lúc15:07:05; typecheck/lint176 tệp/Biome đạt. Production build compile4,0s/TypeScript849ms,11 trang tĩnh/hai route động đạt; chỉ recreate frontendlocalhost3000. Không chạy lại full coverage cho đổi biên độ; full253 lượt91 là lịch sử.

Chromium fixture đo stretch khoảng1,4544 tại thời điểm chụp, lát xa giữ1; rời chuột phục hồi, reduced motion không biến dạng; page errors rỗng. Đã xem `home-watermark-strong.png`; script ignored `.cache/landing-2026-10-20/verify_watermark_strong.py`, kết quả `watermark-distortion-verification.json`. Chưa commit/push/CI hoặc chứng nhận Safari/thiết bị thật/FPS/backend E2E. Dưới đây là lịch sử.

## Lịch sử lượt91 — Chữ AgriAI biến dạng cục bộ theo chuột

Người dùng yêu cầu con trỏ đi vào chữ nền phải làm biến dạng chữ. Thêm `frontend/src/components/home/HomeWatermark.tsx`, thay riêng span watermark của HomeMotionHero. Giữ font/màu/cỡ26vw và drift hiện có; dựng48 lát chữ bị clip ngang, GSAP quickTo dịch Y/giãn Y từng lát theo khoảng cách con trỏ. Vùng gần chuột uốn/giãn, vùng xa giữ nguyên; rời rail trả hình chữ về trạng thái gốc. Chừa khoảng trên/dưới cho nét g và lúc uốn để không bị cắt. Không dùng ảnh/logo khác, không sửa shared/global/design hoặc thêm dependency. Lớp trang trí aria-hidden/pointer-events-none; chỉ bật hover/fine/no-reduced-motion, bỏ touch. Cleanup handlers/tweens qua GSAP matchMedia/context; không setState mỗi frame. Vệt chấm của lượt90 vẫn giữ nguyên.

Thêm3 test đúng `frontend/tests/component/home/HomeWatermark.test.tsx`: biến dạng gần con trỏ/xa không đổi/rời phục hồi, không biến dạng khi reduced/coarse, bỏ touch. RED trước khi có component, GREEN sau. Fresh full `corepack pnpm test:coverage --pool=forks --maxWorkers=2` bắt đầu14:58:53 đạt **253/253 test,40 tệp,54,37s**, branch toàn frontend **1085/1759=61,68%**, watermark **13/15=86,66%**. Không chỉnh gate/exclusion; không suy diễn mọi component đạt80%. Nguồn `.cache/coverage/frontend/coverage-summary.json`. Typecheck/lint176 tệp/Biome đạt. Sau sửa khoảng nét g chỉ chạy lại3/3 focused tests lúc15:01:21 và final build/browser; full253 ở trên chạy trước sửa style này, không ghi thành full run mới.

Production build cuối đạt,11 trang tĩnh/hai route động; chỉ recreate frontendlocalhost3000. Chromium/API fixture xác nhận lát giữa scaleY>1,04 khi rê chuột, lát đầu xa vẫn1; ra ngoài về1, reduced motion đứng yên. Đã xem screenshot biến dạng/phục hồi và sửa clipping đuôi g. Trước sửa style cuối, hồi quy vệt chấm, mở/click đóng/X/Escape/bấm nền/interrupt/drag không mở/focus-autoplay/responsive/flip đều đạt; sau style cuối kiểm tra lại riêng chữ đạt. Page errors rỗng. Evidence ignored `.cache/landing-2026-10-20/verify_watermark_distortion.py`, `verify_watermark_final.py`, `watermark-distortion-verification.json`, `home-watermark-distorted.png`, `home-watermark-restored.png`.

SHA49 tệp bảo vệ không đổi; không commit/push/CI/PR/Jira. Chưa xác minh Safari/thiết bị thật/FPS/Core Web Vitals/backend E2E; đây là uốn chữ bằng lát DOM, không phải shader/WebGL của reference. Dưới đây là lịch sử.

## Lịch sử lượt90 — Vệt chấm nền theo con trỏ

Đã xem video `Screen Recording 2026-10-20 144207.mp4` (12,8666s,1772×912) qua16 frame và một frame lớn: vùng chấm halftone mờ theo đường chuột. Thêm riêng `frontend/src/components/home/HomePointerTrail.tsx`, gắn trong HomeMotionHero phía sau ảnh/chữ; không sửa shared/global/design. Canvas trong lớp trang trí inert/aria-hidden/pointer-events-none; dùng màu `foreground/10` hiện có, không thêm màu/dependency/asset. Home vẫn dùng nền thống nhất từ lượt89.

- Hiệu ứng vẽ các chấm tròn trên lưới18px quanh mẫu con trỏ, bán kính90px, tự tan trong850ms. Giới hạn24 mẫu và DPR1,5; chỉ requestAnimationFrame khi còn mẫu sống, một frame dùng chung cho các pointer event liên tiếp. Thu hẹp vùng quét theo bounds của vệt. Chỉ mouse/fine pointer/no-preference được vẽ; reduced motion/coarse/touch bỏ hiệu ứng. Resize/ẩn tab/đổi media/unmount xóa vệt, hủy frame và cleanup observers/listeners. Không có React state cập nhật mỗi frame.
- Test ở `frontend/tests/component/home/HomePointerTrail.test.tsx`, dùng canvas/media/clock/frame boundary doubles và sự kiện chuột thật trong Testing Library: vẽ/tan/dừng frame, không vẽ khi reduced/coarse/touch, đổi media, unmount, ẩn tab, context không có và gộp nhiều pointer event. RED ban đầu do chưa có component; test sau khi thêm wrapper trợ năng đã phát hiện listener bám nhầm wrapper inert, sửa sang host Home rồi GREEN.
- Typecheck/lint174 tệp/Biome check đạt. Final production build compile5,0s/TypeScript1314ms,11 trang tĩnh/hai route động đạt; chỉ recreate frontendlocalhost3000. Kết quả full mới nhất bổ sung dưới đây, các lần chạy cũ không được tính là bằng chứng mới.
- Fresh full `corepack pnpm test:coverage --pool=forks --maxWorkers=2` bắt đầu **14:52:46**, đạt **250/250 test,39 tệp,47,67s**. Branch toàn frontend **1072/1744=61,46%**, vượt floor60%; HomePointerTrail **26/28=92,85%**, đạt target80% cho component mới này. Không hạ gate/exclusion; các component khác không mặc nhiên đạt80%. Nguồn `.cache/coverage/frontend/coverage-summary.json`. Có8 test mới cho trail. Các lần trước245 test có2 lỗi listener,247/249 test đạt là lịch sử trong cùng lượt; kết quả250 là trạng thái cuối.
- Chromium production/API fixture đo canvas có pixel sau di chuột, về0 sau khi vệt hết tuổi; reduced motion/touch không vẽ. Đã xem screenshot vệt nền. Hồi quy click mở/click đóng/Escape/X/bấm nền/interrupt/autoplay-focus/drag không mở/responsive320–667 và cả hai nhịp flip đạt; page errors rỗng. Script/evidence ignored `.cache/landing-2026-10-20/verify_pointer_trail.py`, `home-pointer-trail.png`, `preview-verification.json`, `video-144207-contact.png`, `video-144207-detail.png`.

SHA49 tệp bảo vệ không đổi; chỉ thay component Home/test/tài liệu. Chưa commit/push/PR/Jira/CI hoặc chứng nhận Safari/thiết bị thật/FPS/Core Web Vitals/backend E2E. Không tuyên bố bản sao shader/WebGL của reference. Các lượt dưới là lịch sử.

## Lịch sử lượt89 — Đồng bộ màu nền Home với khung trang

Theo screenshot, đường chia màu do HomeMotionHero dùng `bg-surface` trong khi AppShell dùng `bg-background`. Chỉ đổi class nền của `frontend/src/components/home/HomeMotionHero.tsx` sang token `bg-background` hiện có. Không sửa Navbar/AppShell/Design System/global CSS; giữ nguyên ảnh/chuyển động/chức năng.

Fresh focused Home tests **20/20 test,3 tệp,5,26s**, bắt đầu14:39:51; Biome check2 tệp đạt. Lần chạy song song build ban đầu có1 test reduced motion không ổn định: zero-duration GSAP tween đã ẩn frame nhưng onComplete cập nhật React ở tick kế tiếp. Sửa test tại `tests/component/home/HomePhotoPreview.test.tsx` kiểm tra mọi tween duration0 và chờ dialog unmount; không nới thời lượng hoặc đổi production animation. Sau sửa đạt; không thêm test chỉ soi class CSS. Build compile5,2s/TypeScript2,5s,11 trang tĩnh/hai route động đạt; chỉ recreate frontendlocalhost3000. Không chạy lại full coverage; full lượt84 là lịch sử.

Chromium production/API fixture đo computed background Home và AppShell đều **rgb(244,242,234)** ở1920×1080 và375×667; đã xem screenshot desktop, page errors rỗng. Script ignored `.cache/landing-2026-10-20/verify_unified_background.py`, `unified-background-verification.json`, `home-unified-background-*.png`. Chưa commit/push/CI hoặc chứng nhận Safari/thiết bị thật; dưới đây là lịch sử.

## Lịch sử lượt88 — Lật ngang nhẹ khi thu ảnh

Theo yêu cầu, sửa riêng `frontend/src/components/home/HomePhotoPreview.tsx`: exit timeline thu vị trí/scale như cũ, đồng thời nghiêng phối cảnh ngang nhẹ trong40% đầu, rồi khớp góc gốc của ảnh ở60% cuối. Chiều nghiêng đối ứng với entrance và lấy cùng token/biên độ/thời lượng; áp dụng cho click ảnh/X/Escape/bấm nền qua một luồng đóng. Reduced motion đóng tức thì; giữ cleanup, chống gọi đóng lặp và autoplay.

Thêm2 ca trong `frontend/tests/component/home/HomePhotoPreview.test.tsx`: chờ entrance hoàn tất rồi xác nhận return có rotationY và phục hồi source; reduced motion đóng tức thì. Test ban đầu đã bắt nhầm tilt của entrance, được sửa để chờ entrance thực sự chạy/kết thúc; sau đó xác nhận RED trước triển khai exit, GREEN sau. Fresh targeted **20/20 test,3 tệp,5,36s**, bắt đầu14:33:22; typecheck/lint172 tệp và Biome check/format2 tệp đạt. Build compile4,4s/TypeScript960ms,11 trang tĩnh/hai route động đạt; cập nhật riêng frontendlocalhost3000. Không chạy lại full coverage; kết quả full lượt84 là lịch sử.

Chromium production/API fixture: return matrix có nghiêng ngang khi thu, kết thúc trả ảnh về dải; screenshot giữa exit đã xem. Hồi quy entrance/click đóng/Escape/X/bấm nền/interrupt/autoplay-focus/drag không mở/responsive320–667/reduced motion đạt; page errors rỗng. Evidence ignored `.cache/landing-2026-10-20/verify_preview_return_flip.py`, `preview-return-flip.png`, `preview-verification.json`. SHA49 tệp bảo vệ không đổi; không sửa shared/global/design/dependency. Chưa commit/push/CI hoặc chứng nhận Safari/thiết bị thật/FPS/backend E2E. Dưới đây là lịch sử.

## Lịch sử lượt87 — Lật chéo nhẹ khi mở ảnh

Đã xem video `Screen Recording 2026-10-20 142448.mp4` (8,2333s,874×608), giải mã16 frame qua localhost HTTP range để quan sát phối cảnh lúc mở/thu. Theo yêu cầu chỉ thêm một nhịp nghiêng nhẹ khi mở trong `frontend/src/components/home/HomePhotoPreview.tsx`: GSAP timeline giữ flight vị trí/scale hiện có, nghiêng X/Y/Z ở40% đầu rồi trở về phẳng ở60% còn lại. Biên độ lấy token drift rotation hiện có, chiều nghiêng theo vị trí nguồn; không lật180 độ hoặc giữ nghiêng lúc xem. Khi đóng giữa entrance, rotationX cũng về0 cùng target nguồn. Reduced motion bỏ toàn bộ tilt; không thêm dependency hoặc sửa shared/global/design.

Thêm2 ca tại `frontend/tests/component/home/HomePhotoPreview.test.tsx`: kiểm tra X/Y có nghiêng trong entrance rồi cả ba trục về0; reduced motion không nghiêng. Test motion mới RED trước triển khai, GREEN sau. Fresh focused Home/Hero/Preview **18/18 test,3 tệp,3,94s**, bắt đầu14:28:41; typecheck/lint172 tệp và Biome check/format2 tệp đạt. Final production build compile3,8s/TypeScript730ms,11 trang tĩnh/hai route động đạt; chỉ recreate frontendlocalhost3000. Không chạy lại full coverage/build ngoài phạm vi này; số236/236 và coverage lượt84 là lịch sử.

Chromium production/API fixture: đo matrix có đồng thời X/Y tilt lúc mở, sau entrance trở phẳng; đã xem screenshot giữa flight. Hồi quy click mở/bấm ảnh đóng/Escape/X/bấm nền/đóng giữa entrance/autoplay-focus/drag không mở/responsive320–667/reduced motion đạt; page errors rỗng. Script/evidence ignored `.cache/landing-2026-10-20/verify_preview_diagonal.py`, `preview-diagonal-flight.png`, `preview-verification.json`, `video-142448-contact.png`. SHA49 tệp bảo vệ không đổi. Chưa commit/push/CI hoặc chứng nhận Safari/thiết bị thật/FPS/backend E2E. Các lượt dưới là lịch sử.

## Lịch sử lượt86 — Bấm lại ảnh lớn để thu về dải

Theo yêu cầu, `frontend/src/components/home/HomePhotoPreview.tsx` bọc riêng ảnh bằng native button có tên trợ năng “Thu ảnh về dải”, cursor zoom-out và focus-visible; nút X là sibling, không lồng button. Bấm ảnh gọi cùng luồng thu về hiện có; giữ X/Escape/bấm nền và cleanup/autoplay. Cập nhật hướng dẫn trợ năng. Không sửa shared/global CSS/Design System hoặc thêm dependency.

Thêm2 ca trong `frontend/tests/component/home/HomePhotoPreview.test.tsx`: click ảnh đóng và phục hồi source với motion thường/reduced motion. Đã xác nhận2 ca RED trước triển khai; sau sửa, fresh focused Home/Hero/Preview **16/16 test,3 tệp,3,86s**, bắt đầu14:21:22. Typecheck, lint172 tệp, Biome check/format2 tệp đạt. Production build compile5,1s/TypeScript948ms,11 trang tĩnh/hai route động đạt; chỉ recreate frontendlocalhost3000. Không chạy lại full coverage vì handler mới dùng lại lifecycle đã kiểm tra; số236/236 và coverage lượt84 là lịch sử.

Chromium production/API fixture: click ảnh lớn để thu về đạt ở1920×1080 và375×667, cả motion thường/reduced. Hồi quy click mở/Escape/X/bấm nền/đóng giữa entrance/drag không mở/autoplay-focus/responsive320–667 đạt; page errors rỗng. Script cục bộ ignored `.cache/landing-2026-10-20/verify_preview_click_again.py`, kết quả `preview-verification.json`. Chưa xác minh Safari/thiết bị thật/CI/FPS/backend E2E. Chưa commit/push. Các lượt dưới là lịch sử.

## Lịch sử lượt85 — Đặt test đúng nhóm component

Chuyển test từ `frontend/tests/component/views/` sang `frontend/tests/component/home/HomeMotionHero.test.tsx` và `HomePhotoPreview.test.tsx` để khớp `src/components/home/`. Hero test render trực tiếp HomeMotionHero, không dựng cả HomePage. Ca kiểm tra nội dung/section gốc của Home chuyển về `tests/component/views/HomePage.test.tsx`; không bỏ test. Bổ sung nhánh `home/` trong `frontend/tests/README.md`. Không sửa production source hoặc cấu hình discovery.

Kiểm chứng mới: `corepack pnpm test tests/component/home tests/component/views/HomePage.test.tsx --pool=forks --maxWorkers=2` bắt đầu14:15:21 đạt **14/14 test,3 tệp,4,21s**; typecheck và Biome check/format ba tệp đạt. Không chạy lại full coverage/build cho việc phân loại test;236/236 và coverage lượt84 là bằng chứng lịch sử. Chưa commit/push. Các mục dưới giữ lịch sử và đường dẫn tại thời điểm chạy.

## Lịch sử lượt84 — Mở và thu ảnh về dải theo video

Người dùng xác nhận bấm ảnh để mở lớn, nền phía sau mờ đi; bấm ra ngoài hoặc Escape để thu ảnh về. Đã xem video `Screen Recording 2026-10-20 134916.mp4` (3,1 giây) bằng các frame trích cục bộ. Chỉ sửa `frontend/src/components/home/HomeMotionHero.tsx`, thêm `HomePhotoPreview.tsx`, test Home tương ứng và tài liệu này. Tái sử dụng DialogContent/Button, GSAP và token hiện có; không sửa nguồn shared component hoặc thêm dependency.

- Bấm nhanh ảnh hoặc Enter mở đúng ảnh đang chọn từ vị trí/scale/góc hiện tại ra giữa màn hình. Đóng bằng X, Escape hoặc bấm nền thì ảnh thu về vị trí gốc. Dải tự chạy tạm dừng trong lúc mở và tiếp tục sau khi đóng nếu không bị pause thủ công/offscreen/ẩn tab. Giữ kéo-thu nhỏ; kéo hoặc giữ lâu không bị hiểu nhầm là bấm mở ảnh. Modal giữ focus bên trong và trả focus về vùng ảnh khi đóng.
- Nền mờ dùng màu `surface` hiện có; frame giữ tỉ lệ 4:3 và giới hạn đồng thời theo chiều rộng/cao viewport. Reduced motion mở/đóng tức thì. Cleanup khi unmount phục hồi opacity ảnh gốc, hủy animation/listeners theo GSAP context. Test mới đã phát hiện ảnh gốc còn ẩn khi rời trang giữa lúc mở; sửa cleanup và chạy hồi quy đạt.
- Thêm **9 test**: Enter/Escape đúng ảnh trong Home; 8 ca preview gồm nút đóng, reduced motion, đóng giữa entrance/lặp Escape, source đã bị gỡ/không còn source, bấm nền và unmount. Dùng GSAP thật với browser media/layout boundary của jsdom; không thay implementation bằng mock toàn bộ animation. RED trước khi thêm mở ảnh; test cleanup mới RED trước sửa, GREEN sau.
- Fresh full `corepack pnpm test:coverage --pool=forks --maxWorkers=2` bắt đầu **14:09:24**, đạt **236/236 test, 38 tệp, 72,77s**. Branch toàn frontend **1038/1706 = 60,84%**, đạt floor60%; preview **46/49 = 93,87%**. Lần đầu 228 test đạt nhưng coverage58,81% thất bại; bổ sung các ca lifecycle/edge thực tế rồi đạt, không hạ threshold/exclusion. HomeMotionHero vẫn chưa đạt target80% unit branch; browser không được cộng vào số đo unit.
- Typecheck, Biome lint172 tệp và format4 tệp đạt. Final production build compile5,2s/TypeScript1124ms, 11 trang tĩnh/hai route động đạt. Chỉ recreate frontend `localhost:3000`, không restart backend/DB.
- Chromium production với phiên/API fixture: click mở lớn, source ẩn, dải đứng yên; Escape thu về/khôi phục focus và autoplay; bấm nền/X/đóng giữa entrance đạt. Giữ-kéo không mở modal. Khung375×667,320×568,667×375 vừa viewport; reduced motion mở/đóng tức thì; page errors rỗng. Hồi quy drag riêng đạt: hold khoảng59,6% baseline, thả phục hồi, pointer capture ngoài khung, blur cancel; CDP touch kéo ngang/cuộn dọc đạt. Đã xem ảnh desktop/mobile. Một assert browser dựa trên sleep150ms không ổn định; chuyển sang chờ transform thu ảnh thực tế, chạy lại đạt. Evidence ignored `.cache/landing-2026-10-20/verify_preview.py`, `preview-verification.json`, `preview-*.png`, `verify_drag.py`, `drag-verification.json`; coverage tại `.cache/coverage/frontend/coverage-summary.json`.

SHA-256 của49 tệp bảo vệ giữ nguyên; Intro vẫn khớp snapshot trước lượt landing. Chưa commit/push/PR/Jira hoặc chứng nhận CI/Safari/thiết bị thật/FPS/backend E2E. Các lượt dưới là lịch sử.

## Lịch sử lượt83 — Kéo giữ thu nhỏ ảnh, bỏ cụm điều khiển

Người dùng yêu cầu xóa số đếm/nút trước–pause–sau và kéo giữ ảnh thu nhỏ theo screenshot. Chỉ sửa `frontend/src/components/home/HomeMotionHero.tsx` và `frontend/tests/component/views/HomeMotionHero.test.tsx` cùng tài liệu. Đã xóa hoàn toàn cụm điều khiển nhìn thấy; giữ trạng thái/hướng dẫn `sr-only` cho trợ năng, vùng ảnh có thể focus và dùng trái/phải để đổi ảnh, Space để pause/resume. Lint exception `noNoninteractiveTabindex` đặt đúng một dòng với lý do keyboard gallery, theo pattern hiện có của `CropFilmStrip`; không đổi rule/gate chung.

- Pointer down chụp vị trí hiện tại, ngừng autoplay và thu cả dải ảnh về60% bằng GSAP quickTo. Pointer capture giữ quyền nhận move/up ngoài khung; dịch ảnh theo chênh lệch tọa độ trên pitch ảnh gốc. Thả/cancel/lost capture/window blur trả về scale1 và tiếp tục autoplay nếu không bị pause thủ công/ẩn tab/offscreen. Không thêm dependency, timer cố định hoặc handler cập nhật React mỗi frame.
- Touch giữ `touch-action: pan-y`; khi hướng vuốt dọc rõ ràng thì hủy drag để browser cuộn trang. Reduced motion vẫn kéo được nhưng không thu/phóng hay autoplay. Cleanup đầy đủ listeners, pointer capture, cursor state và observers. Bỏ gọi focus bằng code trong pointerdown để kéo chuột không hiện viền keyboard; vẫn giữ focus-visible cho Tab.
- Cập nhật test cho yêu cầu mới:3/3 RED trước thay đổi, GREEN sau; focused Home/Hero5/5 đạt. Fresh full `corepack pnpm test:coverage --pool=forks --maxWorkers=2` bắt đầu13:45:36: **227/227 test,37 tệp,49.76s**, branch **985/1635=60.24%** vượt floor60%, chưa đạt target80% mỗi component; không hạ threshold/exclusion. Typecheck/lint170 tệp/format2 tệp đạt. Final production build compile4.4s/TypeScript762ms,11 trang tĩnh/hai route động đạt. Sau sửa focus một dòng, chạy lại lint/format/build/browser, không coi full suite trước đó là lần chạy mới.
- Chromium production dùng phiên/API fixture: giữ ảnh đo scale khoảng59% baseline, đứng yên trong hold, kéo300px làm ảnh đi cùng chiều hơn200px; thả phục hồi size và autoplay. Thả ngoài khung, blur-cancel, phím Space và reduced-motion drag đạt. CDP touch375×667: kéo ngang hoạt động, vuốt dọc vẫn cuộn trang và thoát drag, không tràn ngang; page errors rỗng. Đã xem ảnh held/moved/mobile và kiểm tra không bật focus-visible khi mouse drag. Evidence ignored `.cache/landing-2026-10-20/drag-verification.json`, `verify_drag.py`, `drag-*.png`; coverage JSON `.cache/coverage/frontend/coverage-summary.json`.

Giữ nguyên49 tệp bảo vệ Design System/global CSS/shared/providers/services, Intro vẫn khớp snapshot đầu lượt78; chỉ recreate frontend localhost3000. Chưa commit/push/PR/Jira, chưa xác minh Safari/thiết bị cảm ứng thật/CI/FPS hoặc backend E2E. Các lượt dưới là lịch sử.

## Lịch sử lượt82 — Chữ thương hiệu lớn phía sau ảnh

Người dùng yêu cầu nền sáng có tên website lớn như reference. Chỉ sửa `frontend/src/components/home/HomeMotionHero.tsx`: hero dùng token `surface` có sẵn (rgb251/250/246), lớp chữ “AgriAI” lớn26vw/font hiện có/màu `foreground`10%, nằm dưới ảnh qua z-index. Lớp trang trí `aria-hidden`, không bắt pointer, không chiếm layout. Chữ trôi nhẹ theo cùng phase autoplay/pointer với khoảng dịch lấy token `--banner-drift-distance`, dừng cùng pause/offscreen/tab-hidden và đứng yên trong reduced motion. Giữ ảnh, copy góc trái dưới và chức năng cũ; không sửa token/global CSS/Design System/shared components.

Fresh typecheck/lint170 tệp đạt; focused HomeMotionHero/Home **5/5 test,2 tệp,22.74s** đạt lúc13:31:31, không chạy lại full suite cho thay đổi trang trí này hoặc coi227 test lượt81 là kết quả mới. Format component đã chuẩn hóa. Production build compile4.7s/TypeScript1107ms,11 trang tĩnh/hai route động đạt; chỉ recreate frontend localhost3000. Chromium với phiên/API fixture: chữ hiện dưới ảnh, không chặn pointer; transform đổi theo autoplay, pause giữ nguyên và reduced motion đứng yên;1440/375/320px không tràn ngang, page errors rỗng. Đã xem ảnh desktop1920/mobile375; source evidence ignored `.cache/landing-2026-10-20/watermark-verification.json`, `verify_watermark.py`, `watermark-*.png`.

Không thay dependency/backend/Intro;49 tệp bảo vệ giữ nguyên. Chưa commit/push/PR/Jira, chưa chứng nhận CI/Safari/thiết bị thật/FPS hoặc bản sao shader reference. Các lượt dưới là lịch sử.

## Lịch sử lượt81 — Ảnh toàn khung tự chạy, chữ nhỏ góc trái dưới

Người dùng yêu cầu phóng ảnh như screenshot reference, tự chạy và tạm thu nhỏ khối tiêu đề/mô tả/CTA xuống góc trái dưới. Chỉ sửa `frontend/src/components/home/HomeMotionHero.tsx`, phần typography/spacing hero tại `frontend/src/views/HomePage.tsx`, test và tài liệu liên quan. Giữ các chức năng Home, Intro, Design System/global CSS/shared components và dependency hiện có.

- Hero desktop mở toàn chiều ngang, cao theo viewport trừ navbar; ảnh rộng34vw, các ảnh bên cạnh nghiêng/thu nhỏ theo độ sâu. Khối chữ tối đa `max-w-sm`, heading24–30px, mô tả14px và hai nút44px, ghim góc trái dưới trong hero. Trên mobile, chữ nằm dưới vùng ảnh trong luồng tự nhiên để không che nội dung; nút chuyển ảnh được tách xuống dưới ảnh.
- GSAP tween tuyến tính tự tiến32.5s qua năm ảnh (6.5s mỗi ảnh theo token `--banner-cycle-duration`); modulo nối vòng khi ảnh đã ngoài khung clip. `quickSetter` cập nhật transform, không tạo tween mỗi frame, React chỉ cập nhật khi ảnh chủ đổi. Giữ pointer nhẹ, nút trước/sau, phím trái/phải và thêm pause/resume; aria-live tắt khi tự chạy để không đọc liên tục.
- Tự ngừng bằng IntersectionObserver khi hero ra ngoài viewport và khi tab ẩn; reduced motion không autoplay/hover nhưng vẫn chuyển ảnh tức thời bằng nút/phím. Cleanup tween, media context, observers, visibility/pointer listeners; không kéo cuộn trang hoặc thêm thời gian loading.
- TDD pause/resume: thiếu nút gây RED, sau triển khai focused5/5 đạt. Fresh full `corepack pnpm test:coverage --pool=forks --maxWorkers=2` bắt đầu13:21:26: **227/227 test,37 tệp,48.00s**, branch **983/1589=61.86%** vượt floor60% giữ nguyên. Chưa đạt target80% mỗi component; phần motion xác minh thêm bằng browser. Sau điều chỉnh CSS responsive cuối, typecheck/lint170 tệp/format3 tệp đạt. Final build compile4.4s/TypeScript852ms,11 trang tĩnh/hai route động đạt; recreate riêng frontend localhost3000.
- Chromium production với phiên/API fixture: ảnh chuyển động không có input, pause giữ nguyên transform/resume chạy tiếp. Theo dõi **34s/208 mẫu**, không có dịch vị trí trên150px giữa hai mẫu khi ảnh vẫn trong viewport; đây là kiểm tra nối vòng, không phải chứng nhận FPS. 1920×1080 đo rail x0/rộng1920/cao984, copy x48/y821/rộng352/cao227, ảnh chủ khoảng637px. 1440/768/375/320px và320px/chữ200% không tràn ngang; offscreen pause, reduced-motion và keyboard đạt; page errors rỗng. Đã xem ảnh1920/1440/mobile và sửa nút mobile đè ảnh.
- Bằng chứng ignored `.cache/landing-2026-10-20/autoplay-verification.json`, `verify_autoplay.py`, `autoplay-*.png`; coverage JSON `.cache/coverage/frontend/coverage-summary.json`. Browser không ghi backend hoặc xác minh auth thật. SHA49 tệp bảo vệ không đổi; Intro vẫn khớp snapshot trước lượt78.
- Sau sửa controls mobile, kiểm tra cuối375×667/320×568/1440×1000 đạt: nút nằm dưới mép vùng ảnh ở mobile, copy desktop vẫn góc trái dưới, không overflow/page errors; đã xem ảnh mobile xác nhận. Evidence `autoplay-final-layout.json`, `autoplay-final-*.png`; không chạy lại full suite vì thay đổi cuối chỉ là vị trí CSS controls, static checks/build/browser đã chạy lại.

Đã triển khai demo tại `/home`, chưa commit/push/PR/Jira Done. Chưa chứng nhận CI/Safari/thiết bị thật/FPS hoặc bản sao shader WebGL chính xác. Các lượt dưới là lịch sử.

## Lịch sử lượt80 — Chỉ áp dụng hiệu ứng ảnh vào Home

Người dùng làm rõ chỉ cần hiệu ứng của website mẫu, không cần các section/thiết kế landing đã thêm. Đã gỡ bốn component `components/landing/` cùng showcase test tự tạo ở lượt78; phục hồi nội dung Home và Home test ban đầu. `HomePage.tsx` chỉ đổi import và wrapper hero từ `BotanicalBanner` sang component riêng `components/home/HomeMotionHero.tsx`. Giữ tiêu đề, copy, CTA Kiểm tra lá/Tra cứu bệnh, photo tips, bộ chọn cây/callback và toàn bộ Intro/AppShell.

Mở lại website mẫu trực tiếp bằng Chromium: HTTP200, đúng tiêu đề, quan sát trước/sau di chuột trái/phải và cuộn650px. Ảnh hero dịch ngang, nghiêng, thay đổi kích thước/vị trí để tạo chiều sâu; có bốn canvas trong DOM. Tool đọc web trả lỗi truy cập nên dùng browser thật; không suy diễn từ lỗi đó rằng website không mở được. Evidence cục bộ `motion-reference.json`, `motion-reference-{start,left,right,scroll}.png`. Không sao chép ảnh hoặc mã nguồn của reference.

Component Home mới dùng năm ảnh cây trồng sẵn có, GSAP quickTo cho x/yPercent, scaleX/Y, rotation/rotationY, perspective và scrub cuộn nhẹ; không auto-scroll/hijack trang. Chỉ fine pointer có hover; nút trước/sau và phím trái/phải hoạt động trên touch/bàn phím. Reduced motion bỏ pointer/parallax, chuyển ảnh tức thời. Cleanup matchMedia, tween, ScrollTrigger, pointer listeners và ResizeObserver. Tái sử dụng token/màu/font/radius; không đổi global CSS, Design System, shared component, backend hoặc dependency. Đây là tái hiện bằng DOM transforms trong hero AgriAI, chưa phải bản sao WebGL/shader chính xác hoặc toàn bộ website mẫu.

Kiểm chứng: hai test mới RED trước khi có rail, GREEN sau triển khai; full226/226 tests,37 tệp,72.44s, branch977/1576=61.99%>=floor60% (lần chạy13:05:34). Sau sửa semantic fieldset và alias scale, chạy lại focused Home/Intro; nhánh motion chủ yếu kiểm chứng bằng browser, chưa đạt target unit branch80% mỗi component. Fresh lint170 tệp/typecheck/format đạt. Final production build compile4.3s/TypeScript893ms,11 trang tĩnh/hai route động đạt; chỉ recreate frontend localhost3000. Browser script phát hiện scale alias không hoạt động như dự kiến, chuyển quickTo sang scaleX/Y thay vì scale; không hạ assertion kiểm tra depth.

Browser API/phiên dùng fixture cục bộ, không đăng nhập thật hoặc ghi backend. Artifact ở ignored `.cache/landing-2026-10-20/motion-home-*`; không đưa ảnh/script/cache vào Git. SHA49 tệp được bảo vệ giữ nguyên, Intro vẫn khớp snapshot trước lượt78. Chưa commit/push/PR/Jira Done, chưa chứng nhận shader tương đương, FPS60, Safari/thiết bị thật/CI/backend E2E.

Final focused **8/8** đạt lúc13:09:59,10.14s. Browser bản cuối xác nhận ảnh chủ ở giữa khi chưa di chuột; hover giảm kích thước thật và thay đổi matrix3d trái/phải; next/previous đổi rồi khôi phục ảnh, bốn viewport320–1440px và320px/chữ200% không tràn ngang; reduced motion không phản ứng pointer nhưng phím chuyển ảnh tức thời; CTA cũ vào `/diagnose`; page errors rỗng. Đã xem ảnh desktop hai hướng/mobile và ảnh xác nhận sau sửa depth. JSON `motion-home-verification.json` ghi số đo transform thật.

## Lịch sử lượt79 — Chuyển sang Home theo yêu cầu sửa phạm vi

Người dùng xác nhận trải nghiệm phải nằm tại **`/home` sau đăng nhập**, không phải trang giới thiệu `/`. Lượt78 bên dưới là lịch sử triển khai nhầm đích; kết quả kiểm chứng của lượt78 không được coi là kiểm chứng mới cho Home.

- `frontend/src/views/HomePage.tsx` nhận hero/showcase/story/map/preview và scoped GSAP từ lượt78. Vẫn dùng Navbar/footer/mobile navigation của AppShell hiện có; không thêm header/footer công khai hoặc nút đăng ký vào Home.
- Bốn component mới trong `frontend/src/components/landing/` được dùng riêng bởi Home. Hero giữ tiêu đề Home “Hiểu từng chiếc lá. Giữ trọn mùa xanh.” cùng Kiểm tra lá/Tra cứu bệnh. CTA ở ba slide mở `/diagnose`, `/plants`, `/history`; CTA preview mở `/diagnose`. Giữ photo tips, chọn cây và callback mở cây trước đó của Home.
- `IntroPage.tsx` đã khôi phục **khớp byte** với `.cache/landing-2026-10-20/IntroPage.before.tsx` lưu trước lượt78, giữ các sửa responsive/map/dải phim từ trước. Hoàn nguyên riêng các kỳ vọng IntroPage test đã đổi ở lượt78. Browser xác nhận trang công khai trở lại hero bản đồ, không có showcase/preview mới.
- Test hồi quy mới ở `frontend/tests/component/views/HomePage.test.tsx`: RED vì Home chưa có showcase, GREEN sau chuyển trang; xác nhận bốn CTA mở đúng callback và không có Tạo tài khoản. Focused Home/Intro/showcase **9/9** đạt. Full `corepack pnpm test:coverage --pool=forks --maxWorkers=2` bắt đầu **12:55:43**, đạt **227/227 test, 37 tệp, 72.40s**; branch **986/1585=62.20%**, giữ floor60%. Home branch36%, target80% mỗi component chưa đạt; không thay threshold/exclusion.
- Fresh typecheck, lint173 tệp và format8 tệp đạt. Docker frontend build đạt: compile5.4s, TypeScript1043ms,11 trang tĩnh/hai route động. Chỉ recreate frontend localhost3000 với `--no-deps`.
- Chromium Home **1440×1000,768×900,375×667,320×568**: không tràn ngang tại showcase/story/map/preview/guide; ca375px chữ200% đạt. Slide3 cập nhật aria-current; map mở/đóng và source tab mới đạt. Bốn CTA thực sự điều hướng đến route đích, không mở auth dialog. Reduced motion bỏ transform ảnh, Enter chọn slide đạt; page errors rỗng. Đã xem ảnh Home desktop/mobile/showcase và Intro được khôi phục.
- Browser dùng phiên User và phản hồi `/api/auth/me`, catalog, lịch sử **fixture cục bộ** để xác minh UI/routing; không đăng nhập thật hoặc ghi dữ liệu vào backend. Lần đầu fixture lịch sử sai kiểu phân trang làm startup báo lỗi; sửa fixture đúng `items` rồi toàn bộ kiểm tra đạt, không sửa ứng dụng vì lỗi fixture. Bằng chứng ignored: `.cache/landing-2026-10-20/home-verification.json`, `verify_home.py`, `home-*.png`, `restored-intro.png`; coverage JSON ở `.cache/coverage/frontend/coverage-summary.json`.
- SHA49 tệp Design System/global/shared/providers/services không đổi so với snapshot đầu lượt78. Không thay dependency, backend, shared loading hoặc routing chung. Chưa commit/push/PR/Jira; chưa chứng nhận CI, Safari/thiết bị thật/FPS/Core Web Vitals hoặc backend E2E.

## Lịch sử lượt78 — Triển khai ở trang giới thiệu trước khi được sửa đích

Nhánh đã kiểm tra: `AGRI-57-frontend-summary`. Phạm vi do người dùng duyệt: landing hiện tại và component mới của landing; mọi sửa Design System, global CSS hoặc shared component cần được duyệt trước.

## Kết quả và phạm vi

- Viết lại `frontend/src/views/IntroPage.tsx`, tách bốn component trong `frontend/src/components/landing/`: `LandingHero`, `FeatureShowcase`, `TechnologyStory`, `ProductExperience`.
- Hero dùng logo, font Manrope, ảnh lúa và nội dung thương hiệu hiện có. Ba slide lớn trình bày phân loại, cẩm nang/vùng trồng và lịch sử; chọn trực tiếp hoặc nút trước/sau, cập nhật bước đang xem khi cuộn. Desktop xếp lớp sticky; mobile dùng luồng dọc tự nhiên, không giữ thanh chọn chiếm màn hình.
- Câu chuyện công nghệ giữ đúng phân loại ConvNeXt-Tiny và giới hạn tham khảo. Giữ một bản đồ tương tác cùng dải phim hiện có trong khu vực vùng trồng; nguồn bài viết tiếp tục mở tab mới. CTA vẫn gọi luồng đăng nhập/đăng ký hiện có.
- Preview tái sử dụng `DiagnosePage` ở trạng thái chưa chọn ảnh, có `inert`/`aria-hidden` và chú thích chỉ đọc; không thêm kết quả, phần trăm hoặc tính năng chưa tồn tại. Khung preview có containing block riêng để nội dung trợ năng của giao diện gốc không làm tràn document.
- Không thêm dependency, asset, route hay thay đổi backend. Không chỉnh shared loading trong lượt landing này: yêu cầu loading trong brief đụng shared component, nằm ngoài phạm vi được phép chỉnh. Entrance của landing dùng GSAP, không kéo dài thời gian chờ dữ liệu.

## Reference và Design System

Đã mở [website tham khảo](https://ilyamadzichynau.com/) bằng Chromium, HTTP 200, tiêu đề “Ilya Madzichynau — Product Designer”. Quan sát hero chữ lớn, header gọn, chuỗi project ảnh lớn và chuyển động khi cuộn sang phần giới thiệu. Áp dụng nhịp chữ/ảnh và cách kể chuyện tuần tự; không lấy asset hoặc bảng màu của website đó. Không chứng nhận mọi hiệu ứng hover/loading/mobile của reference đã được khảo sát.

Tái sử dụng màu semantic `background`, `surface`, `primary`, `border`, `muted-foreground`; radius `rounded-media`, Button hiện có và spacing/typography utilities. Animation đọc các token sẵn có `--view-enter-duration`, `--view-enter-distance`, `--auth-brand-stagger`, `--banner-photo-scale`. Không sửa hoặc thêm token. GSAP `useGSAP`/`matchMedia` quản lý scope, cleanup và reduced motion; ảnh chỉ scale để luôn phủ kín figure, copy dùng transform/opacity, không có scroll hijack.

Đối chiếu SHA-256 với snapshot trước triển khai của **49 tệp được bảo vệ**: không có tệp đổi nội dung. Snapshot bao gồm `DESIGN.md`, `index.css`, shared components, providers và services có sẵn. Checkout đã có thay đổi từ các lượt trước; kiểm tra này xác nhận lượt landing không sửa thêm chúng, không có nghĩa toàn bộ working tree sạch.

## Kiểm chứng thực tế

- TDD showcase: hai test mới thất bại trước triển khai, sau đó đạt. Cập nhật các kỳ vọng liên quan trực tiếp trong `IntroPage.test.tsx`, giữ kiểm tra dải phim/bàn phím/map/CTA hiện có.
- Sau các sửa responsive cuối: `corepack pnpm test:coverage --pool=forks --maxWorkers=2` đạt **226/226 test, 37 tệp, 109.17s**. Branch **982/1569 = 62.58%**, vượt floor 60% hiện có; statements 1464/2399, functions 482/717, lines 1344/2157. Nguồn: lần chạy bắt đầu 12:47:38 và `.cache/coverage/frontend/coverage-summary.json`. Branch của `FeatureShowcase` là **50%**, `IntroPage` **34.78%**; nhánh animation bị bỏ qua trong jsdom được kiểm tra thêm bằng browser, chưa đạt target unit branch 80% mỗi component. Không thay threshold/exclusion để tăng số đo.
- Typecheck đạt; Biome lint **173 tệp** đạt; format **7 tệp** landing và test đạt.
- Production `docker compose build frontend` đạt: compile **4.1s**, TypeScript **843ms**, tạo **11 trang tĩnh**, giữ nguyên hai route động. Recreate riêng frontend localhost:3000 bằng `--no-deps`, không restart backend/DB hoặc đổi volume.
- Chromium production: **1440×1000, 1280×900, 768×900, 375×667, 320×568, 667×375**; không tràn ngang ở features, guide, technology, map, preview và footer. Ca **375px/chữ 200%** đạt sau sửa wrap nút header/CTA tại landing.
- Điều hướng tới slide 3, `aria-current`, mở/đóng map, `target="_blank"` của nguồn, preview inert và mở/đóng hai dialog auth đạt; **page errors rỗng**.
- Reduced motion: cả ba slide đọc được, ảnh không có transform animation. Enter chọn slide 2/3 và đưa heading vào viewport; cuộn qua slide cuối hiển thị technology, không mắc kẹt trong showcase; anchor header/brand hoạt động.
- Đã xem ảnh desktop/mobile/showcase/preview/map và chữ lớn; sửa lỗi tràn do preview và nút header. Script, JSON và screenshot cục bộ ở ignored `.cache/landing-2026-10-20/`, không đưa artifact vào Git.

## Giới hạn và bàn giao

Đã triển khai landing để người dùng review trên localhost:3000. Chưa chứng nhận Safari/Firefox/thiết bị thật, WCAG toàn diện, FPS 60 hoặc Core Web Vitals trên máy thật/mạng chậm. Kiểm tra local không chứng nhận GitHub Actions, suy luận checkpoint, storage hay E2E backend. Coverage floor hiện có được giữ nguyên; không suy diễn đạt target 80% mỗi component từ coverage toàn frontend. Chưa commit/push/PR/Jira Done; phần shared loading chờ yêu cầu và phê duyệt riêng theo giới hạn người dùng.
