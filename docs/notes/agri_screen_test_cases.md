# Mẫu và test case màn hình AgriVision

> Phỏng theo cấu trúc `Testing Document/Copy of Testcase Screen.md`; các màn
> cửa hàng, giỏ hàng và thanh toán là dữ liệu của dự án mẫu. Giao diện AgriVision
> hiện dùng Next.js; các case với API stub không chứng minh suy luận bằng model thật.
> Mã FR/NFR tham chiếu [đặc tả yêu cầu](../system_requirements.md).

## Mẫu để thành viên điền

| Trường | Nội dung cần ghi |
|---|---|
| ID, requirement, viewpoint | Ví dụ `WEB-UPLOAD-01`, `FR-04`, `VP-WEB-01`. |
| Màn hình / thành phần | Tên trang và control; link thiết kế hoặc code hiện tại. |
| Trạng thái sản phẩm | `demo`, `tích hợp thật`, `chờ`; không dùng kết quả demo làm kết quả model. |
| Tiền điều kiện / dữ liệu | Browser, kích thước màn hình, trạng thái đăng nhập, ảnh fixture, API stub. |
| Steps / expected | Từng thao tác và trạng thái UI quan sát được; cần phân biệt loading, error, success. |
| Actual / result / evidence | Điền sau khi chạy: `Passed`, `Failed`, `Blocked`, `Not run`; kèm ảnh/video/log nếu cần. |

## Case ưu tiên

| ID | Liên kết | Thao tác | Kết quả mong đợi | Trạng thái |
|---|---|---|---|---|
| WEB-UPLOAD-01 | FR-04, VP-WEB-01 | Chọn/kéo thả JPG/PNG hợp lệ. | Preview, tên và kích thước ảnh hiển thị đúng. | Not run |
| WEB-UPLOAD-02 | FR-04, VP-WEB-01 | Chọn file sai loại/quá giới hạn hoặc ảnh không đọc được. | Báo lỗi rõ ràng, không gửi API. | Not run |
| WEB-PRED-01 | FR-05, VP-WEB-02 | API stub trả kết quả theo contract. | Loading chuyển sang kết quả từ response; nêu rõ đây là stub. | Not run; cần đối chiếu contract |
| WEB-PRED-02 | FR-05, VP-WEB-02 | API trả lỗi hoặc mạng ngắt giữa upload. | Hiện lỗi và cho thử lại; không hiển thị kết quả trước như kết quả mới. | Not run; có thể dùng stub |
| WEB-HIST-01 | FR-07, VP-WEB-02 | Mở lịch sử sau một lần dự đoán. | Chỉ hiển thị dữ liệu được API trả về theo quyền; stub không xác nhận DB. | Not run |
| WEB-RESP-01 | FR-04, VP-WEB-01 | Mở trang tải ảnh ở desktop và mobile. | Thành phần dùng được bằng chuột, bàn phím và màn hình nhỏ. | Not run |

Không ghi "tích hợp thật" chỉ vì UI hiển thị JSON mock.

## Template chi tiết để sao chép cho mỗi màn hình

- **Màn hình / thành phần:** `<tên trang, control, đường dẫn code>`
- **Trạng thái:** `Next.js với API stub | tích hợp API | chờ AI thật`
- **Người thiết kế / phiên bản:** `<tên>` / `<commit hoặc bản thiết kế>`
- **Môi trường:** `<browser/version, desktop/mobile viewport, trạng thái đăng nhập>`
- **Dữ liệu:** `<ảnh fixture, API stub hoặc backend test; không dùng tài khoản thật>`

| ID | Requirement / viewpoint | Nhóm / thành phần | Tiền điều kiện | Bước thao tác | Kết quả UI mong đợi | Actual / bằng chứng | Kết quả | Cách chạy / ghi chú |
|---|---|---|---|---|---|---|---|---|
| `WEB-<AREA>-01` | `<FR-XX, VP-WEB-XX>` | `<upload, result, history, responsive...>` | `<browser, login, API state>` | `<1. ... 2. ...>` | `<trạng thái và nội dung quan sát được>` | `<điền sau khi chạy; ảnh/video>` | `Not run` | `Manual/Auto; link bug nếu Failed` |

**Tổng kết sau khi chạy:** Total `<n>`; Passed `<n>`; Failed `<n>`; Blocked `<n>`;
Not run `<n>`. Ghi rõ fixture/API stub khi kiểm tra loading, lỗi mạng hoặc
response giả; chạy ca E2E riêng khi có AI thật.
