# AGRI-57 - Ô nhập đăng nhập/đăng ký ngày 2026-10-09

Nhánh xác minh: `AGRI-57-frontend-summary`. Yêu cầu: tinh chỉnh các ô nhập trong LoginModal từ ảnh người dùng, giữ ngôn ngữ xanh lá/warm canvas và hành vi hiện có.

## Thay đổi và phạm vi

- `frontend/src/index.css`: token auth-field cho chiều cao48px, surface, viền pha80% muted-foreground, vòng focus xanh18%/3px, vòng lỗi destructive20%. CSS scoped `.auth-form-panel` chỉ chỉnh Input shadcn trong auth, không sửa shared Input hay các form khác. Padding standard pl-4, radius12px giữ nguyên. CAPTCHA cùng chiều cao; nút mắt44px có inset2px để căn giữa.
- Autofill dùng inset surface paint, giữ màu chữ/caret và cả focus/error rings; không dùng transition trì hoãn lâu, không xóa outline trợ năng, không thêm elevation. Đây là color correction cho màu autofill mặc định của browser.
- `DESIGN.md` ghi treatment và token recipes. Không sửa `LoginModal.tsx`, validation, API/session, terms, labels, GSAP hoặc dependency. Giữ Input/Label/Button/Checkbox/Tabs/Dialog có sẵn. Đã đọc docs Input qua CLI project runner và [tài liệu shadcn chính thức](https://ui.shadcn.com/docs/components/radix/input); không init/reinstall preset hay mass migrate form.
- Taste giữ visual identity/dials5/3/5, không thay interaction model auth. React Best Practices giữ thay đổi CSS-only, không thêm state/render. Impeccable chỉ đọc/review/detect.

## Kiểm chứng mới

- `tmp/ui-review/auth_field_check.py` đỏ trước sửa vì input44px thay vì48px. Sau sửa script ban đầu lấy kích thước giữa transition mở dialog, gây assertion dù kích thước cuối48px; thêm chờ entry kết thúc trong QA, không sửa animation ứng dụng.
- Browser final bốn ca375x800/768x900/1280x900 normal và1280x700 reduced PASS:48px input login/register, focus, keyboard Tab, ẩn/hiện mật khẩu, giữ email khi đổi mode, CAPTCHA sai/refresh, error terms, đóng Escape, không horizontal overflow/page errors. Autofill được mô phỏng bằng CDP forced pseudo-state với dữ liệu test, xác minh inset paint và focus ring cùng hiện; không truy cập mật khẩu/account đã lưu thật.
- Đã xem ảnh desktop login và mobile register/error. Script/screenshot QA nằm trong tmp bị Git ignore.
- `corepack pnpm exec vitest run --maxWorkers=2 --testTimeout=20000`:101/101 tests,18/18 files PASS, exit0. `corepack pnpm typecheck`:PASS. `corepack pnpm build`:PASS,3/3 static pages; khôi phục Next dev imports sau build.
- `biome format --write src/index.css` PASS; targeted Biome check exit0, vẫn11 warning print !important cũ ngoài scope. Impeccable read-only CSS detector `[]`.

## Giới hạn

Chưa kiểm tra autofill/password manager thật hoặc Safari/Firefox, screen reader/thiết bị thật, backend authentication/E2E/CI/coverage. Không coi forced pseudo-state là nghiệm thu autofill toàn trình duyệt. Không stage/commit/push, không thay stash dự phòng.
