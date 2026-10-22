# AGRI-80 — Tìm kiếm tự động trong danh sách admin

## Thay đổi

Theo yêu cầu onChange 0,5 giây, `frontend/src/features/admin/AdminRecordList.tsx` áp dụng tìm kiếm sau 500ms kể từ lần sửa ô nhập cuối cùng. Component này được dùng bởi Người dùng, Phiên đăng nhập và Ảnh đã tải lên. Hủy timer trước đó khi nhập tiếp, submit hoặc unmount; dùng ref, không thêm thư viện. Enter/nút Tìm kiếm vẫn áp dụng ngay, không để timer cũ đặt lại phân trang sau submit.

Giữ lọc tên/email không phân biệt hoa thường, dấu tiếng Việt, trim và initialQuery từ tìm kiếm header. Áp dụng query đưa về trang 1; xóa query khôi phục danh sách sau cùng khoảng chờ. Không thay đổi bố cục, số bản ghi mỗi trang, tìm kiếm header hay backend; danh sách vẫn dùng dữ liệu mock.

## Kiểm chứng mới

- RED: 4 ca thất bại/8 ca đạt trong `AdminRecordList.unit.test.tsx` trước sửa, do chưa tự lọc ở mốc 500ms và chưa áp dụng từ khóa cuối; `.cache/admin-search-red.log`.
- GREEN: `pnpm test --maxWorkers=2 --testTimeout=15000` trong container, exit 0: **221/221 test, 37 tệp, 30.72s**. Test mới kiểm tra ba loại resource, ranh giới 499/500ms, đặt lại timer khi gõ, tìm email, bỏ dấu, xóa query, reset trang, cleanup unmount và submit không làm nhảy trang về sau. `.cache/admin-search-green.log`.
- Biome format/check hai tệp TypeScript thay đổi đạt; `git diff --check` đạt, chỉ có cảnh báo LF/CRLF của working tree.
- `docker compose build frontend` đạt: compile 4.6s, TypeScript 2.8s, service frontend localhost:3000 được cập nhật. `.cache/admin-search-build.log`.
- `python frontend/tests/browser/admin_search.py` đạt: cả ba trang ở **1280/768/375px**, không nhấn nút submit khi tìm; bỏ dấu/hoa thường, reset phân trang, không có kết quả và xóa query đều đúng. Không tràn document, không page error, chỉ có request xác thực ban đầu. Ảnh bị ignore ở `.cache/admin-search/`.

Chưa đo coverage mới hoặc xác nhận GitHub Actions, thiết bị thật hay trình duyệt khác. Không commit/push; giữ nguyên stash và thay đổi trước đó.
