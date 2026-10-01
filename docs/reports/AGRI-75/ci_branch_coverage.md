# AGRI-75 — CI, Docker và branch coverage

Ngày xác minh: **2026-09-29**. Nhánh: `AGRI-75-ci-testing-setup`.
Phạm vi: thay đổi chưa commit trên base `8650f48`.

## Cấu hình đã sửa

- [Workflow](../../../.github/workflows/ci.yml) chạy khi mở/cập nhật PR, push
  `main`, hoặc `workflow_dispatch`. Compose smoke, backend, frontend và Python
  độc lập; Docker lỗi không làm unit test của các phần khác bị skip.
- Backend build một lần, chạy riêng unit/integration. Integration dùng PostgreSQL
  Testcontainers; hai suite đều phải có test thực chạy, không fail/skip. ReportGenerator
  5.5.4 hợp nhất coverage trước khi áp ngưỡng; không lấy trung bình hai tỷ lệ.
- Frontend chạy typecheck, toàn bộ Vitest và Next.js build. pnpm 10.34.5 thống nhất
  với `packageManager`; coverage provider 5.0.2 khớp Vitest trong lockfile.
- Python chạy toàn bộ `ai/tasks/agri_21/tests/` bằng Python 3.12, PyTorch CPU 2.8.0,
  TorchVision 0.23.0 và [dependency test cố định](../../../ai/requirements_ci.txt).
  Không cần GPU, dataset thật, training hoặc checkpoint bên ngoài.
- Mỗi job có timeout; run cũ cùng ref được hủy khi có run mới. Job `ci-gate`
  fail nếu bất kỳ job bắt buộc nào fail, bị hủy hoặc bị skip.
- Artifact test/coverage/log được upload bằng `if: always()`, giữ 14 ngày.
  Tóm tắt coverage xuất vào GitHub job summary.

## Chính sách coverage

**Mục tiêu vẫn là tối thiểu 80% branch coverage cho từng phần.** Sau khi bổ sung
test cho lỗi dịch vụ AI và các nhánh API frontend, cả ba phần vẫn dưới 80%.
Theo yêu cầu, CI tạm áp các mức sàn thấp hơn kết quả đo mới; đây là gate chống
suy giảm, không phải tuyên bố đã đạt mục tiêu 80%.

| Phần | Phạm vi đo | Loại trừ | Gate |
|---|---|---|---|
| Backend | API, Application, Domain, Infrastructure; gộp unit + integration | Test assemblies và EF migrations sinh tự động | Sàn 35%, mục tiêu 80% |
| Frontend | Toàn bộ `frontend/src/**/*.ts,tsx`, kể cả file chưa có test | Test files, test setup, khai báo `.d.ts` | Sàn 25%, mục tiêu 80% |
| Python | Toàn bộ package `ai`, kể cả module chưa có test | Test files, `test_gpu.py` chẩn đoán phần cứng, stub cũ `ai/scripts/` vốn bị Git ignore | Sàn 40%, mục tiêu 80% |

Nguồn cấu hình: [Coverlet](../../../backend/coverage.runsettings),
[Vitest](../../../frontend/vitest.config.mts), [coverage.py](../../../.coveragerc),
[gate Cobertura](../../../.github/scripts/check_coverage.py).

Không áp một tỷ lệ tổng cho ba ngôn ngữ. Thiếu báo cáo, thiếu dữ liệu branch,
số đếm không hợp lệ hoặc coverage dưới sàn hiện hành đều gây lỗi. Test regression tại
[test_coverage_checks.py](../../../.github/scripts/test_coverage_checks.py)
xác minh các trường hợp 0%, dưới ngưỡng, đúng 80%, dữ liệu không hợp lệ và
TRX không có test/test fail/test skip.

## Bằng chứng local mới

| Kiểm tra | Kết quả | Artifact/nguồn |
|---|---|---|
| Backend unit | **16/16 pass**; gồm timeout, HTTP lỗi, JSON/contract sai, phản hồi hợp lệ và ánh xạ lỗi qua middleware | `.cache/coverage/review-20260929/unit/unit.trx` |
| Backend integration | **4/4 pass**, PostgreSQL thật qua Testcontainers | `.cache/coverage/review-20260929/integration-docker/integration.trx` |
| Backend branch sau gộp | **100/246 = 40,65% — sàn 35% đạt, mục tiêu 80% chưa đạt** | `.cache/coverage/review-20260929/merged/Cobertura.xml` |
| Frontend | **31/31 pass**, 7 file; typecheck pass | Output `pnpm --dir frontend test` và `pnpm --dir frontend lint` |
| Frontend branch | **255/954 = 26,72% — sàn 25% đạt, mục tiêu 80% chưa đạt** | `.cache/coverage/frontend/coverage-summary.json`, `cobertura-coverage.xml` |
| Python Linux/Python 3.12, đúng dependency CI | **43/43 pass** | Container `python:3.12-slim`; log cài đặt `.cache/coverage/python-linux/install.log` |
| Python branch trên Linux | **458/1024 = 44,73% — sàn 40% đạt, mục tiêu 80% chưa đạt**; artifact từ lần đo trước, Python không đổi trong lượt này | `.cache/coverage/python-linux/coverage.xml` |
| Python Windows/Python 3.14 | **43/43 pass**, branch 457/1024 = 44,63% | `.cache/coverage/python/coverage.xml`; dùng kết quả Linux cho đối chiếu CI |
| Regression cho gate | **3/3 test pass**, có subtests | `python -m unittest discover -s .github/scripts -p 'test_*.py'` |
| Workflow | Lần kiểm tra trước **actionlint 1.7.7 pass**, gồm ShellCheck | Cần kiểm tra lại sau thay đổi gate; chưa phải GitHub Actions run |
| Docker | **Build pass; 4/4 service healthy**; PostgreSQL ready, Next.js HTTP 200, API và proxy trả Healthy | `.cache/compose/api-health.json`, `proxy-health.json`, `frontend.html` |

Artifact trong `.cache/` chỉ có tại máy chạy và bị Git ignore; trên CI tải artifact
theo từng job. Mức sàn được làm tròn xuống dưới tỷ lệ đo để chịu sai khác nhỏ giữa
môi trường local và runner. CI chưa được chạy trên GitHub sau thay đổi này.

FastAPI adapter không còn trả dự đoán `Tomato___Healthy` giả khi timeout, HTTP lỗi
hoặc phản hồi sai. API trả 503 khi dịch vụ AI không khả dụng/quá thời gian và 502
khi phản hồi sai hợp đồng. Test unit kiểm tra các nhánh này; integration vẫn dùng
predictor fake và Compose vẫn chỉ kiểm tra AI health, chưa kiểm tra suy luận thật.

## Docker

[Compose gốc](../../../docker-compose.yml) dùng Next.js standalone, cổng container
3000. Proxy `/api/*` và `/uploads/*` trỏ tới `backend:8080` tại lúc build image;
thay đích proxy cần rebuild. Base stack yêu cầu AI service thật qua `AI_SERVICE_URL`.

[Compose CI](../../../docker-compose.ci.yml) thêm AI health stub riêng. Stub không
có endpoint dự đoán. Integration thay AI predictor và image storage bằng fake;
chỉ API/DB là tích hợp thật. Không suy ra model hoặc cloud upload đã được kiểm thử.

Đã bỏ `container_name` cố định để Compose project riêng không đụng tên. Khi chạy
nhiều stack local vẫn phải chọn cổng host riêng. Lần xác minh dùng project
`agrivision-ci-review-20260929`, cổng DB 55439/API 55080/web 3009; cổng web 53001
ban đầu bị Windows chặn nên đổi sang 3009. CI dùng runner riêng và cổng web 3000.
CI xóa volume chỉ của project kiểm thử có tên theo run ID sau khi lưu log.

## Lệnh kiểm tra

Chạy tại root; cần .NET 9, Docker đang chạy, Node 24/pnpm 10.34.5 và Python đã cài
dependency CPU tương ứng workflow. Dùng thư mục kết quả mới cho mỗi lần chạy
.NET để tránh trộn TRX/Cobertura cũ.

```powershell
dotnet restore backend/AgriVision.sln
dotnet test backend/tests/AgriVision.UnitTests/AgriVision.UnitTests.csproj --settings backend/coverage.runsettings --collect:"XPlat Code Coverage" --logger "trx;LogFileName=unit.trx" --results-directory .cache/local-unit
dotnet test backend/tests/AgriVision.IntegrationTests/AgriVision.IntegrationTests.csproj --settings backend/coverage.runsettings --collect:"XPlat Code Coverage" --logger "trx;LogFileName=integration.trx" --results-directory .cache/local-integration
python .github/scripts/check_dotnet_test_results.py .cache/local-unit
python .github/scripts/check_dotnet_test_results.py .cache/local-integration
dotnet tool install dotnet-reportgenerator-globaltool --tool-path .cache/dotnet-tools --version 5.5.4
.cache/dotnet-tools/reportgenerator '-reports:.cache/local-unit/**/coverage.cobertura.xml;.cache/local-integration/**/coverage.cobertura.xml' '-targetdir:.cache/local-merged' '-reporttypes:Html;Cobertura'
python .github/scripts/check_coverage.py .cache/local-merged/Cobertura.xml --minimum-branches 35 --label Backend

pnpm --dir frontend test:coverage

$env:PYTHONPATH=(Get-Location).Path
python -m coverage run -m unittest discover -s ai/tasks/agri_21/tests -p 'test_*.py'
python -m coverage xml
python -m coverage html
python .github/scripts/check_coverage.py .cache/coverage/python/coverage.xml --minimum-branches 40 --label Python
```

## Còn lại

1. Nâng từng mức sàn khi test mới được đo: backend 35 → 50 → 65 → 80%, frontend
   25 → 40 → 60 → 80%, Python 40 → 55 → 70 → 80%. Ưu tiên mapping nhãn,
   quyền truy cập/lịch sử, lỗi upload, UI error state và runtime AI. Không hạ
   phạm vi đo hoặc tính health stub là inference để đạt số phần trăm.
2. Push/mở PR và xác minh GitHub Actions khi được yêu cầu. Chưa có link run từ xa.
3. Đặt `ci-gate` làm required check trong GitHub branch protection/ruleset sau khi
   xác minh workflow; sửa YAML không tự bật bảo vệ branch.
4. AI contract/inference thật cần checkpoint và môi trường riêng; CD chưa triển khai.
5. Khi AI lỗi sau bước upload, ảnh đã tải lên có thể còn mồ côi; cần xử lý cleanup
   và kiểm thử nhánh đó trong công việc tiếp theo.
