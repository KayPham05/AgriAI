# AGRI-76 — Xử lý review ngày 07/10/2026

## Kết quả

Review kỹ thuật độc lập bằng subagent `review_agri76` đạt **PASS vòng 2**, không còn finding P1/P2. Đây là review tài liệu theo source/metadata/render, không phải Team Lead approval hoặc nghiệm thu inference.

| Finding | Đã sửa / bằng chứng |
|---|---|
| ERD/Class thiếu schema mới | [ERD hiện tại](diagrams/erd_current.puml), Class entities/infrastructure/DTO: 9 bảng, 69 cột, 9 PK/9 FK. [Metadata live](assets/database_schema_current.json) ghi hai migration. ERD 6 bảng giữ làm baseline. |
| Prediction sai thứ tự và nhánh khách | Sequence/Activity/DFD/UC-05 dùng AI → strict mapping → storage/DB cho user, khách trả 200 không lưu lịch sử; user trả 201. Bổ sung snapshot và cleanup khi persist lỗi. |
| Chi tiết công khai/sai owner | Use Case/UC-06/Activity/Sequence history dùng JWT, owner, 401/404 và signature hiện tại. |
| DFD thiếu nguồn catalog | P3 ↔ D3 được bổ sung cho truy vấn navigation/catalog, gồm fallback của bản ghi thiếu snapshot; đồng bộ ledger Level 1/2. |
| Review vòng 1: target table còn thứ tự cũ | Bảng target trong system_design_diagrams và core target đồng bộ AI/mapping trước storage, snapshot và cleanup. |
| Review vòng 1: lỗi snapshot sai HTTP status | UC-06 phân biệt JsonException/NotSupportedException → 500 và snapshot deserialize null → InvalidOperationException → 400 theo middleware. |
| Review vòng 1: UC-10 precondition | Phân biệt HTTP health cần API chạy với migration/expiry là process CLI riêng không cần HTTP API. |
| QA render: varchar(n) bị hide methods ẩn | Thêm `{field}` vào từng dòng ERD. Subagent parse SVG xác nhận đủ 69 tên cột/kiểu/default, CHECK/UNIQUE và delete rules khớp metadata. |
| Biên tập | Bỏ câu lặp trong core target; archive phân biệt baseline hiện trạng 05/10 với target bổ sung 06/10. |

## Quy trình review

1. Sửa các finding ban đầu, render lại toàn bộ bộ mô hình rồi spawn subagent read-only để review.
2. Sửa các finding vòng 1; QA phát hiện và sửa cột bị ẩn ở SVG; render lại 36 source.
3. Subagent review vòng 2: kiểm source/controller/service/middleware/schema và SVG thực tế, xác nhận technical PASS. Câu lặp nhỏ còn được ghi nhận đã sửa sau đó.

Visual QA xem lại tám sơ đồ bị ảnh hưởng; refresh ERD và DFD Level 1 sau lần render cuối. DFD Level 1 rộng, gallery giữ kích thước tự nhiên và cho cuộn ngang để đọc nhãn.

## Điều kiện nghiệm thu còn chờ

- Team Lead review và phản hồi thật; xử lý phản hồi nếu có.
- Commit source editable thực tế theo quy tắc Git của repo.

Không ghi Team Lead, approval hay commit hash giả. Theo [checklist](verification.md), phần kỹ thuật đã hoàn tất; DoD Jira vẫn chưa đủ hai điều kiện trên. Không chạy lại application/model tests trong lần sửa tài liệu này.
