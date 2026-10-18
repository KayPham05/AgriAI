# AGRI-127 — Sửa báo nhầm lá khỏe thành Dom_than_la

Ngày 2026-10-17. Giữ nguyên dataset v1.4/split/nhãn/metric và checkpoint gốc.
Baseline: [đánh giá trước sửa](fixed_test_evaluation.md).

## Đã sửa ở đâu? Dataset trong ổ D có đổi không?

**Không sửa nhãn hoặc ảnh trong `D:\AgriVisionAI_Data\v1.4`.** Dataset, manifest và
split vẫn giữ nguyên; các lần kiểm tra hash đã ghi nhận không đổi. “Sai nhãn” ở
đây là **model dự đoán khác nhãn chuẩn trong manifest**, chưa phải bằng chứng
dataset bị gán nhãn sai. Chưa có đợt rà soát và sửa annotation thủ công.

Đã sửa cách tính loss cho các lần huấn luyện tiếp theo và cách nạp checkpoint
disease hiện tại khi suy luận/đánh giá. Hiệu chỉnh có tác dụng khi chạy code hoặc
image AI đã cập nhật; dùng checkpoint gốc với loader cũ vẫn có lỗi cũ. File
checkpoint gốc không bị ghi đè; chưa huấn luyện lại model.

### Hai phần code đã sửa và thời điểm có tác dụng

| Phần | Trước sửa | Sau sửa | Khi nào có tác dụng? |
|---|---|---|---|
| Huấn luyện: `ai/train.py`, `ai/utils/losses.py` | Trọng số từng lớp tác động cả lên phần nhãn được làm mềm; trọng số lớn của lớp hiếm khiến ảnh khỏe cũng đẩy điểm lớp bệnh đó lên. | Tính loss có smoothing cho từng ảnh trước, sau đó nhân trọng số của **nhãn chuẩn của ảnh đó** và lấy trung bình theo trọng số. | **Lần train tiếp theo** bằng code mới. Không tự sửa kiến thức đã học trong checkpoint hiện tại. |
| Suy luận/đánh giá: `ai/utils/checkpoint_correction.py`, `ai/predict.py`, `ai/evaluate.py` | Nạp nguyên head của checkpoint cũ, giữ thiên lệch đã học. | Khi nạp đúng checkpoint disease có SHA đã pin, trừ `0.5 * log(class_weight)` khỏi bias của từng lớp trong bộ nhớ; hệ số chọn từ validation. | **Ngay khi chạy loader mới**, gồm CLI, FastAPI dùng chung predictor và evaluator. Dịch vụ đang chạy code/image cũ cần được cập nhật và khởi động lại mới nhận thay đổi. |

Phần thứ hai hiệu chỉnh điểm của cả 44 lớp, không phải quy tắc đổi mọi dự đoán
`Dom_than_la` thành `Khoe_manh`, không sửa nhãn chuẩn và không đổi ngưỡng
confidence 80%. Đây là hiệu chỉnh điểm dự đoán, chưa chứng minh confidence đã
được hiệu chuẩn thành xác suất đúng ngoài thực tế. Model mới hoặc checkpoint có
SHA khác không tự nhận hiệu chỉnh dành riêng cho bản cũ.

**Kết quả 428 → 0 được đo với checkpoint cũ qua loader đã hiệu chỉnh**, không
phải kết quả của một model vừa train lại. Sửa loss là biện pháp cho lần huấn
luyện tiếp theo; hiệu quả của model train mới phải được đánh giá riêng. Đã build
image và kiểm tra dịch vụ test thật; chưa xác nhận triển khai lên môi trường
vận hành hoặc hoàn tất E2E của ứng dụng.

## Nguyên nhân và thay đổi

- 428 lỗi raw disease gồm 374 ảnh cây khác lúa và 54 ảnh lúa. Pipeline đã lọc bệnh
  theo cây; vì vậy 428 không phải số lỗi đã xác nhận của toàn pipeline.
- Dom_than_la chỉ có 28/4/8 mẫu train/val/test. Checkpoint có class weight ~50;
  Khoe_manh ~0,122. Trong weighted label smoothing 0,1, một mẫu khỏe nhận hệ số
  loss cho Dom_than_la ~0,114, lớn hơn nhãn đúng ~0,110. Đây là tương tác sai trong
  cách dự án dùng [CrossEntropyLoss](https://docs.pytorch.org/docs/2.8/generated/torch.nn.CrossEntropyLoss.html), không phải lỗi thư viện.
- [Loss mới](../../../ai/utils/losses.py) áp trọng số theo mẫu sau smoothing;
  [train.py](../../../ai/train.py) dùng cho task có class weights. Không đổi loss
  unweighted của plant, smoothing, optimizer hoặc split. Chưa huấn luyện lại.
- [Hiệu chỉnh loader](../../../ai/utils/checkpoint_correction.py) trừ
  `0.5 * log(train_class_weight)` khỏi bias head, chỉ cho SHA disease đã xác minh.
  [CLI](../../../ai/predict.py) và [evaluator](../../../ai/evaluate.py) dùng chung;
  checkpoint khác không bị áp, file gốc không đổi, bản đã fold không bị áp hai lần.

## Chọn hệ số bằng validation, không bằng test

8.802 ảnh validation; thử alpha 0/0,25/0,5/0,75/1. Chọn alpha 0,5 theo Macro-F1,
đồng thời yêu cầu accuracy và F1 Dom_than_la không giảm; đóng băng trước đánh giá test.

| Validation | Accuracy | Macro-F1 | Khoe_manh → Dom_than_la |
|---|---:|---:|---:|
| Gốc | 0,963304 | 0,949490 | 218 |
| Alpha 0,5 | 0,987957 | 0,971960 | 0 |

## Test cố định: 17.599 ảnh, trước → sau

| Chỉ số | Trước | Sau |
|---|---:|---:|
| Accuracy disease | 96,6248% | 99,0909% |
| Macro-F1 disease | 0,950208 | 0,970392 |
| Balanced accuracy | 0,968115 | 0,966264 |
| Khoe_manh → Dom_than_la | 428 | 0 |
| Precision Dom_than_la | 0,015487 | 1,000000 |
| Recall Dom_than_la | 7/8 | 6/8 |
| F1 Dom_than_la | 0,030435 | 0,857143 |
| Tổng ảnh sai | 594 | 160 |

Trade-off: giảm báo nhầm nhưng bỏ sót nhãn Dom_than_la 2/8 thay vì 1/8; balanced
accuracy giảm nhẹ. Vang_lui F1 còn 0,744186 (24 mẫu), Sau_gai_an_la 0,768293 (82 mẫu).
Không chọn lại hệ số sau khi xem test. Test này đã được dùng phân tích lỗi trước
sửa; đây là đánh giá hồi quy cùng split, không phải blind holdout mới.

## Lớp bị lỗi và ảnh hưởng

Các số dưới đây là kết quả của **disease head trên test cố định**, chưa đại diện
cho số lỗi người dùng gặp trong toàn pipeline.

| Nhãn chuẩn | Lỗi và trạng thái sau sửa | Ảnh hưởng nếu kết quả sai đến người dùng |
|---|---|---|
| `Khoe_manh` | Trước sửa có 428 ảnh bị đoán `Dom_than_la` (374 cây khác lúa, 54 lúa); sau sửa còn **0 trường hợp nhầm cặp này**. Vẫn có 26 ảnh khỏe bị đoán thành bệnh khác: 16 `Sau_gai_an_la`, 7 `Chay_la`, 2 `Dom_nau`, 1 `Dom_tao`. | Báo bệnh trên lá khỏe, có thể dẫn đến xử lý không cần thiết. Bộ lọc cây–bệnh đã chặn nhãn không hợp lệ cho cây khác lúa; không được kết luận cả 428 ảnh đều tạo kết quả sai trên app. |
| `Dom_than_la` | Precision tăng lên 1, F1 lên 0,857143; nhưng chỉ nhận đúng **6/8** ảnh. Hai ảnh còn lại thành `Chay_la` và `Dom_nau`, trước sửa chỉ bỏ sót 1/8. | Bỏ sót đúng loại bệnh và có thể đưa hướng xử lý khác bệnh thật; hết báo nhầm từ lá khỏe không đồng nghĩa nhận diện bệnh này hoàn hảo. |
| `Sau_gai_an_la` | Sau sửa đúng 63/82; 15 ảnh thành `Khoe_manh`, 4 thành `Chay_la`. F1 0,757062 → 0,768293. | Có thể bỏ qua dấu hiệu sâu hại hoặc hướng người dùng sang xử lý bệnh khác. |
| `Vang_lui` | Sau sửa đúng 16/24; 5 ảnh thành `Thoi_chop_la`, 2 `Dom_nau`, 1 `Bac_la_lua`. F1 **giảm** 0,772727 → 0,744186. | Nhầm loại bệnh dù accuracy chung tăng; cần theo dõi riêng, không xem đây là lớp đã giải quyết. |

Toàn bộ 44 lớp vẫn còn **160 ảnh dự đoán sai**; các nhầm lẫn khác được lưu trong
`test/top_confusions.csv` và `test/misclassified_samples.csv`. Ảnh hưởng nêu trên
là rủi ro của dự đoán sai, không phải bằng chứng app đã hiển thị thuốc sai; việc
hiển thị khuyến nghị còn phụ thuộc confidence, cặp cây–bệnh và nội dung được duyệt.

## Trạng thái AGRI-127 và bàn giao

Phạm vi DB/migration/kiểm thử đã chốt của AGRI-127 đã hoàn tất theo bằng chứng
hiện có; có thể chuẩn bị commit các thay đổi đã hoàn thành sau khi rà diff và
phạm vi file. Không đồng nghĩa toàn bộ US-01–10 đã triển khai, dataset đã sửa
nhãn, mọi lỗi AI đã hết hoặc Jira đã Done. API/UI ngoài phạm vi, thử restore,
GitHub Actions và cải thiện AI còn lại được theo dõi tại
[remaining_work.md](../../notes/remaining_work.md). Chưa commit/push trong đợt cập nhật này.

## Kiểm tra đã thực hiện

- Loss: 2 regression fail trước sửa, 4 pass sau sửa. Loader: 1 fail trước sửa.
- Sau nối loader: **81 test AI pass**, gồm 6 ca checkpoint thật/CLI–HTTP parity.
- Unit/HTTP đúng CI: 62 + 13 pass; branch **507/1076 = 47,12%**, vượt sàn 40%. Image AI build pass.
- API thật sửa được một ảnh lúa khỏe từng sai; **1 ca .NET → FastAPI thật pass**,
  PostgreSQL disposable, storage vẫn fake. Không chạy E2E hoặc GitHub Actions.
- Folded checkpoint khớp logits loader theo phép biến đổi đã đóng băng; bản gốc
  giữ SHA `d21d8d6efd3c66e36ce166bfdb03bf0f017a0452ee07508df82e49ca42d429b9`.

Evidence ignored `.cache/qa-verification/agri127/disease-fix/`: `loss-red.log`,
`loss-green.log`, `correction-red.log`, `ai-final.log`, `validation_logits.pt`,
`validation_comparison.json`, `frozen_selection.json`, `candidate-test.log`, `test/`,
`http-rice-healthy.json`, `backend/real-checkpoint.trx`, `coverage/`, `state-parity.log`, `image-build.log`. Các harness trong cache
ghi lại selection/export; không ghi đè model gốc hoặc đưa checkpoint/dataset vào Git.
Validation Dom_than_la chỉ có 4 mẫu; không suy rộng thành loại bỏ mọi lỗi ngoài thực tế.
