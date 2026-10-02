# AGRI-75 — Phân loại finding secret scan ngày 2026-10-02

## Trạng thái sau khi xử lý lịch sử

Chủ tài khoản xác nhận khóa Cloudinary đã thu hồi. Lịch sử của bốn nhánh đã
được cập nhật; `.gitleaksignore` được xóa vì token mẫu đã thay bằng placeholder
trong lịch sử. Xem [báo cáo làm sạch lịch sử](secret_history_cleanup.md).
Các số liệu dưới đây ghi nhận lần phân loại trước khi viết lại lịch sử.

## Kết luận trước khi viết lại lịch sử

Secret gate **chưa pass**. Log GitHub Actions do người dùng cung cấp có 7 finding.
Bốn finding là cùng một token minh họa bị cắt; ba finding còn lại cần chủ tài
khoản xác minh và xử lý lịch sử Git. Không ghi giá trị credential trong báo cáo.

Nguồn cấu hình: [workflow CI](../../../.github/workflows/ci.yml),
ngoại lệ theo fingerprint tại commit trước khi làm sạch lịch sử và
[cấu hình API hiện tại](../../../backend/src/AgriVision.API/appsettings.json).

## Phân loại 7 finding trong log CI

| Commit | File và dòng tại commit đó | Phân loại | Xử lý |
|---|---|---|---|
| `2b4394841bf68962ee320bc85eb9d4a5801789c9` | `docs/backend_frontend_integration_handbook.md:72` | Token minh họa | Loại trừ đúng fingerprint. |
| `ffc0b1621ce446fdc1f269770f88c0c59ce15a92` | `docs/reports/AGRI-45/BACKEND_SYSTEM_REPORT_AND_FRONTEND_INTEGRATION_GUIDE.md:170` | Token minh họa | Loại trừ đúng fingerprint. |
| `ffc0b1621ce446fdc1f269770f88c0c59ce15a92` | `docs/reports/AGRI-45/BACKEND_SYSTEM_REPORT_AND_FRONTEND_INTEGRATION_GUIDE.md:194` | Token minh họa | Loại trừ đúng fingerprint. |
| `ffc0b1621ce446fdc1f269770f88c0c59ce15a92` | `docs/task-logs/AGRI-45/backend_frontend_integration_handbook.md:72` | Token minh họa | Loại trừ đúng fingerprint. |
| `ffc0b1621ce446fdc1f269770f88c0c59ce15a92` | `backend/src/AgriVision.API/appsettings.json:21` | Cloudinary `ApiSecret` chưa xác minh hiệu lực | Giữ finding; chủ tài khoản cần thu hồi/đổi khóa nếu là credential thật. |
| `ffc0b1621ce446fdc1f269770f88c0c59ce15a92` | `backend/src/AgriVision.API/appsettings.Development.json:20` | Cloudinary `ApiSecret` chưa xác minh hiệu lực | Giữ finding; kiểm tra cùng credential với file trên. |
| `75d6f5f793cb20b8afe20e36fa50af7154049e8d` | `frontend/.visual-qa-profile/Local State:1` | Khóa mã hóa của browser profile | Giữ finding; cần kiểm tra dữ liệu profile và xóa profile khỏi lịch sử. Chưa xác nhận có session đang hoạt động. |

Bốn token đã được đối chiếu trực tiếp ở đúng commit/dòng: cùng chuỗi 39 ký tự,
chỉ có header JWT và dấu cắt `...`, thiếu payload/chữ ký. Vì vậy chúng không
phải JWT hoàn chỉnh có thể dùng để xác thực. `.gitleaksignore` chỉ chứa bốn
fingerprint này; không loại trừ toàn bộ file, thư mục hoặc rule `generic-api-key`.
Cơ chế fingerprint theo [tài liệu Gitleaks v8.24.2](https://github.com/gitleaks/gitleaks/tree/v8.24.2#additional-configuration).

## Kiểm chứng cục bộ

Chạy image `ghcr.io/gitleaks/gitleaks:v8.24.2` với `git /repo`, `--redact`, báo
cáo JSON và repo mount read-only. Workflow vẫn quét `--log-opts="--all"`;
`--gitleaks-ignore-path /repo/.gitleaksignore` xác định rõ file ngoại lệ trong container.

| Phạm vi | Finding | Exit code | Artifact ngoài Git |
|---|---:|---:|---|
| Mọi ref local, trước ngoại lệ | 31 | 1 | `.cache/secret-scan/before.json` |
| Mọi ref local, sau ngoại lệ | 27 | 1 | `.cache/secret-scan/after-all.json` |
| Lịch sử `HEAD` của AGRI-75, sau ngoại lệ | 3 | 1 | `.cache/secret-scan/after-head.json` |

Đối chiếu JSON xác nhận đúng bốn fingerprint đã biến mất và ba finding trong
bảng vẫn xuất hiện ở lịch sử `HEAD`. Mọi ref local có thêm 24 finding trong
build/cache `.NET` và `.next` ở các commit cũ; số liệu này khác phạm vi checkout
CI trong log được cung cấp. Không xóa ref hoặc bỏ qua build/cache trong secret scan.
Chưa chạy lại GitHub Actions sau thay đổi này.

## Việc cần làm để đóng finding còn lại

1. Chủ tài khoản Cloudinary xác minh hai giá trị `ApiSecret` cũ, thu hồi/đổi khóa
   nếu là credential thật và cập nhật cấu hình local/deployment qua secret store.
   Không gửi khóa mới vào chat hoặc Git. Việc khóa đã hết hiệu lực chưa được xác minh.
2. Chủ browser profile kiểm tra dữ liệu tài khoản/cookie/session từng được commit;
   thu hồi session nếu xác định có dữ liệu xác thực bị lộ.
3. Chuẩn bị bản sao cô lập, xác định các branch/tag bị ảnh hưởng và bảo toàn WIP;
   xóa credential cùng bản sao build và toàn bộ browser profile khỏi lịch sử.
   Viết lại lịch sử và force-push cần người dùng cho phép riêng theo quy tắc repo;
   các thao tác này chưa được thực hiện.
4. Quét lại toàn bộ ref sau khi xử lý, đối chiếu GitHub Actions và lưu bằng chứng.
   Xóa file ở commit mới hoặc thêm `.gitignore` không xóa giá trị trong commit cũ.
