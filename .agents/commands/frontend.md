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
pnpm --dir frontend test:integration
pnpm --dir frontend test
pnpm --dir frontend build
pnpm --dir frontend test:coverage
~~~

Choose the relevant suites or all tests; there is no need to repeat all suites. Lint currently runs TypeScript tsc --noEmit. Branch coverage target is 80%, current CI floor is 25%. Tests/mocks do not establish real web-to-model inference.
