# AGRI-57: Cài skill và xác minh cấu hình shadcn

> Bản ghi lịch sử ngày 2026-10-07. Ngày 2026-10-08, script shadcn được chuyển sang CLI local cố định phiên bản và `lint` được tách khỏi `typecheck`; xem [báo cáo cấu hình mới](agri_57_frontend_quality_setup.md). Không áp dụng kết quả lint cũ cho quality gate mới.

- Ngày thực hiện các lượt được tổng hợp: 2026-10-07.
- Nhánh đã xác minh khi đồng bộ tài liệu: `AGRI-57-frontend-summary`.
- Task log hiện có: [AGRI-57-frontend-ui-and-integration](../../task-logs/AGRI-57/AGRI-57-frontend-ui-and-integration.md).
- Điểm vào và trạng thái tổng thể: [README AGRI-57](README.md).

## 1. Phạm vi và trạng thái

Hoàn thành phạm vi cài skill, bổ sung ranh giới sử dụng và xác minh cấu hình shadcn hiện có. Báo cáo này tổng hợp các lần chạy thực trong phiên làm việc, không phải một lần chạy lại trong lượt chỉ sửa tài liệu. Không tuyên bố dự án sẵn sàng production hoặc đã nghiệm thu UI bằng trình duyệt.

UI/banner được ghi riêng tại [frontend_ui_refinement_audit.md](frontend_ui_refinement_audit.md). Bản demo ngày 2026-09-28 được giữ nguyên lịch sử trong [frontend_implementation_report.md](frontend_implementation_report.md).

## 2. Cài và quản lý skills

Nguồn bằng chứng chính: [manifest cài đặt](../../../.agents/skills/installed_skills.json) và [hướng dẫn sử dụng theo dự án](../../../.agents/skills/README.md). Bộ cài dùng `skill-installer/scripts/install-skill-from-github.py`, đích `.agents/skills`, nguồn được chốt bằng commit, không ghi đè skill cũ.

| Đợt | Gói cài thêm | Kiểm tra đã ghi nhận |
| --- | --- | --- |
| Đợt đầu | `shadcn`, `vercel-composition-patterns`, `webapp-testing`, `aspnet-core`, `security-best-practices` | Metadata, cấu trúc và tham chiếu local; giữ attribution/license theo nguồn. |
| Bổ sung debug/test/CI/bảo mật | `systematic-debugging`, `test-driven-development`, `verification-before-completion`, `gh-fix-ci`, `security-threat-model` | Đối chiếu Git blob hash của 25 file trong các package với commit upstream; kiểm tra thêm bản sao LICENSE gốc cho 3 gói Superpowers. |
| Bổ sung Docker/API/AI | `docker-patterns`, `api-design`, `pytorch-patterns` | Đối chiếu 6 file (3 SKILL.md và 3 LICENSE) với commit ECC `ef648e01899ba3e8dc6371642deaaf64b4477775`. |

Kết quả kiểm kê trực tiếp thư mục khi đồng bộ: **15 skill repo-local**, gồm **13 gói cài thêm** trong manifest và **2 skill giữ nguyên** (`coding-standards`, `git-commit`). Các đợt cài có exit code 0; metadata và kiểm tra nguồn trong phạm vi nêu trên đạt. Đây không phải audit bảo mật toàn bộ nội dung, cũng không phải kết quả kiểm thử ứng dụng.

Bảy skill UI có sẵn trên máy được ghi riêng: Taste, React Best Practices, GSAP core/react/performance/scrolltrigger và Impeccable. Không sao chép chúng vào repo, không khẳng định thành viên khác tự động có các skill đó khi clone.

Ranh giới đã ghi trong README của skills và được `AGENTS.md` yêu cầu đọc:

- Rules, phạm vi người dùng và `DESIGN.md` vẫn có hiệu lực; Impeccable chỉ audit/critique, sửa UI bằng Taste + React Best Practices.
- Không tự xóa code có sẵn để theo TDD, không dump secrets, commit/push hoặc triển khai.
- Không tự xóa Docker volume, đổi hợp đồng API, pretrained weights, nhãn/split/metric hoặc chạy training theo ví dụ của skill.
- Cài skill không cài runtime Docker/PyTorch/CUDA, không khởi chạy container, migration, browser hay training job.

## 3. Cấu hình shadcn

CLI `corepack pnpm dlx shadcn@latest info --json`, chạy trong `frontend/`, đã nhận đúng cấu hình có sẵn:

| Thuộc tính | Giá trị được nhận |
| --- | --- |
| Framework | Next.js App Router `16.3.6`, TypeScript, RSC |
| Style / base | `radix-nova` / `radix` |
| Tailwind | v4, không cần file config Tailwind 3 |
| CSS / theme | `src/index.css`, semantic variables từ `DESIGN.md` |
| Alias | `@/components/ui`, `@/lib/utils`, `@/hooks` |
| Icon / font trong ứng dụng | Lucide / Manrope qua `next/font` |
| Primitive hiện có | 16 file trong `frontend/src/components/ui/` |

Các primitive: AlertDialog, Badge, Button, Card, Checkbox, Dialog, Input, Label, Progress, Select, Separator, Sheet, Sonner, Tabs, Textarea và Tooltip.

Chỉ bổ sung script `"ui": "corepack pnpm dlx shadcn@latest"` trong [package.json](../../../frontend/package.json) và hướng dẫn ở [frontend/README.md](../../../frontend/README.md). Giữ [components.json](../../../frontend/components.json), [token CSS](../../../frontend/src/index.css), alias, dependency lockfile và các component tùy chỉnh; không chạy `init`, áp preset hoặc `--overwrite`.

`info` có thể trả preset fallback neutral/Geist khi không suy ra được theme tùy chỉnh; không dùng giá trị fallback đó thay thế palette/Manrope đang render. `add @shadcn/button --dry-run` cảnh báo sẽ ghi đè Button và đề xuất dependency `cn`; không áp dụng preview này. `next-env.d.ts` tự đổi đường dẫn type khi build đã được trả về đường dẫn dev có trước lượt kiểm tra.

## 4. Bằng chứng lượt cấu hình shadcn

Các lệnh sau chạy thực ngày 2026-10-07, working directory `E:\AgriAI\frontend`:

| Lệnh | Kết quả quan sát |
| --- | --- |
| `corepack pnpm ui info --json` | Exit 0; nhận đúng framework, Radix, Tailwind v4, aliases và 16 component. |
| `corepack pnpm ui docs button dialog select` | Exit 0; trả URL tài liệu đúng base Radix. |
| `corepack pnpm ui add @shadcn/button --dry-run` | Exit 0; preview 1 file ghi đè, không thực hiện ghi đè. |
| `corepack pnpm lint` | Exit 0, TypeScript không lỗi; chạy lại sau khi trả `next-env.d.ts` về trạng thái đầu lượt cũng exit 0. |
| `corepack pnpm test` | Exit 0; **63 tests / 12 files** đều pass. |
| `corepack pnpm build` | Exit 0; compile, TypeScript, tạo static pages thành công. |

Trích nguyên các dòng kết quả Vitest từ lần chạy trên, không phải log mới tạo khi đồng bộ tài liệu:

```text
Test Files  12 passed (12)
     Tests  63 passed (63)
  Start at  21:44:28
  Duration  39.42s (environment 83%, import 10%, setup 4%, tests 2%, transform 1%)
```

Output Next.js của cùng lượt kiểm tra ghi `Compiled successfully in 35.9s`, TypeScript hoàn tất, static pages `3/3`; route `/` và `/_not-found` được prerender. Đây là thời gian của một lần chạy, không phải benchmark hiệu năng sản phẩm.

Đối chiếu SHA-256 sau kiểm tra giữ nguyên **21 file**: `components.json`, `pnpm-lock.yaml`, `src/index.css`, `src/lib/utils.ts`, `src/app/layout.tsx` và 16 file UI. `git diff --check` đạt. Không dùng kết quả test/build này để suy ra giao diện đẹp, đạt WCAG, camera thật hoạt động hoặc backend/AI đã được kiểm thử lại.

## 5. Đồng bộ tài liệu và các lần sau

Lượt tổng hợp này chỉ cập nhật `AGENTS.md`, `.agents/rules/project_rules.md`, các báo cáo AGRI-57 và task log hiện có. Không chạy lại test/build ứng dụng; kiểm tra nhánh, nguồn số liệu, liên kết local và whitespace của tài liệu trước khi bàn giao.

Quy tắc mới yêu cầu mỗi lần thay đổi repo cập nhật report và task log theo Jira key của nhánh hiện tại, không đợi tạo PR. Giữ lịch sử có ngày/phạm vi, ghi đúng kiểm tra thực chạy, giới hạn và follow-up. Task log AGRI-57 giữ nguyên đường dẫn nested đang dùng; ngoại lệ này được ghi rõ trong rules, không tạo bản flat trùng.

## 6. Giới hạn còn lại

- Kiểm tra trực quan ở 375px, 768px, 1280px, chuyển động banner và khả năng tiếp cận vẫn chưa hoàn tất; giữ đánh đổi bỏ nút dừng thủ công trong báo cáo UI.
- Không có lần kiểm thử backend, Docker, training hoặc E2E toàn hệ thống mới trong các lượt cài skill/cấu hình shadcn.
- Task log giữ owner đã ghi trước đó; không tạo Jira key, reviewer, PR URL hay kết quả thí nghiệm mới.
- Không commit, push, tạo PR hoặc cập nhật Jira trong các lượt được tổng hợp này.

## 7. Cài bộ skill UI vào dự án ngày 2026-10-08

Theo yêu cầu “cài vào folder”, đã cài vào `E:/AgriAI/.agents/skills`, không ghi đè các bản cấp máy. Nhánh xác minh: `AGRI-57-frontend-summary`. Các lượt trước chỉ dùng bộ UI cấp máy; mục này ghi lần bổ sung thực sự vào repo.

| Thư mục mới | Nguồn và commit ghim | Đường dẫn upstream |
| --- | --- | --- |
| `taste-skill` | [Leonxlnx/taste-skill](https://github.com/Leonxlnx/taste-skill/tree/b482f7a970abb98c4108d4a9f761e458c64cefc8) | `skills/taste-skill` |
| `gsap-core`, `gsap-react`, `gsap-performance`, `gsap-scrolltrigger` | [GreenSock](https://github.com/greensock/gsap-skills/tree/aed9cfd3277740755f6bfc1155c7aa645403b760) | Bốn thư mục cùng tên trong `skills/` |
| `react-best-practices` | [Vercel](https://github.com/vercel-labs/agent-skills/tree/063bee94c3f4df8453406c830b0a7df0f2860278) | `skills/react-best-practices` |
| `impeccable` | [Paul Bakaus](https://github.com/pbakaus/impeccable/tree/778c8a7b71ccd5bfe3ca6ac68c15d9d872d0f87d) | `.agents/skills/impeccable` |

- Dùng `skill-installer/scripts/install-skill-from-github.py --repo ... --ref ... --path ... --dest E:/AgriAI/.agents/skills --method download`, không dùng npm lifecycle script. Cả bốn lệnh cài đều exit 0; bộ cài từ chối ghi đè thư mục đã tồn tại.
- Tổng mới: **22 skill trong repo**, gồm 20 gói third-party và 2 skill gốc. Bảy thư mục mới có 150 file sau khi bổ sung giấy phép/notice. React có 72 file rules; Impeccable có 41 file reference và các launcher đi kèm.
- Giữ nguyên file upstream; bổ sung LICENSE gốc đúng commit cho Taste và bốn GSAP, LICENSE/NOTICE.md cho Impeccable. React giữ khai báo MIT của upstream; cây nguồn đã kiểm tra không có LICENSE ở root.
- Kiểm tra front matter/tên của 7 SKILL.md và 34 liên kết local trực tiếp: **0 lỗi**. Sáu SKILL.md Taste/GSAP/React có SHA-256 khớp bản cấp máy. Impeccable vẫn version 4.5.0 nhưng upstream thêm một nguyên tắc tránh biểu tượng thù hận/quân phiệt làm trang trí; đã đối chiếu diff, không sửa bản cấp máy.
- Cập nhật `.agents/skills/installed_skills.json` với nguồn, commit, ngày cài và license; cập nhật `.agents/skills/README.md` với thư mục, tổng số và ranh giới sử dụng. Không sửa SKILL.md upstream để nhét quy tắc riêng.
- Tiếp tục áp dụng DESIGN.md: Taste + React Best Practices sửa UI, GSAP theo quy tắc chuyển động, Impeccable **chỉ review**. Cài package không cho phép tự đổi DESIGN.md, chạy hooks, sửa giao diện, tạo agent phụ hoặc tải engine khi chưa có quyền phù hợp.
- Không chạy script/engine của skill vừa cài; không đổi dependency ứng dụng, frontend/backend/AI, commit hoặc push. Không chạy lại test/build ứng dụng cho thay đổi chỉ gồm skill/tài liệu; các kết quả UI trước đó không phải bằng chứng mới trong lượt này.
- Các skill mới có thể được nhận từ lượt kế tiếp; nếu danh mục chưa refresh thì mở lại project/session. Bản cấp máy vẫn giữ nguyên, không cần nạp đồng thời cả hai bản cho cùng một tác vụ.
