# Frontend

Use locked dependencies from the root:

~~~powershell
pnpm --dir frontend install --frozen-lockfile
pnpm --dir frontend dev
~~~

Dev occupies the terminal and port 3000; stop Docker frontend first if needed.

Independent checks:

~~~powershell
pnpm --dir frontend lint
pnpm --dir frontend test:unit
pnpm --dir frontend test:component
pnpm --dir frontend test:integration
pnpm --dir frontend test:tooling
pnpm --dir frontend test
pnpm --dir frontend build
pnpm --dir frontend test:coverage
~~~

Choose the relevant suites or all tests; there is no need to repeat all suites. Lint uses Biome; typecheck is a separate `corepack pnpm --dir frontend typecheck` command. Branch coverage target is 80%, current CI floor is 60%. Tests/mocks do not establish real web-to-model inference.

All frontend tests live in `frontend/tests/`. The four group commands partition the suite; `test` and `test:coverage` run every group. See [test layout](../../frontend/tests/README.md). Shared setup/helpers stay outside production `src/`.
