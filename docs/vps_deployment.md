# Phương án triển khai AgriVision AI trên VPS cho demo môn học

- **Jira:** `AGRI-79`; tài liệu thiết kế triển khai demo, không xác nhận đã deploy.
- **Review ban đầu:** 2026-10-06; **chốt phương án:** 2026-10-07 theo ủy quyền của người dùng.
- **Trạng thái:** Đã chọn thiết kế; chưa thuê VPS, deploy hoặc nghiệm thu môi trường thật.
- **Đối chiếu:** Source/cấu hình ngày 2026-10-07; tích hợp DB đã commit tại `5a8a6a7`, kiểm thử tại `b7c6fbd`. Baseline `99d6e56` của review ban đầu là mốc lịch sử.
- **Phương pháp:** Đọc source và hướng dẫn chính thức; không chạy lại build/test/inference trong lần cập nhật này.

## 1. Phương án đã chốt và lựa chọn phụ

| Hạng mục | Chọn cho demo | Lựa chọn phụ và điều kiện chuyển |
|---|---|---|
| Hạ tầng | Một VPS x86_64, Ubuntu 24.04 LTS, Docker Compose | Máy trường/nhóm cấp nếu đủ tài nguyên và quyền quản trị |
| Nhà cung cấp | DigitalOcean; ưu tiên Singapore nếu gói còn khả dụng | Nhà cung cấp khác nếu nhóm có credit hoặc giá tốt hơn |
| Cấu hình dự trù | Basic Regular: 4 vCPU, 8 GiB RAM, 160 GiB SSD; inference CPU | 2 vCPU/4 GiB/80 GiB khi benchmark đạt điều kiện mục 2 |
| Dịch vụ | Caddy + Next.js + API .NET 9 + FastAPI + PostgreSQL 16 cùng máy | Tách AI sang CPU/GPU riêng khi benchmark không đạt sau tối ưu |
| Registry | GHCR public cho application image; không chứa secret/checkpoint | GHCR private khi cần giữ kín; VPS cần credential chỉ đọc package |
| HTTPS/domain | Caddy, subdomain `agrivision.<domain-của-nhóm>`, DNS trỏ VPS | Domain mới nếu nhóm chưa có; Nginx + Certbot nếu nhóm đã quen vận hành |
| Database | PostgreSQL trong Compose, volume bền vững | Managed DB nếu được cấp credit; không cần mặc định |
| Ảnh | Cloudinary, asset `authenticated`, backend kiểm owner; ảnh hết hạn sau 30 ngày | Google Cloud Storage bucket private nếu nhóm có GCP credit hoặc muốn dùng chung nơi lưu backup |
| Model | Bundle checkpoint/mapping/preprocessing có version và SHA-256, mount chỉ đọc | Private artifact storage khi phân phối thường xuyên |
| Release | GitHub Actions build/publish; deploy manual bằng `workflow_dispatch` | Tự deploy mỗi merge `main` khi quy trình đã ổn định |
| Migration | Bước CLI riêng trong deploy, trước API mới | Chạy thủ công cùng CLI khi xử lý sự cố; giữ lịch sử migration |
| Backup | Tự tạo hàng ngày; tải bản mã hóa về máy nhóm mỗi ngày và trước demo/deploy | Object storage ngoài VPS nếu cần tự động cả chuyển backup |
| Theo dõi | Health/readiness, Docker logs có rotation, kiểm RAM/disk | Dashboard riêng khi cần vận hành lâu dài |

Giá tham khảo ngày 2026-10-07: **48 USD/tháng** cho Basic Regular 8 GiB/4 vCPU và **24 USD/tháng** cho 4 GiB/2 vCPU; chưa gồm domain, thuế và dịch vụ phụ. Chỉ tạo máy gần giai đoạn deploy/demo; kiểm giá và khả dụng trước thanh toán. [Bảng giá DigitalOcean](https://www.digitalocean.com/pricing/droplets).

GHCR cho phép pull public image không cần đăng nhập; publish dùng quyền package của workflow. Caddy hỗ trợ tự động HTTPS khi DNS/domain và kết nối tới máy chủ được cấu hình đúng. [GHCR](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry), [Caddy HTTPS](https://caddyserver.com/docs/quick-starts/https).

Các lựa chọn chính là mặc định triển khai. Domain trên là placeholder, không phải domain đã sở hữu. Giữ stack và yêu cầu sản phẩm hiện có; demo môn học không tự miễn các yêu cầu đã chốt.

## 2. Quy mô và benchmark trước khi thuê máy

Giả định demo khoảng **5 người truy cập web, 1 lượt inference chạy tại một thời điểm**; chấp nhận gián đoạn ngắn khi cập nhật. Đây là mục tiêu thiết kế, chưa phải load test; một VPS không có HA/zero downtime.

FastAPI chạy **1 Uvicorn worker CPU** để tránh nhân bản model trong RAM. Source hiện có khóa tuần tự trong mỗi process, chưa có hàng đợi được giới hạn. Trước public cần giới hạn tối đa 1 request dự đoán chờ; quá tải trả 429 để thử lại. Đây là công việc còn làm.

Benchmark checkpoint thật trong image CPU dự định deploy: khởi động lạnh, RAM đỉnh toàn stack, warm inference ít nhất 30 lượt và truy cập web kèm dự đoán. Ghi môi trường/số đo; kiểm lại trên VPS vì CPU shared khác máy local.

- 8 GiB là mức dự trù, chưa xác nhận đủ hoặc đạt latency.
- Chỉ giảm xuống 4 GiB nếu RAM đỉnh toàn stack ≤ 3 GiB, không OOM/swap kéo dài và warm inference p95 ≤ 10 giây trên CPU tương đương VPS.
- p95 ≤ 10 giây là mục tiêu demo, chưa đo. Dự kiến timeout gọi AI của API 30 giây, proxy 60 giây; đồng bộ với hàng đợi sau benchmark. Mặc định API hiện là 15 giây.
- Nếu 8 GiB vẫn không đạt, kiểm preprocessing/CPU threads/hàng đợi trước khi tăng máy hoặc tách AI.

## 3. Cấu hình production

Luồng: **Browser → HTTPS/Caddy → Next.js → ASP.NET Core API → PostgreSQL hoặc FastAPI**. Caddy proxy web; Next.js proxy `/api` tới backend trong mạng Compose.

- Chỉ public 80/443; SSH 22 giới hạn IP quản trị. Không publish host port web/API/AI/DB; kiểm firewall nhà cung cấp và port thực tế.
- Tạo **Compose production độc lập** `docker-compose.production.yml` dùng `image:` đã publish, tránh merge Compose local giữ lại port/Swagger.
- Project cố định `agrivision-demo`, thư mục `/opt/agrivision`; giữ định danh volume qua các release. Không deploy bằng `down -v`.
- Backend: `Production`, `Swagger__Enabled=false`, AI URL `http://ai:8000`, DB host `postgres`. Cấu hình forwarded headers cho chuỗi proxy tin cậy; kiểm HTTPS redirect qua domain thật.
- Frontend build với `API_PROXY_TARGET=http://backend:8080`: đây là build argument tạo Next.js rewrites, không giả định đổi env runtime sẽ đổi proxy của image đã build.
- Volume DB/chứng chỉ bền vững, restart policy và healthcheck. Ảnh mới lưu trên Cloudinary; production không dùng uploads local làm kho hoặc fallback. Bật log rotation, kiểm dung lượng định kỳ.
- Secret ứng dụng trong env file trên VPS quyền `0600`, ngoài Git/image/log. Example chỉ chứa placeholder. Workflow dùng SSH key riêng và host key đã xác minh; không tắt kiểm host key.

Model bundle tại `/opt/agrivision/models/<model-version>`, mount chỉ đọc. Entrypoint hiện là `ai.service.app:app`, đọc `AGRIVISION_PLANT_CHECKPOINT`, `AGRIVISION_DISEASE_CHECKPOINT`, `AGRIVISION_MODEL_VERSION`. Bundle cần **hai checkpoint plant/disease phù hợp predictor hiện tại**, mapping, preprocessing và checksum. Không tự thay checkpoint chỉ vì cùng tên ConvNeXt-Tiny; không cần dataset trên VPS.

### Kho ảnh đã chọn: Cloudinary; phương án phụ: Google Cloud Storage

Chọn **Cloudinary cho demo** vì repo đã có adapter `CloudinaryImageStorage`, giảm phần tích hợp phải viết thêm. Google Cloud Storage (GCS) là lựa chọn phụ khi nhóm có credit GCP hoặc muốn lưu cả ảnh và backup trên GCS; hiện repo chưa có adapter GCS. Không triển khai đồng thời hai provider cho cùng môi trường demo.

Luồng ảnh đăng nhập: frontend gửi ảnh tới API → AI dự đoán và kiểm mapping → backend upload cloud → DB lưu định danh ảnh/metadata/snapshot. Khách dự đoán vẫn không lưu ảnh hoặc lịch sử. Backend cung cấp endpoint đọc ảnh kiểm owner/expiry rồi tải từ cloud và stream về; frontend fetch có xác thực và hiển thị blob. Như vậy không phát URL cloud dùng chung cho người khác. Không lưu URL có chữ ký hết hạn như địa chỉ cố định trong DB.

- **Cloudinary:** upload kiểu `authenticated` để bảo vệ cả ảnh gốc và ảnh biến đổi; API secret chỉ ở backend. Source hiện upload mặc định và trả `SecureUrl`, chưa đáp ứng thiết kế này. Cần sửa cả upload/read/delete theo delivery type và kiểm tài khoản/gói hỗ trợ cách dùng dự định. Chữ ký URL thông thường không tự đồng nghĩa có thời hạn hoặc kiểm owner. [Cloudinary access control](https://cloudinary.com/documentation/control_access_to_media).
- **GCS:** nếu chuyển provider, chọn Standard bucket private, bật Public Access Prevention và uniform bucket-level access; service account chỉ có quyền cần thiết trên bucket. Backend dùng credential an toàn trên VPS, không đưa key vào image/Git. Lưu object key và generation khi cần định danh phiên bản; phải viết adapter tương ứng `IImageStorage` và kiểm tương thích metadata DB. [Public Access Prevention](https://docs.cloud.google.com/storage/docs/public-access-prevention).
- **Đọc trực tiếp qua URL tạm:** là lựa chọn phụ nếu muốn giảm traffic qua VPS; backend kiểm owner trước khi cấp URL thời hạn ngắn, tối đa 5 phút và không vượt expiry ảnh. Người có URL vẫn sử dụng được trong thời hạn đó; không coi đây là kiểm owner ở từng lần tải. Với Cloudinary dùng cơ chế download có thời hạn phù hợp, không chỉ URL ký thông thường. [Cloudinary Upload API](https://cloudinary.com/documentation/image_upload_api_reference), [GCS signed URLs](https://docs.cloud.google.com/storage/docs/access-control/signed-urls).
- **Lỗi cloud:** production phải báo lỗi lưu ảnh và dọn dữ liệu dang dở, không âm thầm chuyển sang local. Local fallback chỉ dành cho chế độ development được bật rõ ràng. Adapter hiện tại còn fallback cả khi thiếu credential hoặc Cloudinary lỗi, nên cần sửa trước deploy.
- **Retention:** CLI cleanup xóa asset/object trên provider đúng định danh/type; lỗi xóa phải retry. Guest không upload cloud; snapshot/metadata vẫn giữ sau ảnh hết hạn theo yêu cầu.

Kiểm quota/gói Cloudinary trước demo; chưa xác nhận chi phí tài khoản hoặc tính năng thực tế. GCS có phí lưu trữ, operation và truyền dữ liệu theo cấu hình, không mặc định xem bucket Singapore là miễn phí. [Giá GCS](https://cloud.google.com/storage/pricing). Nếu đang có ảnh local cần giữ, chuyển chúng lên provider và cập nhật metadata trước khi ngừng phục vụ `/uploads`.

## 4. Hiện trạng đã cập nhật và phần còn làm

| Hạng mục | Source hiện tại | Còn làm trước public |
|---|---|---|
| Web/API Docker | Có multi-stage Dockerfile, runtime user thường | Publish release, kiểm config/volume production |
| Compose | Có web/API/DB; local còn publish port và bật Swagger | Production độc lập thêm Caddy/AI thật |
| FastAPI | Đã có entrypoint, `/predict`, health/readiness | AI Dockerfile CPU; nghiệm thu checkpoint và inference xuyên lớp |
| Mapping | Kiểm class name/index; bỏ fallback lấy lớp DB đầu tiên | Catalog production đủ 59 lớp, khớp mapping/model |
| Quyền lịch sử | GET chi tiết yêu cầu đăng nhập và kiểm owner | E2E qua web/domain, quyền ảnh trực tiếp |
| Khách dự đoán | Guest không lưu ảnh/DB lịch sử | E2E, lỗi AI/storage; giữ quyền guest đã chốt |
| Kho cloud | Có Cloudinary adapter, URL upload mặc định và local fallback; chưa có GCS adapter | Cloudinary authenticated, đọc ảnh kiểm owner, xóa đúng type; tắt fallback production; GCS chỉ làm khi chuyển provider |
| Vòng đời ảnh | Có snapshot, expiry và cleanup CLI | Endpoint ảnh riêng tư, lịch cleanup/retry |
| Migration | CLI `--migrate`; HTTP startup chỉ kiểm schema | Job riêng; kiểm DB trống/nâng cấp DB cũ |
| Catalog | Development seed không đủ làm catalog production | Import danh mục 59 lớp bằng công cụ riêng, kiểm đầy đủ/tránh trùng |
| Upload | AI giới hạn 15 MiB/ảnh; tổng lượt/nhiều ảnh còn cần đồng bộ | Client/API/AI/proxy khớp yêu cầu đã chốt; tính multipart overhead |
| CI | Có tests/build/lint/smoke/coverage | CI đúng SHA release; floors backend 50%, frontend 25%, Python 40%; mục tiêu mỗi phần 80% |
| Publish/CD/TLS | Chưa có bộ production được kiểm chứng | Workflow/config/SSH và release manifest |
| Backup/restore | Chưa có bằng chứng diễn tập VPS | Script/lịch backup, bản ngoài VPS và restore thử |

Nguồn: [Compose](../docker-compose.yml), [backend Dockerfile](../backend/Dockerfile), [frontend Dockerfile](../frontend/Dockerfile), [FastAPI](../ai/service/app.py), [PredictionService](../backend/src/AgriVision.Application/Services/Implementations/PredictionService.cs), [PredictionsController](../backend/src/AgriVision.API/Controllers/PredictionsController.cs), [Program.cs](../backend/src/AgriVision.API/Program.cs), [CI](../.github/workflows/ci.yml).

Các nhận định review cũ “chưa có FastAPI”, “fallback mapping”, “GET chi tiết công khai” và “guest vẫn lưu lịch sử” được thay bằng hiện trạng trên. Có source không đồng nghĩa đã nghiệm thu. [Compose CI](../docker-compose.ci.yml) chỉ dùng AI health mock; health/coverage không chứng minh prediction với checkpoint thật. Chức năng tài khoản/upload chưa xong vẫn đối chiếu [yêu cầu sản phẩm](system_requirements.md), không đánh dấu Passed bằng mock.

## 5. Release và migration riêng

1. Hoàn thiện local theo mục 4; unit/integration và E2E model thật, benchmark. Chọn commit đã merge vào `main`, CI đạt đúng SHA; không deploy PR chưa tin cậy.
2. GitHub Actions build/publish ba image web/API/AI, tag SHA và ghi digest. VPS pull đúng digest, không rebuild; pin cả image hạ tầng đã kiểm chứng.
3. Lần đầu: Docker/Compose, firewall, DNS/Caddy, secret/volume; chuyển model bundle và kiểm checksum.
4. Khởi chạy workflow manual; serialize deploy. Ghi manifest release trước/đích. Với schema/dữ liệu thay đổi, bật maintenance và ngừng writer/cleanup trước backup.
5. Backup DB/manifest và danh sách asset cloud; nếu thay đổi/xóa ảnh, giữ bản sao ảnh cần phục hồi thành cùng bộ nhất quán. Xác nhận bản ngoài VPS trước thay đổi có nguy cơ mất dữ liệu. DB trống lần đầu ghi rõ chưa có dữ liệu cần backup.
6. Chờ DB healthy; image backend **release đích** chạy CLI `--migrate` trong container tạm, không chạy HTTP. Migration lỗi thì dừng, không bật API mới.
7. Import catalog 59 lớp lần đầu bằng công cụ/lệnh riêng cần xây dựng; lần sau cập nhật theo release. Không dựa vào development seed hoặc sửa migration lịch sử đã áp dụng.
8. Khởi động API/AI/web; chờ readiness, kiểm smoke nội bộ, bỏ maintenance rồi kiểm domain thật theo mục 8.
9. Ghi SHA/digest, model/checksum, migration list, backup ID và kết quả; lỗi thì xử lý mục 7.

Mẫu lệnh dưới đây dùng **Compose production chưa tạo**, chưa phải lệnh chạy được trong checkout hiện tại:

```bash
docker compose --project-name agrivision-demo --env-file /opt/agrivision/.env.production -f docker-compose.production.yml up -d postgres
docker compose --project-name agrivision-demo --env-file /opt/agrivision/.env.production -f docker-compose.production.yml run --rm --no-deps backend --migrate
```

Deploy tự gọi bước migration riêng sau khi người vận hành bắt đầu release; HTTP startup không tự migrate. Manifest ghép **commit + ba image digest + model bundle/checksum + mapping/preprocessing version + migration list**; không dùng `latest` làm cơ sở rollback. Xem [migration hiện có](notes/database_migrations.md).

## 6. Backup và retention

- Backup lúc **02:00 Asia/Ho_Chi_Minh** hàng ngày và trước deploy/migration thay đổi dữ liệu: `pg_dump` custom format, release manifest, danh sách định danh/version ảnh cloud và bản export ảnh còn hiệu lực để phục hồi. Không chép trực tiếp thư mục PostgreSQL đang chạy; ảnh nằm ngoài VPS không tự được tính là backup.
- Tạm ngừng writer/cleanup để bộ DB/ảnh nhất quán; ghi checksum/timestamp. Giữ 7 bộ hàng ngày và 2 bộ trước deploy gần nhất; mã hóa backup/config cần thiết, khóa giải mã giữ riêng khỏi VPS/backup. Export cloud cần script/quyền/quota được kiểm chứng; không giả định Cloudinary tự backup hoặc khôi phục được asset đã xóa trên mọi gói.
- Tải về máy nhóm sau backup mỗi ngày và trước trình bày/deploy; người vận hành xác nhận. Chỉ có bản trên VPS chưa tính backup ngoài VPS. Chuyển sang object storage ngoài VPS nếu cần tự động khi máy nhóm không bật.
- Mục tiêu **RPO 24 giờ, RTO 2 giờ**, chưa diễn tập; không cam kết RPO khi chưa xác nhận bản ngoài VPS hàng ngày.
- Restore thử vào DB/volume riêng, kiểm tài khoản/lịch sử/snapshot/ảnh rồi dọn môi trường thử sau ghi bằng chứng; không đè DB đang dùng.
- Cleanup systemd timer **03:00 Asia/Ho_Chi_Minh**, gọi CLI `--expire-images` với env/credential provider tương ứng; giữ snapshot/metadata và lịch sử migration. Nếu chọn GCS, rà soát soft delete/versioning/lifecycle để không xung đột retention và chi phí; ứng dụng vẫn kiểm expiry.
- Backup cũ có thể giữ ảnh hết hạn trong vòng quay backup, chỉ quản trị được đọc. Sau restore chạy cleanup trước mở truy cập. Nếu cần xóa tuyệt đối cả backup, thiết kế retention phải điều chỉnh.

Các script/timer chưa được tạo bởi tài liệu này; cần kiểm mã thoát, lỗi storage và dung lượng khi triển khai.

## 7. Rollback

Giữ ít nhất hai release đã kiểm chứng. Đổi về image/model trước nếu tương thích schema hiện tại; không tự chạy migration `Down` hoặc xóa volume.

Trước deploy ghi rõ migration có tương thích image cũ không. Nếu không, giữ maintenance từ trước migration; chọn sửa tiến lên hoặc restore **bộ DB/metadata cloud và ảnh cần thiết** trước deploy cùng image/model cũ. Khôi phục DB không tự khôi phục asset cloud đã xóa; cần restore provider được kiểm chứng hoặc upload lại bản export và cập nhật định danh. Restore có thể mất dữ liệu sau backup, không thực hiện ngầm khi còn nhận ghi.

Migration/health/inference lỗi làm release thất bại. Chỉ mở ứng dụng khi bộ phiên bản đã kiểm tra hoạt động; chưa khôi phục được thì giữ maintenance và ghi lỗi. Diễn tập rollback image/model và restore thử trước nghiệm thu VPS.

## 8. Tiêu chí nghiệm thu

- [ ] CI đúng SHA đạt; unit/integration/E2E local có bằng chứng riêng.
- [ ] Catalog/model 59 lớp khớp; cùng ảnh cho cây/bệnh/confidence nhất quán CLI–HTTP–API–web theo tolerance đã kiểm chứng.
- [ ] RAM/latency benchmark đạt; không OOM, xử lý quá tải rõ, timeout đồng bộ.
- [ ] HTTPS không redirect loop; port public đúng thiết kế; không lộ secret qua log.
- [ ] Guest không lưu lịch sử; user lưu snapshot/ảnh; A không đọc/xóa bản ghi hoặc ảnh của B.
- [ ] Upload sai/quá giới hạn bị từ chối; AI lỗi không thành công giả; expiry/cleanup/retry đạt.
- [ ] Recreate/reboot giữ DB và liên kết ảnh cloud; ảnh không public, không fallback local production; lỗi upload/delete/read và retry được kiểm chứng.
- [ ] Startup không tự migrate; CLI migration kiểm DB trống và DB cũ.
- [ ] Catalog production import được; backup ngoài VPS và restore thử đạt; rollback tương thích đạt.
- [ ] Có manifest, thời điểm deploy và lệnh thực sự chạy được; chưa kiểm ghi Chưa chạy.

Thiết kế đã chốt. Khi triển khai còn điền **đầu vào thực tế**: IP VPS, domain nhóm sở hữu, tài khoản/quyền registry, SSH host key, tài khoản Cloudinary và credential/gói phù hợp (hoặc GCS khi chuyển phương án), secret qua kênh an toàn, bundle/checksum và kết quả benchmark. Không gửi secret vào chat/tài liệu. Các đầu vào này cần có trước deploy, không phải quyết định kiến trúc còn bỏ ngỏ.

## 9. Đầu việc sau khi local hoàn tất

Bổ sung theo thứ tự: hoàn thiện Cloudinary authenticated/đọc ảnh kiểm owner/tắt local fallback production và kiểm thử; AI Dockerfile CPU; Compose production/Caddy/env example; workflow build/publish và deploy manual; công cụ import catalog; script deploy/backup/export-restore ảnh cloud và timer cleanup. Tái sử dụng CLI migration/expiry. Chốt dependency AI từ bản thực sự kiểm chứng, không tùy ý nâng phiên bản.

Lần đầu chạy các bước bằng tay, sau đó workflow gọi cùng quy trình. Quy mô này chưa cần Kubernetes, Terraform, staging riêng hoặc auto-update container. Cập nhật hiện tại chỉ hoàn thiện tài liệu; chưa tạo cấu hình/script kể trên, thay CI hoặc deploy.

## 10. Tham khảo

- [Docker/pipeline CI](notes/docker_pipeline.md), [Docker local](notes/docker_run_guide.md), [migration](notes/database_migrations.md).
- [Kế hoạch CI/CD](plans/ci_cd_plan.md), [coverage AGRI-75](reports/AGRI-75/ci_branch_coverage.md), [model AGRI-21](reports/AGRI-21/README.md).
- [Yêu cầu sản phẩm](system_requirements.md), [skill DevOps áp dụng](../.agents/skills/devops-iac-engineer/SKILL.md).
- [Docker Compose production](https://docs.docker.com/compose/how-tos/production/), [GitHub Actions publish image](https://docs.github.com/en/actions/tutorials/publish-packages/publish-docker-images).
