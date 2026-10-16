# AGRI-80 — Unit test và integration test frontend admin

Ngày kiểm tra: 2026-10-16. Nhánh: `AGRI-80-create-crm-admin-page`.

## Thay đổi

Bổ sung 26 kiểm thử cho hành vi hiện có, không đổi mã giao diện hay dữ liệu mẫu của ứng dụng và không thêm dependency.

| Tệp trong `frontend/src/features/admin/` | Số ca mới | Phạm vi |
| --- | ---: | --- |
| `AdminMockProvider.unit.test.tsx` | 7 | Khóa/khôi phục, kết thúc phiên, cộng dồn cảnh báo theo chủ ảnh, xóa ảnh, ID không tồn tại và ranh giới ngày UTC+7. |
| `AdminRecordList.unit.test.tsx` | 7 | Phân trang 12 bản ghi, tìm không dấu/không phân biệt hoa thường, submit tìm kiếm, rỗng/không khớp, co danh sách, trường chủ ảnh và dữ liệu thiếu/ngày không hợp lệ. |
| `AdminActionDialog.unit.test.tsx` | 8 | Lý do toàn khoảng trắng, cắt khoảng trắng, chờ xác nhận, khóa điều khiển khi chờ, lỗi/thử lại, hủy/Escape, thao tác không cần lý do và giới hạn độ dài. |
| `AdminCrmPage.integration.test.tsx` | 4 | Khóa/khôi phục đồng bộ với phiên khi đổi mục; cảnh báo ảnh/tài khoản cùng chủ; hủy khóa; cưỡng chế đăng xuất mẫu vẫn giữ phiên Admin thật trong trình duyệt. |

Integration test render `AdminCrmPage`, `AdminAccess`, `AdminMockProvider`, danh sách và hộp thoại thật. Chỉ thay biên HTTP xác minh tài khoản và router của Next.js; kiểm tra các thao tác mock không phát sinh yêu cầu quản trị. Đây là kiểm thử tích hợp frontend trong jsdom, không phải kiểm thử trình duyệt end-to-end.

Trong `frontend/package.json`, `test:unit` giữ các test utils/services và chọn thêm `.unit.test.tsx`; `test:integration` chọn mọi `.integration.test.tsx`, bao gồm luồng chẩn đoán hiện có và admin. Không đổi dependency hoặc lockfile.

## Kết quả mới

Chạy từ `frontend/` với thư viện đã có:

| Lệnh | Kết quả |
| --- | --- |
| `corepack pnpm test:unit --maxWorkers=2` | 60/60 kiểm thử, 7 tệp; 10.37s. |
| `corepack pnpm test:integration --maxWorkers=2` | 12/12 kiểm thử, 2 tệp; 4.63s. |
| `corepack pnpm test:coverage --maxWorkers=2` | 200/200 kiểm thử, 32 tệp; 96.30s. |
| `corepack pnpm typecheck` | Đạt. |
| `corepack pnpm lint` | Đạt, 163 tệp. |
| `corepack pnpm format:check` | Đạt, 163 tệp. |

Nguồn số đo: đầu ra Vitest/V8 của lần chạy coverage trên và `.cache/coverage/frontend/coverage-summary.json`, `.cache/coverage/frontend/index.html` (đầu ra cục bộ bị Git bỏ qua).

- Nhóm `src/features/admin`: statements **84.17%**, branches **80.79%**, functions **90.26%**, lines **85.82%**. Nhóm admin đạt mục tiêu bao phủ nhánh 80%; không có nghĩa từng tệp riêng lẻ đều đạt 80%.
- Toàn frontend: branches **898/1491 = 60.22%**, vượt ngưỡng CI cấu hình 25%, chưa đạt mục tiêu 80% cho toàn frontend.
- Các test này bổ sung độ bao phủ cho hành vi đã tồn tại; không báo cáo là một lần triển khai hành vi mới theo chu kỳ RED/GREEN.

Lần thử trong sandbox dừng ở bước khởi động worker, đã hủy và chạy lại ngoài sandbox thành công. Typecheck từng phát hiện tùy chọn truy vấn `exact` không được hỗ trợ; đã dùng biểu thức chính quy giới hạn tên nút và chạy lại thành công.

## Giới hạn

Không chạy lại build hoặc trình duyệt responsive trong đợt chỉ bổ sung test. Chưa xác nhận GitHub Actions, không thay đổi ngưỡng coverage, không staging/commit/push. Các nhánh chuyển động, điều hướng di động và trạng thái dự phòng vẫn còn phần chưa được bao phủ; số đo đầy đủ nằm trong báo cáo HTML cục bộ. DoD tổng thể vẫn cần duyệt PR.

## Kiểm tra trước commit theo yêu cầu — 2026-10-16

Người dùng yêu cầu tạo commit local, chưa push và không đưa thư viện vào commit. Chạy lại `corepack pnpm test --maxWorkers=2`: **200/200**, 32 tệp, **31.08s**; typecheck/lint/format đạt (163 tệp). Không đo lại coverage trong bước commit; số đo V8 ở trên thuộc lần chạy trước đó. Commitlint thông điệp `test(admin): AGRI-80 add frontend unit and integration tests` đạt, không lỗi/cảnh báo; `git diff --check` đạt. Chỉ chọn bốn tệp test, ba tệp tài liệu AGRI-80 và script trong `frontend/package.json`; không có dependency/lockfile, thư viện/skill, cache hoặc đầu ra build. Dòng chưa commit ở phần giới hạn ghi nhận thời điểm hoàn thành bổ sung test trước yêu cầu commit này.
