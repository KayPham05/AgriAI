# Mobile tests

Chuẩn bị unit/component/integration/e2e. Chưa có runner/test nghiệp vụ; thư mục trống hoặc bundle export không phải test pass/coverage.

Khi thêm feature: unit cho validation/transform, component cho native interactions, integration cho API/session, e2e cho device flows; theo root TESTING.md. Không test hằng số/cấu trúc file để giả coverage. API/model/storage thật cần evidence riêng.


Tooling Windows: chạy `./tooling/LocalRuntime.Tests.ps1` từ thư mục tests (hoặc `./tests/tooling/LocalRuntime.Tests.ps1` từ reactNative). Script kiểm runtime thật và cách ly môi trường, không cần Pester/JS runner. Chưa có coverage nghiệp vụ.
