# AGRI-75 — Làm sạch lịch sử secret ngày 2026-10-02

## Phạm vi và kết quả

Người dùng xác nhận khóa Cloudinary đã thu hồi và cho phép viết lại lịch sử,
force-push các nhánh bị ảnh hưởng. `git-filter-repo` 2.47.0 chạy trong mirror
cô lập để thay đúng giá trị `ApiSecret` cũ bằng placeholder, thay JWT mẫu bị
cắt bằng `<jwt-token>`, xóa toàn bộ `frontend/.visual-qa-profile/` và
`backend/.vs/`. Scan mở rộng phát hiện thêm hai finding trong cấu hình IIS
của `.vs`, ngoài bảy finding của log CI ban đầu.

Mirror có 22 refs. Đối chiếu cây file tại từng tip xác nhận chỉ có hai phép
thay chuỗi và hai thư mục sinh tự động bị xóa. Gitleaks v8.24.2 quét mọi ref
mirror đã làm sạch, **không dùng ignore**, trả **0 finding, exit 0**.
Workflow vẫn dùng `--log-opts="--all"`; đã bỏ `.gitleaksignore` cũ.

## Các nhánh đã cập nhật trên remote

Push atomic với lease SHA cũ; xác minh lại SHA bằng `git ls-remote`.

| Nhánh | SHA trước | SHA sau rewrite, trước commit báo cáo |
|---|---|---|
| `main` | `7579be1d45404e6fa5559df71ad97a6b034c0f4c` | `0186cd3d1e11c2e6ba67b62895b44f114b10eb14` |
| `AGRI-45-backend-database-system` | `1074c9e80818b3aa93d03943adeb9ec6d93d3175` | `e81d1f953463b6a9755fc98ba03c3f0a29358a8b` |
| `AGRI-57-frontend-summary` | `3f5ebab7772384c6bc802476cc1b53000698c5b4` | `a437e8653c93a863a686340b7fb6af7b537d6674` |
| `AGRI-75-ci-testing-setup` | `11b16c0ca307439779fd82105a4545702f625458` | `9626d6627383e074d2a13f06be1b183cd6f9d5eb` |

## Kiểm chứng remote và nhánh giữ nguyên

Bộ duyệt tự động từ chối push cả chín nhánh vì chỉ công nhận phạm vi phê duyệt
rõ cho bốn nhánh trên. Năm nhánh dưới đây giữ nguyên SHA trên remote:

- `AGRI-21-extend-dataset-with-rice-and-mango`
- `AGRI-21-preprocessing-augmentation`
- `feature/Model_Plant_Species_Classification`
- `init-project`
- `revert-3-AGRI-21-extend-dataset-with-rice-and-mango`

Sau push, tạo bare clone mới từ GitHub, chứa đầy đủ chín nhánh remote.
Gitleaks v8.24.2 quét `--log-opts=--all` không dùng ignore: **93 commit,
0 finding, exit 0**. Vì vậy không cần force-push thêm năm nhánh để xử lý các
finding đã ghi nhận. Chưa xác nhận GitHub Actions pass; bare clone này chứa
refs nhánh, không chứa refs PR do GitHub quản lý.

Refs PR cũ và cache commit trên GitHub do GitHub quản lý; không force-push
`refs/pull/*`. Mirror ban đầu có refs của 12 PR bị ảnh hưởng. First changed
commit cũ: `00f8ee6215a9e9dd9ec357d7eaa1f0177d3c8e4b`. Nếu cần xóa dữ liệu khỏi
refs/cache này, chủ repo cần làm việc với GitHub Support; việc khóa đã thu hồi
có thể ảnh hưởng điều kiện hỗ trợ. Xem [hướng dẫn GitHub](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository).

## Bảo toàn workspace và bằng chứng

Đã đồng bộ checkout AGRI-75 và nhánh `main` local sang lịch sử sạch. Toàn bộ
19 file WIP được sao lưu và khôi phục đúng hash/nội dung, gồm trạng thái xóa.
Stash bảo toàn WIP và các mirror cũ vẫn nằm local, ngoài phạm vi push.
Nhánh local `ci_cd_initiation` vẫn giữ lịch sử cũ; scan `--all` ngay trong
workspace này còn thấy refs local/stash cũ và không tương đương checkout CI mới.

Artifact ngoài Git:

- `.cache/history-cleanup/remote-before.git`: backup remote cũ, gồm refs PR.
- `.cache/history-cleanup/local-before.git`: backup refs local trước đồng bộ.
- `.cache/history-cleanup/clean.git`: mirror đã làm sạch, gồm commit/ref map.
- `.cache/history-cleanup/remote-published.json`: SHA remote sau push bốn nhánh.
- `.cache/history-cleanup/wip_manifest.json`: hash của 19 file WIP.
- `.cache/secret-scan/clean-mirror-final.json`: scan mirror sạch, 0 finding.
- `.cache/history-cleanup/remote-after.git`: bare clone mới của chín nhánh GitHub.
- `.cache/secret-scan/remote-after.json`: scan clone mới, 93 commit, 0 finding.

Backup và stash chứa lịch sử cũ; không push hoặc merge chúng vào lịch sử mới.
Thành viên khác cần bảo toàn WIP rồi clone lại hoặc chuyển phần việc riêng
sang lịch sử mới; merge lịch sử cũ có thể đưa dữ liệu đã xóa trở lại.
