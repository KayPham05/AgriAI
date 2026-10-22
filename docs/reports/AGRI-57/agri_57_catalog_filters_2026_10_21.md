# AGRI-57 — Additional catalog filters (2026-10-21, lượt127)

## Cập nhật lượt136 — Danh sách lọc cố định và cuộn bên trong

Theo yêu cầu sửa hành vi dropdown Cây trồng, `frontend/src/components/common/CatalogControls.tsx`
đổi riêng FilterSelect sang Radix popper, align-start/side-bottom, giới hạn chiều cao
bằng spacing64 (256px) hoặc không gian khả dụng nhỏ hơn. Thêm SelectGroup bao items.
Không đổi primitive Select dùng chung, tokens, dữ liệu hay tiêu chí lọc; không khôi phục
các bộ lọc đã gỡ ở lượt128. Các FilterSelect hiện có dùng cùng hành vi này.

Regression browser mới `frontend/tests/browser/catalog/filter_scroll.py` tái hiện RED:
menu cũ cao660px, cùng tọa độy158 với trigger, không nằm bên dưới. GREEN sau sửa tại
1280/768/375/320px: menu cao tối đa256px, bám dưới trigger, wheel tăng scrollTop bên trong
và không cuộn trang, End/Enter chọn được mục cuối, mở lại không nhấc menu theo mục chọn,
Escape giữ lựa chọn. Ban đầu test cần dùng CSS selector vì Radix aria-hides trigger khi mở;
thêm chờ focus của End trước Enter, không sửa hành vi bàn phím ứng dụng. Screenshot
`.cache/filter-scroll/crop-filter-1280.png` đã xem trực tiếp; fixtures auth/API cô lập.

Fresh14/14 tests (HistoryPage/CatalogPagination/CatalogAccessibility),3files,4.15s,
runner12:01:29; Biome và TypeScript đạt. Docker frontend build compile3.8s/TS753ms đạt,
recreate riêng frontendlocalhost3000; browser script cuối đạt. Không fullsuite/coverage/CI
mới, không backend/DB/shared primitive/globalCSS thay đổi, chưa commit/push.

## Cập nhật lượt128 — Đã gỡ theo yêu cầu người dùng

Người dùng yêu cầu xóa bộ lọc mới làm. Gỡ toàn bộ phần thêm ở lượt127 khỏi PlantsPage/DiseasesPage/HistoryPage: count/status/confidence/sort state và UI, reset button mới, panel border/padding và counter lịch sử mới. Khôi phục bộ lọc/search/list-grid/paging cũ; giữ các header đã xóa/sr-only h1 và thay đổi không liên quan. Xóa hai test riêng cho tính năng đã gỡ (`CatalogFilters.test.tsx`, browser/catalog/filters.py) cùng đoạn README tương ứng; giữ bộ regression catalog cũ và lịch sử báo cáo bên dưới.

Fresh catalog accessibility/pagination/images **14/14**,3 tệp,03:03:07,4,12s đạt. Biome3 tệp và Docker build compile4s/TypeScript2,4s đạt; cập nhật riêng frontendlocalhost3000. Browser fixture `.cache/verify_filter_removal.py` đạt cả ba route1440/768/375/320: số combobox cũ0/1/2, không còn nút reset mới và không tràn. Không full suite/coverage mới; số257/64,51% bên dưới chỉ là lịch sử tính năng đã gỡ. Chưa commit/push.

## Phạm vi và thay đổi

Người dùng yêu cầu thêm bộ lọc cho cây trồng, bệnh thường gặp và mẫu đã lưu. Xác minh nhánh `AGRI-57-frontend-summary`, giữ unrelated work và các khối header đã xóa. Chỉ sửa ba view/kiểm thử/tài liệu; dùng FilterSelect/SearchField/Button hiện có, semantic surface/border/radius/spacing; không shared/global CSS/Design System/API/dependency.

- `frontend/src/views/PlantsPage.tsx`: giữ search/nhóm cây/ưu tiên mặc định, thêm số bệnh tham khảo (all/0/1–5/>=6), tên A–Z/Z–A. Đếm conditions không isHealthy, không gọi đây là số lớp mô hình hỗ trợ. Thay đổi filter/sort resetPage; reset toàn bộ cũng trở về1.
- `frontend/src/views/DiseasesPage.tsx`: giữ search/cây/nhóm bệnh, thêm trạng thái từ dữ liệu hiện có, chuẩn hóa Common/Severe/Normal thành Phổ biến/Nghiêm trọng/Bình thường; không tự gán mức độ cho bệnh. Thêm sort tên và reset toàn bộ/paging.
- `frontend/src/views/HistoryPage.tsx`: giữ search/cây/kết quả/list-grid/delete flow; thêm confidence high>=0.85, medium>=0.6 và<0.85, low<0.6 theo ngưỡng hiện có ở predictionApi; thêm sort confidence asc/desc. Mặc định giữ thứ tự input. Filter trả mảng mới trước sort, không mutate props. Hiển thị số lượng mẫu sau lọc. Không lọc ngày vì timestamp hiện là chuỗi hiển thị địa phương, không suy diễn timestamp ISO.
- Ba panel có nền surface, border/rounded-card/padding thống nhất, responsive, reset button disabled khi đang mặc định. EmptyResults tái sử dụng cùng reset đầy đủ. Không gửi request mới hoặc thay dữ liệu gốc.

## Kiểm chứng mới

- `frontend/tests/component/views/CatalogFilters.test.tsx`: RED3/3 trước triển khai do thiếu dropdown mới; GREEN3/3 lúc02:55:45 (4,16s). Kết hợp plant count/search/sort/reset; disease status/cây/nhóm/reset; confidence boundary0.85/0.6/0.599 và sort bất biến. Sau đó bổ sung ca filter vẫn còn nhiều trang phải về1, focused **4/4**,02:58:36,4,94s đạt.
- Fresh full coverage **257/257 test,44 tệp**,02:56:04,131,24s, exit0; lần này chứa3 test mới ban đầu. Branch **1089/1688=64,51%**>=60% giữ nguyên; statements1576/2554=61,70%, functions522/756=69,04%, lines1438/2280=63,07%. Branch Plants82,14%, Diseases87,50%, History86,53%. Nguồn `.cache/coverage/frontend/coverage-summary.json`. Ca pagination thứ4 bổ sung sau lần full được kiểm tra focused riêng, không gọi là full258. Reorder controls History cuối chỉ đổi thứ tự JSX, browser kiểm tra bản build cuối.
- Final Biome4 tệp và TypeScript noEmit đạt. Final Docker build compile4,5s/TypeScript1092ms đạt; recreate riêng frontendlocalhost3000 `--no-deps`, không backend/DB/volume.
- Browser test mới `frontend/tests/browser/catalog/filters.py`: cả3 panel tại1440/1024/768/375/320/667px không tràn; chọn filter/sort, long-label selected320px, reset disabled khi default, search no-match/reset, mẫu confidence medium chỉ còn fixture0.7 rồi reset3 mẫu đều đạt; pageerrors rỗng. Đã xem desktop3panel và History320px. Hướng dẫn trong tests README; ảnh/JSON ignored `.cache/catalog-filters/`.

## Giới hạn

Browser dùng API/auth fixtures, không nghiệm thu backend/model/storage. Chưa CI/Safari/Firefox/thiết bị thật/WCAG toàn diện. Không thêm date filtering, persistence/query string hay backend pagination. Không đổi ngưỡng/confidence semantics/model labels. Chưa commit/push/PR/Jira Done.
