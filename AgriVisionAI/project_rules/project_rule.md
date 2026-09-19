# QUY TẮC LÀM VIỆC — AGRIVISION AI
> Bản rút gọn: tập trung vào **đặt tên**, **commit**, **pull request**, và **báo cáo hoàn thành task**.

---

## 1. Quy tắc đặt tên (Naming Conventions)

### 1.1. Jira Key
- Format: `AGRI-XXX` (ví dụ: `AGRI-23`)
- Mọi branch, commit, PR **MUST** chứa Jira Key tương ứng.

### 1.2. Branch
```text
<jira-key>-<mo-ta-ngan>
```
- Chữ thường, dùng `-` (không dùng `_` hay khoảng trắng), ngắn gọn.

| ✅ Đúng | ❌ Sai |
|---|---|
| `AGRI-23-convnext-baseline` | `convnext` (thiếu Jira Key) |
| `AGRI-31-macro-f1-evaluation` | `AGRI_23_baseline` (dùng `_`) |
| `AGRI-42-fastapi-predict-endpoint` | `fix-bug` (không rõ ràng) |

### 1.3. File theo ngôn ngữ

| Phân hệ | Quy tắc | Ví dụ đúng | Ví dụ sai |
|---|---|---|---|
| Python | `snake_case.py` | `data_loader.py` | `DataLoader.py` |
| C# (.NET) | `PascalCase.cs` | `PredictionController.cs` | `predictionController.cs` |
| React/TSX | `PascalCase.jsx/.tsx` | `DiseaseCard.jsx` | `disease_card.jsx` |
| Config | `snake_case.yaml/.json` | `class_mapping.json` | `ClassMapping.JSON` |
| Notebook | `0X_snake_case.ipynb` | `01_eda_dataset.ipynb` | `test.ipynb`, `final.ipynb` |

### 1.4. Experiment & Model
- Experiment ID: `EXP-XXX` (tăng dần, khớp tên thư mục `AI/experiments/EXP-XXX/`)
- Model version: `convnext-tiny-v<major>.<minor>` (ví dụ: `convnext-tiny-v1.0`)
- Dataset version: `v<major>.<minor>` (ví dụ: `v1.0`, `v1.1`)

---

## 2. Commit chuẩn

### 2.1. Cú pháp
```text
<jira-key> <type>: <mo-ta-ngan>
```

### 2.2. Danh sách `type` hợp lệ
| Type | Dùng khi |
|---|---|
| `feat` | Thêm tính năng mới |
| `fix` | Sửa lỗi |
| `refactor` | Tái cấu trúc, không đổi logic |
| `docs` | Cập nhật tài liệu |
| `test` | Thêm/sửa test |
| `chore` | Config, dependency, `.gitignore` |
| `experiment` | Chạy thử nghiệm AI, đổi hyperparameter |

### 2.3. Ví dụ

**✅ Đúng:**
```text
AGRI-23 feat: implement ConvNeXt-Tiny model definition
AGRI-24 experiment: add ColorJitter data augmentation pipeline
AGRI-31 test: add unit tests for Macro-F1 evaluation metric
```

**❌ Sai:**
```text
update code                          (thiếu Jira Key, type, mô tả vô nghĩa)
AGRI-23 fix                          (mô tả quá ngắn)
AGRI-24 added new files and fixed... (gom nhiều việc vào 1 commit)
```

### 2.4. Nguyên tắc
- Mỗi commit **MUST** atomic — chỉ làm đúng 1 việc.
- Viết tiếng Anh hoặc tiếng Việt, nhất quán trong toàn bộ commit.

---

## 3. Tạo Pull Request

### 3.1. Điều kiện bắt buộc
- PR title **MUST** chứa Jira Key: `AGRI-23 Implement ConvNeXt baseline training`
- **MUST** tách ra từ `develop`, target về lại `develop` (hoặc `main` nếu là release).
- **MUST NOT** tự duyệt PR của chính mình.
- **MUST** có ít nhất 1 Reviewer đúng domain duyệt (AI / Backend / Frontend).

### 3.2. Template PR (bắt buộc điền đủ)
```markdown
## Jira Issue
AGRI-XXX

## Tóm tắt thay đổi (Summary)
[Mô tả ngắn gọn mục đích PR]

## Danh sách thay đổi (Changes)
- Thêm module X vào AI/src/
- Cập nhật API endpoint Y

## Phương pháp kiểm thử (Testing)
- [x] Unit test cho module X đã pass
- [x] Đã test tay trên môi trường local

## Thông tin AI Experiment (nếu thuộc phân hệ AI)
- Experiment ID: EXP-XXX
- Dataset Version: vX.X
- Metric đạt được (Macro-F1): 0.885

## Checklist
- [ ] Code chạy được ở local, không lỗi
- [ ] Đã lint/format
- [ ] Đã có unit test tương ứng
- [ ] Không chứa secret/API key/password
- [ ] Tài liệu liên quan đã cập nhật
```

### 3.3. Ai duyệt PR nào
| Phạm vi PR | Người duyệt |
|---|---|
| `AI/` | Thành Ngọc Huy (AI Lead) hoặc Nguyễn Quang Vinh (ML Engineer) |
| `Backend/` | Trần Trung Thông |
| `Frontend/` / UI / Data | Nguyễn Phạm Bảo Khanh |

---

## 4. Báo cáo sau khi hoàn thành task (bắt buộc mỗi thành viên)

Sau khi nộp task (trước hoặc cùng lúc tạo PR), mỗi người **MUST** viết 1 file markdown ngắn mô tả mình đã làm gì. Đặt tại:

```text
docs/task-logs/<jira-key>-<ten-viet-tat>.md
```
Ví dụ: `docs/task-logs/AGRI-24-vinh.md`

### Template báo cáo task
```markdown
# AGRI-XXX — <tên task>

- **Người thực hiện:**
- **Ngày hoàn thành:**
- **Branch:**
- **PR:** (link)

## 1. Đã làm gì
[Mô tả ngắn gọn công việc đã thực hiện, 3-5 dòng]

## 2. Thay đổi chính
- ...
- ...

## 3. Kết quả / Kiểm thử
[Nếu là code: kết quả test. Nếu là AI: Experiment ID + Metric chính (Macro-F1, Accuracy)]

## 4. Vấn đề gặp phải (nếu có)
[Khó khăn, blocker, hoặc điều cần lưu ý cho người review]

## 5. Việc còn lại / Follow-up (nếu có)
[Việc chưa xong, hoặc đề xuất cho task tiếp theo]
```

> Báo cáo này là điều kiện để chuyển Jira Issue sang `Done`.

---

## 5. Checklist nhanh trước khi nộp task

- [ ] Branch đúng format `<jira-key>-<mo-ta>`
- [ ] Commit đúng format `<jira-key> <type>: <mo-ta>`, mỗi commit atomic
- [ ] Đã viết file báo cáo task tại `docs/task-logs/`
- [ ] PR đã điền đủ template, đúng title có Jira Key
- [ ] Đã gửi đúng Reviewer theo domain
- [ ] Không có secret/credential trong diff