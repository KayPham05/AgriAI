# AGRI-130 — Full ASP.NET Core API tests

Nhánh: `AGRI-130-api-tests`, từ main sau PR #43 merge. [PR #44](https://github.com/KayPham05/AgriAI/pull/44) đã tạo; các mục cũ phản ánh thời điểm ghi. Trạng thái mới nhất ở mục cuối.

## 2026-10-23 — Tách suite và bổ sung test

- Tách Unit/Integration/API, fixture dùng chung; giữ test real-service opt-in riêng. Thêm manifest toàn bộ controller API, contract tests, Kestrel tests và bước CI API/coverage.
- Review độc lập đã góp ý lifecycle, concurrency, config isolation, catalog semantics và assertion; đã sửa các điểm tĩnh được xác nhận.
- Theo red–green: sửa leak exception 500, thực thi validator HTTP, bổ sung biên catalog và mapping duplicate name. Không thêm endpoint.

## 2026-10-23 — Nghiệm thu sau khi Docker hoạt động lại

- Trước đó Docker crash nên chỉ có unit 136/mapping 5/CI checker 3 pass; chưa đủ nghiệm thu. Người dùng restart Docker, giữ dữ liệu/volume.
- Runtime phát hiện lỗi revoke session khi lệch đồng hồ: thêm migration 7 và clamp repository; sửa oracle Disease unique/Kestrel và kỳ vọng số migration, rồi chạy lại.
- Cuối: Unit 137/137, Integration 60/60, API 200/200 ×3 không retry/skip; giữ đủ 264 case baseline, không trùng. Build/diff check pass; coverage gộp 80,97% (baseline 73,33%), gate 70% pass. Review độc lập không còn P1/P2 trong phạm vi.
- Khi triển khai cần backup + `--migrate` riêng; chưa chạy GitHub Actions/real-service/frontend/Python hoặc migrate DB ứng dụng. Chưa commit/push.
- Chi tiết: [báo cáo](../../reports/AGRI-130/README.md), [ma trận](../../reports/AGRI-130/api_matrix.md), [review](../../reports/AGRI-130/review.md).

## 2026-10-23 — Bổ sung hồ sơ bàn giao

- Hồ sơ [kiểm chứng và bàn giao](../../reports/AGRI-130/README.md): nguồn TRX/coverage, điều kiện nghiệm thu, lệnh tái chạy và lưu ý migration. Giữ lịch sử kết quả; lần cập nhật tài liệu này không chạy lại application tests.
- Thêm [TESTING.md ở root](../../../TESTING.md) làm quy chuẩn chung; liên kết từ AGENTS và chiến lược lịch sử. Kiểm tra link/cấu hình/lệnh và diff; không thay code/CI hoặc chạy lại application tests.

## 2026-10-23 — Commit theo nhóm

- Theo yêu cầu: tách commit fix backend/regression, API suite, CI/coverage và tài liệu theo Conventional Commits AGRI-130. Kiểm tra staged diff từng nhóm; sửa một trailing whitespace trong test mới. Chưa push/tạo PR.

## 2026-10-24 — Sửa theo review PR #44

- Xác nhận P2 và red→green: tách fixture R2 opt-in nạp config chỉ định; giữ fake cho suite thường, thêm guard thiếu credential/bucket dev và regression SDK/config.
- Bổ sung đúng 15 MiB cho Guest/User, giữ 15 MiB + 1 byte bị chặn; cập nhật manifest, ma trận và hướng dẫn R2.
- Full local: Unit 137, Integration 64, API 202 ×3 không retry/skip pass; coverage 80,97%; RealR2 thật 1/1 pass với cleanup. CI tại 69c925c đã pass, không coi là CI của fix mới.
- Fix mới chưa commit/push; không migrate DB ứng dụng. Chi tiết và artifact: [report](../../reports/AGRI-130/README.md), [review](../../reports/AGRI-130/review.md).

## 2026-10-24 — Review lại P2 fixture R2

- Không thấy blocker mới trong đường cấu hình; không sửa thêm source. Chạy mới: fixture 4/4, R2 thật 1/1 pass; tắt opt-in/không credential skip 1 đúng chủ đích, không tính pass cloud.
- Bằng chứng/giới hạn tại [review](../../reports/AGRI-130/review.md); fix vẫn chưa commit/push.

## 2026-10-24 — Bàn giao fix PR #44

- Theo yêu cầu commit/push: tách fix fixture + regression, test biên upload và tài liệu thành Conventional Commits AGRI-130. Kiểm staged diff từng nhóm; chỉ sửa thêm blank line EOF. CI revision mới theo dõi tại PR #44; không merge/deploy.
