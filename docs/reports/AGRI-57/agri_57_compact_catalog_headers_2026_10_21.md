# AGRI-57 — Compact catalog headers (2026-10-21, lượt126)

Theo yêu cầu xóa hai khối đầu trang, bỏ header/mô tả/border khỏi `frontend/src/views/PlantsPage.tsx` và `frontend/src/views/DiseasesPage.tsx`; giữ h1 sr-only cho ngữ nghĩa trợ năng. Đổi margin bộ lọc từ my-7 thành mb-7 để không giữ khoảng trống của header cũ. Giữ tìm kiếm, bộ lọc, phân trang, danh mục và callbacks; không shared/global CSS/token/API/dependency.

Browser regression lưu tại `frontend/tests/browser/catalog/compact_headers.py`, cách chạy trong tests README. RED trên bản cũ do h1 chiếm chiều cao; lượt fixture đầu dùng role textbox sai, sửa searchbox trước khi xác nhận RED. GREEN sau cập nhật frontend: cả hai route ở1440/768/375/320px chỉ giữ h1 ẩn1px, không còn main header, không tràn ngang; search không khớp/đặt lại về rỗng đạt. API/auth là fixture, không E2E backend.

Fresh `CatalogAccessibility`, `CatalogPagination`, `CatalogImages`: **14/14 test,3 tệp**,02:50:40,3,77s. Biome2 tệp đạt; Docker build compile4,1s/TypeScript1433ms đạt, cập nhật riêng frontendlocalhost3000 không backend/DB/volumes. Không full suite/coverage/CI mới; chưa thiết bị thật/Safari/commit/push.
