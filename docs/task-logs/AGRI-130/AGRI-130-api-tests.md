# AGRI-130 — Full ASP.NET Core API tests

Nhánh: `AGRI-130-api-tests`, từ main sau PR #43 merge. Chưa commit/push.

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
