# TESTING — Quy chuẩn kiểm thử AgriVision AI

Quy chuẩn chung cho người phát triển và agent, áp dụng cho Next.js → ASP.NET Core (.NET 9) → PostgreSQL, FastAPI/ConvNeXt-Tiny và các ranh giới storage. Tài liệu quy định cách thiết kế, viết, chạy và đánh giá test; không phải báo cáo mọi chức năng đã được nghiệm thu.

**Bắt buộc** là điều kiện phải đáp ứng trong phạm vi thay đổi. **Khuyến nghị** có thể điều chỉnh nếu ghi rõ lý do. Chỉ dẫn trực tiếp của người dùng được ưu tiên; tài liệu này không tự cấp quyền commit, deploy, migrate DB ứng dụng, chạy scanner/load test hoặc thay đổi nghiệp vụ.

## 1. Nguồn chuẩn và phạm vi

- Đọc [AGENTS.md](AGENTS.md), các [quy tắc dự án](.agents/rules/project_rules.md), [cấu trúc thư mục](.agents/rules/directory_structure.md) và skill phù hợp trước khi làm việc.
- Hành vi mong đợi lấy từ yêu cầu đã chốt, contract/DTO, frontend consumer và ràng buộc dữ liệu. Khi nguồn mâu thuẫn, ghi nhận và làm rõ; không chọn hành vi đang lỗi làm expected chỉ để test xanh.
- Đường dẫn, runner, dependency và gate thực thi lấy từ project/package/config và [CI](.github/workflows/ci.yml). Nếu khác tài liệu, xác minh rồi sửa tài liệu hoặc implementation; không âm thầm bỏ yêu cầu.
- Tài liệu này là quy chuẩn hiện hành. [Chiến lược cũ](docs/notes/testing_strategy.md) và report theo Jira giữ vai trò lịch sử/bằng chứng theo ngày, không ghi đè cấu hình hiện tại.
- Không thêm test cho chức năng chưa triển khai rồi ghi thành coverage hiện có. Ghi riêng đề xuất, phần chưa làm, blocked và không áp dụng.

## 2. Thế nào là kiểm thử đầy đủ?

Một thay đổi đủ kiểm thử khi các hành vi áp dụng đã có expected độc lập, ca kiểm phù hợp, kết quả thực thi và review. Không đặt số lượng test hoặc tỷ lệ Unit/Integration/E2E cố định để đánh giá chất lượng.

Bắt buộc xem xét các nhóm sau; ghi lý do nếu không áp dụng:

| Nhóm | Câu hỏi cần trả lời |
|---|---|
| Thành công | Kết quả, dữ liệu lưu và trạng thái hiển thị có đúng nghiệp vụ? |
| Validation/biên | Thiếu/null/rỗng/whitespace, sai kiểu/định dạng, min/max và vượt biên có được xử lý? |
| Danh tính/quyền | Guest, owner, foreign user, Admin, token/session không hợp lệ có đúng quyền? |
| Trạng thái | Không tồn tại, inactive, đã xóa, hết hạn, lặp thao tác, chuyển trạng thái có đúng? |
| Dependency | Timeout, cancellation, AI/storage/DB lỗi có trả lỗi đúng và bảo toàn dữ liệu? |
| Đồng thời | Race, quota, rate limit, transaction và cleanup có giữ invariant? |
| Contract | JSON, nullability, header, MIME, pagination/filter/date và consumer có tương thích? |
| UI | Loading/empty/error/success, thao tác bàn phím, responsive và phục hồi lỗi có dùng được? |

Ưu tiên cao: xác thực/session, ownership, ảnh private, Guest không lưu, lịch sử/snapshot, migration, đồng bộ DB–storage, mapping nhãn/confidence. Mức ưu tiên là đánh giá rủi ro, không phải tỷ lệ lỗi đã đo.

Với task lớn/API, lập ma trận trước khi bổ sung test:

```text
Requirement hoặc method+route | hành vi | expected/nguồn contract
| test ID/đường dẫn | có sẵn/cần thêm/không áp dụng | kết quả và artifact
```

Ma trận phải bao gồm alias và các nhánh lỗi áp dụng. Khi một hành vi quan trọng chưa có bằng chứng, chưa được ghi hoàn tất chỉ vì coverage đạt gate.

## 3. Phân loại và thư mục

| Nhóm | Trách nhiệm | Vị trí hiện hành |
|---|---|---|
| Backend Unit | Service/validator/mapping/xử lý lỗi độc lập | `backend/tests/AgriVision.UnitTests/` |
| Backend Integration | PostgreSQL, repository, constraint, migration, transaction, adapter/contract dịch vụ ngoài | `backend/tests/AgriVision.IntegrationTests/` |
| Backend API | HTTP qua routing, binding, middleware, JWT, authorization, service và PostgreSQL | `backend/tests/AgriVision.ApiTests/` |
| Shared backend support | Fixture/fake trung lập, link source; không tham chiếu project test khác | `backend/tests/Shared/` |
| Frontend Unit | Utility, validation, data, API adapter với transport có kiểm soát | `frontend/tests/unit/` |
| Frontend Component | UI riêng lẻ qua Testing Library | `frontend/tests/component/` |
| Frontend Integration | Composition giữa UI/provider/routing/service với network có kiểm soát | `frontend/tests/integration/` |
| Frontend Tooling | Kiểm tra công cụ/quy tắc thực tế | `frontend/tests/tooling/` |
| Browser checks | Script browser có scope, gồm cả trường hợp dùng response giả | `frontend/tests/browser/` |
| Python Unit | Data/preprocessing/mapping/metrics/predictor logic với fixture tổng hợp | `ai/tests/unit/` |
| Python Integration | FastAPI HTTP và contract với model fake | `ai/tests/integration/` |
| Checkpoint/manual | Checkpoint thật hoặc chẩn đoán phần cứng theo yêu cầu | `ai/tests/checkpoint/`, `ai/tests/manual/` |

API là cách kiểm ranh giới HTTP; API test backend về kỹ thuật cũng đi qua nhiều thành phần tích hợp. Ba project backend được tách theo trách nhiệm vận hành và chẩn đoán lỗi, không phải ba khái niệm loại trừ nhau tuyệt đối.

Frontend kiểm request/response adapter bằng mock HTTP không thay thế provider API tests. Không tạo thư mục `api/` chỉ để có cùng bốn tên Unit/Integration/API/E2E. Nếu Next.js có route handler/proxy cần kiểm, chọn nhóm theo boundary thực tế và mô tả rõ backend thật hay fake.

Browser chạy với mock API là browser UI test; chỉ gọi là E2E toàn hệ thống khi đi qua các thành phần thật trong phạm vi đã công bố. Các script browser hiện có không tạo thành một E2E gate đầy đủ. jsdom không chứng minh layout, browser navigation thật hoặc backend persistence.

Giữ xUnit/FluentAssertions/WebApplicationFactory/Testcontainers, Vitest/Testing Library và Python unittest/coverage hiện có. Không tự thêm Postman/Newman, framework, broker, scanner hoặc dịch vụ trả phí để đáp ứng tài liệu này.

## 4. Quy trình cho mỗi thay đổi

1. Kiểm tra branch/status, đọc source và test liên quan; xác định contract, rủi ro và phạm vi ảnh hưởng.
2. Với thay đổi suite/coverage lớn, chạy baseline hợp lệ trước thay đổi; ghi SHA, môi trường và exclusion. Baseline lỗi hạ tầng không dùng để so coverage.
3. Thiết kế ca/ma trận; tái sử dụng helper nhưng giữ expected độc lập. Không viết test máy móc cho thay đổi tài liệu hoặc mã hiển nhiên không có hành vi cần bảo vệ.
4. Với bug, viết test tái hiện và quan sát thất bại đúng nguyên nhân → sửa tối thiểu → regression xanh. Với hành vi mới, viết test từ contract trước implementation theo phạm vi phù hợp.
5. Chạy nhóm nhỏ liên quan, sau đó suite của thành phần bị ảnh hưởng; chạy rộng hơn khi boundary chung, migration hoặc lỗi mới yêu cầu.
6. Review test và code sau khi chạy. Sửa finding, chạy lại kiểm tra bị ảnh hưởng; không dừng ở lần xanh đầu khi còn lỗi chức năng đã biết.
7. Cập nhật report/tasklog với bằng chứng, việc chưa chạy và giới hạn; chỉ kết luận trong phạm vi đã kiểm.

Không sửa expected, nới assertion, tăng timeout/rate budget hoặc bỏ test chỉ để làm xanh. Nếu expected sai, phải đối chiếu nguồn contract và ghi lý do sửa. Breaking API/thay đổi nghiệp vụ phải được nêu riêng để quyết định.

## 5. Cấu trúc test và assertion

- Tên thể hiện hành vi, điều kiện và kết quả; ưu tiên Arrange–Act–Assert rõ ràng. Một test có một mục đích, có thể kiểm nhiều assertion liên quan để chứng minh mục đích đó.
- Test phải thất bại khi hành vi cần bảo vệ sai. Không chỉ assert `not null`, `IsSuccessStatusCode`, số lần gọi hoặc snapshot toàn bộ response.
- API: kiểm status cụ thể, field/type/nullability, giá trị nghiệp vụ và header liên quan. Với `201`, kiểm `Location` và đọc lại tài nguyên nếu contract cho phép.
- Mutation: kiểm trạng thái sau bằng HTTP tiếp theo. Dùng DB/fake cho invariant không thể quan sát qua HTTP, như Guest không lưu ảnh, không có pending upload hoặc audit đúng actor/target/action.
- UI: query theo role/accessibility name/label; thao tác như người dùng. Kiểm nội dung và trạng thái có ý nghĩa; tránh class CSS, DOM nội bộ hoặc snapshot lớn làm assertion chính.
- Dùng literal/fixture được duyệt cho expected; không tính expected bằng chính hàm production đang được kiểm. Một helper dựng request không được tự quyết luôn kết quả expected.
- Float dùng tolerance hợp lý theo contract; ngày giờ/timezone phải xác định. Assert collection theo thứ tự khi contract có ordering, theo tập khi không có.
- Theory/parameterization dành cho các input cùng một quy tắc; dữ liệu phải giúp nhận biết row thất bại. Không gom nhiều flow không liên quan vào một vòng lặp khó chẩn đoán.
- Cancellation/exception phải được quan sát, background task phải được await; tránh test hoàn thành trước assertion bất đồng bộ.

## 6. Backend API và manifest

Manifest ở [api_manifest.json](backend/tests/AgriVision.ApiTests/Contracts/api_manifest.json); guards ở [Contracts](backend/tests/AgriVision.ApiTests/Contracts/).

1. Manifest được tác giả duy trì độc lập theo **HTTP method + route**, gồm alias. Không lấy cùng một runtime list để sinh cả expected và actual.
2. Runtime guard so toàn bộ controller routes với manifest, phát hiện thiếu/thừa/trùng. Endpoint ngoài controller được ghi phạm vi riêng.
3. `ApiCase` là ID ổn định của một Fact/Theory method. Một case có thể kiểm nhiều routes; một Theory có nhiều rows. Không dùng số ID thay số test thực thi.
4. Mapping guard phải phát hiện missing, orphan, duplicate, non-test và route không có case. Khi thêm/xóa/đổi endpoint, cập nhật test, manifest và ma trận cùng nhau.
5. Guard xanh chỉ chứng minh mapping/discovery nhất quán. HTTP assertions và TRX mới chứng minh thực thi. Mapping ID sang một test không kiểm hành vi đó là lỗi review.

Các hành vi bắt buộc xem xét khi sửa API liên quan:

- Auth/User: register/login/me/logout, malformed/missing body, validator boundaries, email trùng, credentials sai, role injection, JWT sai/hết hạn, revoked session; logout chỉ phiên hiện tại, đổi mật khẩu chặn toàn bộ phiên cũ và mật khẩu mới dùng được.
- Admin: Guest/User bị chặn, list/detail/filter/paging, ID thiếu, role/status hợp lệ và không hợp lệ, tự bảo vệ theo contract, revoke session và audit; kiểm cả alias audit-log.
- Catalog: public read/inactive filter, Admin writes, duplicate, missing ID, validation và semantics delete thực tế; giữ dữ liệu đang tham chiếu.
- Profiles: owner CRUD, tên biên, Guest/foreign/Admin isolation, prediction chỉ chọn profile sở hữu; xóa profile giữ history/snapshot.
- Predictions: Guest có kết quả nhưng không lưu; User lưu và có Location đúng; detail/delete/filter/paging/date; quyền owner/Admin theo contract hiện hành.
- Upload/private image: missing/empty/type/size và giới hạn request server, quota, 429/Retry-After, concurrency/permit release, bytes/MIME/no-store/nosniff, missing/expired/deleted, lỗi AI/storage không tạo thành công giả hoặc dữ liệu dở dang.
- Health: DB health và dependency health tách biệt; AI unavailable không làm sai liveness; lỗi không lộ credential, stack trace hoặc thông tin nhạy cảm.

Đọc giá trị giới hạn từ source/config hiện hành rồi xác định expected độc lập. Phân biệt kích thước file, multipart section và toàn request; TestServer không chứng minh đầy đủ Kestrel. Dùng real test host khi kiểm transport/server limit. Không ép mọi lỗi thành một status/envelope mới; ví dụ model binding có thể trả ProblemDetails khác middleware.

## 7. PostgreSQL, fixture và dịch vụ ngoài

- Integration/API dùng PostgreSQL disposable, schema/migration thật và synthetic accounts. Không dùng DB ứng dụng, tài khoản người dùng thật hoặc bucket chứa dữ liệu thật cho suite thông thường.
- Phân tách dữ liệu, session, limiter, journal và fake state giữa các suite/ca độc lập. Seed có chủ đích; không dựa thứ tự test hoặc tài nguyên còn lại từ lần chạy trước.
- Chỉ tăng budget ở fixture thông thường để tránh limiter làm nhiễu ca khác. Test giới hạn phải cấu hình policy riêng, kiểm ngay trong/quá ngưỡng và không được tắt protection cần kiểm.
- Fake ở ranh giới AI/R2/HTTP, cho cấu hình success/error/cancel và ghi nhận upload/delete/bytes. Không mock repository thay PostgreSQL trong ca kiểm persistence/transaction/migration.
- Chặn outbound không cấu hình ở suite thông thường. Real-service opt-in phải có target giới hạn, cấu hình riêng, synthetic object prefix và cleanup chỉ tài nguyên do lần chạy tạo.
- Dispose host/client/stream/container trong đường cleanup, kể cả test thất bại. Không catch rồi nuốt exception để ghi pass.
- Migration test kiểm nâng cấp legacy, bảo toàn dữ liệu, constraint/trigger, idempotency và rollback transaction khi phù hợp. Forward-only migration không bị ép chạy `Down()`; không sửa migration đã dùng để tránh thêm migration mới.
- Cleanup/expiry kiểm trên fixture riêng; `--expire-images` có tác dụng xóa ảnh thật, không dùng làm lệnh kiểm tra vô hại.
- Giữ app DB/volume/history. Không `down -v`, drop/reset hoặc factory-reset Docker để chữa lỗi test. Migration ứng dụng chạy riêng sau backup theo quy trình đã được cho phép.

## 8. Đồng thời, thời gian và flaky tests

- Dùng signal/barrier/TaskCompletionSource để đặt đúng interleaving; không dùng sleep cố định để đoán request đã đến bước cần kiểm.
- Chờ điều kiện bằng cơ chế bounded wait; timeout là giới hạn treo test, không thay expected. Dùng clock có kiểm soát khi phù hợp; kiểm timezone/clock skew nếu invariant phụ thuộc thời gian.
- Assert kết quả các request cạnh tranh và invariant cuối: số bản ghi/upload, transaction rollback, session revoke hoặc đủ permits được giải phóng. Một probe thành công không chứng minh phục hồi đủ nhiều permits.
- Khi tách suite/refactor fixture hoặc thay đổi concurrency lớn, chạy suite liên quan ba lần trong các process mới/fresh resources, không retry, ghi duration theo cùng một cách đo và kiểm state leakage. Thay code sau đó phải chạy lại kiểm tra bị ảnh hưởng và vòng stability nếu thay đổi có thể ảnh hưởng độ ổn định.
- Flake phải được điều tra như một lỗi: giữ lần fail, seed/order, log và repro. Không chạy lại đến xanh rồi bỏ lần fail khỏi report. Lần sửa xong có thể tạo chuỗi nghiệm thu mới, phân biệt rõ với retry.
- Không xóa/quarantine/skip test để chữa CI đỏ mà không có quyết định và lý do được ghi nhận. Không tự đặt SLA duration/flake rate chưa được thống nhất.

## 9. Frontend và browser

- Unit kiểm input/adapter; component kiểm hành vi độc lập; integration kiểm composition và lifecycle, kể cả abort/unmount, stale response và lỗi service khi áp dụng.
- Mock đúng DTO/status hiện hành, gồm null/empty/error; tránh fixture chỉ chứa happy path. Mock frontend không chứng minh authorization hoặc validation server.
- Với UI bị thay đổi, xem xét keyboard/focus/label, loading/error/retry, disabled/double submit, responsive, reduced motion và nội dung dài. Chỉ chạy nhóm áp dụng; ghi rõ tự động hay kiểm thủ công.
- Browser checks phải công bố base URL, build mode, viewport/browser, API thật hay intercepted và checkpoint thật hay fake. Ảnh chụp màn hình không thay assertion chức năng; jsdom không dùng để kết luận layout thật.
- E2E ưu tiên hành trình quan trọng: Guest diagnosis; đăng nhập → diagnosis → đọc history/ảnh owner; foreign user bị chặn; Admin quản lý quyền. Chỉ triển khai/chạy khi có scope và môi trường phù hợp, không coi danh sách này là suite đã có.
- Không thêm bypass CAPTCHA/auth hoặc production flag để tiện test. Dùng cơ chế fixture/test được thiết kế riêng; phần cần người dùng tương tác được ghi blocked cho tới khi hoàn tất.

## 10. FastAPI, model và dữ liệu AI

- Phân biệt: unit logic với tensor tổng hợp; HTTP contract với fake model; checkpoint smoke thật; đánh giá chất lượng trên held-out split. Một nhóm pass không suy ra nhóm còn lại pass.
- Giữ dataset v1.4, 59-class mapping đã chốt, class index/order, split, preprocessing và metric semantics. Kiểm payload/confidence/top-k/mapping ở các boundary liên quan.
- Biên confidence/guidance phải theo nghiệp vụ đã chốt; không đổi expected theo output tình cờ của một checkpoint.
- Artifact thật cần provenance/version/SHA-256 được xác minh; thiếu/sai artifact trong explicit checkpoint run phải fail rõ. Không tải/train/đổi checkpoint hay split để làm xanh nếu chưa có yêu cầu.
- Không dùng dữ liệu test để huấn luyện/chọn tham số. Không báo accuracy/Macro-F1 từ vài ảnh smoke; metric phải kèm dataset/split, model, command và nguồn kết quả.
- Dataset/checkpoint/ảnh người dùng và output lớn không đưa vào Git. Fixture nhỏ phải synthetic hoặc có quyền sử dụng và không chứa dữ liệu nhạy cảm.

## 11. Coverage và CI

| Thành phần | Branch floor CI hiện hành | Mục tiêu | Nguồn |
|---|---|---|---|
| Backend | 70% sau gộp Unit + Integration + API | 80% | [CI](.github/workflows/ci.yml), [runsettings](backend/coverage.runsettings) |
| Frontend | 65% toàn bộ production source được cấu hình | 80% | [Vitest](frontend/vitest.config.mts) |
| Python | 40% gộp Unit + Integration | 80% | [CI](.github/workflows/ci.yml), [.coveragerc](.coveragerc) |

- Coverage đo production code; backend giữ exclusion migration và test assemblies, frontend giữ `src/**`, Python theo `.coveragerc`. Không bỏ module/nhánh khó hoặc hạ gate để xanh.
- Backend không có gate riêng tùy ý cho API project. Không lấy coverage một suite hoặc trung bình các tỷ lệ để đại diện tổng backend.
- Merge bằng công cụ hiện có, cùng source/build/config và đúng ba report thành công. Không trộn baseline, retry, report cũ hoặc các build khác. Dùng results directory mới; báo covered/valid branches cùng phần trăm.
- So baseline cùng scope/exclusion khi task yêu cầu non-regression; giải thích thay đổi mẫu số. Chỉ thêm test chạy qua code nhưng không assert hành vi không đáp ứng quy chuẩn.
- Mỗi suite bắt buộc được discover và có test thực thi; exit0 chỉ build hoặc zero tests không phải pass. Skip/exclusion phải công bố. Real-service opt-in excluded không được tính pass.
- CI backend chạy ba suite riêng sau build, suite khác vẫn được chạy khi một suite fail nếu môi trường cho phép; job/gate cuối chỉ xanh khi mọi suite bắt buộc và coverage đều đạt. Giữ TRX/coverage artifacts để chẩn đoán.
- Local pass, build pass, manifest pass và GitHub Actions pass là các kết quả khác nhau. Chỉ ghi GitHub Actions pass khi có run thực tế đúng revision và có URL/run ID.

## 12. Lệnh chạy và phạm vi xác minh

Các lệnh dưới là mẫu chạy từ root, trừ block frontend. Dừng và xử lý exit code khác0; khi cần thu thập lỗi nhiều suite độc lập, vẫn chạy các suite còn lại nhưng tổng kết phải fail nếu bất kỳ suite bắt buộc nào fail. Dependency theo lockfile/requirements hiện hành, không nâng phiên bản trong task QA.

### Backend

Cần host .NET SDK 9; Integration/API cần Docker đang hoạt động.

```powershell
dotnet restore backend/AgriVision.sln
dotnet build backend/AgriVision.sln --no-restore
dotnet test backend/tests/AgriVision.UnitTests/AgriVision.UnitTests.csproj --no-build --no-restore
dotnet test backend/tests/AgriVision.IntegrationTests/AgriVision.IntegrationTests.csproj --no-build --no-restore --filter 'Category!=RealCheckpoint&Category!=RealR2'
dotnet test backend/tests/AgriVision.ApiTests/AgriVision.ApiTests.csproj --no-build --no-restore
```

Bỏ `--no-build` khi source thay đổi hoặc build chưa cập nhật. Thu coverage thêm `--settings backend/coverage.runsettings --collect 'XPlat Code Coverage'`, TRX và results directory riêng cho từng suite/lần chạy. Dùng [checker TRX/coverage](.github/scripts/check_dotnet_test_results.py) và [coverage gate](.github/scripts/check_coverage.py) như CI. Quy trình tái chạy chi tiết: [backend guide](.agents/commands/backend.md), [ví dụ AGRI-130](docs/reports/AGRI-130/README.md).

### Frontend

Chạy trong `frontend/`, với Node/pnpm theo `package.json` và dependency đã cài đúng lockfile:

```powershell
corepack pnpm typecheck
corepack pnpm lint
corepack pnpm test
corepack pnpm test:coverage
corepack pnpm build
```

Chọn `test` cho phản hồi nhanh hoặc `test:coverage` khi cần đo; không cần chạy cả hai liên tiếp nếu không có lý do. Có scripts `test:unit`, `test:component`, `test:integration`, `test:tooling`; nhóm riêng không thay thế full coverage. Browser scripts cần server và runtime riêng, không nằm trong Vitest gate. Xem [frontend tests](frontend/tests/README.md).

### Python

Từ root, Python environment đã có dependency, `PYTHONPATH` trỏ root:

```powershell
python -m unittest discover -s ai/tests/unit -t . -p 'test_*.py'
python -m unittest discover -s ai/tests/integration -t . -p 'test_*.py'
```

Coverage chạy Unit bằng `coverage run`, Integration bằng `coverage run --append`, sau đó xuất XML theo [AI tests guide](ai/tests/README.md). Explicit checkpoint command chỉ chạy khi có artifact được xác minh. Không chạy discovery toàn `ai/tests` rồi bỏ qua lỗi thiếu checkpoint như một ordinary-suite pass.

## 13. Review, nghiệm thu và bằng chứng

Review test theo sáu mặt:

1. **Rõ ràng:** tên/mục đích/arrange có thể hiểu mà không đọc toàn production implementation?
2. **Ổn định:** không phụ thuộc order, clock, network thật, shared limiter hoặc sleep suy đoán?
3. **Chẩn đoán:** failure cho biết input, expected/actual và boundary; không lộ secret?
4. **Fixture/mock:** giả đúng external boundary, lifecycle/cleanup an toàn, fake không tự tạo kết quả pass?
5. **Assertion độc lập:** có kiểm giá trị/tác dụng phụ và có thể bắt regression thực tế?
6. **Độ phủ hành vi:** ma trận còn thiếu quyền, lỗi, biên, race hay contract consumer nào?

Task lớn/ảnh hưởng auth, migration hoặc nhiều boundary nên có review độc lập khi có khả năng; ghi rõ reviewer đã kiểm source, artifact hay chạy lại. Không bịa tên người/reviewer hoặc coi review tĩnh là runtime acceptance.

Điều kiện bàn giao trong phạm vi task:

- [ ] Contract/phạm vi rõ; mọi hành vi áp dụng có test hoặc lý do chưa áp dụng.
- [ ] Regression tái hiện được sửa và kiểm lại; không còn lỗi nghiêm trọng/chức năng đã biết chưa xử lý trong phạm vi tuyên bố hoàn tất.
- [ ] Build/static checks và suite liên quan pass thực sự, discovery không mất/trùng ca sau di chuyển.
- [ ] Coverage đạt gate với đúng scope khi đo; stability runs hoàn tất khi áp dụng.
- [ ] Finding được phân mức, ghi cách sửa/kết quả kiểm lại và giới hạn; review lại sau sửa.
- [ ] Không có secret, dữ liệu người dùng hoặc generated artifacts trong phần đưa vào Git.
- [ ] Report/tasklog ghi đúng thực tế; các check chưa chạy, skip, blocked, real-service và deployment còn lại được nêu rõ.

Report tại `docs/reports/<JIRA-KEY>/` có README làm mục lục, ma trận, kết quả/review cần thiết. Mỗi kết quả cần command/scope, ngày/revision, môi trường/dependency, counts/skip/fail, artifact hoặc CI URL và giới hạn. Phân biệt test time với TRX elapsed/wall time. Không ghi lại kết quả cũ thành lần chạy mới khi chỉ sửa tài liệu.

Tasklog tại `docs/task-logs/<JIRA-KEY>/` giữ ngắn: thay đổi chính, kiểm chứng thực tế, việc còn lại và link report. **Không tạo README trong tasklog.** Không tự tạo Jira key/owner/kết quả. Artifact/log thô ở thư mục ignored; report tracked phải đủ tóm tắt để review khi cache local không còn.

## 14. Bảo trì quy chuẩn

Cập nhật tài liệu này khi thay contract, phân loại/thư mục test, runner, CI gate hoặc khi regression cho thấy thiếu quy tắc. Giữ kết quả theo ngày trong report, không đưa số lượng test/coverage tức thời thành quy định cố định. Thay đổi policy/gate phải được review riêng; chỉ sửa tài liệu không tự thay CI.

| Ngày | Task | Thay đổi |
|---|---|---|
| 2026-10-23 | AGRI-130 | Tạo quy chuẩn root: phân loại, thiết kế/assertion, isolation, manifest, stability, AI/UI, CI và nghiệm thu. |
