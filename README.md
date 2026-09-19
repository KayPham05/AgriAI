# AgriVision AI

Hệ thống nhận diện bệnh lá cây sử dụng ConvNeXt-Tiny.

## Cấu trúc

```text
ai/             Mã nguồn huấn luyện, đánh giá và suy luận
.agents/rules/  Quy tắc dành cho agent
docs/           Nhật ký task và tài liệu dự án
experiments/    Kết quả được tổ chức theo EXP-XXX
```

## Chạy module AI

```powershell
cd ai
setup_env.bat
python train.py
python evaluate.py
```

Dataset được đặt tại `ai/Image/<cây>/<bệnh>/` và không được commit vào Git.
