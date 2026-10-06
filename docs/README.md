# Tài liệu dự án AgriVision AI

Thư mục này lưu tài liệu làm việc và báo cáo của các thành viên. Không lưu dataset, model checkpoint, generated output hoặc secret tại đây.

## Quy ước đường dẫn dataset

Tài liệu dùng `<dataset_root>` để chỉ thư mục cha chứa các phiên bản dataset
sau khi mount Google Drive hoặc tải về máy. Không ghi đường dẫn tuyệt đối phụ
thuộc thiết bị của một thành viên.

```text
<dataset_root>/
├── v1.0/
├── v1.1/
├── v1.2/
├── v1.3/
└── v1.4/
```

Cấu trúc bên trong từng phiên bản phải được giữ nguyên. Khi chạy mô hình, đặt
`AGRIVISION_DATASET_DIR` trỏ tới `<dataset_root>/v1.4`. Bản v1.3 là mốc đối
chiếu; v1.4 thay toàn bộ ảnh Ớt và dùng hợp đồng 59 lớp. Xem
[báo cáo AGRI-21](reports/AGRI-21/README.md) để kiểm tra nhãn và artifact.

## Điểm vào chính

- [Database, migration riêng trong Docker và kiểm thử đọc/ghi](notes/database_migrations.md)
- [Giải thích Entities, quan hệ và ảnh hưởng đến ERD](notes/database_entities.md)
- [Task log AGRI-79: schema/migration và kiểm thử backend–PostgreSQL](task-logs/AGRI-79/AGRI-79-database-migrations.md)
- [Tech stack và trạng thái](tech_stack.md)
- [Yêu cầu hệ thống](system_requirements.md)
- [Sơ đồ thiết kế](system_design_diagrams.md)
- [Phân tích hiện trạng và thiết kế AGRI-76](reports/AGRI-76/README.md)
- [Bộ 36 sơ đồ editable và gallery AGRI-76](reports/AGRI-76/diagrams/README.md)
- [Tổng hợp sơ đồ AGRI-76](reports/AGRI-76/diagram_compendium.md)
- [Đặc tả 10 Use Case AGRI-76](reports/AGRI-76/use_case_specifications.md)
- [Verification và DoD AGRI-76](reports/AGRI-76/verification.md)
- [Tasklog chỉnh sửa tài liệu AGRI-76](task-logs/AGRI-76/AGRI-76-documentation.md)
- [Lộ trình phát triển](development_roadmap.md)
- [Dataset và mô hình AGRI-21](reports/AGRI-21/README.md)
- [Kế hoạch CI/CD](plans/ci_cd_plan.md)

README ở root là điểm bắt đầu. Các report và nhật ký dưới đây là bằng chứng theo
task hoặc thời điểm; không dùng số liệu lịch sử để mô tả trạng thái hiện tại.

## Cấu trúc

```text
docs/
├── task-logs/   Báo cáo tính năng, sửa lỗi hoặc công việc đã hoàn thành
├── reports/     Báo cáo theo Jira task, mỗi task có một README làm điểm vào
├── plans/       Kế hoạch cá nhân hoặc kế hoạch triển khai task
├── notes/       Ghi chú kỹ thuật, quyết định và thông tin dùng chung
├── journals/    Nhật ký phát triển theo ngày của từng thành viên
└── notebooks/   Jupyter notebook phục vụ khám phá và ghi chép
```

## Báo cáo và ghi chú chi tiết

- [Hướng dẫn chạy Docker local và smoke test](notes/docker_run_guide.md)
- [Docker và pipeline CI ngắn gọn](notes/docker_pipeline.md)
- [Quy tắc commit và commitlint trong CI](notes/commitlint.md)
- [Báo cáo unit và integration test AGRI-75](reports/AGRI-75/unit_integration_test_report.md)
- [Chiến lược kiểm thử, test case và branch coverage](notes/testing_strategy.md)
- [Viewpoint kiểm thử AgriVision](notes/agri_test_viewpoints.md)
- [Mẫu và ca kiểm thử API](notes/agri_api_test_cases.md)
- [Mẫu và ca kiểm thử giao diện](notes/agri_screen_test_cases.md)
- [Mẫu và ca kiểm thử unit](notes/agri_unit_test_cases.md)
- [Mẫu và ca kiểm thử integration](notes/agri_integration_test_cases.md)
- [Báo cáo thực hiện kiểm thử và CI](notes/testing_ci_execution_report.md)
- [Báo cáo AGRI-75 về Docker, CI và kiểm thử](reports/AGRI-75/README.md)

## Quy ước

| Thư mục | Tên file đề xuất | Ví dụ |
|---|---|---|
| `task-logs/` | `AGRI-XXX-<member>.md` | `AGRI-24-vinh.md` |
| `reports/` | `AGRI-XXX/README.md` và bằng chứng liên quan | `AGRI-21/README.md` |
| `plans/` | `AGRI-XXX-<member>-plan.md` | `AGRI-24-kha-plan.md` |
| `notes/` | `<topic>.md` | `dataset_sources.md` |
| `journals/` | `<member>-YYYY-MM-DD.md` | `huy-2026-09-19.md` |
| `notebooks/` | `0X_<topic>.ipynb` | `01_dataset_audit.ipynb` |

- Mỗi task log chỉ mô tả một Jira task và sử dụng template trong `.agents/rules/project_rules.md`.
- Mỗi thư mục report theo task có một `README.md` làm nguồn tổng hợp; các file còn lại là bằng chứng chi tiết.
- Report không dùng thay cho task log bắt buộc của Jira.
- Plan ghi rõ mục tiêu, phạm vi, đầu ra và tiêu chí hoàn thành; plan không thay thế quyết định đã được duyệt.
- Journal ghi những gì đã thử, kết quả thực tế, lỗi gặp phải và bước tiếp theo.
- Notebook chính thức phải chạy lại được; kết quả thực nghiệm được chốt tại `experiments/EXP-XXX/`.
- Không dùng tên mơ hồ như `final.md`, `new_plan.md`, `test.ipynb` hoặc `note1.md`.
