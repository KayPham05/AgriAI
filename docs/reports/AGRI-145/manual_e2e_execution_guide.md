# AGRI-145 — Hướng dẫn chạy tay chi tiết 10 Ca Manual E2E (Runbook)

Tài liệu này cung cấp hướng dẫn từng bước, lệnh Docker/DevTools và thông điệp UI chính xác để thực thi thủ công **10 ca Manual E2E** đã chốt trong [manual_e2e_test_cases.md](manual_e2e_test_cases.md).

> **Lưu ý:** Sau khi thực hiện xong, ghi kết quả (`Pass` / `Fail` / `Blocked`) và bằng chứng vào cột tương ứng của [manual_e2e_test_cases.md](manual_e2e_test_cases.md), rồi tổng hợp lên [README.md](README.md). Không đánh dấu `Pass` nếu chỉ chạy bằng mock API.

---

## 0. Chuẩn bị môi trường & Tài khoản test

1. **Khởi động Docker stack đầy đủ (từ thư mục gốc `E:\AgriAI`):**
   ```powershell
   docker compose -f docker-compose.yml -f docker-compose.e2e.yml up -d
   docker compose ps
   ```
   Kiểm tra các container `postgres`, `ai-service`, `backend`, `frontend`, `mailpit` đều ở trạng thái `healthy`/`running`:
   - Frontend: `http://localhost:3000`
   - Backend API & Swagger: `http://localhost:5080/swagger` và `http://localhost:5080/api/health`
   - Mailpit (hộp thư test): `http://localhost:8025`

2. **Chuẩn bị 3 tài khoản (từ `.env` hoặc đăng ký mới trên UI):**
   - **`User A` (Demo User):** `user@agrivision.ai` — mật khẩu lấy từ biến `DEMO_USER_PASSWORD` trong file `.env` ở máy local.
   - **`User B` (Tài khoản phụ cô lập):** Vào `http://localhost:3000` $\rightarrow$ `Đăng nhập` $\rightarrow$ tab `Đăng ký` $\rightarrow$ tạo tài khoản mới (ví dụ `manual_user_b@example.test`).
   - **`Admin`:** `admin@agrivision.ai` — mật khẩu lấy từ biến `DEMO_ADMIN_PASSWORD` trong file `.env`.

3. **Chuẩn bị ảnh mẫu:**
   - 1 ảnh lá cây rõ nét $\ge 224 \times 224\text{ px}$ (JPG/PNG).
   - 1 ảnh nhiễu/mờ/không thuộc lá cây trong dataset (hoặc chụp vật thể bất kỳ $\ge 224 \times 224\text{ px}$) để thử ca độ tin cậy thấp.

---

## 1. Phân hệ Chẩn đoán AI (`E2E-DIAG-04`, `E2E-DIAG-06`, `E2E-DIAG-08`)

### `E2E-DIAG-04` (P1) — Cảnh báo khi độ tin cậy thấp (`LOW_CONFIDENCE_SOFTMAX`)
1. Mở trình duyệt (cửa sổ ẩn danh hoặc chưa đăng nhập) tới `http://localhost:3000/diagnose`.
2. Nhấn **`Chọn ảnh`** (hoặc nạp qua input **`Chọn ảnh lá cây`**) và chọn ảnh mờ/nhiễu/ngoài đối tượng lá cây.
3. Nhấn **`Phân tích ngay`**.
4. **Kiểm tra trên vùng `Kết quả phân tích`:**
   - Mở tab **Network** trong Chrome DevTools (`F12`), xem response của `POST /api/predictions`: xác nhận `confidence < 0.45` hoặc hiệu `max - min` của Top-3 $\le 0.05$.
   - Trên giao diện, khối cảnh báo hiển thị tiêu đề **`Độ tin cậy chẩn đoán thấp`** kèm mô tả hướng dẫn chụp lại và nút **`Chọn ảnh rõ nét hơn`** (tùy chọn xem bảng đối chiếu Top-3).
   - Không hiển thị khẳng định điều trị như ca tự tin cao.

---

### `E2E-DIAG-06` (P1) — Giữ kết quả khi ảnh tạm hết hạn và cho phép thử lại
1. Mở cửa sổ ẩn danh tới `http://localhost:3000/diagnose` (trạng thái **Guest**).
2. Tải lên ảnh lá hợp lệ $\rightarrow$ nhấn **`Phân tích ngay`** và chờ có kết quả hiển thị đầy đủ.
3. Mở **Chrome DevTools (`F12`) $\rightarrow$ Application $\rightarrow$ Session Storage** (hoặc chờ hết TTL ảnh tạm / chạy lệnh dọn ảnh hết hạn trên môi trường test cô lập):
   - *Cách test nhanh mà không cần đợi 60 phút:* Nếu có ảnh guest cũ đã quá hạn `ExpiresAt` trong DB test, chạy lệnh cleanup trên container backend test:
     ```powershell
     docker compose exec backend dotnet AgriVision.API.dll --expire-images
     ```
     *(Lưu ý quy chuẩn `TESTING.md`: chỉ chạy lệnh `--expire-images` trên DB test disposable, không chạy trên DB chứa dữ liệu thật; hoặc kiểm tra trực tiếp bằng cách block request tải ảnh `/api/predictions/guest-image/...` trả về `404`/`410` trong DevTools Network để quan sát đúng trạng thái ảnh hết hạn của UI).*
4. **Tải lại trang (`F5`)** hoặc mở lại tab `/diagnose`.
5. **Kiểm tra kết quả:**
   - Thông tin kết quả chẩn đoán (tên bệnh, độ tin cậy, Top-3) vẫn được giữ từ bản nháp phiên tab.
   - Không văng lỗi runtime; giao diện hiển thị thông báo ảnh tạm hết hạn/không khả dụng và vẫn cho phép chọn ảnh để phân tích lại.

---

### `E2E-DIAG-08` (P2) — Khả năng phục hồi khi AI Service gặp sự cố (Timeout / 503)
1. Mở `http://localhost:3000/diagnose`, chọn sẵn 1 ảnh lá hợp lệ nhưng **chưa bấm phân tích**.
2. Chạy lệnh tạm dừng container `ai-service`:
   ```powershell
   docker compose stop ai-service
   ```
3. Quay lại trình duyệt, bấm **`Phân tích ngay`**.
4. **Kiểm tra trạng thái lỗi:**
   - Trang không trắng/crash.
   - Vùng kết quả hiển thị banner lỗi tiêu đề **`Gián đoạn quá trình phân tích`**, mô tả **`Kết nối hoặc quá trình xử lý đã bị gián đoạn. Ảnh đã chọn được giữ nguyên để bạn thử lại.`** và nút **`Phân tích lại ngay`**.
5. Khởi động lại container `ai-service` và chờ container `healthy`:
   ```powershell
   docker compose start ai-service
   docker compose ps
   ```
6. Bấm nút **`Phân tích lại ngay`** (không chọn lại ảnh).
7. **Kiểm tra phục hồi:** Yêu cầu gửi lại thành công và hiển thị đầy đủ kết quả chẩn đoán mới.

---

## 2. Phân hệ Lịch sử chẩn đoán (`E2E-HIST-04`, `E2E-HIST-05`)

### `E2E-HIST-04` (P1) — Tìm kiếm và lọc lịch sử theo cây trồng & trạng thái
1. Đăng nhập **`User A`**. Nếu tài khoản chưa có tối thiểu 2 mẫu lịch sử khác nhau (ví dụ 1 mẫu khỏe mạnh và 1 mẫu có bệnh), vào `/diagnose` chạy 2 ảnh tương ứng để tạo dữ liệu.
2. Truy cập `http://localhost:3000/history`.
3. Thực hiện tuần tự các thao tác sau:
   - Nhập từ khóa tên bệnh/cây vào ô **`Tìm cây hoặc tên bệnh`** $\rightarrow$ danh sách lọc đúng các card/hàng khớp từ khóa.
   - Xóa ô tìm kiếm, chọn từng giá trị ở dropdown **`Cây trồng`** và dropdown **`Kết quả`** (`Dự đoán khỏe mạnh` / `Dự đoán có bệnh`) $\rightarrow$ danh sách chỉ hiển thị bản ghi thỏa cả 2 điều kiện.
   - Bấm hai nút chuyển chế độ hiển thị **`Dạng danh sách`** và **`Dạng lưới`** $\rightarrow$ bố cục chuyển đổi mượt, số lượng bản ghi không đổi.
   - Nhập một chuỗi không tồn tại (ví dụ `"khong-ton-tai-xyz"`) $\rightarrow$ hiển thị khung empty state **`Không tìm thấy kết quả phù hợp`** kèm nút reset bộ lọc.

---

### `E2E-HIST-05` (P2) — Kiểm tra cô lập dữ liệu lịch sử giữa hai người dùng
1. Đăng nhập **`User A`**, mở `http://localhost:3000/history`, bật **DevTools (`F12`) $\rightarrow$ Tab Network**.
2. Bấm **`Xem chi tiết`** trên 1 bản ghi của `User A`, ghi lại:
   - `predictionId` từ URL request `GET /api/predictions/{predictionId}` (ví dụ `a1b2c3d4-...`).
3. Đăng xuất **`User A`**, sau đó đăng nhập **`User B`**.
4. Mở `http://localhost:3000/history` của `User B` $\rightarrow$ xác nhận **không thấy** bản ghi của `User A` trong danh sách.
5. Lấy Bearer token của `User B` từ **DevTools Application $\rightarrow$ Local Storage (`leafai_auth_session`)** hoặc chạy trực tiếp trong **DevTools Console** của tab đang đăng nhập `User B`:
   ```javascript
   const tokenB = JSON.parse(localStorage.getItem('leafai_auth_session') || sessionStorage.getItem('leafai_auth_session')).token;
   const targetId = '<THAY_PREDICTION_ID_CUA_USER_A>';
   Promise.all([
     fetch(`/api/predictions/${targetId}`, { headers: { Authorization: `Bearer ${tokenB}` } }),
     fetch(`/api/predictions/${targetId}`, { method: 'DELETE', headers: { Authorization: `Bearer ${tokenB}` } }),
   ]).then(async ([getRes, delRes]) => console.log('GET:', getRes.status, 'DELETE:', delRes.status));
   ```
6. **Kiểm tra kết quả:**
   - Cả hai request `GET` và `DELETE` của `User B` phải trả về **`403`** hoặc **`404`** (không bao giờ trả `200`/`204`).
   - Đăng nhập lại **`User A`**, mở `/history` và xác nhận bản ghi `targetId` **vẫn còn nguyên vẹn**.

---

## 3. Phân hệ Hồ sơ nông nghiệp (`E2E-PROF-AGRI-04`, `E2E-PROF-AGRI-05`)

### `E2E-PROF-AGRI-04` (P1) — Theo dõi lịch sử dịch bệnh riêng của từng hồ sơ nông nghiệp
1. Đăng nhập **`User A`**, truy cập `http://localhost:3000/agricultural-profiles`.
2. Nếu chưa có hồ sơ nào có lượt chẩn đoán, tạo mới 1 hồ sơ (ví dụ `"Vườn test lịch sử"`), sau đó ở màn hình chi tiết hồ sơ bấm **`Chẩn đoán với hồ sơ này`** và chạy 1–2 lần chẩn đoán ở `/diagnose`.
3. Quay lại `/agricultural-profiles`, bấm **`Xem chi tiết`** trên hồ sơ đó.
4. **Kiểm tra kết quả:**
   - Số lượng ở mục **`Đã lưu vào hồ sơ`** khớp số lượt đã gắn (`X lượt chẩn đoán`).
   - Danh sách lịch sử dịch bệnh bên dưới chỉ hiển thị các bản ghi đã gắn vào hồ sơ này, sắp xếp đúng theo thời gian; bấm vào bản ghi mở được chi tiết kết quả.

---

### `E2E-PROF-AGRI-05` (P2) — Xóa hồ sơ nông nghiệp và bảo toàn lịch sử chẩn đoán
1. Tiếp nối từ hồ sơ vừa có ít nhất 1 chẩn đoán ở `E2E-PROF-AGRI-04`, mở màn hình chi tiết của hồ sơ đó tại `/agricultural-profiles`.
2. Cuộn xuống thẻ thông tin bên phải, bấm nút **`Xóa hồ sơ`**.
3. Đọc màn hình xác nhận **`Xóa “<Tên hồ sơ>”?`** (hiển thị lưu ý **`Lịch sử chẩn đoán vẫn được giữ`**), sau đó bấm nút đỏ **`Xóa hồ sơ`**.
4. **Kiểm tra kết quả:**
   - Hệ thống chuyển về danh sách và hiện thông báo **`Đã xóa hồ sơ. Lịch sử chẩn đoán vẫn được giữ.`**.
   - Nhấn `F5` reload `/agricultural-profiles` $\rightarrow$ hồ sơ đã bị xóa hoàn toàn.
   - Điều hướng sang `http://localhost:3000/history` $\rightarrow$ các bản ghi chẩn đoán trước đó của `User A` **vẫn còn nguyên trong danh sách**.

---

## 4. Phân hệ Cẩm nang & Danh mục công khai (`E2E-CAT-05`, `E2E-CAT-06`)

### `E2E-CAT-05` (P2) — Trạng thái hiển thị khi bản ghi thiếu dữ liệu chi tiết
1. Đăng nhập **`Admin`**, vào `http://localhost:3000/admin` $\rightarrow$ chọn **`Bệnh cây`** (hoặc **`Thuốc BVTV`**) $\rightarrow$ **`Thêm mới`**.
2. Tạo 1 bản ghi chỉ điền các trường bắt buộc, **để trống** các trường tùy chọn (như `Triệu chứng`, `Điều trị`, `Phòng ngừa` hoặc chưa gắn hướng dẫn sử dụng đối với thuốc), rồi lưu (nếu là Thuốc BVTV cần bấm **`Công khai`** để xuất hiện ở trang công khai).
3. Mở cửa sổ ẩn danh, truy cập trang chi tiết công khai của bản ghi vừa tạo (`/diseases/{id}` hoặc `/medicines/{id}`).
4. **Kiểm tra kết quả:**
   - Trang render sạch, không bị `undefined`, không tràn/vỡ bố cục; các mục thiếu sử dụng hiển thị fallback chuẩn (ví dụ ở thuốc: **`Chưa có hướng dẫn sử dụng được công khai.`**).
5. *(Dọn dữ liệu test)* Quay lại `/admin`, mở bản ghi vừa tạo và bấm **`Xóa vĩnh viễn`**.

---

### `E2E-CAT-06` (P2) — Trạng thái Loading, lỗi API (500) và Empty state của Catalog
1. Mở `http://localhost:3000/medicines` (và kiểm tra tương tự trên `/plants`, `/diseases`, `/knowledge`):
2. **Kiểm tra Empty state:** Nhập từ khóa không tồn tại `"khong-ton-tai-123"` vào **`Tìm kiếm danh mục`** $\rightarrow$ bấm **`Tìm kiếm`** $\rightarrow$ hiển thị **`Chưa có nội dung phù hợp được công khai.`**.
3. **Kiểm tra Loading & Error 500/Network:**
   - Mở **DevTools (`F12`) $\rightarrow$ Tab Network**:
     - Chuyển throttling sang **`Slow 3G`** và reload trang $\rightarrow$ quan sát dòng trạng thái **`Đang tải nội dung...`** xuất hiện trước khi dữ liệu về.
     - Trả throttling về **`No throttling`**, chuột phải vào request `GET /api/medicines...` (hoặc `/api/plants`) $\rightarrow$ chọn **`Block request URL`** (hoặc dùng **Override content** trả về HTTP `500`), rồi reload trang.
   - **Kiểm tra trạng thái lỗi:** Trang không crash, hiển thị thông báo lỗi màu đỏ (`role="alert"`) và nút **`Thử lại`**.
   - Bỏ chặn URL trong DevTools rồi bấm nút **`Thử lại`** $\rightarrow$ dữ liệu danh mục tải lại bình thường.

---

## 5. Phân hệ Cổng quản trị CRM (`E2E-ADM-05`)

### `E2E-ADM-05` (P1) — Quản lý ảnh, xem cảnh báo và xóa ảnh trong Admin Images
1. Đảm bảo đã có ít nhất 1 ảnh chẩn đoán của **`User A`** (nếu chưa có, đăng nhập `User A` chạy 1 lần `/diagnose`).
2. Đăng nhập **`Admin`**, mở `http://localhost:3000/admin`.
3. Ở thanh điều hướng quản trị bên trái, chọn mục **`Ảnh đã tải lên`**.
4. **Kiểm tra danh sách & tìm kiếm:**
   - Thấy thẻ **`Danh sách ảnh đã tải lên`**, ảnh có badge **`Còn lưu trữ`** và ảnh preview hiển thị được.
   - Thử tìm theo email `user@agrivision.ai` trong ô tìm kiếm để lọc đúng ảnh của `User A`.
5. **Kiểm tra luồng Cảnh báo & Xóa ảnh:**
   - Bấm **`Cảnh báo ảnh vi phạm`** $\rightarrow$ nhập nội dung cảnh báo $\rightarrow$ bấm **`Gửi cảnh báo`** $\rightarrow$ kiểm tra notice **`Đã gửi cảnh báo cho chủ ảnh.`**.
   - Bấm **`Xóa ảnh`** trên bản ghi ảnh đó $\rightarrow$ kiểm tra dialog xác nhận hiển thị mô tả **`Xóa tệp ảnh khỏi lưu trữ. Kết quả chẩn đoán vẫn được giữ lại.`** $\rightarrow$ bấm **`Xác nhận xóa ảnh`**.
6. **Kiểm tra hậu kiểm & phiên Admin:**
   - Giao diện hiện thông báo **`Đã xóa ảnh khỏi lưu trữ.`**.
   - Nhấn `F5` tải lại `/admin` $\rightarrow$ quay lại **`Ảnh đã tải lên`** $\rightarrow$ bản ghi ảnh vừa xóa chuyển sang badge **`Đã xóa`** và khung ảnh hiển thị **`Ảnh đã được xóa`** (nút `Xóa ảnh` bị disabled).
   - Phiên đăng nhập **`Admin`** vẫn còn hiệu lực bình thường (không bị đăng xuất nhầm).
