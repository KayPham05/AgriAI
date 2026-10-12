# AGRI-57 - Khung banner nhất quán và crossfade

- Ngày: 2026-10-10. Nhánh xác minh: `AGRI-57-frontend-summary`.
- User không chấp nhận hình chữ nhật contain ở lượt trước và yêu cầu thống nhất kích thước, chuyển ảnh mượt hơn. Thay đổi này supersede framing cũ; không thay nguồn ảnh.

## Thay đổi

- `frontend/src/components/common/BotanicalBanner.tsx`: mọi scene dùng chung media bounds, `object-cover` và focal position từng cây; Next sizes khớp vùng ảnh. Giữ 13 JPEG gốc/order, chỉ active+next, prepared-photo gate, copy/actions, zoom và cleanup hiện có.
- `frontend/src/index.css`: mobile khung3:2, desktop width `min(56vw,60rem)`, minimum hero `clamp(28rem,37.333vw,40rem)`. Các ảnh lấp cùng khung, không thay đổi mép letterbox theo tỷ lệ gốc. Chỉ mép trái desktop alpha-blend vào canvas, opaque từ24%; không blur, vignette trên/dưới, border, card shadow hoặc scrim rộng. Mobile không mask.
- Crossfade opacity tăng0.65→1.2s, `sine.inOut`; giữ scene interval6.5s, centered zoom1.03/12s, offscreen/tab pause và static reduced-motion. Không thêm manual control theo override trước.
- `DESIGN.md` ghi treatment hiện hành, giữ các mô tả trước như lịch sử. Taste/React điều khiển triển khai; GSAP Performance kiểm tra transform/opacity, Impeccable review-only. Không sửa Button, logo/map/phim, auth/API/routes/dependency/dữ liệu.

## Kiểm chứng mới

- Browser RED trên bản contain: painted photo bounds hai nguồn đầu ở1920px là922x574.33 và907.5x605; assertion cùng khung thất bại. Lượt RED riêng đo vùng opacity10%→90% mất383.6ms, không đạt yêu cầu blend tối thiểu600ms.
- Final Chromium production với API/session fixtures: **5/5 PASS** ở1920/1280 normal,768/375 reduced và375 normal. Hai nguồn đầu có cùng bounds960x640,717x478 và375x250 theo viewport. Blend thực tế10%→90% đạt714.9/716.4/716.6ms ở ba ca normal; không overflow/page error. Reduced không đổi scene trong thời gian quan sát; unit suite kiểm tra policy lâu hơn.
- QA ignored `tmp/ui-review/banner_consistent_frame_check.py`, ảnh `banner-consistent-*.png`. Một batch inspection desktop/mobile phát hiện feather trên/dưới hơi mờ; bỏ trong một batch, final confirmation PASS. Không mở vòng polish thêm.
- Fresh full Vitest **115/115 tests,21/21 files PASS**,49.19s. Sau inspection chỉ chỉnh CSS mask, không đổi logic/component; final production build **PASS** (10/10 static pages,2 dynamic routes). Restore Next dev type imports rồi final `corepack pnpm typecheck` **PASS**.
- Scoped Biome lint component, format component/CSS **PASS**; final detector hai target `[]`; scoped Git whitespace **PASS** với LF/CRLF notice. Không lint toàn repo.
- Test server riêng3100 đã dừng sau QA; warning `next start`/standalone đã có, không chỉnh deployment. Không rebuild/restart Docker stack của user.

## Giới hạn

- Cover cắt nhẹ rìa ảnh theo khung/focal, đặc biệt khi ảnh gốc khác3:2; không hứa nhìn100% nguồn như iteration trước. Không stretch ảnh hay resize/ghi đè file gốc. Ba ảnh nhỏ vẫn giới hạn độ nét.
- Browser kiểm tra chuyển hai nguồn đầu bằng hình ảnh/frame thực; unit suite kiểm tra loop đủ13. Chưa nghiệm thu visually từng scene, FPS/60fps, Safari/Firefox, thiết bị thật, screen reader, CI, coverage hoặc Lighthouse.
- API fixture không phải backend/AI inference E2E. Không migration, volume changes, stage/commit/push/PR/Jira/stash. Licensing/provenance ảnh và việc không có manual pause vẫn là giới hạn lịch sử.
