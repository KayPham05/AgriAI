# AGRI-145 — Task log

- Hoàn tất result validator, exit-code propagation, artifact aggregation và mapping `case_ids`.
- Hoàn tất retry Sheets, batch writes, bảo vệ cột manual và deprecation scan.
- CI YAML đã có 7 job, gồm live-contract, readiness, artifact gate và Sheets concurrency.
- Verify local: 23 Python tests pass; API 294 pass; health/guest adapters pass; Vitest 9 pass; Playwright pass; Docker health 200.
- Verify Sheets: local sync protected pass, lần chạy thứ hai 7/7 `unchanged`; GitHub protected sync pass ở run `43570450037`.
- Security: service-account key ignored và không tracked.

## Còn lại

- GitHub run `43570450037` pass toàn bộ jobs gồm Sheets sync; viewpoint chưa có runner tự động.
