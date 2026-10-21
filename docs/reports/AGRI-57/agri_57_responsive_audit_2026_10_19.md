# AGRI-57 - Rà soát responsive toàn frontend

Ngày: 2026-10-19. Nhánh đã xác minh: `AGRI-57-frontend-summary`, bắt đầu từ `893cef4` sau pull main, working tree ban đầu sạch. Phạm vi: kiểm tra và sửa responsive của giao diện hiện có, giữ thiết kế và hành vi nghiệp vụ.

## Kết quả và thay đổi

Đã rà soát các trang đang truy cập được và trạng thái tương tác liệt kê bên dưới. Không còn tràn ngang trong **85 trạng thái trang**, **108 trạng thái tương tác** và **33 cấu hình chữ 200%** đã đo bằng Chromium. Đây là kết quả của ma trận thử cụ thể, không phải chứng nhận mọi thiết bị/trình duyệt hay toàn bộ WCAG.

| Lỗi quan sát được | Bằng chứng trước sửa | Cách sửa và kết quả |
| --- | --- | --- |
| Header giới thiệu tràn ngang ở 320px | Document rộng 341px, nút tạo tài khoản ra ngoài màn hình. | Giảm đệm nút ở màn hình nhỏ, cho nhóm điều khiển/header xuống dòng khi cần; document còn 320px. |
| Hộp đăng nhập/chi tiết mất lề khi breakpoint tăng max-width | Auth tại 768px rộng 768px, x=0. | Giới hạn chiều rộng Dialog trực tiếp theo viewport, giữ max-width riêng; auth rộng 736px, x=16px. |
| Hộp khóa admin không cuộn khi lý do dài | Tại 320x568: cao 764.5px, y=-98.25px; tại 667x375: cao 596.5px, y=-110.75px. Chromium không bấm được nút xác nhận nằm ngoài viewport. | Dialog/AlertDialog dùng token giới hạn chiều cao và cuộn dọc. Sau sửa: cao 536px/343px, y=16px; thao tác xác nhận trong màn hình ngang đạt. |
| CTA giới thiệu tràn khi chữ 200% | Header/CTA đầu trang tràn; sau sửa đầu tiên, CTA cuối trang còn làm document rộng 390px tại viewport 375px. | Cho CTA xuống dòng, chiều cao tự tăng và giới hạn chiều rộng; toàn bộ 33 ca chữ 200% không tràn ngang ở lần xác nhận cuối. |

Mã thay đổi chỉ gồm:

- `frontend/src/views/IntroPage.tsx`: header và CTA thích ứng màn hình nhỏ/chữ lớn.
- `frontend/src/components/ui/dialog.tsx`: giữ lề ngang, giới hạn chiều cao và cho cuộn khi nội dung dài.
- `frontend/src/components/ui/alert-dialog.tsx`: áp dụng cùng giới hạn cho hộp xác nhận xóa.
- `frontend/src/index.css`: `--dialog-max-height: calc(100dvh - 2rem)`; token auth cũ tham chiếu token chung.

Giữ Manrope, màu xanh/nền ấm, ảnh, nội dung, route, thanh điều hướng, hiệu ứng và component shadcn/Radix sẵn có. Không đổi dependency, lockfile, backend, dữ liệu thật hoặc cấu hình CI.

## Ma trận trình duyệt và dữ liệu

Kiểm tra trên **bản production Docker tại http://localhost:3000**, dựng từ source hiện tại. Dev cổng 3001 trên Windows bị chậm lúc biên dịch nên đã dừng; file `next-env.d.ts` tự sinh được trả về đúng nội dung trước chạy dev. Chỉ rebuild/recreate frontend, giữ nguyên các dịch vụ và volume khác.

| Nhóm | Nội dung đã kiểm tra |
| --- | --- |
| Trang và danh mục | `/`, `/home`, `/plants`, `/diseases`, `/diagnose`, `/history`, `/about`, `/profile`; chi tiết cà chua, chi tiết bệnh đốm vòng cà chua; trang 404. |
| Admin | Tổng quan, người dùng, ảnh, phiên; menu di động, khóa với lý do dài, khôi phục, cảnh báo và trạng thái sau khóa. |
| Tương tác | Bản đồ mở thông tin inline; đăng ký với điều khoản mở; menu và thông báo; tìm kiếm không kết quả; Select; lịch sử dạng lưới, chi tiết, bản in và hộp xác nhận xóa; upload/preview, kết quả và lỗi phân tích; hồ sơ với tên/email dài và form sửa. |
| Độ rộng | 320, 375, 768, 1024, 1280 và 1440px; chi tiết cây/bệnh dùng 320/375/768/1280px. |
| Chiều cao nhỏ | 320x568, 375x667, 768x600, 667x375 cho các trạng thái tương tác; 1280x900 cho desktop. |
| Chữ lớn | Font gốc 200%, 11 trang tại 375/768/1280px; không dùng CSS zoom để thay thế phép thử này. |
| Cảm ứng và bàn phím | Chromium mobile với touch CDP tổng hợp: cuộn ngang phim và cuộn dọc trang qua phim; ArrowRight cuộn phim; Tab trong login/menu, Escape và trả focus menu. |
| Chuyển động | Ma trận chính dùng reduced motion; thêm smoke trang chủ ở chế độ chuyển động bình thường. |

API xác minh tài khoản, danh mục, lịch sử và kết quả dùng fixture synthetic được chặn tại trình duyệt. Mọi yêu cầu ghi ngoài fixture bị từ chối. Không đăng ký/sửa/xóa tài khoản hay bản ghi thật, không chạy suy luận thật. Tên/email dài và lý do khóa dài chỉ nằm trong context trình duyệt cô lập. Không có lỗi JavaScript trang trong các lượt xác nhận được ghi nhận.

Đã xem ảnh các nhóm trang mobile, trang chi tiết, admin và các hộp thoại; kiểm tra số đo scrollWidth/viewport cùng bounding box của hộp thoại, không dùng screenshot riêng để suy ra khả năng cuộn cảm ứng. Ảnh full-page giữ nội dung dài; phép đo vị trí và thao tác xác nhận kiểm tra trên viewport thật của context.

## Kiểm tra mới trên bản cuối

| Lệnh/nguồn | Kết quả |
| --- | --- |
| `corepack pnpm test --maxWorkers=2` trong `frontend/` | **215/215**, 34 tệp, **51.79s**, không lỗi/bỏ qua. |
| `corepack pnpm typecheck` | Đạt. |
| `corepack pnpm lint` | Đạt, 165 tệp. |
| Biome format bốn tệp source thay đổi | Đạt. |
| `corepack pnpm format:check` toàn checkout Windows | Ban đầu không đạt: 57 lỗi định dạng do CRLF ở các tệp nguyên trạng sau pull. Thử khôi phục LF nguyên bản Git cho các tệp không đổi thì toàn bộ 165 tệp đạt; đã trả các tệp không liên quan về CRLF ban đầu để tránh làm nhiễu working tree. Không báo cáo toàn checkout hiện tại đạt format. |
| `docker compose build frontend` | Đạt trên bản cuối: compile 4.2s, TypeScript 1011ms, 11 trang tĩnh và 2 route động. Không coi thời gian một lần build là chuẩn hiệu năng. |
| `regressions.py` | Bốn lỗi layout được ghi nhận thất bại trước sửa, sau sửa cả bốn qua và xác nhận nút khóa dùng được trên landscape. |
| `audit.py`, `interactions.py`, `text_scale.py` | 85 + 108 + 33 trạng thái, 0 document tràn ngang; 0 hộp thoại vượt chiều cao ở ma trận tương tác. |
| `final_checks.py` | 13 kiểm tra đạt: 6 độ rộng intro, cuộn phim bàn phím/cảm ứng và cuộn trang, focus/đóng dialog/menu, smoke chuyển động thường; 0 lỗi trang. |

Chưa chạy coverage mới hoặc GitHub Actions. Full test được chạy sau thay đổi CTA cuối cùng; kết quả trước đó 215/215 trong 130.13s chỉ là lịch sử của lần kiểm tra trung gian.

## Bằng chứng cục bộ và cách chạy lại

Các script và đầu ra nằm trong `.cache/responsive-2026-10-19/`, bị Git bỏ qua:

- `audit-before.json`, `interactions-before.json`, `text-scale-before.json`, `regressions-before.json`: số đo trước sửa.
- `audit.json`, `interactions.json`, `text-scale.json`, `regressions.json`, `final-checks.json`: số đo/lỗi trang và kết quả xác nhận.
- `before-intro-320.png`, `before-admin-lock-320.png`, `final-intro-{320,768,1280}.png` và ảnh từng trạng thái có tên trong JSON; `contact-*.png` phục vụ xem nhiều ảnh cùng lượt.
- `audit.py`, `interactions.py`, `regressions.py`, `text_scale.py`, `final_checks.py`: kiểm tra bằng Python Playwright đã có trên máy; không thêm framework/dependency vào repo.

Ví dụ từ repository root, khi frontend bản cần kiểm tra đang chạy:

```powershell
$env:AUDIT_BASE = 'http://localhost:3000'
python .cache/responsive-2026-10-19/regressions.py
python .cache/responsive-2026-10-19/audit.py
python .cache/responsive-2026-10-19/interactions.py
python .cache/responsive-2026-10-19/text_scale.py
python .cache/responsive-2026-10-19/final_checks.py
```

Một lượt kiểm tra keyboard/tap ban đầu chưa đạt vì quán tính của gesture tổng hợp trước đó tiêu thụ lần tap mở login; tách sang navigation mới rồi kiểm tra đạt, không sửa ứng dụng để né lỗi. Lượt tương tác trước sửa dừng đúng ở nút xác nhận admin ngoài viewport; sau sửa đã hoàn thành toàn bộ.

## Giới hạn và việc còn lại

- Chưa thử trên thiết bị vật lý, Safari/iOS, Firefox, bàn phím ảo, trình đọc màn hình hoặc đầy đủ tổ hợp dữ liệu/route chi tiết. Touch ở đây là CDP synthetic trên Chromium.
- CameraCaptureModal không được gọi từ luồng DiagnosePage hiện tại; không có kiểm chứng camera phần cứng trong lượt responsive. Nhánh Grad-CAM cũ không được tạo từ DTO kết quả hiện hành nên chưa kiểm tra trực quan trong lượt này.
- Chưa kích hoạt render-error boundary chủ động hay xác nhận bản in PDF thực; đã xem giao diện bản in và trang 404, không bật hộp in hệ điều hành.
- Đây là nghiệm thu responsive có giới hạn của các màn hình/trạng thái đã nêu; không thay thế nghiệm thu suy luận thật, backend, hiệu năng, toàn bộ accessibility hay CI. DoD tổng thể còn cần review.
- Chưa staging/commit/push hoặc sửa PR/Jira trong yêu cầu này.
