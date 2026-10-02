# Kiểm tra commit với commitlint

Cấu hình [commitlint.config.cjs](../../commitlint.config.cjs) áp dụng mục 2 của
[project_rules.md](../../.agents/rules/project_rules.md). Skill
[git-commit](../../.agents/skills/git-commit/SKILL.md) tiếp tục hướng dẫn chọn type,
scope và chia commit theo thay đổi thực tế; commitlint kiểm tra thông điệp được tạo.

## Quy tắc

```text
<type>(<optional-scope>): AGRI-<number> <short-description>
```

- Cho phép đúng 12 type: `feat`, `fix`, `refactor`, `docs`, `test`, `chore`,
  `experiment`, `style`, `perf`, `build`, `ci`, `revert`.
- Jira key phải viết hoa và ở đầu mô tả, có nội dung sau key. Scope tùy chọn;
  không giới hạn scope vào danh sách gợi ý `ai`, `docs`, `data`, `api`.
- Chấp nhận tiếng Anh, tiếng Việt và cú pháp breaking change (`!`, footer
  `BREAKING CHANGE:`). Không ép chữ thường lên Jira key hoặc tên model.
- Header quá 72 ký tự chỉ cảnh báo, theo yêu cầu “when practical”. Không áp thêm
  giới hạn độ dài dòng body/footer hay dấu chấm cuối mô tả.
- Không bỏ qua merge, revert hoặc commit của bot. Khi merge/squash/revert, chỉnh
  thông điệp tự sinh về đúng định dạng; ví dụ `chore: AGRI-<number> merge main`.
  Dùng Jira key thật của công việc, không dùng nguyên placeholder này.

Commitlint không xác minh Jira issue tồn tại, nội dung commit có atomic hay không,
imperative mood hoặc việc dùng ngôn ngữ nhất quán; người tạo và reviewer vẫn kiểm
tra các yêu cầu đó theo skill và quy tắc dự án.

## Chạy cục bộ

Chạy từ root; dependency công cụ dùng pnpm 10.34.5, độc lập với `frontend/`.
Commitlint 21.2.3 cần Node >=22.12.0; CI dùng Node 24.

```powershell
pnpm install --frozen-lockfile
pnpm run commitlint --last --verbose
pnpm run commitlint --from <base-sha> --to HEAD --verbose
```

Kiểm tra một thông điệp trước khi tạo commit bằng cách đưa chuỗi vào stdin:

```powershell
'<type>: AGRI-<number> <description>' | pnpm run commitlint --verbose
```

Thay placeholder bằng type, Jira key và mô tả thật. Không cần cài Git hook để chạy
CI; có thể dùng cùng cấu hình cho hook `commit-msg` nếu nhóm cần phản hồi sớm.

## CI

Job `commitlint` trong [ci.yml](../../.github/workflows/ci.yml) cài dependency từ
lockfile bằng Node 24 và pnpm 10.34.5, tải đủ lịch sử Git (`fetch-depth: 0`):

- PR: kiểm tra các commit từ base SHA tới head SHA của PR, không lint synthetic
  merge commit mà GitHub tạo để chạy các job kiểm thử.
- Push `main`: kiểm tra các commit từ `before` tới SHA được push. Nếu GitHub gửi
  SHA `before` toàn số 0 khi tạo nhánh, kiểm tra commit cuối.
- Chạy thủ công: kiểm tra commit cuối của ref được chọn.

`ci-gate` yêu cầu job này thành công. Các commit cũ ngoài phạm vi thay đổi không
bị quét lại. Commit sai định dạng trong phạm vi PR/push sẽ làm job thất bại; commit
Dependabot cũng cần Jira key và định dạng hợp lệ trước khi merge.

Tham khảo [cấu hình commitlint](https://commitlint.js.org/reference/configuration.html)
và [hướng dẫn GitHub Actions](https://commitlint.js.org/guides/ci-setup).

## Kiểm chứng cục bộ ngày 2026-10-02

- CLI commitlint: 23 thông điệp hợp lệ pass, 17 thông điệp sai bị từ chối đúng.
  Bao gồm toàn bộ type dự án, scope tùy chọn, tiếng Việt, breaking change, header
  dài chỉ cảnh báo, thiếu/sai/vị trí Jira key và commit merge/revert/bot tự sinh.
- Khoảng Git `9ccce5d..HEAD` tại `b9ca890`: 18 commit hiện có pass.
- `pnpm install --offline --frozen-lockfile`: pass với dependency đã tải cục bộ.
- actionlint 1.7.7 trong container: workflow pass.

Đây là bằng chứng cục bộ; chưa chạy job mới trên GitHub Actions. Không thay đổi
lịch sử Git để thực hiện các kiểm tra này.
