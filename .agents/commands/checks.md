# Change checks

Read-only Git commands from the root:

~~~powershell
git status --short
git diff --stat
git diff --check
git diff --cached --stat
~~~

Diff checks cover tracked changes; inspect new untracked files separately. Preserve unrelated work. Stage/commit/push only when requested.

Check the last commit subject if needed, using locked root tooling:

~~~powershell
pnpm install --frozen-lockfile
pnpm run commitlint --last --verbose
~~~

Last-commit checking does not validate a proposed subject before commit. Use a real Jira key following [project rules](../rules/project_rules.md). A branch name does not assign its Jira key to unrelated work. A task without a key is recorded as a draft when requested by the user.

Report passed, unrun and blocked checks honestly. These commands do not replace runtime tests, CI or a secret scanner.
