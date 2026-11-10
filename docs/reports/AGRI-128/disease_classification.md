# AGRI-128 — Phân loại tình trạng trong Admin

Ngày triển khai: 2026-10-28. Nhánh: `AGRI-128-knowledge-medicine`, trên HEAD
`8c146bf`. Người dùng đã xác nhận thực thi sau giai đoạn lập kế hoạch.

## Nguyên nhân và hành vi

Cặp `Ca_chua / Chay_la_som` có cây, bệnh và liên kết active nhưng bệnh có
`ConditionType=Unknown`. Điều kiện Disease của `MedicineService.AssignUseAsync`
đang đúng; trước đây Admin không có cách sửa phân loại và UI thuốc không giải
thích điều kiện này. Chi tiết truy vấn DB ở mốc chẩn đoán trong [index](README.md).

- Thêm **Phân loại tình trạng** trong trình sửa/tạo **bệnh cây**, gồm Chưa xác
  định, Khỏe mạnh, Thiếu dinh dưỡng và Bệnh. Thuốc vẫn chọn **cặp cây và bệnh**.
- Create/Update disease nhận `conditionType`; backend chỉ nhận bốn giá trị hợp
  lệ. Create bỏ qua trường này mặc định Unknown; update bỏ qua/null giữ phân loại
  cũ để tương thích client cũ. Thay đổi phân loại thu hồi `IsContentApproved`.
- Lookup cặp bổ sung `conditionType`, `plantIsActive`, `diseaseIsActive`, giữ
  `isActive` là trạng thái riêng của liên kết.
- UI thuốc giải thích bằng tiếng Việt khi cặp không hợp lệ và chặn lưu, xác minh,
  duyệt. Liên kết cũ vẫn xem/gỡ được; dữ liệu metadata thiếu cũng chặn lưu.
- Khi đổi bệnh khỏi Disease, public detail và bộ lọc danh sách thuốc không trả
  hướng dẫn cũ của cặp đó. Điều kiện gợi ý thuốc hiện có vẫn giữ nguyên.

Không migration mới, không đổi nhãn/class index/dataset và không tự phân loại
danh mục thật. Phân loại ở cấp bệnh áp dụng cho mọi cây liên kết với bệnh đó.

## Các đường dẫn thay đổi

- Backend Application: `DTOs/Disease/DiseaseDtos.cs`,
  `DTOs/PlantDisease/PlantDiseaseCatalogDtos.cs`, các service `DiseaseService`,
  `PlantDiseaseCatalogService`, `MedicineService`.
- Backend Infrastructure: `Persistence/Repositories/MedicineRepository.cs`.
- Frontend: `src/features/knowledge/{CatalogControls,CatalogEditor,MedicineUses}.tsx`
  và `src/services/knowledgeApi.ts`.
- Regression: `DiseaseClassificationTests.cs`, `KnowledgeMedicineTests.cs`,
  `tests/component/admin/{CatalogEditor,MedicineUses}.test.tsx`,
  `tests/helpers/knowledge.ts`.
- API inventory: `backend/tests/AgriVision.ApiTests/Contracts/api_manifest.json`
  và [route matrix](knowledge_api_matrix.md), thêm `knowledge.classification`.

## Kiểm chứng

Regression được chạy trước sửa: unit 9 fail/3 pass; component 7 fail/7 pass.
API regression sau khi thêm editor phát hiện public detail vẫn trả một hướng
dẫn khi đã đổi bệnh sang Healthy; đã bổ sung bộ lọc ở service và repository.
Test API dùng dữ liệu tổng hợp trong PostgreSQL Testcontainers riêng, không
đổi phân loại trong DB ứng dụng.

Kiểm chứng mới ngày 2026-10-28:

- `corepack pnpm typecheck` và `corepack pnpm lint`: đạt (234 files được lint).
- `corepack pnpm test --maxWorkers=2`: **447/447** test, 63/63 file đạt.
- Backend chạy SDK 9.0.305 bằng lệnh dưới đây; unit **168/168**, không skip.
  Integration **65/65**, không skip. Lượt API đầu **239 pass/1 fail**: ApiCase của test mới
  bị trùng `knowledge.lifecycle`; đã đổi thành `knowledge.classification` và
  cập nhật manifest. Chạy lại riêng toàn bộ project ApiTests với cùng flags,
  output `final-api`: **240/240 đạt, không skip**, gồm regression classification
  và manifest guard. Tổng kết quả cuối theo suite: **473 backend + 447 frontend**.
- `git diff --check`: đạt. Không đo lại coverage.

```powershell
& D:/AgriAI/.cache/tools/dotnet-9.0.305/dotnet.exe test backend/AgriVision.sln --no-restore --filter 'Category!=RealCheckpoint&Category!=RealR2' --verbosity quiet --logger trx --results-directory .cache/classification-verification/final-backend -m:1 -p:UseSharedCompilation=false -nodeReuse:false
```

Artifact local trong `.cache/classification-verification/`: `frontend-final.log`,
`backend-final.log`, `final-backend/*.trx`, `api-final.log`, `final-api/*.trx`,
`red-api/*.trx`, `docker-build.log`, `docker-up.log`;
không đưa vào Git.

Docker build backend/frontend thành công, sau đó chạy:

```powershell
docker compose --env-file D:/AgriAI/.env -p agriai up -d --no-deps --wait --wait-timeout 60 backend frontend
```

Hai container healthy; health trực tiếp port 5080 và proxy port 3000 đều Healthy,
trang chủ HTTP 200. Lookup public qua port 3000 trả 59 cặp, không cặp nào thiếu
ba trường metadata mới. Phân bố vẫn là 47 Unknown, 10 Healthy và 2 NutrientDeficiency.
`Ca_chua / Chay_la_som` vẫn Unknown, cả ba trạng thái active; chưa tự sửa dữ liệu.
Giữ PostgreSQL volume và AI nguyên trạng. Không chạy migration trong lần sửa này.

Tab trình duyệt hiện ở màn hình đăng nhập có CAPTCHA, nên chưa kiểm tra lại Admin
trực tiếp trong phiên này. Kết quả UI ở trên là component/integration tests;
không coi healthcheck hoặc tests dùng fixture là UAT trình duyệt với dữ liệu thật.

## Cách dùng và giới hạn

Tại **Admin → Bệnh cây**, mở mục bệnh, chọn phân loại đúng rồi lưu. Sau đó quay
lại **Thuốc → Đối tượng sử dụng và nhãn**, chọn cặp cây–bệnh để lưu hướng dẫn.
Việc xác minh nhãn và duyệt vẫn là các thao tác riêng; đổi phân loại cần duyệt
lại nội dung bệnh. Không tự đổi tất cả Unknown sang Disease để làm nút lưu hoạt động.

Chưa chạy RealR2, RealCheckpoint, đo coverage hoặc xác minh GitHub Actions.
Chưa commit/push. AI không thuộc phạm vi cập nhật này.

## 2026-10-29 — Bàn giao tìm kiếm cặp cây–bệnh trong thuốc

Thay đổi và kiểm thử được thực hiện ngày 2026-10-28; hoàn tất ghi nhận khi người
dùng yêu cầu tiếp tục ngày 2026-10-29. Các kết quả dưới đây thuộc lượt chạy ngày
28, không phải một lần chạy suite mới ngày 29.

- Thêm ô **Tìm cặp cây và bệnh** vào `frontend/src/features/knowledge/MedicineUses.tsx`,
  tái sử dụng `SearchField` hiện có. Tìm theo tên cây, tên bệnh hoặc class name;
  không phân biệt hoa/thường, dấu tiếng Việt hoặc dấu gạch dưới, hỗ trợ nhiều từ.
- Lọc cả danh sách liên kết đã gắn và danh sách chọn. Hiển thị số kết quả/trạng thái
  không tìm thấy; giữ cặp đang chọn cùng nội dung đang biên tập khi bộ lọc thay đổi.
  Cặp ngoài kết quả được ghi `(đang chọn)`. Xóa từ khóa khôi phục danh sách.
- Test tại `frontend/tests/component/admin/MedicineUses.test.tsx`: trước sửa
  2 fail/10 pass do chưa có ô search; sau sửa 12/12 đạt. Toàn bộ frontend
  **449/449**, 63 file đạt; typecheck/lint và Docker frontend build đạt. Lint từng
  phát hiện non-null assertion trong fixture mới; đã sửa và kiểm tra lại đạt,
  chạy lại riêng MedicineUses 12/12 đạt sau chỉnh fixture.
- Build và cập nhật riêng frontend bằng Compose project `agriai`, dùng root
  `.env`, `--no-deps --wait`; container healthy. Không sửa backend/AI hoặc dữ liệu.
  Log local: `.cache/classification-verification/pair-search-{red,green,full,final,build}.log`.
- UAT ngày 28 trên tab kiểm thử riêng đã đăng nhập Admin: nhập `lúa bạc_lá` giảm
  59 cặp xuống đúng `Lua / Bac_la_lua`, cả liên kết đã gắn và dropdown đều khớp;
  chọn cặp hiển thị hướng dẫn đã lưu; tìm không có kết quả vẫn giữ cặp/hướng dẫn;
  xóa từ khóa trả về 59 cặp. Không lưu, xác minh hoặc duyệt nội dung thật trong UAT.
- Kiểm tra trang công khai `/medicines/{id}` xác nhận mục **Hướng dẫn theo đối
  tượng sử dụng**. Thuốc cần công khai, liên kết cần xác minh nhãn và duyệt, cặp
  phải active và thuộc Disease. Trong lần kiểm tra, liên kết hiện có chưa xác
  minh/chưa duyệt nên trang hiển thị chưa có hướng dẫn được công khai.

Không chạy lại backend hoặc coverage cho thay đổi tìm kiếm chỉ ở frontend.
Chưa commit/push hoặc xác minh CI. Giới hạn CAPTCHA ở mốc trước vẫn là lịch sử;
lượt UAT tìm kiếm này dùng phiên Admin đã đăng nhập của người dùng.
