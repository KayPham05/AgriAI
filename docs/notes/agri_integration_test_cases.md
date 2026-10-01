# Mẫu và ca kiểm thử integration AgriVision

> Kế thừa cách ghi tiền điều kiện, thao tác, kỳ vọng và kết quả của
> `Testing Document/`. Đây là **thiết kế**, không phải kết quả chạy test.
> Liên kết với [kế hoạch test](testing_strategy.md) và
> [viewpoint](agri_test_viewpoints.md).

## Ranh giới và điều kiện chạy

Integration kiểm tra tương tác giữa ít nhất hai thành phần thật: HTTP API với
DI/EF/PostgreSQL, hoặc adapter .NET với AI HTTP stub theo contract. Ghi rõ
thành phần nào là thật và thành phần nào là stub. Test xuyên CLI → AI service →
.NET → web là E2E; chỉ chạy khi checkpoint và contract đã được xác nhận.

Backend hiện có xUnit `AgriVision.IntegrationTests`, `WebApplicationFactory` và
Testcontainers PostgreSQL. Dùng DB test tách biệt; không dùng dữ liệu hoặc
credential thật. Mỗi case cần setup/cleanup có thể chạy lại độc lập.

## Template để sao chép cho mỗi luồng

- **Luồng / nguồn:** `<endpoint và các thành phần tham gia>`
- **Yêu cầu / viewpoint:** `<FR/NFR-XX, VP-XX>`
- **Ranh giới:** `<API thật + DB thật + AI stub, hoặc cấu hình khác>`
- **Phiên bản / môi trường:** `<commit, contract, .NET, PostgreSQL, Docker>`
- **Fixture và cô lập:** `<seed, user A/B, ảnh test, cleanup>`

| ID | Kịch bản / tên test | Tiền điều kiện / setup | Bước gọi / dữ liệu | HTTP/UI và DB/storage/AI mong đợi | Actual / bằng chứng | Kết quả | Cleanup / ghi chú |
|---|---|---|---|---|---|---|---|
| `INT-<AREA>-01` | `<Flow_ShouldOutcome_WhenCondition>` | `<DB trống/seed, auth, stub>` | `<request và thứ tự thao tác>` | `<status/schema + side effect/không side effect>` | `<điền sau khi chạy>` | `Not run` | `<rollback/delete fixture, link test>` |

**Tổng kết sau khi chạy:** Total `<n>`; Passed `<n>`; Failed `<n>`; Blocked `<n>`;
Not run `<n>`; lệnh `<...>`; số test thực chạy `<n>`; artifact `<TRX/log an toàn>`.

## Case ưu tiên

| ID | Ranh giới / viewpoint | Setup → thao tác | Kết quả mong đợi | Trạng thái thiết kế |
|---|---|---|---|---|
| INT-AUTH-01 | API + PostgreSQL, VP-API-03 | DB test sạch → đăng ký rồi đăng nhập. | User được lưu; token/response theo code; không rò mật khẩu. | Có test tương ứng; cần ghi kết quả chạy riêng. |
| INT-HEALTH-01 | API + PostgreSQL + AI stub, NFR-03 | DB/AI health theo từng trạng thái → `GET /api/health`. | `Checks` và `Status` phản ánh dependency; ghi rõ HTTP status hiện tại theo controller. | Có test tương ứng; cần ghi kết quả chạy riêng. |
| INT-HIST-01 | API + PostgreSQL, VP-API-03 | Seed prediction của A và B → A gọi history. | Chỉ trả prediction của A; phân trang và tổng số khớp DB. | Cần bổ sung. |
| INT-HIST-02 | API + PostgreSQL + storage stub, VP-API-03 | Seed prediction của B → A gọi delete. | Bị từ chối; bản ghi và ảnh của B giữ nguyên. | Cần bổ sung. |
| INT-PRED-01 | API + PostgreSQL + AI/storage stub, VP-API-02 | Ảnh hợp lệ, AI stub trả class canonical → `POST /api/predictions`. | Response, prediction và top-k nhất quán; chỉ một bản ghi được thêm. | Chờ contract/mapping được chốt. |
| INT-PRED-02 | API + PostgreSQL + AI/storage stub, VP-API-02 | AI timeout hoặc class không tồn tại → post ảnh. | Không có response thành công, không thêm prediction; xử lý ảnh theo policy. | Cần bổ sung; code hiện có fallback. |
| INT-DB-01 | EF migration + PostgreSQL, VP-DB-01 | DB test trống → migrate/seed. | Schema và ràng buộc hợp lệ; mapping seed đối chiếu checkpoint khi đã chốt. | Chờ mapping/checkpoint cho phần đối chiếu. |
| INT-CONTRACT-01 | Web + API, VP-WEB-02 | API test theo contract → gửi ảnh từ web. | Tên field multipart, response và đơn vị confidence khớp. | Blocked: web đang gửi `image`, .NET đang nhận `File`. |

Các case dùng AI stub chỉ chứng minh hợp đồng và side effect. Khi có AI service
thật, thêm ca E2E riêng để đối chiếu cùng ảnh giữa CLI, HTTP AI và API; không
gộp kết quả stub với chất lượng phân loại.
