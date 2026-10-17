# LeafAI Frontend

Next.js App Router frontend for the LeafAI plant-disease classification experience. Styling uses Tailwind CSS 4 and dependencies are managed with pnpm.

The home page banner automatically cycles through all 13 plants in the project. It has no selector, previous/next buttons or manual pause control, as requested. Motion stops when the banner is out of view or the tab is hidden, and reduced-motion mode shows a static scene. The accessibility trade-off is recorded in the AGRI-57 UI report.

## Run locally

Frontend runtime: Node.js 24.15.0 and pnpm 10.34.5. `packageManager` pins pnpm; `pnpm-workspace.yaml` tells pnpm to download and use the project Node runtime without replacing the machine-wide Node installation. `.node-version` declares the same version for other version managers. A working Node/Corepack installation is needed to bootstrap pnpm, and the first run needs network access. The integrated backend additionally needs the .NET 9 SDK.

Docker uses `node:24.15.0-bookworm-slim` for both build and standalone runtime. Keep both stages on glibc: pnpm's managed Node download (`useNodeVersion`) is incompatible with Alpine/musl. The workspace configuration is copied before the frozen dependency install so install and build use the same settings. Rebuild from the repository root with `docker compose build frontend`; do not delete database or upload volumes to resolve a frontend image error.

Open two terminals from the project root:

```powershell
cd backend
dotnet restore AgriVision.sln
dotnet run --project src/AgriVision.API/AgriVision.API.csproj --launch-profile http
```

```powershell
cd frontend
corepack pnpm install --frozen-lockfile
corepack pnpm node --version
corepack pnpm dev
```

Open `http://localhost:3000`. Next.js rewrites `/api/*` to the ASP.NET API at `http://127.0.0.1:5034`. Set `API_PROXY_TARGET` to change the proxy destination, or `NEXT_PUBLIC_API_BASE_URL` to call a public API origin directly. Restart the development server after changing environment variables. Production settings are read at build time: rebuild the image when changing the proxy destination. Root Compose builds with `API_PROXY_TARGET=http://backend:8080` and runs the standalone Node server on port 3000.

## Commands

```powershell
corepack pnpm dev
corepack pnpm typecheck
corepack pnpm lint
corepack pnpm test
corepack pnpm test:coverage
corepack pnpm format:check
corepack pnpm build
corepack pnpm start
```

## Team quality workflow

`typecheck` runs TypeScript. `lint` now runs Biome's recommended checks plus project import boundaries; it fails on errors **and warnings**. The old `lint` command only ran TypeScript, so historical lint passes do not mean the current source has passed this new gate.

Biome 2.5.15 is pinned in the lockfile. It parses TypeScript independently of the compiler and understands Tailwind 4 directives. The attempted Next/ESLint setup was not retained because its TypeScript parser's declared peer range excludes this project's TypeScript 7. The existing framework/compiler versions were preserved.

```powershell
# Read-only gates, stopping at the first failed step.
corepack pnpm check       # typecheck, lint, tests
corepack pnpm check:ci    # the above, then formatting and production build

# Format only the files you intentionally changed; review the diff afterward.
corepack pnpm exec biome format --write tests/tooling/lintRules.test.ts
```

Do not run a blanket formatter or `--unsafe` fix across somebody else's dirty worktree. `.editorconfig` standardizes UTF-8, two-space indentation and LF for frontend files. Generated output, dependency folders, public assets and `next-env.d.ts` are excluded from the formatter/linter. The quality commands do not start Docker, contact the backend, stage files, commit or deploy.

The new full-project gates may reject existing source. Do not silence rules to make CI green: review the diagnostics and remediate them with focused tests. Current evidence and remaining migration work are recorded in the [AGRI-57 quality setup report](../docs/reports/AGRI-57/agri_57_frontend_quality_setup.md). These are local/CI-ready commands; no remote GitHub workflow, branch protection or deployment has been enabled by this setup.

### Source boundaries

- `src/app`: Next.js entry points, layout and framework integration.
- `src/features`: route-specific client adapters, one explicit import per page. Bind existing views to shared state/actions here; do not add a second pathname-based view switch.
- `src/providers`: verified client session, startup orchestration and typed auth/catalog/history/feedback contexts. Context values/actions remain stable across unrelated updates.
- `src/hooks`: small reusable interaction hooks; `useAppNavigation` centralizes imperative navigation for existing view callbacks.
- `src/views`: screen composition; reuse shared controls and existing services.
- `src/components/ui`: shadcn/Radix primitives only. Do not import application services, views or feature/modal components into this layer.
- `src/components/common`, `features`, `layout`, `modals`: domain composition built from shared primitives; import from `@/components/ui`, not Radix directly.
- `src/services`: existing API clients and contracts; keep transport logic out of UI primitives.
- `src/lib`: small shared utilities, including the `cn` alias.
- `tests`: centralized Vitest suites; `unit/` covers services/data/utilities/metadata,
  `component/` covers rendered components, `integration/` covers app/admin/diagnosis
  flows with controlled API boundaries, and `tooling/` runs lint regression checks.
  Shared setup is `tests/setup.ts`; test-only composition lives in `tests/helpers/`.
  See [test layout and commands](tests/README.md).

Lint enforces direct Radix package imports outside the primitive layer and the listed `@/` application imports inside it. It is not a complete dependency-graph analyzer: relative-path boundary bypasses still need review. The tooling tests run the real linter against isolated temporary fixture files and remove only their own fixtures afterward. Run full-tree lint/format checks after the tests finish, not concurrently with these temporary fixtures; `check` and `check:ci` already sequence their steps.

## Routing architecture

```text
src/app/layout.tsx                     root font, CSS, metadata, tooltip provider
src/app/(website)/layout.tsx           persistent AppProvider (no screen imports)
src/app/(website)/page.tsx             introduction (/)
src/app/(website)/(application)/layout.tsx  AppShell: navigation, footer, entrance
src/app/(website)/(application)/**/page.tsx server entry + metadata + explicit feature
src/features/<domain>/*Route.tsx       client bindings to existing views
src/providers/AppContexts.ts          auth / catalog / history / feedback contracts
```

Groups do not change URLs. App pages are `/home`, `/diagnose`, `/plants`, `/diseases`, `/history`, `/about`, `/profile`; detail pages use `/plants/[id]` and `/diseases/[id]`. Navigation links use Next Link, composed with the existing shadcn Button. Existing action callbacks use Next router through `useAppNavigation`. Authentication/history details remain dialogs.

Application loading/error boundaries stay inside the shell. Website/root boundaries cover layout/provider failures; global-error replaces the root with its own `html`/`body`. Render-error retries use the installed Next 16.3 `retry` callback. Expected API/async errors remain handled in the relevant feature/startup flow. The custom root not-found page handles unmatched URLs. Unknown catalog IDs still use a client missing-item state, not a guaranteed HTTP 404.

Session storage and ASP.NET API contracts are preserved. The client gate is not authorization: protected API requests must still be verified by ASP.NET. Server-side session checks require a separately agreed cookie/BFF design; adding a proxy cannot read the current browser-storage token. Startup still loads catalog/history in parallel before completing the approved greeting entrance. Next loading boundaries do not replace that client request state. App routes are noindex; detail metadata names known local catalog IDs and uses generic text for unknown/backend-only IDs. These private pages are not a public SSR catalog.

See [AGRI-57 architecture evidence](../docs/reports/AGRI-57/agri_57_routing_architecture.md). Do not copy sample NextAuth, Server Actions, catch-all or parallel routes into this ASP.NET-backed project without a concrete requirement.

## shadcn/ui configuration

shadcn/ui is already initialized. Do not run `init`, apply a preset, or overwrite existing components as part of normal setup.

| Setting | Project value |
| --- | --- |
| Configuration | `components.json` |
| Style and primitives | `radix-nova`, Radix UI |
| Framework | Next.js App Router, TypeScript, React Server Components |
| Styling | Tailwind CSS 4; CSS variables in `src/index.css` |
| Icons and font | Lucide; Manrope via `next/font` |
| UI source | `src/components/ui`, imported with `@/components/ui/...` |
| Utility alias | `@/lib/utils`, which re-exports the installed `cn` utility |

Read the root `AGENTS.md` and `DESIGN.md` first. LeafAI's warm/green theme is defined by the semantic tokens in `src/index.css`, not by the neutral base color in `components.json`. Leave `tailwind.config` empty for Tailwind 4. Do not create a second `globals.css` or a Tailwind 3 configuration file.

The existing primitives are Button, Input, Label, Textarea, Dialog, AlertDialog, Sheet, Tabs, Select, Checkbox, Card, Badge, Progress, Separator, Tooltip and Sonner. Reuse them rather than recreating controls. Keep the existing 44px touch targets, focus states, custom button variants and reduced-motion behavior.

Run these commands from `frontend/`:

```powershell
# Read-only project inspection.
corepack pnpm ui info --json
corepack pnpm ui docs button dialog select

# Preview upstream changes to an existing component; writes no project files.
corepack pnpm ui add @shadcn/button --dry-run
corepack pnpm ui add @shadcn/button --diff button.tsx

# Example for a genuinely needed, not-yet-installed component.
corepack pnpm ui add @shadcn/alert --dry-run
# After reviewing the preview, omit --dry-run to install it.
```

The `ui` script uses the locally installed shadcn CLI, pinned to 4.21.3 and resolved by pnpm, instead of downloading `@latest` each time. Registry/docs requests may still need network access. Updates are deliberate dependency changes: review release notes and component dry-runs, update the exact version and lockfile, then rerun the gates. Use explicit `@shadcn/...` registry names; review third-party registries separately. Never use `--overwrite`, `--all` or `apply` to update the customized UI without explicit approval.

The CLI may report fallback preset values such as a neutral theme or Geist font because LeafAI uses custom tokens. These are not the actual rendered theme; do not apply that inferred preset to restore the project.

After an intentional component change, run `corepack pnpm typecheck`, `corepack pnpm lint`, `corepack pnpm test` and `corepack pnpm build`, then check the affected UI at 375px, 768px and 1280px as required by `DESIGN.md`.

## Demo flow

1. Select or drag in a JPG/PNG image, at most 15 MB. Invalid or unreadable files show an inline error.
2. Check the preview and file details. Replace or remove the image if needed.
3. Press **Phân tích**. The page shows upload progress, then an analyzing state while waiting for the API.
4. On success, the crop, disease and confidence come from the JSON response. On network or API errors, the page shows the error and a retry action.

The request is `POST /api/predictions`, `multipart/form-data`, with the file in the `file` field. The response follows the backend `PredictionResultDto` contract:

```json
{
  "id": "prediction-guid",
  "imagePath": "https://...",
  "predictedPlantDisease": {
    "className": "Tomato___Early_blight",
    "plant": { "name": "Tomato", "vietnameseName": "Cà chua" },
    "disease": { "name": "Early Blight", "vietnameseName": "Bệnh đốm vòng" }
  },
  "confidence": 0.94,
  "predictionDetails": [],
  "createdAt": "2026-09-27T00:00:00Z"
}
```

Authenticated requests include the JWT bearer token, allowing predictions to appear in `GET /api/predictions` history and to be removed through `DELETE /api/predictions/{id}`.

## Checks

```powershell
cd frontend
corepack pnpm check:ci
```

`pnpm test:coverage` runs every Vitest file, including component and mocked API integration tests. The current CI floor is 60% branch coverage across `src/`, with an 80% target that will rise as tests expand. Reports are in `../.cache/coverage/frontend/`. Reports include untested source files; this suite does not test real backend/model inference.

For backend coverage commands, see the [CI report](../docs/reports/AGRI-75/ci_branch_coverage.md). For a UI check, test registration, login, one valid image, one non-image file, a file above 15 MB, and a request with the backend stopped. Confirm the authentication, preview, loading, result, and error states.
