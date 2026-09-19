# Project Documentation

Thư mục này lưu tài liệu làm việc và báo cáo của các thành viên. Không lưu dataset, model checkpoint, generated output hoặc secret tại đây.

## Cấu trúc

```text
docs/
├── task-logs/   Báo cáo tính năng, sửa lỗi hoặc công việc đã hoàn thành
├── plans/       Kế hoạch cá nhân hoặc kế hoạch triển khai task
├── notes/       Ghi chú kỹ thuật, quyết định và thông tin dùng chung
├── journals/    Nhật ký phát triển theo ngày của từng thành viên
└── notebooks/   Jupyter notebook phục vụ khám phá và ghi chép
```

## Quy ước

| Thư mục | Tên file đề xuất | Ví dụ |
|---|---|---|
| `task-logs/` | `AGRI-XXX-<member>.md` | `AGRI-24-vinh.md` |
| `plans/` | `AGRI-XXX-<member>-plan.md` | `AGRI-24-kha-plan.md` |
| `notes/` | `<topic>.md` | `dataset_sources.md` |
| `journals/` | `<member>-YYYY-MM-DD.md` | `huy-2026-09-19.md` |
| `notebooks/` | `0X_<topic>.ipynb` | `01_dataset_audit.ipynb` |

- Mỗi task log chỉ mô tả một Jira task và sử dụng template trong `.agents/rules/project_rules.md`.
- Plan ghi rõ mục tiêu, phạm vi, đầu ra và tiêu chí hoàn thành; plan không thay thế quyết định đã được duyệt.
- Journal ghi những gì đã thử, kết quả thực tế, lỗi gặp phải và bước tiếp theo.
- Notebook chính thức phải chạy lại được; kết quả thực nghiệm được chốt tại `experiments/EXP-XXX/`.
- Không dùng tên mơ hồ như `final.md`, `new_plan.md`, `test.ipynb` hoặc `note1.md`.
