# Frontend tests

All Vitest tests and support code live here. Application code stays under `src/`.
Use `@/` for application imports and ordinary relative imports for shared test helpers.

```text
tests/
├── unit/
│   ├── app/              # Route metadata
│   ├── data/             # Catalog and supplied asset contracts
│   ├── services/         # API adapters with controlled HTTP/XHR
│   └── utils/            # Input validation
├── component/
│   ├── admin/
│   ├── app/              # Error/not-found screens
│   ├── common/
│   ├── layout/
│   ├── modals/
│   └── views/
├── integration/
│   ├── admin/
│   ├── app/              # Provider, routing and authentication composition
│   └── diagnosis/
├── tooling/              # Real Biome rule probes
├── helpers/              # Test-only AppHarness
└── setup.ts              # Testing Library cleanup and jsdom shims
```

Run from `frontend/` using the existing pnpm version and dependencies:

```powershell
corepack pnpm test                # Every group
corepack pnpm test:unit
corepack pnpm test:component
corepack pnpm test:integration
corepack pnpm test:tooling
corepack pnpm test:coverage       # Every group; source coverage remains src/**
corepack pnpm typecheck
corepack pnpm lint
```

The all-tests command includes tooling tests; individual groups partition the suite
without duplicate discovery. Existing `.unit.test.tsx`/`.integration.test.tsx` names
are retained, while directory location now decides the group.

`integration` means in-process React/Testing Library composition with controlled
network responses, not browser E2E or real backend/model acceptance. E2E remains
deferred. Asset-contract tests read the original files under `src/assets/`.

Do not run full-tree lint/format concurrently with tooling probes: those tests
create and clean up their own temporary fixtures under `src/`. CI still runs
`test:coverage` and discovers every group through `vitest.config.mts`; no new CI
job, gate, dependency or browser runtime is required.
