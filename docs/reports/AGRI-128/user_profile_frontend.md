# AGRI-128 — User Profile & Password Management frontend

Ngày: 2026-10-25. Nhánh đã kiểm tra: `AGRI-128-backend-improvement`.

## Phạm vi và thiết kế

Người dùng xác nhận chỉ triển khai User Profile & Password Management từ
[Profile / Desktop](https://www.figma.com/design/sENsAMduZgE8hw8E5Jip4W?node-id=1-2).
Không triển khai S3-03 Agricultural Profile. Không sửa backend, schema hay migration.
Không commit/push. Các thay đổi không liên quan có sẵn trong worktree được giữ nguyên.

Trang `/profile` khi đăng nhập dùng `frontend/src/views/UserProfilePage.tsx`;
`frontend/src/features/profile/ProfileRoute.tsx` giữ trang dùng thử hiện tại cho Guest.
Giữ AppShell/navigation và font Manrope của sản phẩm; chuyển bố cục Figma thành grid
responsive, tái sử dụng shadcn Input, Button, Label, Separator, Dialog và avatar editor.

## Mapping API

| Hành vi | Contract backend hiện có |
| --- | --- |
| Tải tài khoản | `GET /api/users/profile`, Bearer token, `UserProfileDto` |
| Lưu họ tên | `PUT /api/users/profile`, JSON `{fullName}`; trim, 1–60 ký tự |
| Đổi mật khẩu | `POST /api/users/change-password`, JSON `{currentPassword,newPassword,confirmPassword}`, 204 |

Nguồn đối chiếu: `backend/src/AgriVision.API/Controllers/UsersController.cs`,
`backend/src/AgriVision.Application/DTOs/User/UserDtos.cs` và
`backend/src/AgriVision.Application/Services/Implementations/UserService.cs`.

`frontend/src/services/userApi.ts` dùng base URL/proxy hiện có, không cache tài khoản,
giữ status 401 cho trạng thái đăng nhập lại, không đọc JSON cho 204. Không trim mật khẩu.
Form kiểm tra mật khẩu mới tối thiểu 6 ký tự, khác mật khẩu cũ và khớp xác nhận;
backend vẫn là nguồn kiểm tra mật khẩu hiện tại. Sau 204, gọi logout hiện có để xóa
token và về trang giới thiệu vì backend thu hồi toàn bộ phiên.

Lưu họ tên thành công cập nhật AuthContext, tên trên Navbar và cache phiên trong đúng
localStorage/sessionStorage đã chọn; không thay chế độ ghi nhớ. Không gửi role, email,
userId hoặc các trường chưa được backend hỗ trợ khi lưu. Có trạng thái tải, thử lại,
lỗi validation/API, khóa gửi lặp và hủy request khi rời trang. Lưu lỗi giữ draft.

## Giới hạn có chủ đích

- Backend chỉ cho sửa fullName; email/vai trò chỉ đọc. Tên hiển thị riêng, số điện
  thoại, tỉnh/thành thể hiện “Chưa hỗ trợ”, không giả vờ lưu vào backend.
- Avatar tiếp tục là chức năng trong phiên hiện có, JPG/PNG tối đa 15 MB; chú thích
  đúng giới hạn thực tế thay cho 5 MB của mockup. Không thêm upload API.
- Ngôn ngữ/múi giờ là thông tin ứng dụng chỉ đọc. Không dựng lịch sử đổi mật khẩu giả.
- Docker daemon/backend không chạy khi kiểm tra. Browser dùng HTTP fixtures, không
  phải nghiệm thu backend/DB thật, GitHub CI hoặc cơ chế thu hồi JWT thực tế.
- Chưa đo lại branch coverage; không khẳng định đạt mục tiêu 80%.

## Kiểm chứng ngày 2026-10-25

- `corepack pnpm install --frozen-lockfile`: khôi phục dependency thiếu theo lockfile;
  không sửa package.json/lockfile.
- Typecheck và lint: đạt.
- Production build: đạt, có route `/profile`.
- Full Vitest lần cuối: **54 file, 368/368 test đạt**, thời lượng 65,51 giây.
- Format 10 file TS/TSX thuộc thay đổi: đạt. `pnpm format:check` toàn frontend báo
  201 lỗi tại các file ngoài phạm vi, chủ yếu CRLF so với cấu hình LF; không mass-format.
- Browser Chromium trên production build, fixtures: 1280/768/375px không tràn ngang;
  dialog nằm trong viewport; lưu tên, Navbar, tải lại, lỗi mật khẩu và xóa phiên sau
  đổi mật khẩu đều đạt; không có page error; xác nhận font Manrope.
- Artifact local ignored: `.cache/verification/AGRI-128/user-profile/browser.cjs`,
  `browser-results.json`, `profile-{1280,768,375}.png`, `password-{1280,768,375}.png`.

Kiểm thử mới trong `frontend/tests/unit/services/userApi.test.ts`,
`frontend/tests/component/views/UserProfilePage.test.tsx`; bổ sung kiểm thử cache
ở `frontend/tests/unit/services/authApi.test.ts`. Các test cũ của trang dùng thử được
giữ nguyên. Lượt discovery trước implementation thất bại vì module chưa tồn tại,
không tính là một lượt assertion đã chạy. Lần chạy UI đầu tiên còn thiếu dependency
`cn` ở môi trường; được xử lý bằng install frozen trước các lượt kiểm chứng đạt.

Phạm vi code và UI đã triển khai; nghiệm thu frontend–backend thật còn chờ môi trường.

`git diff --check`: đạt; không thay đổi package/lockfile. Backend, AI và CI không được
chạy lại vì không thuộc thay đổi frontend này. Không kết luận Jira Done hay CI xanh.

## 2026-10-25 — Hủy thay đổi avatar và đồng bộ remote main

- Theo yêu cầu mới, hoàn tác toàn bộ phần AvatarUrl/upload/migration và việc bỏ các
  trường chưa hỗ trợ của lượt đang dở. Giữ giao diện Profile/Password đã làm trước đó.
- Fetch `origin/main`, fast-forward `AGRI-128-backend-improvement` từ `a43797d` lên
  `018bf32` (16 commit). `HEAD...origin/main`: `0 0`, không tạo merge commit, không push.
- Cất local vào stash `5eb57ac762a39ed8dbdcbb122059a1b78af0d402` rồi apply lại, giữ
  stash dự phòng. Bản sao local trước hoàn tác ở
  `.cache/recovery/cancel-avatar-before-main-merge/` (ignored).
- Giải quyết import AppProvider bằng cách giữ cả `revokeSession` từ main và
  `AuthUser`/`updateStoredAuthUser` của Profile local. Giữ việc xóa
  `appsettings.Development.json.example` đã có trước task, không phục hồi nhầm.
- Bổ sung callback `updateAccount` vào fixture `PrivateHistoryImage.test.tsx` từ main
  để khớp AuthContext local. Không còn unmerged paths hoặc conflict markers.
- Bốn file local không liên quan (`database_details.md`, `writing-block.md`,
  `sprint1report.ipynb`, report commit-review) được đối chiếu và giữ byte-for-byte.
- Dependency frontend được đồng bộ theo lockfile từ main; Next 16.4.1 là thay đổi
  có sẵn trên main, không phải nâng phiên bản riêng của task.
- Kết quả kiểm tra sau merge được ghi ở task log của lượt này; không dùng lại
  368 test phía trên làm bằng chứng mới. Không chạy backend/AI hoặc migrate DB.
- Kiểm tra mới sau merge: frontend typecheck/lint đạt; **55 file, 374/374 test đạt**
  (97,13 giây). `git diff --check` đạt, không còn unmerged paths và index không có
  file staged. Không chạy lại production build hoặc backend suites trong lượt merge.
