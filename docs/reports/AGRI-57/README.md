# AGRI-57 — Frontend LeafAI và tích hợp Backend

Khởi động backend sau migration (2026-10-21): user đã xác nhận áp dụng hai migration forward-only sau review/backup. Migration exit0, backend và cả bốn service Healthy; API/database/AI dependency/catalog/proxy frontend HTTP200. [Bằng chứng, backup và giới hạn](agri_57_local_backend_migrations_2026_10_21.md). Không sửa source, commit/push hoặc xóa volume.

Khôi phục media auth sau stash (2026-10-21): lấy riêng video gốc/poster/WebM từ stash80 về thư mục media ignored của nhánh57, phục hồi vào container frontend hiện tại và restart riêng frontend. HTTP video206/poster200 và browser phát thật/chuyển mode/desktop-mobile-reduced đạt; không sửa component, build hay backend/database. [Chi tiết và giới hạn image cũ](agri_57_auth_panel_video_2026_10_21.md#media-restoration-after-stash-restore-2026-10-21). Không commit/push.

Cập nhật lượt149 (2026-10-21): custom404 AgriAI với home/back, HTTP404/noindex.4/4component, Biome/build/browser5sizes đạt. [Báo cáo](agri_57_not_found_2026_10_21.md). Chưa commit/push.

Cập nhật lượt148 (2026-10-21): bỏ nút pause video theo yêu cầu; browserRED/GREEN và build đạt. [Báo cáo](agri_57_auth_panel_video_2026_10_21.md#follow-up148-remove-playback-button). Chưa commit/push.

Cập nhật lượt147 (2026-10-21): authdialog cùng chiều cao, formcuộn, video nền chung đứngyên qua chuyểnmode.6/6modal/build/browser5sizes đạt. [Báo cáo](agri_57_auth_panel_video_2026_10_21.md#follow-up147-stable-dialog-and-unified-video-background). Chưa commit/push.

Cập nhật lượt146 (2026-10-21): authvideo dùng MP4 gốc khôngchuyểnđổi/hashkhớp;6/6tests/build/browser4K/HTTPRange đạt. [Bằng chứng và giới hạn droppedframes](agri_57_auth_panel_video_2026_10_21.md#follow-up146-use-original-mp4). Chưa commit/push.

Cập nhật lượt145 (2026-10-21): video cánh đồng trong sidepanel đăng nhập/đăng ký,720pnhẹ/mutedloop, pause/reduced/posterfallback;6/6modal, Biome/build/browser đạt. [Bằng chứng và lưu ý provision media local](agri_57_auth_panel_video_2026_10_21.md). Chưa commit/push.

Cập nhật lượt144 (2026-10-21): ảnh và lá cùng scene fade/preload, dọn cảnh cũ sau fade. Final10/10, Biome/build/browser opacity desktop/mobile và regression5sizes đạt. [Bằng chứng và giới hạn](agri_57_interactive_landing_2026_10_20.md#cập-nhật-lượt144--đồng-bộ-chuyển-cảnh-ảnh-và-lá-2026-10-21). Chưa commit/push.

Cập nhật lượt143 (2026-10-21): khôi phục lá động đúng crop cho banner Home, size responsive tránh chữ/nút/caption. Finalfocused9/9, Biome/build/browser5sizes đạt. [Bằng chứng](agri_57_interactive_landing_2026_10_20.md#cập-nhật-lượt143--khôi-phục-lá-động-trên-banner-home-2026-10-21). Chưa commit/push.

Cập nhật lượt142 (2026-10-21): nền hero có lá lớn mờ và lá nhỏ đung đưa chậm; focused5/5, Biome/build/browser5widths và regression lá giữa đạt. [Bằng chứng và giới hạn đổi reduced-motion động của map](agri_57_intro_lower_sections_2026_10_21.md#follow-up-botanical-hero-background-turn142). Chưa commit/push.

Cập nhật lượt141 (2026-10-21): lá Intro đung đưa rõ hơn:60px/15độ/5,85s, giữ pause và reduced motion. Browser regression RED/GREEN, Biome và build đạt; không fullsuite/CI mới. [Bằng chứng](agri_57_intro_lower_sections_2026_10_21.md#follow-up-stronger-leaf-motion-turn141).

Cập nhật lượt140 (2026-10-21): nền giữa Intro có5lá desktop/3mobile, swayGSAP lệch nhịp, pause offscreen/hidden và staticreduced. Full311/311, branch66,35%, Biome/Typecheck/build và browsermotion/layout đạt. [Phạm vi và bằng chứng](agri_57_intro_lower_sections_2026_10_21.md#follow-up-multiple-moving-background-leaves-turn140). Chưa commit/push.

Cập nhật lượt139 (2026-10-21): áp dụng mẫu vào3khối dưới Intro: ảnh/tip +3bước, nềnbe/principles, bannerxanh2CTA. Hero/map/footer giữ nguyên. FullLinux311/311, branch66,70%; finalfocused5/5, Biome/Typecheck/build/browser6sizes đạt. [Phạm vi, lỗi môi trường đã xử lý và bằng chứng](agri_57_intro_lower_sections_2026_10_21.md). Chưa commit/push.

Cập nhật lượt138 (2026-10-21): Stepper chưa có ảnh hiện CHỌN ẢNH, có ảnh mới ĐANG THỰC HIỆN; bước2 đổi thành Phân tích, giữ success/reset đúng luồng. Focused18/18threads, Biome/Typecheck/build/browser đạt; fullcoverage gián đoạn lỗi thiết bị cục bộ, không có kết quả mới. [Chi tiết](agri_57_diagnosis_components_2026_10_21.md#cập-nhật-lượt138--phân-biệt-chờ-chọn-ảnh-và-đang-thực-hiện). Chưa commit/push.

Cập nhật lượt137 (2026-10-21): phân trang hai danh mục người dùng tối đa2hàng,6/4/2items desktop/tablet/phone. Full309/309, branch66,57%/hook100%, Biome/Typecheck/build/browser2routes6widths đạt. [Phạm vi và bằng chứng](agri_57_catalog_pagination_2026_10_21.md). Chưa commit/push.

Cập nhật lượt136 (2026-10-21): dropdown bộ lọc mở dưới trigger, cao tối đa256px và cuộn bằng con lăn bên trong, không nhấc theo mục chọn. Focused14/14, Biome/Typecheck/build/browser4widths RED-GREEN đạt. [Chi tiết](agri_57_catalog_filters_2026_10_21.md#cập-nhật-lượt136--danh-sách-lọc-cố-định-và-cuộn-bên-trong). Không thêm lại filter đã gỡ; chưa commit/push.

Cập nhật lượt135 (2026-10-21): ảnh đại diện mới có hộp xem trước, Lưu ảnh/Không lưu/Chọn ảnh khác; chỉ cập nhật khi lưu. Full308/308, branch66,31%/editor85,71%, final focused19/19, Biome/Typecheck/build/browser đạt. [Chi tiết](agri_57_profile_layout_2026_10_21.md#follow-up-confirm-or-discard-avatar-changes-turn135). Chưa commit/push.

Cập nhật lượt134 (2026-10-21): nút đổi ảnh thành icon máy ảnh nhỏ góc dưới phải avatar; giữ target44px/aria và chức năng. Focused16/16, Biome/Typecheck/build/browser RED-GREEN vị trí và flow đạt. [Chi tiết](agri_57_profile_layout_2026_10_21.md#follow-up-avatar-corner-camera-control-turn134). Không full coverage mới, chưa commit/push.

Cập nhật lượt133 (2026-10-21): cho đổi ảnh đại diện từ thiết bị trong Hồ sơ, validate JPG/PNG/15MiB và giải mã trước cập nhật; giữ ảnh cũ nếu lỗi, cleanup khi rời trang. Full305/30546files, branch66,16%/AvatarEditor83,33%, Biome/Typecheck/build/browser đạt. [Chi tiết và giới hạn lưu trong phiên](agri_57_profile_layout_2026_10_21.md#follow-up-change-profile-avatar-turn133). Chưa commit/push.

Cập nhật lượt132 (2026-10-21): thiết kế lại Hồ sơ theo sidebar/thông tin/thống kê, thu gọn mobile, giữ session-only update và thêm status sau lưu. Full296/29645files, branch65,90%; final focused7/7, Biome/Typecheck/build/browser5widths đạt. [Phạm vi, đường dẫn và các lần chạy](agri_57_profile_layout_2026_10_21.md). Chưa commit/push.

Cập nhật lượt131 (2026-10-21): gỡ thiết kế Về dự án vừa thử theo yêu cầu, khôi phục `frontend/src/views/AboutAiPage.tsx` khớp bản gốc (SHA256 và Git diff xác nhận), bỏ test riêng bản thiết kế mới. Không thay các trang khác hoặc Design System. Fresh Docker frontend build đạt (compile4,4s, TypeScript2,1s); recreate riêng frontend và Chromium localhost `/about` xác nhận heading cũ, không còn navigation/FAQ mới. Không chạy lại full suite/coverage hoặc GitHub CI; kết quả296 tests của bản thiết kế đã bỏ không đại diện bản khôi phục. Chưa commit/push.

Cập nhật lượt130 (2026-10-21): đổi tên nhật ký theo công việc thành [AGRI-57-frontend-ui-and-integration.md](../../task-logs/AGRI-57/AGRI-57-frontend-ui-and-integration.md), cập nhật liên kết tài liệu và xác minh đường dẫn. Chỉ thay tài liệu, không chạy lại test/build hoặc thay tên quy tắc chung; chưa commit/push.

Cập nhật lượt129 (2026-10-21): triển khai11 UI error/warning states Chẩn đoán, chặn file/224px, confidence gate/provisionalTop3, structured API codes/retry/sample/dialog. Full293/293/branch65,59%; final focused74/74, Typecheck/Biome/build/browser11states đạt. **NhómB semantic detection chưa có ở API/model thật**, hiện nhận code và testfixtures. [Phạm vi/bằng chứng](agri_57_diagnosis_error_states_2026_10_21.md). Chưa commit/push.

Cập nhật lượt128 (2026-10-21): đã gỡ toàn bộ bộ lọc bổ sung lượt127, khôi phục bộ lọc/bố cục cũ ba trang. Focused14/14, Biome/build/browser đạt. [Chi tiết](agri_57_catalog_filters_2026_10_21.md). Chưa commit/push.

Cập nhật lượt127 (2026-10-21): bổ sung lọc số bệnh/sort cây, trạng thái/sort bệnh, confidence/sort mẫu; panel/reset thống nhất. Full257/257/branch64,51%, sau thêm ca paging focused4/4; Biome/Typecheck/build/browser3trang×6sizes đạt. [Chi tiết và giới hạn](agri_57_catalog_filters_2026_10_21.md). Chưa commit/push.

Cập nhật lượt126 (2026-10-21): bỏ tiêu đề/mô tả/đường chia đầu hai trang cây trồng và cẩm nang bệnh, giữ bộ lọc và heading trợ năng. Focused14/14, Biome/build/browser4 kích thước/tìm kiếm đạt. [Chi tiết](agri_57_compact_catalog_headers_2026_10_21.md). Chưa commit/push.

Cập nhật lượt125 (2026-10-21): bỏ header/mô tả/đường chia đầu trang Chẩn đoán, thu gọn khoảng trống; giữ heading trợ năng. Focused25/25, Biome/build/browser đạt. [Chi tiết](agri_57_diagnosis_components_2026_10_21.md). Chưa commit/push.

Cập nhật lượt124 (2026-10-21): CTA/hướng dẫn đổi thành “Phân tích ngay”; focused18/18, Biome/build/browser đạt. [Chi tiết](agri_57_diagnosis_components_2026_10_21.md). Không full coverage mới; chưa commit/push.

Cập nhật lượt123 (2026-10-21): sửa Stepper3 khi API success thành ĐÃ HOÀN TẤT và ba dấu check. Regression RED/GREEN, full254/254, Biome/build/browser đạt. [Chi tiết](agri_57_diagnosis_components_2026_10_21.md). Không coverage mới; chưa commit/push.

Cập nhật lượt122 (2026-10-21): trang Chẩn đoán có Stepper3 bước và Result Card empty/loading/error/Top-3/metadata nối API hiện có. Full254/254, branch63,70% vượt floor60%; hai component mới100% nhánh; Typecheck/Biome/build/browser6 kích thước và flow lỗi/retry đạt. [Báo cáo và giới hạn](agri_57_diagnosis_components_2026_10_21.md). Chưa commit/push.

Cập nhật lượt121 (2026-10-21): danh mục rộng hơn, ảnh16:9/chữ lớn và card nổi4px khi hover/nhấn/focus; hỗ trợ reduced motion. Full244/244, Biome/build/browser đạt. [Chi tiết](agri_57_interactive_landing_2026_10_20.md). Chưa commit/push.

Cập nhật lượt120 (2026-10-21): danh mục Home thành thẻ ảnh ngang sát đầu, thông tin gọn/badge nhóm/footer theo mẫu. Full244/244, Biome/build/browser layout4 và navigation6 kích thước đạt. [Chi tiết](agri_57_interactive_landing_2026_10_20.md). Chưa commit/push.

Cập nhật lượt119 (2026-10-21): ba ô lưu ý nhấc4px/bóng khi hover/nhấn, hạ mượt200ms và tắt theo reduced motion. Browser test lưu tại frontend/tests/browser/home/photo_tip_motion.py; full244/244, Biome/build đạt. [Chi tiết](agri_57_interactive_landing_2026_10_20.md). Chưa commit/push.

Cập nhật lượt118 (2026-10-21): bỏ cụm “Bạn đang trồng cây gì?”/selector/CTA trên lưu ý, giữ danh mục thẻ. Full244/244, Typecheck/Biome/build và Chromium6 kích thước đạt. [Chi tiết](agri_57_interactive_landing_2026_10_20.md). Chưa commit/push.

Cập nhật lượt117 (2026-10-21): cụm lưu ý Home thành panel có header camera và ba thẻ số/icon theo mẫu, dùng token hiện có; không đưa98% chưa xác minh. Focused6/6, Typecheck/Biome/build và Chromium6 kích thước/điều hướng đạt. [Chi tiết](agri_57_interactive_landing_2026_10_20.md). Không full suite/coverage mới; chưa commit/push.

Cập nhật lượt116 (2026-10-21): phần dưới Home có3 thẻ hướng dẫn và danh mục cây dạng tab/card theo mẫu; giữ hero và selector/navigation. Full244/244, Typecheck/Biome/build và browser6 kích thước đạt. [Chi tiết](agri_57_interactive_landing_2026_10_20.md). Chưa commit/push.

Cập nhật lượt115 (2026-10-21): logout có2 vòng sóng như login, bỏ thanh tiến trình. Focused13/13, Biome/build và browser motion/reduced-motion/return đạt. [Chi tiết](agri_57_reload_loading_2026_10_20.md). Chưa commit/push.

Cập nhật lượt114 (2026-10-21): màn cây ba khối cân giữa, hai vòng sóng lệch nửa chu kỳ và progressbar indeterminate accessible. Full241/241, Typecheck/Biome/build, browser5 kích thước/contrast/reduced motion đạt. [Chi tiết](agri_57_reload_loading_2026_10_20.md). Giữ timer4s; chưa commit/push.

Cập nhật lượt113 (2026-10-21): căn lại cụm logo/lời chào/cây/trạng thái, giữ hiệu ứng và4s. Focused13/13, Biome/build và browser4 kích thước đạt. [Chi tiết](agri_57_reload_loading_2026_10_20.md). Chưa commit/push.

Cập nhật lượt112: bỏ lời chào/dòng chuẩn bị trang ở loader reload, chỉ giữ hoạt ảnh; màn login/logout4s không đổi. Targeted24/24, Biome/build/browser đạt. [Chi tiết](agri_57_reload_loading_2026_10_20.md). Chưa commit/push.

Cập nhật lượt111: đăng nhập/đăng xuất thành công hiển thị tối thiểu4s; giữ reload theo dữ liệu thật. Full241/241, Typecheck/Biome/build và browser timing đạt. [Chi tiết](agri_57_reload_loading_2026_10_20.md). Chưa commit/push.

Cập nhật lượt110: bỏ outline main gây đường viền khi reload, giữ skip link và focus nút/link. Routing7/7, Biome/build và browser reload desktop/mobile đạt. [Chi tiết](agri_57_interactive_landing_2026_10_20.md). Chưa commit/push.

Cập nhật lượt109: thêm loader ô vuông xanh khi reload theo video; giữ màn cây/chào đăng nhập và Tạm biệt cũ. Fresh full237/237, Typecheck/Biome/build/browser đạt sau sửa2 expectation cũ. [Báo cáo reload loading](agri_57_reload_loading_2026_10_20.md). Chưa commit/push.

Cập nhật lượt108: banner phủ nền toàn hero, tràn viền, phía trên nhạt xuống dưới rõ dần; caption mobile tránh bottom navigation. Focused11/11, Biome/build và Chromium5 kích thước đạt. [Chi tiết](agri_57_interactive_landing_2026_10_20.md). Chưa commit/push.

Cập nhật lượt107: sửa import durian sang tên ảnh hiện có sầu riêng banner.jpg để khắc phục Docker frontend Module not found. Targeted24/24, Biome/build đạt; [chi tiết](agri_57_interactive_landing_2026_10_20.md). Chưa commit/push.

Cập nhật lượt106: bỏ nút Play/Pause banner theo yêu cầu, giữ tự chuyển14 ảnh. Focused11/11, Biome/build đạt. [Chi tiết](agri_57_interactive_landing_2026_10_20.md). Chưa commit/push.

Cập nhật lượt105: Home tự luân phiên đủ14 banner, chờ tải trước/crossfade/pause/reduced motion và cleanup. Full233/233 (38 tệp), Typecheck/Biome/build và Chromium desktop/mobile đạt. [Chi tiết và giới hạn](agri_57_interactive_landing_2026_10_20.md). Chưa commit/push.

Cập nhật lượt104: bỏ bo góc trên banner Home, giữ góc dưới; build/Biome và Chromium4 kích thước đạt. Fresh Vitest threads6/6 đạt; xem [chi tiết](agri_57_interactive_landing_2026_10_20.md). Chưa commit/push.

Cập nhật lượt103: thu sát vùng hero thêm; banner desktop lên47,59px. Focused6/6, Biome/build và Chromium4 kích thước đạt. [Chi tiết](agri_57_interactive_landing_2026_10_20.md). Chưa commit/push.

Cập nhật lượt102: thu gọn padding vùng đầu và khoảng cách chữ Home, banner desktop lên thêm63,20px; focused6/6, Biome/build và Chromium4 kích thước đạt. [Chi tiết](agri_57_interactive_landing_2026_10_20.md). Chưa commit/push.

Cập nhật lượt101: đưa CTA Home lên16px, banner lên/cao thêm32px trên desktop; focused6/6, Biome/build và Chromium4 kích thước đạt. [Bằng chứng landing](agri_57_interactive_landing_2026_10_20.md). Chưa commit/push.

Cập nhật lượt100 (2026-10-20): tiêu đề Home uốn vòng cung theo lựa chọn người dùng. Focused6/6, Typecheck/Biome/build đạt; Chromium320–1904px không cắt chữ/tràn ngang. Chi tiết [báo cáo landing](agri_57_interactive_landing_2026_10_20.md). Chưa commit/push.

Cập nhật lượt99 (2026-10-20): bỏ ba dấu chấm cuối heading/caption Home; focused5/5 và Biome3 tệp đạt, production build đạt. Chi tiết tại [báo cáo landing](agri_57_interactive_landing_2026_10_20.md). Chưa commit/push.

Đây là điểm vào chính cho toàn bộ bằng chứng kỹ thuật của task AGRI-57.

Nhánh đã đối chiếu: `AGRI-57-frontend-summary`. Cập nhật tài liệu: 2026-10-20.

## Landing tương tác — 2026-10-20

**Hiện trạng lượt98:** bỏ wrapper xanh/bo tròn và dùng logo lá tách nền trong suốt, không còn hai viền. Asset cuối `public/images/agriai-leaf-mark.png`, built-in image_gen; [prompt và bằng chứng alpha/wrapper](agri_57_interactive_landing_2026_10_20.md#hiện-trạng-lượt98--logo-lá-trong-suốt-bỏ-khung-kép). Fresh23/23targeted tests/static/build/browser8 kích thước đạt. Chưa commit/push; dưới đây là lịch sử.

**Hiện trạng lượt97:** logo dùng URL mới `/images/agriai-leaf-logo.png` để tránh cache URL cũ; đồng bộ7 reference, không đổi styles/logic. Navbar test RED/GREEN, fresh227/227full/37 tệp, branch62,77%, static/build/browser xác nhận URL/hash/logo đúng đạt. [Chi tiết và phạm vi shared chỉ đổi URL](agri_57_interactive_landing_2026_10_20.md#hiện-trạng-lượt97--url-logo-lá-riêng-để-tránh-ảnh-cũ-trong-cache). Chưa commit/push; dưới đây là lịch sử.

**Hiện trạng lượt96:** banner lấp chiều cao còn lại của màn hình đầu, section hướng dẫn không còn ló lên; nội dung vẫn cuộn xem được. Fresh5/5focused tests/Biome/build đạt; browser height regression RED bản cũ/GREEN8 kích thước bản mới, CTA/logo/reflow đạt. [Chi tiết](agri_57_interactive_landing_2026_10_20.md#hiện-trạng-lượt96--banner-phủ-hết-màn-hình-đầu). Chưa commit/push; dưới đây là lịch sử.

**Hiện trạng lượt95:** xóa3 dòng chữ phụ được đánh dấu và thay file logo chung bằng đúng PNG lá người dùng cung cấp. Fresh23/23targeted tests/6 tệp/static/build/browser7 kích thước/CTA đạt; hash logo đã đối chiếu. [Phạm vi logo dùng chung và bằng chứng](agri_57_interactive_landing_2026_10_20.md#hiện-trạng-lượt95--xóa-ba-dòng-phụ-và-thay-logo-lá-do-người-dùng-gửi). Chưa commit/push; dưới đây là lịch sử.

**Hiện trạng lượt94:** thay toàn bộ hero Home theo screenshot: tiêu đề/CTA ở giữa, ảnh đồi chè rộng dưới. Xóa5 component hiệu ứng Home cũ và test tương ứng; giữ chức năng/nội dung phía dưới/Intro/shared/design. Thêm2 test hero mới đúng `tests/component/home/`, cập nhật test trang. Fresh227/227full, branch62,77%, static/build/Chromium7 kích thước/CTA đạt. [Chi tiết và phạm vi đã loại bỏ](agri_57_interactive_landing_2026_10_20.md#hiện-trạng-lượt94--thay-toàn-bộ-hero-home-theo-bố-cục-ảnh-tham-khảo). Chưa commit/push; các lượt dưới đã được thay thế.

**Hiện trạng lượt93:** đưa lại cây đung đưa đúng5 loại ảnh và2 lá lúa, cả rail/preview; dùng artwork/token hiện có, không đổi shared/global/design.8 test mới đúng `tests/component/home/`; fresh261/261full, branch62,22% toàn frontend/95,83% cây động; static/build/browser đạt. Sau full, ổn định test flip bằng seek GSAP rồi focused39/39 đạt. [Chi tiết](agri_57_interactive_landing_2026_10_20.md#hiện-trạng-lượt93--khôi-phục-cây-động-trên-ảnh-banner-home). Chưa commit/push; dưới đây là lịch sử.

**Hiện trạng lượt92:** tăng uốn chữ3 lần, stretch tối đa52%, vùng tác động rộng hơn/phản hồi nhanh hơn; giữ màu và phục hồi/reduced motion. Test yêu cầu biên độ lớn hơn RED/GREEN; fresh31/31focused tests/static/build/browser đạt. [Chi tiết](agri_57_interactive_landing_2026_10_20.md#hiện-trạng-lượt92--tăng-cường-độ-biến-dạng-chữ). Chưa commit/push; dưới đây là lịch sử.

**Hiện trạng lượt91:** chữ AgriAI nền uốn/giãn cục bộ quanh chuột, ra ngoài phục hồi; giữ vệt chấm/font/màu/drift.3 test mới đúng `tests/component/home/`; fresh253/253 full, branch61,68% toàn frontend/86,66% watermark; static/build/browser đạt. Sau sửa style tránh cắt đuôi g, focused3/3/final build/browser đạt, không chạy full lại. [Chi tiết](agri_57_interactive_landing_2026_10_20.md#hiện-trạng-lượt91--chữ-agriai-biến-dạng-cục-bộ-theo-chuột). Chưa commit/push; dưới đây là lịch sử.

**Hiện trạng lượt90:** thêm vệt chấm halftone mờ theo chuột phía sau ảnh Home, tự tan; tắt khi reduced motion/touch/coarse, dừng vẽ khi rảnh. Test riêng tại `tests/component/home/HomePointerTrail.test.tsx`; không đổi shared/global/design/dependency. Static/build/Chromium pixel và hồi quy ảnh đạt. [Phạm vi, kết quả full và giới hạn](agri_57_interactive_landing_2026_10_20.md#hiện-trạng-lượt90--vệt-chấm-nền-theo-con-trỏ). Chưa commit/push; dưới đây là lịch sử.

Fresh full lượt90: **250/250 test,39 tệp,47,67s** lúc14:52:46; branch toàn frontend61,46%, HomePointerTrail92,85%.8 test mới; không đổi threshold/exclusion.

**Hiện trạng lượt89:** nền Home dùng cùng token `background` với khung trang, bỏ đường chia hai màu. Fresh20/20 focused tests, Biome/build đạt; Chromium desktop/mobile xác nhận hai nền cùng rgb244/242/234. Sửa test reduced-motion tránh phụ thuộc GSAP tick; không đổi production animation/shared/global. [Chi tiết](agri_57_interactive_landing_2026_10_20.md#hiện-trạng-lượt89--đồng-bộ-màu-nền-home-với-khung-trang). Chưa commit/push; dưới đây là lịch sử.

**Hiện trạng lượt88:** khi thu ảnh cũng lật ngang nhẹ rồi khớp góc nguồn, cùng luồng đóng hiện có. Thêm2 test đúng `tests/component/home/`; fresh20/20 focused tests/static/build/Chromium đạt,49 tệp bảo vệ không đổi. [Chi tiết](agri_57_interactive_landing_2026_10_20.md#hiện-trạng-lượt88--lật-ngang-nhẹ-khi-thu-ảnh). Chưa commit/push; dưới đây là lịch sử.

**Hiện trạng lượt87:** thêm nhịp lật chéo phối cảnh nhẹ khi mở ảnh theo video8,23s, sau đó trở phẳng; giữ bấm lại thu về/reduced motion. Thêm2 test đúng `tests/component/home/`; fresh18/18 focused tests/static/build/Chromium đạt,49 tệp bảo vệ không đổi. [Chi tiết](agri_57_interactive_landing_2026_10_20.md#hiện-trạng-lượt87--lật-chéo-nhẹ-khi-mở-ảnh). Chưa commit/push; dưới đây là lịch sử.

**Hiện trạng lượt86:** bấm lại ảnh lớn để thu về dải, giữ X/Escape/bấm nền. Thêm2 test đúng `tests/component/home/`, RED trước/GREEN sau; fresh16/16 focused tests, typecheck/lint/format/build và Chromium desktop/mobile/reduced motion đạt. [Chi tiết](agri_57_interactive_landing_2026_10_20.md#hiện-trạng-lượt86--bấm-lại-ảnh-lớn-để-thu-về-dải). Chưa commit/push; dưới đây là lịch sử.

**Hiện trạng lượt85:** chuyển test component ảnh về `tests/component/home/`, render Hero trực tiếp; ca nội dung trang nằm trong `views/HomePage.test.tsx`. Không bỏ test hoặc sửa production source. Fresh14/14 targeted tests/3 tệp, typecheck/Biome đạt; không chạy lại full suite/build. [Chi tiết](agri_57_interactive_landing_2026_10_20.md#hiện-trạng-lượt85--đặt-test-đúng-nhóm-component). Chưa commit/push; dưới đây là lịch sử.

**Hiện trạng lượt84:** bấm ảnh/Enter mở lớn từ vị trí gốc, nền mờ; X/Escape/bấm nền thu về dải. Giữ kéo-thu nhỏ và autoplay; thêm9 test, sửa lỗi cleanup qua test hồi quy. Fresh236/236 tests/38 tệp, branch60,84% toàn frontend, preview93,87%; typecheck/lint/format/build và Chromium desktop/mobile/drag đạt. Giữ49 tệp bảo vệ/Intro; chưa commit/push. [Bằng chứng và giới hạn](agri_57_interactive_landing_2026_10_20.md#hiện-trạng-lượt84--mở-và-thu-ảnh-về-dải-theo-video). Các lượt dưới là lịch sử.

**Hiện trạng lượt83:** bỏ số đếm/cụm nút theo yêu cầu, thêm giữ-kéo thu nhỏ ảnh60%, thả phục hồi/tự chạy. Chuột capture ngoài khung, touch kéo ngang/vuốt dọc, reduced motion và keyboard đạt; full227/227tests,branch60.24%, static/build/browser đạt. [Phạm vi, bằng chứng và giới hạn](agri_57_interactive_landing_2026_10_20.md#hiện-trạng-lượt83--kéo-giữ-thu-nhỏ-ảnh-bỏ-cụm-điều-khiển). Chưa commit/push; dưới đây là lịch sử.

**Hiện trạng lượt82:** thêm chữAgriAI lớn/mờ dưới dải ảnh trên nền `surface` sáng có sẵn; trôi nhẹ và dừng cùng autoplay, reduced motion đứng yên. Fresh5/5 focused tests, typecheck/lint/build và Chromium desktop/mobile đạt. Không sửa global/shared/token; chưa commit/push. [Bằng chứng mới](agri_57_interactive_landing_2026_10_20.md#hiện-trạng-lượt82--chữ-thương-hiệu-lớn-phía-sau-ảnh). Các lượt dưới là lịch sử.

**Hiện trạng lượt81:** theo screenshot mới, dải ảnh Home mở toàn khung và tự chạy nối vòng, chữ/CTA nhỏ góc trái dưới; mobile tách controls khỏi ảnh. Fresh227/227 tests/37 tệp/48s, branch61.86%, build/static checks đạt; Chromium theo dõi34s/208 mẫu, pause/resume/reduced motion/offscreen và responsive đạt. [Report hiện trạng và giới hạn](agri_57_interactive_landing_2026_10_20.md#hiện-trạng-lượt81--ảnh-toàn-khung-tự-chạy-chữ-nhỏ-góc-trái-dưới). Chưa commit/push; dưới đây là lịch sử.

**Hiện trạng lượt80:** người dùng chỉ cần hiệu ứng. Đã gỡ showcase/story/preview tự thêm, giữ nội dung Home ban đầu; đổi riêng hero sang dải ảnh nghiêng/dịch ngang theo chuột với GSAP. Đã mở reference bằng browser và so sánh trước/sau pointer/scroll; giữ nguyên49 tệp Design System/global/shared. Full226/226, branch61.99%; build/static checks đạt. [Phạm vi và kiểm chứng hiệu ứng](agri_57_interactive_landing_2026_10_20.md#hiện-trạng-lượt80--chỉ-áp-dụng-hiệu-ứng-ảnh-vào-home). Chưa commit/push; các lượt sau đây là lịch sử.

**Hiện trạng lượt79:** người dùng sửa đích sang **Home `/home`**, đã chuyển trải nghiệm và CTA sang chức năng ứng dụng; phục hồi Intro khớp bản lưu trước lượt78. Fresh227/227 tests/37 tệp/72.40s, branch62.20%, typecheck/lint/format/build và Chromium Home320–1440px/chữ200%/reduced motion đạt. SHA49 tệp bảo vệ không đổi; chưa commit/push, chưa đạt target80% mỗi component. [Bằng chứng sửa phạm vi](agri_57_interactive_landing_2026_10_20.md#hiện-trạng-lượt79--chuyển-sang-home-theo-yêu-cầu-sửa-phạm-vi). Đoạn lượt78 sau đây là lịch sử.

Lượt78: triển khai hero, ba slide tính năng, câu chuyện công nghệ, bản đồ và preview sản phẩm thật trong landing. Fresh226/226 tests,37 tệp,109.17s, branch62.58%; typecheck/lint/format/build và Chromium sáu khung hình, chữ200%, reduced motion, bàn phím/CTA/map đạt. SHA49 tệp Design System/global/shared hiện có không đổi trong lượt này. Landing sẵn sàng review local; shared loading chưa sửa vì cần phê duyệt riêng, chưa nghiệm thu production/CI hoặc target80% mỗi component. [Phạm vi, bằng chứng và giới hạn](agri_57_interactive_landing_2026_10_20.md). Chưa commit/push; các mục dưới là lịch sử.

## Loading theo video mới - 2026-10-20

Lượt77: đăng xuất hiện “Tạm biệt, [tên].”/HẸN GẶP LẠI, xóa phiên ngay, về giới thiệu sau xác nhận1.2s; không nháy “Xin chào” trong luồng logout. Fresh224/224,36 tệp,66.07s, branch62.84%; typecheck/lint/format/build và browser desktop/mobile/reduced motion đạt. [Bằng chứng lời tạm biệt](agri_57_seedling_video_loading_2026_10_20.md#bổ-sung-lời-tạm-biệt-khi-đăng-xuất). Chưa commit/push; kết quả dưới là lịch sử.

Theo video người dùng gửi sau lượt hoàn nguyên: mầm hai lá xanh nhạt/đất xám/LOADING cam trên nền trắng, chu kỳ ba nấc0.9s; thêm logo AgriAI và lời chào tài khoản đã xác minh. User vào app theo dữ liệu thật; giữ admin entrance. Fresh220/220 tests, branch62.41% toàn frontend/94.73% component; typecheck/lint/format/build và browser5 khung/chữ200%/reduced motion đạt. [Report video và bằng chứng](agri_57_seedling_video_loading_2026_10_20.md). Chưa commit/push; còn review/CI.

## Mốc hoàn nguyên thử nghiệm trước đó

Ngày2026-10-20, theo yêu cầu người dùng, đã hoàn nguyên toàn bộ thử nghiệm loading vừa bổ sung: khôi phục sáu tệp startup/auth/fallback/test về HEAD, xóa component/demo/ảnh/test/report mới và các mục thiết kế/nhật ký tương ứng. Giữ nguyên sửa responsive và nguồn vùng trồng; không thay backend/dependency. Fresh215/215 tests,34 tệp,44.70s; typecheck/lint165 tệp/format CSS/build đạt (compile5.0s, TypeScript1507ms). Chromium xác minh demo và hai ảnh mới trả404, splash gốc hiện khi restore đang chờ rồi vào trang giới thiệu, mobile375px không tràn ngang/page errors rỗng. Đối chiếu nội dung sáu tệp phục hồi với HEAD và hash bảy tệp ngoài phạm vi không đổi; diff-check đạt. Đã cập nhật localhost3000, chưa commit/push; chưa kiểm chứng CI/Safari/thiết bị thật. Đây là biên nhận hoàn nguyên, không giữ tài liệu triển khai thử nghiệm đã bỏ.

## Nguồn vùng trồng mở tab mới - 2026-10-19

Đã rà14 cây, thay12 URL bằng bài cụ thể và giữ hai bài đúng chủ đề; liên kết mở tab riêng, giữ trang AgriAI. Chromium14/14 ca mở tab và full215/215 test (38.57s) đạt; typecheck/lint/format tệp sửa/build đạt. [Danh sách nguồn, bằng chứng và giới hạn](agri_57_crop_map_sources_2026_10_19.md). Chưa commit/push.

## Rà soát responsive mới nhất - 2026-10-19

Bổ sung dải phim: ảnh/viền/lỗ cùng co theo chiều rộng cột, giữ bốn cell cả trên mobile. Kiểm tra bảy độ rộng, sáu cỡ normal motion không cắt dọc, cuộn phím đạt; fresh215/215 test (38.82s), lint/format CSS/build đạt. [Chi tiết bổ sung và bằng chứng](agri_57_intro_map_responsive_2026_10_19.md#bổ-sung-dải-phim-chưa-co-theo-khung).

Theo xác nhận tiếp theo của người dùng, toàn khối giới thiệu co theo khung và giữ chữ/bản đồ cạnh nhau cả trên điện thoại. Kiểm tra mới: 7 độ rộng layout, 42 lượt chọn điểm, mở/đóng với chuyển động bình thường và 33 trạng thái chữ 200% đạt; 215/215 test (37.51s), typecheck/lint/build đạt. [Báo cáo bản đồ responsive và đánh đổi kích thước ghim](agri_57_intro_map_responsive_2026_10_19.md). Bản localhost3000 đã cập nhật; phần dưới ghi lượt audit trước sửa map.

Đã kiểm tra trang giới thiệu, các trang người dùng/chi tiết, admin và các trạng thái tương tác ở 320–1440px, màn hình ngang/thấp và chữ 200%. Sửa tràn header/CTA giới thiệu, lề Dialog ở breakpoint tablet và hộp xác nhận dài vượt chiều cao. 85 trạng thái trang + 108 trạng thái tương tác + 33 ca chữ lớn không tràn ngang trong ma trận Chromium; 13 ca bổ sung layout/cảm ứng/bàn phím đạt. Full frontend 215/215 kiểm thử, 34 tệp; typecheck/lint/build và format bốn tệp sửa đạt. Format toàn checkout còn vấn đề CRLF ở tệp nguyên trạng; không suy diễn Safari/thiết bị thật/CI đã đạt. [Bằng chứng, phạm vi và giới hạn](agri_57_responsive_audit_2026_10_19.md). Chưa commit/push; các mục trước ngày này bên dưới là lịch sử.

[Tổng hợp toàn bộ công việc và hiện trạng ngày2026-10-12](frontend_implementation_report.md#tổng-hợp-hiện-trạng-ngày-2026-10-12): chức năng, routing, ảnh/banner/lá, map, phân trang, kiểm chứng gần nhất và phần chưa nghiệm thu. Lượt tổng hợp chỉ sửa tài liệu, không chạy lại các kết quả lịch sử.

## Trạng thái Definition of Done

- **Merge remote main và review ngày2026-10-13:** merge `origin/main` tại `25075b4` không conflict; sửa đường dẫn fixture ảnh của CI. Fresh lint/format/build/typecheck,160frontend +66backend +65Python tests và ba coverage floors PASS; Docker với checkpoint thật, proxy upload/storage/history và AI-down503 PASS. Log GitHub xác nhận lỗi compose-smoke cũ là curl26/file thiếu. PR#29 vẫn `BLOCKED`/`REVIEW_REQUIRED`, cần CI trên commit cập nhật và reviewer duyệt trước merge main. [Bằng chứng mới và giới hạn](agri_57_main_merge_review_2026_10_13.md). Các mục dưới là lịch sử.

- **Sửa blockers local ngày2026-10-12, sau mục commit-only:** user cho phép sửa trên feature branch, không tác động main. Strict lint/format/typecheck/build PASS; test:coverage160/160 PASS, branch654/1195=54.73% vượt floor25% giữ nguyên. Smoke expectation đổi sang AgriAI, đối chiếu HTML build PASS; Chromium print/direct image delivery và map4/4 PASS. Chưa chạy full Compose/GitHub CI/CD, chưa commit/push các sửa mới. [Follow-up](agri_57_commit_readiness.md#follow-up-local-ci-remediation-2026-10-12).

- **Chuẩn bị commit ngày2026-10-12:** user chọn commit cả frontend/docs/skills/rules và không sửa lỗi CI. Fresh160/160tests, branch coverage654/1197=54.64% vượt floor25%, build/typecheck/commitlint và local secrets scans PASS. Lint49warnings và format62errors vẫn FAIL; Compose smoke còn tìm LeafAI. Không xác nhận GitHub CI/CD pass. [Preflight và giới hạn](agri_57_commit_readiness.md).

- **Scroll và kích thước map ngày2026-10-12:** bỏ thanh cuộn dọc tạm lúc entrance, tăng canvas hero lên512px từ640px màn hình; giữ hai cột cân và pan ngang trên điện thoại. Fresh build/typecheck,160/160tests và Chromium4/4 PASS, gồm lấy mẫu lúc entrance1900px normal motion. [Bằng chứng](agri_57_map_balance.md#follow-up-map-entrance-scrollbar-and-larger-canvas-2026-10-12).

- **Cân bố cục map ngày2026-10-12:** hai cột desktop bằng nhau, Hoàng Sa/Trường Sa dịch gần đất liền trong lớp trình bày riêng, giữ dữ liệu tọa độ gốc/ghim/motion. Hiển thị không còn đúng khoảng cách địa lý. Fresh160/160tests, typecheck/build và Chromium375/768/1280/1900 PASS. [Báo cáo](agri_57_map_balance.md).

- **Tọa độ bản đồ ngày2026-10-12:** đất liền/đảo/ghim dùng chung Web Mercator, Natural Earth1:10m, bỏ inset đảo kéo sát bờ/phóng lớn, mobile cuộn ngang; giữ canopy/ghim44px/motion. Fresh160/160tests, typecheck/build và Chromium4/4 PASS. Không chứng nhận đo đạc/ranh giới; nguồn đảo còn thiếu chi tiết. [Báo cáo](agri_57_geographic_map.md).

- **Nền nhãn đảo ngày2026-10-12:** bỏ ô nền khác màu trên nhãn đảo, đưa Trường Sa lên khoảng trống bằng offset chuẩn hiện có; giữ map/ghim/motion. Fresh157/157tests, typecheck/build và Chromium375/768/1280 PASS. [Bằng chứng](agri_57_map_relief.md#island-label-background-correction-2026-10-12).

- **Phân trang danh mục ngày2026-10-12:** cây/bệnh9 mục mỗi trang, Trước/Sau/số trang; tìm kiếm/lọc toàn bộ rồi reset trang1, chuyển trang focus/cuộn về đầu danh sách. Fresh157/157tests, typecheck/build và Chromium375/768/1280 PASS. Client-side, không API/URL persistence. [Báo cáo](agri_57_catalog_pagination.md).

- **Ảnh đạo ôn lúa bổ sung ngày2026-10-12:** PNG mới gắn vào `rice-blast` hiện có ở cây lúa/cẩm nang/chi tiết, không duplicate/new model label; inventory71ảnh. Fresh151/151tests, typecheck, build và Chromium3viewport ảnh/hash PASS. [Bằng chứng bổ sung](agri_57_leaf_illustrations.md#follow-up-rice-blast-illustration--2026-10-12).

- **Ảnh lá do user cung cấp ngày 2026-10-12:** tích hợp70 ảnh/14 cây vào điều kiện lá và cẩm nang; giữ riêng56 ảnh bệnh/hại và14 ảnh khỏe, thêm4 cây tham khảo không-model, không sửa nhãn/backend/ảnh gốc/banner. Ánh xạ theo tên file, chưa xác minh chuyên môn/licensing; mục chưa khớp vẫn thiếu ảnh, nội dung các mục mới chưa hoàn thiện. [Phạm vi, kiểm chứng và giới hạn](agri_57_leaf_illustrations.md).

- **Sửa Docker frontend ngày 2026-10-09:** tái hiện `ERR_PNPM_MUSL`; đổi hai stage sang Node24.15.0 Debian slim/glibc và copy workspace config trước frozen install, giữ pnpm10.34.5/local runtime. Fresh Docker build10/10, runtime smoke HTTP200/CSS/404/non-root và114/114 frontend tests PASS. Không khởi động lại stack hay thay volume/database. [Nguyên nhân và bằng chứng](agri_57_docker_node_runtime.md).

- **Cấu trúc routing mở rộng ngày 2026-10-09:** page sở hữu nội dung, route group tách intro/application shell, domain `features`, shared provider với bốn context và Next Link; thêm metadata/loading/error/custom404, giữ UI/API/session hiện có. Fresh114/114 tests/21 files, typecheck, lint/format46 file và build10/10 PASS; browser bốn viewport/motion và guest deep-link/404 PASS bằng API fixture. SSR auth/cookie và HTTP404 cho ID thiếu chưa nằm trong phạm vi. [Kiến trúc, kiểm chứng và giới hạn](agri_57_routing_architecture.md).

- **Routing ngày 2026-10-09:** Next App Router có URL riêng cho các màn hình và chi tiết cây/bệnh, shared layout giữ phiên; fresh107/107 tests, typecheck, targeted lint và build10/10 PASS. Browser375/768/1280 reduced và1280 normal PASS; sửa race login trả về deep link rồi kiểm tra lại PASS. API fixture, không phải backend/AI E2E thật. [Phạm vi và bằng chứng](agri_57_app_routing.md).

- **Ô nhập auth ngày 2026-10-09:**48px, viền/focus xanh, đồng bộ CAPTCHA/nút mắt và autofill surface paint, CSS scoped không sửa validation. Fresh101/101 tests/typecheck/build PASS; bốn ca browser PASS,11 warning print cũ còn nguyên. [Báo cáo và giới hạn](agri_57_auth_fields.md).

- **Bóng nổi bản đồ ngày 2026-10-09:** mainland có bóng mềm hai lớp theo semantic tokens; giữ đảo/ghim/địa lý. Fresh101/101 tests/build PASS và bốn ca browser PASS;11 warning print cũ còn nguyên. [Báo cáo và giới hạn](agri_57_map_relief.md).

- **Đồng bộ main ngày 2026-10-09:** fast-forward 60 commit tới `d34166d`, khôi phục WIP và giữ stash dự phòng; không commit/push. Fresh 101/101 tests và build PASS; backend/AI/E2E chưa chạy. [Chi tiết đồng bộ và conflict](agri_57_main_sync.md).

- **Thu khoảng trống map mở ngày 2026-10-09:** khoảng dưới navbar giảm92→44px, căn hai cột lên trên; đóng giữ bố cục cũ. Fresh90/90 tests/typecheck/build PASS, năm ca browser spacing PASS. [Bằng chứng và giới hạn](frontend_ui_refinement_audit.md#compact-map-exploration-top-spacing--2026-10-09).
- **Sửa luồng khám phá map ngày 2026-10-09:** giữ một bản đồ gốc bên phải, bảng thông tin thay chữ/cuộn phim trái bằng GSAP đảo chiều khi đóng; không modal/map thứ hai ở trang giới thiệu. Fresh90/90 tests, typecheck/build PASS, năm ca browser responsive/reduced và kiểm tra motion/pause phim PASS. [Phạm vi, bằng chứng và giới hạn](frontend_ui_refinement_audit.md#single-map-inline-exploration-correction--2026-10-09); không phải nghiệm thu toàn hệ thống.
- **Cài skill UI vào repo ngày 2026-10-08:** thêm Taste, 4 GSAP, React Best Practices và Impeccable vào `.agents/skills`; tổng 22 skill. Kiểm tra 7 metadata và 34 link local không lỗi; giữ giới hạn Impeccable review-only. [Nguồn, commit và kiểm chứng](agri_57_skills_shadcn_setup.md#7-cài-bộ-skill-ui-vào-dự-án-ngày-2026-10-08). Không chạy lại application tests/build trong lượt chỉ cài skill này.
- **Tinh chỉnh UI xanh lá ngày 2026-10-08:** tăng phân cấp và đồng bộ 10 màn hình theo DESIGN.md; sửa ảnh stock sai/hỏng bằng trạng thái thiếu ảnh trung thực. Kiểm tra trình duyệt cô lập 36 trạng thái ở 375/768/1280px; 79/79 tests, typecheck và build PASS. Lint còn 63 warnings, format còn 46 file; thư viện ảnh bệnh và backend E2E chưa hoàn tất. Xem [bằng chứng UI mới](frontend_ui_refinement_audit.md#leaf-green-refinement-and-browser-review--2026-10-08).
- **Nền tảng frontend ngày 2026-10-08:** bổ sung runtime/công cụ, test luật lint và xử lý 24 lỗi mức error. Lần chạy mới: 74/74 tests và build PASS; còn 69 cảnh báo lint và 52 file cần format nên quality gate chưa đạt. Xem [bằng chứng từng lượt và việc còn lại](agri_57_frontend_quality_setup.md); không coi đây là nghiệm thu toàn dự án lớn.
- **Baseline demo ngày 2026-09-28:** hoàn thành trong phạm vi đã ghi nhận; các kết quả bên dưới là lịch sử, không phải kiểm tra lại toàn hệ thống.
- **Lượt UI/banner ngày 2026-10-07:** chưa hoàn tất nghiệm thu trực quan ở 375px, 768px và 1280px. Kiểm thử tự động và build đã qua, nhưng không thay thế kiểm tra bằng trình duyệt. Việc bỏ nút dừng thủ công có đánh đổi về khả năng tiếp cận trong [báo cáo rà soát UI](frontend_ui_refinement_audit.md).
- **Lượt skill/shadcn ngày 2026-10-07:** hoàn thành phần cài skill và xác minh cấu hình, có bằng chứng trong [báo cáo công cụ](agri_57_skills_shadcn_setup.md). Không phải xác nhận sẵn sàng production, không thay đổi trạng thái Jira hoặc tạo PR.

### Phạm vi demo đã ghi nhận ngày 2026-09-28

- Upload, preview, xóa và chọn lại ảnh: hoàn thành.
- Validation định dạng, file rỗng và dung lượng tối đa 15 MB: hoàn thành.
- Gửi multipart request đến ASP.NET Backend và nhận JSON response: hoàn thành.
- Hiển thị cây trồng, bệnh, confidence, ảnh và trạng thái xử lý: hoàn thành.
- Idle, Uploading, Analyzing, Success, Error và retry: hoàn thành.
- Responsive desktop, tablet và mobile: hoàn thành.
- Unit test và integration test frontend: **20/20 PASS**.
- TypeScript check và Next.js production build: PASS.
- Prediction result không hard-code trong UI; dữ liệu được mapping từ Backend DTO.

## Kết quả baseline ngày 2026-09-28

| Kiểm tra | Kết quả | Nguồn bằng chứng |
|---|---:|---|
| Test files | 6/6 PASS | `corepack pnpm test` ngày 2026-09-28 |
| Test cases | 20/20 PASS | `corepack pnpm test` ngày 2026-09-28 |
| TypeScript | PASS | `corepack pnpm lint` ngày 2026-09-28 |
| Production build | PASS | `corepack pnpm build` ngày 2026-09-28 |
| Backend unit tests | 8/8 PASS | `dotnet test` ngày 2026-09-28 |
| Backend integration tests | 5/5 PASS | `dotnet test` với Testcontainers ngày 2026-09-28 |
| Static route | `/` | Output của Next.js build ngày 2026-09-28 |

## Các thay đổi bổ sung ngày 2026-10-07

| Nhóm | Thay đổi và bằng chứng |
| --- | --- |
| Hệ thống thiết kế và UI | `DESIGN.md`, semantic tokens, shadcn/Radix, tinh chỉnh các màn hình và khả năng tiếp cận; [chi tiết UI](frontend_ui_refinement_audit.md). |
| Banner | Khôi phục 13 bộ ảnh gốc; tự chuyển, lá chuyển động mạnh hơn, bỏ selector/mũi tên/nút dừng theo yêu cầu; giữ reduced motion và tự dừng khi khuất/ẩn tab. Nguồn: `frontend/src/data/bannerData.ts`, `BotanicalBanner.tsx` và các test được dẫn trong báo cáo UI. |
| Agent skills | Cài thêm 13 gói, giữ 2 skill cũ, tổng 15 skill trong repo; 7 skill UI cấp máy được ghi riêng, không giả định đã đi cùng repo. Nguồn: `.agents/skills/installed_skills.json`, `.agents/skills/README.md`. |
| shadcn | Xác nhận cấu hình có sẵn `radix-nova`, Tailwind 4, 16 primitive; thêm script `ui` và hướng dẫn dùng, không khởi tạo lại hoặc ghi đè component. [Chi tiết và lệnh kiểm chứng](agri_57_skills_shadcn_setup.md). |
| Report/task log | Đồng bộ các lượt trước vào đúng AGRI-57; bổ sung quy tắc cập nhật theo nhánh ở `AGENTS.md` và `.agents/rules/project_rules.md`. |

Kết quả gần nhất của lượt cấu hình shadcn: **63/63 tests, 12/12 test files**, typecheck và production build PASS ngày 2026-10-07. Đây là lần chạy đã ghi nhận trong [báo cáo công cụ](agri_57_skills_shadcn_setup.md), không phải một lần chạy mới trong lượt chỉ sửa tài liệu. Backend, AI và E2E toàn hệ thống không được chạy lại trong lượt đó.

## Tài liệu

- [Nền tảng công cụ và quality gate frontend ngày 2026-10-08](agri_57_frontend_quality_setup.md)
- [Báo cáo triển khai frontend](frontend_implementation_report.md)
- [Rà soát và tinh chỉnh UI ngày 2026-10-07–08](frontend_ui_refinement_audit.md)
- [Cài skill và xác minh cấu hình shadcn ngày 2026-10-07](agri_57_skills_shadcn_setup.md)
- [Task completion log](../../task-logs/AGRI-57/AGRI-57-frontend-ui-and-integration.md)
- Hướng dẫn tích hợp Backend–Frontend: đường dẫn cũ `docs/backend_frontend_integration_handbook.md` hiện không có trong workspace; chưa có tài liệu thay thế được xác nhận.

## Mã nguồn liên quan

- `frontend/src/App.tsx`
- `frontend/src/views/`
- `frontend/src/components/`
- `frontend/src/services/authApi.ts`
- `frontend/src/services/catalogApi.ts`
- `frontend/src/services/predictionApi.ts`
- `frontend/src/utils/imageFileValidation.ts`
- `frontend/src/**/*.test.ts`
- `frontend/src/**/*.test.tsx`
- `DESIGN.md`, `AGENTS.md`, `.agents/rules/project_rules.md`
- `frontend/components.json`, `frontend/src/index.css`, `frontend/package.json`, `frontend/README.md`
- `.agents/skills/README.md`, `.agents/skills/installed_skills.json`

Các lượt bổ sung này không sửa mã nguồn trong `ai/` hoặc `backend/`.

## Giới hạn còn lại

Nho ngày2026-10-12: supplied JPG dùng chung cho14-scene home/film/catalog/map info, thêm ghim vùng trồng Ninh Thuận và PNG trang trí nền trong suốt; giữ cơ chế sway/pause/reduced có sẵn. Fresh136 tests và build/typecheck PASS. [Phạm vi, nguồn vùng trồng, prompt/asset và giới hạn](agri_57_grape_surfaces.md).

Ảnh danh mục backend ngày2026-10-12: sửa exact alias tên canonical Cam/Che/Lua/Ngo/Ot… sang local crop ID để dùng JPEG thật từ assets/banner và metadata đúng cây. Fresh132 tests PASS; Nho chưa có ảnh trong bộ supplied, không gán ảnh cây khác. [Nguyên nhân, kiểm chứng và giới hạn](agri_57_catalog_photo_aliases.md).

Tổ chức ảnh ngày2026-10-12, theo user clarification:13 JPEG trong `frontend/src/assets/banner/`,14 PNG trong folder ngang hàng `frontend/src/assets/banner-leaves/`. Giữ byte/static import/UI/motion. [Phạm vi và bằng chứng từng lượt](agri_57_banner_asset_folder.md).

Follow-up ngô 2026-10-10: chỉ thu nhỏ foliage ngô30%, giữ neo góc/sway và mọi crop khác. Fresh118 tests PASS trước batch cuối chỉ đổi CSS; final build/typecheck/format và3 viewport Chromium PASS. [Bằng chứng và giới hạn](agri_57_banner_anchored_foliage.md#follow-up-thu-nhỏ-riêng-cụm-ngô-ngày-2026-10-10).

Lượt sửa cụm cây neo góc 2026-10-10: thay các cụm nhỏ bay riêng bằng một cụm cây đung đưa quanh gốc ở góc phải dưới; khôi phục thêm thân/bông lúa, chỉ lúa có lá nhỏ trôi. Giữ ảnh nền thật và khung cân đối. Fresh118 tests/build/typecheck và6 ca Chromium PASS; báo cáo giữ các lỗi lần đầu và kết quả rerun. Đây là treatment decoration hiện hành thay lượt khôi phục bên dưới. [Báo cáo cụm cây neo góc và bông lúa](agri_57_banner_anchored_foliage.md).

Lượt khôi phục lá động 2026-10-10:13 PNG decoration cũ được đưa vào src/assets/banner-leaves qua registry riêng, giữ ảnh thật toàn UI và khung cân đối. Scoped GSAP drift/pause/reduced-motion, next-image/error fallback; fresh117 tests,build/typecheck và6 ca Chromium PASS. Đây là ngoại lệ hẹp cho artwork trang trí, không khôi phục ảnh crop AI hoặc coi artwork là ảnh lá thật. [Báo cáo lá chuyển động và nguồn asset](agri_57_banner_leaf_motion.md).

Lượt cân đối banner 2026-10-10: stage desktop cùng max-width/gutter với menu, ảnh60% stage và alpha-blend hai mép, giữ crossfade1.2s/mobile3:2. Fresh build/typecheck,115 tests rerun và5 viewport kiểm tra lề PASS; giữ đầy đủ ghi nhận timeout worker ở lượt đầu. Đây là bố cục hiện hành thay thế full-bleed bên phải của lượt trước. [Báo cáo bố cục banner cân đối](agri_57_banner_balance.md).

Lượt sửa theo phản hồi 2026-10-10: thay contain bằng khung cover thống nhất, focal từng ảnh, chỉ hòa mép trái vào nền và crossfade1.2s. Fresh115/115 tests, final build/typecheck, scoped lint/format và5 ca Chromium frame/blend/reduced PASS. Đây là treatment hiện tại, thay thế framing dưới. [Báo cáo khung nhất quán và crossfade](agri_57_banner_consistency.md).

Lượt framing banner 2026-10-10: bỏ cover toàn chiều ngang và scrim rộng; giữ trọn ảnh trong nửa phải desktop, mobile ảnh dưới chữ, chừa mép cho zoom. Fresh 115/115 tests, typecheck/build, scoped lint/format và 5 ca Chromium framing/motion PASS. Không đổi logo/map/phim. [Báo cáo framing và giới hạn](agri_57_banner_photo_framing.md).

Lượt tiếp theo 2026-10-10: đồng bộ ảnh thật trên danh mục/chi tiết cây, preview trang chủ, thông tin ghim bản đồ và các ảnh lúa phụ trợ; xóa 28 PNG AI cũ. Giữ logo và texture bản đồ theo user clarification. Fresh 115/115 tests, typecheck/build và 4 ca browser responsive/reduced-motion PASS. [Báo cáo thay ảnh toàn giao diện và cleanup](agri_57_real_catalog_photos.md). Không dùng ảnh cây chung làm bằng chứng bệnh/lá khỏe; nguồn/quyền dùng ảnh còn cần xác minh. Đoạn dưới ghi lượt trước, không phải trạng thái asset hiện tại.

Lượt cập nhật 2026-10-10: thay đủ 13 ảnh banner/cuộn phim bằng JPEG người dùng cung cấp và đổi lớp lá AI sang zoom/chuyển ảnh nhẹ. Fresh 114/114 tests, typecheck, production build và 8 ca browser responsive/reduced-motion PASS; strict TS/TSX lint PASS, CSS còn 11 warning print cũ. [Báo cáo ảnh thật và giới hạn nguồn/quyền sử dụng](agri_57_real_banner_photos.md). Không thay ảnh catalog/map hay dữ liệu mô hình trong lượt này.

- CAPTCHA phía frontend chỉ phục vụ demo, chưa thay thế xác minh chống bot phía server.
- Grad-CAM và kết quả bệnh production phụ thuộc AI service/model thật.
- Nghiệm thu UI hiện tại, chuyển động banner, camera thật, in PDF và E2E đăng nhập/upload/lịch sử vẫn còn trong checklist của báo cáo UI.
- Chưa có Pull Request cho thay đổi hiện tại.


## Admin integration ? 2026-10-21

Integrated the retained AGRI-80 admin snapshot into AGRI-57 while preserving user work. Remote admin commits were already ancestors; all changes remain uncommitted. Fresh 340 tests, production build and browser regression checks passed. [Source, safety backup, checks and limits](agri_57_admin_ui_merge_2026_10_21.md).


## Automatic catalog search - 2026-10-21

Plants, common diseases and saved samples now search after 500 ms of inactivity, with Enter and clear applying immediately. [Implementation and fresh verification](agri_57_catalog_search_2026_10_21.md).


## DESIGN.md dated-note cleanup

User requested removing dated change notes from `DESIGN.md`. Removed 51 dated entries, preserved undated rules/tokens, and left frontend/backend/AI source unchanged (before/after runtime Git diff SHA-256 matched). Evidence: ignored `.cache/design-date-cleanup/verification.json`. Documentation only; tests/build not rerun, no commit/push. Historical reports and task logs remain unchanged except this record.


## Requested local commits - 2026-10-22

Grouped existing UI/admin work into nine Conventional Commits with verified AGRI-57/AGRI-80 keys. Libraries and generated/private artifacts excluded. Fresh 353 tests, strict lint, production build/typecheck and proposed commitlint passed; 18 untouched format diagnostics remain documented. [Scope, evidence and limits](agri_57_local_commits_2026_10_22.md).


## Main synchronization - 2026-10-27

Fast-forwarded AGRI-57 to origin/main `018bf32` (39 incoming commits), preserving local generated declarations and ignored assets. No conflicts or push. Git verification passed; runtime checks not run and locked dependencies need synchronization. [Evidence and limits](agri_57_main_sync_2026_10_27.md). This records synchronization only, not application/CI acceptance.


## Shared public auth media - 2026-10-31

Prepared 8.85 MB web MP4 from the 75.9 MB original and configured the supplied public R2 host for login/register media. Relevant tests 13/13, scoped Biome and production build/typecheck passed; local Chromium playback verified. **Follow-up: user uploaded both objects; live HTTP delivery and browser playback now pass.** [Source, artifact hashes, verification and remaining work](agri_57_public_auth_media_2026_10_31.md).
