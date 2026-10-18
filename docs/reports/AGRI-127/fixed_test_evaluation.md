# AGRI-127 — Đánh giá test set v1.4

Baseline **trước sửa**; kết quả mới tại [disease_false_positive_fix.md](disease_false_positive_fix.md).

Ngày 2026-10-17; nhánh `AGRI-127-database-improvement`. Không training hoặc tuning bằng test set.
Dataset `D:/AgriVisionAI_Data/v1.4`: train61.599 / val8.802 / test17.599, giữ nguyên split.
Validator gốc xác minh đủ path/group/split; 17.599 ảnh test đều khớp SHA-256 manifest, 224×224.

| Model | Lớp | Ảnh test | Accuracy | Macro-F1 |
|---|---:|---:|---:|---:|
| plant | 10 | 17.599 | 0.999886 (99.99%) | 0.999881 |
| disease | 44 | 17.599 | 0.966248 (96.62%) | 0.950208 |

Metric dùng nguyên `ai/evaluate.py` và `ai/utils/metrics.py`: top-1 argmax,
macro không trọng số, zero_division=0, preprocessing validation không augmentation.
Checkpoint khớp SHA đã pin; evaluator kiểm tra task/target/mapping lớp khớp manifest.
CPU PyTorch2.8.0, float32/không AMP, batch32, workers0, seed42; không đổi checkpoint.
Validator chạy trên host để tránh metadata Docker/Windows chậm; container dùng lại
records đã xác minh, evaluator/mapping/metric giữ nguyên. Label map/output ghi vào cache riêng.

Đây là hai classifier độc lập 10/44 lớp, không phải accuracy toàn pipeline 59 cặp
cây–bệnh, reject ngoài phạm vi hoặc API/web. Không so trực tiếp với compound model cũ.

## Điểm cần theo dõi

Plant sai 2 ảnh; disease sai 594 ảnh. Nhầm lớn nhất là **428 Khoe_manh → Dom_than_la**.
Dom_than_la có 8 mẫu thật, precision 0,015487, recall 0,875 và F1 **0,030435**;
Sau_gai_an_la F1 0,757062 (82 mẫu), Vang_lui F1 0,772727 (24 mẫu).
Nguồn: per_class/top_confusions và CSV mẫu sai trong artifact disease.
Điểm tổng thể chưa phản ánh tốt các lớp này. Cần phân tích trên train/validation;
không chỉnh checkpoint/ngưỡng theo test set rồi báo lại cùng tập như kết quả độc lập.

Evidence local `.cache/qa-verification/agri127/fixed-evaluation/`: `provenance.json`,
`image-integrity.json`, `validated_records.json`, `test-support.json`; mỗi thư mục
`plant/`, `disease/` có `test_metrics.json`, classification report, confusion matrix,
top_confusions và misclassified_samples CSV. Log plant `run-final.log`, disease `disease.log`.
Harness local `.cache/qa-verification/agri127/evaluate_fixed.py`; source/dataset chỉ đọc.
Manifest test SHA-256: `a141a60b7678f1e2112ccaf4bbb27c1bfb277d3cebdb2281910ec98592bfffbe`.
[Việc còn lại](../../notes/remaining_work.md); không nghiệm thu E2E/storage/JWT hoặc GitHub Actions.
