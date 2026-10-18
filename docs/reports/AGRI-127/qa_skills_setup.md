# AGRI-127 — QA skill setup

Ngày 2026-10-17: cài/gộp **25 guide** thành một [QA testing](../../../.agents/skills/qa-testing/SKILL.md).
Nguồn `petrkindlmann/qa-skills`, commit `b3bb61bd268b147476252c6ed5a0440c87b97441`;
giữ nội dung upstream, MIT attribution và 19 skill khác.

- Một SKILL.md discoverable; guide con đổi tên thành `guide.md`, router tự chọn
  theo nhu cầu. Không bảo đảm routing đúng tuyệt đối hoặc tự cài/chạy QA tool.
- Bao phủ planning, frontend/accessibility/visual, API/unit/DB/contracts, security,
  performance/email, coverage/reliability và CI readiness. Không dùng LLM/RAG eval
  cho ConvNeXt. [Catalogue](../../../.agents/skills/README.md),
  [manifest](../../../.agents/skills/installed_skills.json),
  [context](../../../.agents/references/qa-project-context.md).
- Kiểm tra cài đặt: 112 file, 62 reference paths; sau gộp 114 payload files,
  98 link, một entrypoint/25 guide, 19 record khác giữ nguyên; official quick_validate pass.
- Evidence local `.cache/qa-skill-setup/validation.json` và
  `.cache/qa-skill-grouping/validation.json`; PyYAML chỉ ở cache, không dependency app.

Đây là xác minh cài skill, không phải test ứng dụng hoặc cấp quyền production,
commit/push/deploy. [Các phần chưa làm](../../notes/remaining_work.md).
