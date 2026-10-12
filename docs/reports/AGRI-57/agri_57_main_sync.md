# AGRI-57 — Đồng bộ main, giữ nguyên công việc chưa commit

Ngày thực hiện: 2026-10-09. Nhánh xác minh: `AGRI-57-frontend-summary`.
Phạm vi: lấy code mới từ `origin/main` theo yêu cầu người dùng; không commit hoặc push phần đang làm, không tạo PR hay đổi trạng thái Jira.

## Thực hiện và bảo toàn dữ liệu

- Đọc `AGENTS.md`, `.agents/rules/project_rules.md`, quy tắc thư mục và giới hạn skill. Đọc lại hướng dẫn mới từ main; giữ các quy tắc local khi hòa giải `AGENTS.md`.
- HEAD trước cập nhật: `a437e8653c93a863a686340b7fb6af7b537d6674`. Sau fetch, main có thêm 60 commit và nhánh không có commit riêng: `git rev-list --left-right --count HEAD...origin/main` trả `0 60`.
- Tạo backup bằng `git stash push -u`, bao gồm 46 file tracked đã sửa và 607 file untracked. Stash giữ lại: `7eeb6012c161a9798892eea50934f4842aa4e8df`, tên `AGRI-57 WIP backup before syncing origin/main 2026-10-09`.
- `git merge --ff-only origin/main` thành công; HEAD mới và `origin/main` cùng là `d34166d1dda734681f7384e90a8280e7762bf464`. Không tạo merge commit, không rebase hay viết lại lịch sử.
- Khôi phục bằng `git stash apply`, không pop/drop. Có bốn conflict tracked được hòa giải ở `AGENTS.md`, `frontend/README.md`, `frontend/pnpm-lock.yaml`, `frontend/src/services/predictionApi.test.ts`.
- Giữ đồng thời hướng dẫn runtime/Corepack local và proxy production từ main; hợp nhất import/test prediction của hai phía. `package.json` và `vitest.config.mts` giữ công cụ local cùng script/dependency/config coverage từ main.
- 24 file untracked trùng đường dẫn mới trên main đã có cùng blob hash. Đối chiếu toàn bộ 607 file với cây `stash^3`: 0 thiếu, 0 khác nội dung. 39 file tracked WIP không bị upstream chạm tới, ngoại trừ file type do Next sinh lại, đều có hash khớp stash.
- Stash apply khi conflict tự đưa các file hòa giải tự động vào index. Index ban đầu rỗng; dùng `git restore --staged -- .` trả toàn bộ công việc về unstaged, không thay nội dung worktree. Không stage để commit, không commit/push.

## Kiểm chứng mới trong lượt này

- `corepack pnpm install --lockfile-only --ignore-scripts`: PASS; pnpm hòa giải lockfile và lấy metadata của dependency coverage mới từ registry. Lần offline trước đó thiếu metadata `@vitest/coverage-v8@5.0.2`; không sửa phiên bản dependency để né lỗi.
- `corepack pnpm install --lockfile-only --frozen-lockfile --ignore-scripts --offline`: PASS, xác minh manifest/lockfile nhất quán. Đây là thao tác lockfile, không phải cài mới toàn bộ node_modules.
- Lần `corepack pnpm test` đầu: 99/101 đạt, hai test lint timeout. Lần dùng `pnpm test -- --testTimeout=20000` không truyền được timeout như dự định, tiếp tục có timeout lint/khởi tạo worker; không coi là PASS.
- `corepack pnpm exec vitest run --maxWorkers=2 --testTimeout=20000`: PASS, **101/101 test trong 18/18 file**, exit 0. Không thay logic test hay cấu hình timeout trong source.
- `corepack pnpm build`: PASS, exit 0; biên dịch/TypeScript và sinh 3/3 static pages. Khôi phục đường dẫn type development trong `frontend/next-env.d.ts` sau build để giữ setup dev trước đó.
- `corepack pnpm typecheck` sau khi khôi phục type development: PASS, exit 0.
- `git diff --check` cho bốn file hòa giải: PASS; chỉ có thông báo line ending cho lockfile. Không còn marker conflict hoặc unmerged index; HEAD bằng main đã fetch, vẫn ở nhánh AGRI-57, stash vẫn còn.

## Giới hạn và việc còn lại

Không chạy backend/AI/Docker/database migrations, không xóa volume hay đọc nội dung secret. Chưa kiểm chứng E2E với backend mới, coverage, CI GitHub hoặc review trực quan lại toàn bộ UI sau cập nhật. Các kết quả UI/90 test trước lượt này là lịch sử, không thay thế kiểm chứng tích hợp mới.

Công việc frontend chưa hoàn thành vẫn nằm trong worktree để tiếp tục. Giữ stash làm bản dự phòng; **không apply/pop lại** vì đã khôi phục rồi. Chỉ xóa backup khi người dùng xác nhận không còn cần.
