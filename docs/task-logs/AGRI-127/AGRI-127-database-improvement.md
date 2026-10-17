# AGRI-127 — Nhật ký tóm tắt

Nhánh `AGRI-127-database-improvement`; các đợt dưới đều ngày 2026-10-17.
**DoD DB/migration/kiểm thử đã chốt: hoàn tất.** Không xác nhận toàn US hoặc Jira Done.
[Báo cáo](../../reports/AGRI-127/README.md) · [Việc còn lại](../../notes/remaining_work.md).

## 2026-10-17 — Lập tài liệu tổng quan

Tổng hợp 10 US + 10 subtask; lập ma trận source. Chỉ Markdown, chưa chạy DB/test.

## 2026-10-17 — Tinh chỉnh scope theo quyết định đã chốt

Áp dụng confirmed decisions và hồ sơ tùy chọn; giữ Guest không lưu. Kiểm tra link/whitespace pass.

## 2026-10-17 — Phỏng vấn và thực thi phạm vi database

Thêm 7 entity/configuration, 2 migration forward-only, trigger ownership/session/reapproval. 33 unit + 44 integration pass; build backend pass. Backup đọc archive được (chưa restore). Local từ 3/9 lên 5 migration/16 bảng, checksum cột cũ giữ nguyên. Evidence `.cache/database-verification/agri127/`.

## 2026-10-17 — Bổ sung skill QA cho toàn hệ thống theo yêu cầu

Cài 25 QA guide pin b3bb61bd268b147476252c6ed5a0440c87b97441, giữ MIT/19 skill khác. Kiểm tra cấu trúc/hash/link pass; không test ứng dụng. Evidence `.cache/qa-skill-setup/`.

## 2026-10-17 — Gộp 25 chuyên môn vào skill QA testing

Gộp một QA testing entrypoint; 25 guide/114 payload, 98 link, quick_validate pass. Evidence `.cache/qa-skill-grouping/`.

## 2026-10-17 — Kiểm thử checkpoint thật và bảo mật/phân quyền

Thêm Security/real checkpoint: 33 unit + 75 integration, 65 Python regression + 6 checkpoint pass. JWT sensitivity: expired/future fail khi tắt lifetime, khôi phục rồi full pass. Storage fake; evidence `.cache/qa-verification/agri127/final-backend/`, `mutation/`, log Python.

## 2026-10-17 — QA toàn DB/backend/migration/AI/frontend và gom test AI

Thêm 27 ca, gom 24 file AI; 21 hash giữ nguyên, không mất method. Sửa predictionApi sau 5 contract fail. Backend 33+84, AI74, frontend215 pass (406 tổng); typecheck/lint/build pass. Branch 62,01/46,83/61,83%; format toàn Windows fail161, file đổi pass. Evidence `.cache/qa-verification/agri127/system/`.

## 2026-10-17 — Gom test frontend vào cấu trúc tập trung

Gom frontend 34 test + 2 helpers: 215 pass (79 unit/99 component/33 integration/4 tooling); typecheck/lint/format38 file pass; coverage không đổi. Giữ QA context tại .agents/references, sửa link/hash wrapper. Evidence `.cache/qa-verification/agri127/frontend-layout/`.

## 2026-10-17 — Nâng gate coverage và khảo sát UUID v7

Gate backend/frontend lên60%, Python40%; 33+83 backend và215 frontend pass, branch62,01/61,83. Validator3 pass, biên59,99 fail/60 pass. UUID khảo sát32cột/113ID v4, không đổi DB. Evidence `.cache/qa-verification/agri127/coverage-uuid/`.

## 2026-10-17 — Gom việc còn lại và thống nhất báo cáo

Tạo remaining_work.md và thống nhất các đợt/ngưỡng; 11 Markdown/108 link/5anchor hợp lệ, diff check pass. Không chạy app test. Evidence `.cache/qa-verification/agri127/docs-consolidation/`.

## 2026-10-17 — Rút gọn tài liệu và đánh giá test set

Rút gọn report/task log, giữ nguyên overview; remaining_work chỉ bổ sung khoảng trống coverage và kết quả đánh giá. Bản đầy đủ trước rút gọn ở ignored `.cache/qa-verification/agri127/short-docs/before/`; các đợt/metric/evidence chính giữ trong bản tóm tắt.

Chạy evaluator gốc trên split test17.599 ảnh, hai checkpoint SHA đúng; image integrity0 mismatch. plant: accuracy=0.999886, Macro-F1=0.999881. disease: accuracy=0.966248, Macro-F1=0.950208. Xem [báo cáo đánh giá](../../reports/AGRI-127/fixed_test_evaluation.md). Các lượt preflight chậm dừng riêng; host validator kiểm tra đủ split rồi chạy container. Container chính dừng sau khi plant hoàn tất để tránh chạy disease trùng; kết quả disease lấy từ lượt độc lập kết thúc COMPLETE/exit0. Không đổi split/model/app source, không chạy training, DB, E2E hoặc GitHub Actions; không commit/push/Jira.

Đánh giá theo lớp phát hiện428 Khoe_manh→Dom_than_la, F1 lớp0,030435 (support8); đã bổ sung remaining_work, chưa sửa model.

Xác minh cuối: 12 Markdown/72 link local và anchor hợp lệ; overview byte-identical, SHA checkpoint không đổi, manifest SHA sau chạy giữ nguyên. Diff check pass, staged rỗng; container đánh giá đã dọn, chỉ PostgreSQL ứng dụng còn chạy. Evidence `short-docs/validation.json`.

## 2026-10-17 — Sửa false positive disease

Sửa ai/train.py + ai/utils/losses.py: sample weighting sau smoothing; thêm4 test,
2 fail trước sửa. ai/utils/checkpoint_correction.py dùng alpha0,5 chọn bằng val,
chỉ SHA disease đã pin; ai/predict.py và ai/evaluate.py dùng chung, thêm3 test loader
(1 fail trước sửa). Không đổi checkpoint/nhãn/split/metric hoặc threshold80%.
Val8.802: Macro-F1 0,949490→0,971960, healthy→Dom218→0. Test17.599:
accuracy0,966248→0,990909, Macro-F1 0,950208→0,970392, healthy→Dom428→0,
Dom F1 0,030435→0,857143 nhưng recall7/8→6/8; tổng lỗi594→160.
81 AI pass; CI unit62+HTTP13 pass, branch507/1076=47,12%; image build pass.
1 real .NET/FastAPI test + HTTP ảnh lúa khỏe từng sai pass, storage fake/PG riêng.
Evidence .cache/qa-verification/agri127/disease-fix/; [báo cáo](../../reports/AGRI-127/disease_false_positive_fix.md).
Giữ số liệu baseline; remaining_work ghi rõ recall/lớp ít mẫu/chưa retrain/GPU/E2E.
Không thay DB, commit/push/Jira. Trọng số runtime trùng từng tensor với candidate
được test; SHA bản gốc giữ nguyên, checkpoint khác không bị áp hoặc áp hai lần.

Bàn giao: manifest/checkpoint SHA giữ nguyên; 9 Markdown/70 link và anchor hợp lệ, diff check pass/staged rỗng. Giữ việc lược bỏ ba báo cáo cũ phát sinh trong phiên, sửa link đang dùng sang tài liệu hiện có. Container test tự dọn, chỉ PostgreSQL ứng dụng còn chạy. `disease-fix/validation.json` ghi kiểm tra cuối.

## 2026-10-17 — Làm rõ lỗi dự đoán và trạng thái bàn giao

Bổ sung `disease_false_positive_fix.md`: không sửa annotation/ảnh/manifest ở
`D:\AgriVisionAI_Data\v1.4`; sửa loss cho training sau này và loader checkpoint
hiện tại. Ghi riêng lỗi/ảnh hưởng của Khoe_manh, Dom_than_la, Sau_gai_an_la,
Vang_lui và phân biệt hoàn tất phạm vi DB với hoàn tất toàn hệ thống.
Đối chiếu CSV test đã lưu: 160 lỗi, lần lượt 26/2/19/8 lỗi của bốn lớp trên;
Khoe_manh→Dom_than_la bằng 0. Link local trong báo cáo hợp lệ, diff check pass.
Chỉ cập nhật tài liệu, không chạy lại inference/training hoặc các suite ứng dụng;
các kết quả test trước đó giữ nguyên thời điểm và phạm vi. Chưa stage/commit/push.

Bổ sung tiếp bảng trước/sau theo từng file trong `disease_false_positive_fix.md`:
loss chỉ tác dụng ở lần train mới; hiệu chỉnh loader tác dụng với checkpoint cũ
khi chạy code mới. Làm rõ phép đổi bias áp dụng cả 44 lớp, không sửa dataset,
không đổi threshold80%, không chứng minh calibration xác suất hoặc triển khai
môi trường vận hành. Đối chiếu source hiện tại; không thay code hoặc chạy lại ML.

Rà khả năng commit: kiểm tra status/diff/225 file mới, chưa thấy đường dẫn
dataset/checkpoint/cache/backup/env cần loại trong danh sách chưa ignore;
checkpoint/cache thực tế vẫn được ignore. Sửa link gate hỏng trong `AGENTS.md`
sang `docs/reports/AGRI-127/README.md` đang tồn tại; diff check pass. Chưa rà secret
toàn nội dung, chưa chạy lại suite, chưa stage/commit/push.

## 2026-10-17 — Rà secret trước commit

Gitleaks v8.24.2 cùng phiên bản CI: snapshot1.101 file, HEAD103 commit được quét,
mọi ref local127 commit được quét đều0 finding/exit0. Đối chiếu7 giá trị nhạy cảm
từ2 cấu hình local với snapshot:0 trùng. Rà bổ sung32 literal/URL/public-config
candidates, phân biệt fixture/ví dụ/UI; không thấy credential thật cần chặn commit.
Env/checkpoint/cache/backup không nằm trong tập file có thể commit; không quét
trực tiếp GitHub PR refs/artifact/triển khai. Xem
[báo cáo và giới hạn](../../reports/AGRI-127/README.md);
evidence ignored `leak-audit/`. Chỉ thêm tài liệu, không đổi secret/source/history,
không chạy lại suite ứng dụng, không stage/commit/push.

## 2026-10-17 — Bàn giao các thay đổi bằng commit local

Theo yêu cầu người dùng, chuẩn bị commit toàn bộ thay đổi không bị ignore theo
nhóm DB, skill QA, test AI, sửa AI, frontend, CI và tài liệu; Conventional Commits
với key AGRI-127. Checklist đã được người dùng chuyển vào `docs/notes/remaining_work.md`;
sửa các liên kết đi/về, gồm link trong overview (chỉ đổi đường dẫn).
Giữ các lược bỏ tài liệu của người dùng, không khôi phục báo cáo đã xóa.
Rà staged paths/diff, liên kết và secret trước commit; không chạy lại các suite
ứng dụng hoặc trình bày bằng chứng cũ như mới. Không push/tạo PR/đổi Jira.

Đã tạo sáu commit local trước commit tài liệu: DB `144e66d`, skill QA `ebf479b`,
test AI/bảo mật `d52baa9`, sửa AI `70517ce`, frontend `8e954f1`, CI `f379a69`.
Kiểm tra lại73 liên kết local trong report/checklist/task log: pass. Bỏ khoảng
trắng cuối dòng trong `docs/notes/database_details.md` để staged diff check đạt;
giữ nguyên nội dung kỹ thuật. Commit tài liệu cuối bao gồm log này và checklist
ở notes; các mục chưa làm tiếp tục được theo dõi, không tự đánh dấu hoàn tất.

Gitleaks v8.24.2 quét lại snapshot1.101 file ngay trước commit tài liệu:0 finding,
exit0; evidence ignored `leak-audit/precommit.json` và `precommit.log`.
