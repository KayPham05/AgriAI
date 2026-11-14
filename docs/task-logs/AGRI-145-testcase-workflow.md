# AGRI-145 — Task log

- Hoàn tất result validator, exit-code propagation, artifact aggregation và mapping `case_ids`.
- Hoàn tất retry Sheets, batch writes, bảo vệ cột manual và deprecation scan.
- CI YAML đã có 7 job, gồm live-contract, readiness, artifact gate và Sheets concurrency.
- Verify local: 23 Python tests pass; API 294 pass; health/guest adapters pass; Vitest 9 pass; Playwright pass; Docker health 200.
- Verify Sheets: sync protected pass; lần chạy thứ hai 7/7 `unchanged`.\n- Security: service-account key ignored và không tracked.

## Còn lại

- Remote branch còn workflow cũ; cần push revision local rồi dispatch để xác minh CI thật.
- Live-contract đã pass trên GitHub; Sheets remote cần secret `GCP_SA_KEY_BASE64`; viewpoint chưa có runner tự động.\n\n\n\n\n