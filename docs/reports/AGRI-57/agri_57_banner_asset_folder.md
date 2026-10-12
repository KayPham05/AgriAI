# AGRI-57 - Banner asset folder

Ngày 2026-10-12; nhánh xác minh `AGRI-57-frontend-summary`.

## Thay đổi

Theo yêu cầu user, gom toàn bộ27 banner assets vào `frontend/src/assets/banner/`:13 JPEG ảnh thật trực tiếp trong folder và14 PNG decoration trong `banner-leaves/`. Kiểm tra resolved source/destination trong assets và không có target trùng trước native PowerShell Move-Item; SHA25627/27 khớp trước/sau, không đổi tên hoặc nén/chỉnh nội dung.

Cập nhật static imports tại `frontend/src/data/cropPhotos.ts` và `bannerLeaves.ts`; test đọc JPEG tại `bannerData.test.ts` dùng folder mới. DESIGN ghi vị trí hiện hành. Registry dùng chung vẫn phục vụ banner/phim/catalog/map info, không nhân bản ảnh. Giữ mọi component/CSS, motion, crop order/focal, logo/map geometry/auth/API/dependencies và unrelated WIP. Coding-standards hướng dẫn thay đổi tối thiểu; đây là tổ chức file, không thiết kế lại UI.

## Kiểm chứng

- Trước di chuyển, test đường dẫn mới RED13/15 do ENOENT ở13 JPEG,2 pass.
- Sau di chuyển/import update, full `corepack pnpm exec vitest run --maxWorkers=2 --testTimeout=20000` PASS118/118 tests,21/21 files,59.34s.
- Scoped `corepack pnpm exec biome check src/data/cropPhotos.ts src/data/bannerLeaves.ts src/data/bannerData.test.ts` PASS3 files.
- Build đầu exit1 do không tải được Manrope từ Google Fonts trong môi trường hạn chế mạng. Rerun với quyền mạng PASS10/10 static pages và2 dynamic routes; không sửa font/config. Restore Next dev type imports về trạng thái trước build rồi `corepack pnpm typecheck` PASS. Không dùng build cũ làm bằng chứng mới.

## Giới hạn

### User clarification: sibling folders, 2026-10-12

User làm rõ `banner-leaves` nằm trực tiếp trong assets, ngang hàng banner. Chuyển14 PNG từ banner/banner-leaves về assets/banner-leaves sau kiểm tra resolved paths/no collisions;14/14 SHA256 unchanged. Chỉ cập nhật14 import trong bannerLeaves.ts và DESIGN;13 JPEG vẫn trong banner. Typecheck và scoped Biome1 file PASS. Focused `BotanicalBanner.test.tsx`/`bannerData.test.ts` PASS38/38 tests,2 files,41.69s. Không chạy lại build/full suite/browser/Docker trong lượt correction này; evidence phía trên thuộc lượt trước.

Không chạy browser/screenshot vì không sửa component/CSS hoặc nội dung ảnh; không dùng browser evidence cũ làm bằng chứng mới. Chưa Docker rebuild/restart/backend/model E2E/CI/coverage/Lighthouse. Không stage/commit/push/PR/Jira/stash hoặc xóa dữ liệu; giữ giới hạn licensing/provenance và decoration generated đã ghi trước đó. Kết quả local không xác nhận toàn bộ DoD.
