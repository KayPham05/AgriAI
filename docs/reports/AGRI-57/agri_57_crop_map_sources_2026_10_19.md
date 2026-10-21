# AGRI-57 — Nguồn vùng trồng mở tab mới (2026-10-19)

Nhánh xác minh: `AGRI-57-frontend-summary`. Thực hiện theo yêu cầu mở nguồn ở tab mới và chỉ dùng bài báo/bài nghiên cứu liên quan trực tiếp đến cây tương ứng. Giữ nguyên các thay đổi responsive chưa commit của lượt trước.

## Thay đổi

- `frontend/src/components/common/CropMap.tsx`: liên kết dùng chung cho hero inline và details có `target="_blank"`, `rel="noopener noreferrer"` và title thông báo mở tab mới. Giữ nguyên trạng thái bản đồ khi đọc nguồn.
- `frontend/src/data/cropRegions.ts`: rà đủ14 cây; thay12 URL, giữ bài tin sầu riêng và bài nghiên cứu khoai tây đúng chủ đề. Loại nguồn nghị quyết, thống kê tổng hợp, danh sách chỉ dẫn địa lý, trang giới thiệu chung; chỉnh context theo bài được chọn, không đổi marker/tọa độ hoặc danh mục cây.
- `frontend/tests/component/views/CropMap.test.tsx`: cập nhật kỳ vọng nguồn nho/cà phê, thêm kiểm tra tab mới và rel. Đã thấy hai ca nguồn thất bại trước sửa dữ liệu, rồi ca target thất bại trước sửa liên kết; sau sửa full suite đạt.
- `DESIGN.md`: ghi quyết định mở tab và phạm vi nguồn theo yêu cầu. Không thêm thư viện, sửa backend hay lockfile.

## Danh sách nguồn đã đối chiếu trực tuyến

Các bài được kiểm tra về đúng cây và vùng, không chỉ dựa vào tên miền. Tên địa phương giữ theo bối cảnh bài nguồn; không dùng bài cũ làm số liệu sản xuất hiện tại hoặc chứng nhận ranh giới hành chính mới.

| Cây | Bài và đơn vị xuất bản |
|---|---|
| Cam sành | [Trồng cam hữu cơ, hướng đi bền vững cho nhà vườn — Báo Hà Giang](https://baohagiang.vn/kinh-te/202201/trong-cam-huu-co-huong-di-ben-vung-cho-nha-vuon-8C02CF2/) |
| Chè | [Tri thức trồng, chế biến chè Tân Cương — VietnamPlus/TTXVN](https://www.vietnamplus.vn/tri-thuc-trong-che-bien-che-tan-cuong-di-san-van-hoa-phi-vat-the-qg-post855479.vnp) |
| Ngô | [Mô hình trồng ngô ngọt vụ Đông Xuân theo chuỗi liên kết tại Sông Mã — Sơn La](https://sonlatv.vn/mo-hinh-trong-ngo-ngot-vu-dong-xuan-theo-chuoi-lien-ket-tai-song-ma-19402.html) |
| Cà phê | [Xây dựng chuỗi ngành hàng cà phê Việt Nam chất lượng cao — Báo Chính phủ](https://baochinhphu.vn/xay-dung-chuoi-nganh-hang-ca-phe-viet-nam-chat-luong-cao-102230312155540856.htm) |
| Sầu riêng | [Huyện Krông Pắc tổng kết niên vụ sầu riêng năm2024 — bài tin Cổng Đắk Lắk](https://daklak.gov.vn/en/-/huyen-krong-pac-tong-ket-nien-vu-sau-rieng-nam-2024) |
| Cà chua | [Chua chát… cà chua Đơn Dương — Báo Nhân Dân](https://nhandan.vn/chua-chat-ca-chua-don-duong-post273925.html) |
| Khoai tây | [Nghiên cứu phát triển sản xuất khoai tây — kỷ yếu KHCN Lâm Đồng](https://lamdong.gov.vn/sites/book/kyyeu/nghiencuuphattrienkhoaitay45.htm) |
| Chuối | [Mở hướng cho chuối tươi xuất ngoại — Báo Nhân Dân](https://nhandan.vn/mo-huong-cho-chuoi-tuoi-xuat-ngoai-post742535.html) |
| Nho | [Công bố chỉ dẫn địa lý cho sản phẩm nho Ninh Thuận — VietnamPlus/TTXVN](https://www.vietnamplus.vn/cong-bo-chi-dan-dia-ly-cho-san-pham-nho-ninh-thuan-post135387.vnp) |
| Lúa | [Công nghệ số mở đường cho canh tác lúa bền vững tại Đồng bằng sông Cửu Long — Báo Chính phủ](https://baochinhphu.vn/cong-nghe-so-mo-duong-cho-canh-tac-lua-ben-vung-tai-dong-bang-song-cuu-long-102251023172321188.htm) |
| Xoài | [Sản phẩm xoài Cao Lãnh chính thức có thương hiệu — VietnamPlus/TTXVN](https://www.vietnamplus.vn/san-pham-xoai-cao-lanh-chinh-thuc-co-thuong-hieu-post177670.vnp) |
| Ớt | [Phân tích chuỗi giá trị ớt tỉnh Đồng Tháp — Tạp chí Khoa học Đại học Cần Thơ,2015](https://ctujsvn.ctu.edu.vn/index.php/ctujsvn/article/view/1981) |
| Bưởi | [Bưởi da xanh của Bến Tre: Sẵn sàng vươn mình ra biển lớn — VietnamPlus/TTXVN](https://www.vietnamplus.vn/buoi-da-xanh-cua-ben-tre-san-sang-vuon-minh-ra-bien-lon-post832614.vnp) |
| Dưa hấu | [Xây dựng, phát triển nhãn hiệu Dưa hấu Gò Công — Báo Đồng Tháp](https://baodongthap.vn/xay-dung-phat-trien-nhan-hieu-dua-hau-go-cong-a52097.html) |

Bài cà chua cũ chỉ trả metadata khi mở bằng công cụ đọc web nên thay bằng bài Nhân Dân đã đọc được. PDF nghiên cứu ớt trả lỗi fetch của công cụ; dùng trang bài nghiên cứu chính thức có abstract và liên kết toàn văn. Nguồn khoai tây là nghiên cứu trong kỷ yếu, không gán nhãn đã bình duyệt nếu chưa có bằng chứng.

## Kiểm chứng mới

- Full Vitest215/215,34 tệp,38.57s. Typecheck, lint165 tệp, format ba tệp sửa đạt. Production build đạt (compile4.9s, TypeScript979ms); chỉ recreate frontend localhost3000.
- Chromium1024×945: bấm nguồn của đủ14 cây, nhận popup có URL đúng, `window.opener === null`, trang gốc giữ URL và panel thông tin vẫn mở. Response của tab ngoài được cô lập để tránh quảng cáo; nội dung nguồn thật được đối chiếu riêng qua web như bảng trên. Bằng chứng local bị Git bỏ qua: `.cache/responsive-2026-10-19/source_tabs.py`, `source-tabs.json`.
- `git diff --check` đạt. Chưa chạy GitHub Actions, coverage mới hoặc kiểm tra mọi trình duyệt/thiết bị vật lý. Nguồn ngoài có thể đổi URL/nội dung sau thời điểm rà soát. Chưa staging, commit hoặc push.
