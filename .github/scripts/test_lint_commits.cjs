const assert = require('node:assert/strict');
const { execFileSync, spawnSync } = require('node:child_process');
const { mkdtempSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');
const path = require('node:path');
const { test } = require('node:test');

test('legacy history is exempt but new invalid commits fail, including inside merges', () => {
  const directory = mkdtempSync(path.join(tmpdir(), 'agrivision-commitlint-'));
  const git = (...args) => execFileSync('git', args, { cwd: directory, encoding: 'utf8' }).trim();
  const commit = (message) => {
    git('commit', '--allow-empty', '-m', message);
    return git('rev-parse', 'HEAD');
  };
  const lint = (baseline, head, base = '') => spawnSync(process.execPath, [
    path.join(__dirname, 'lint_commits.cjs'),
  ], {
    encoding: 'utf8',
    env: {
      ...process.env,
      GIT_DIR: path.join(directory, '.git'),
      GIT_WORK_TREE: directory,
      COMMITLINT_BASELINE: baseline,
      BASE_SHA: base,
      HEAD_SHA: head,
    },
  });
  const check = (result, status, count) => {
    assert.equal(result.status, status, result.stdout + result.stderr);
    assert.match(result.stdout, new RegExp(`Checking ${count} new content commit`));
  };
  try {
    git('init', '--initial-branch=main');
    git('config', 'user.name', 'CI Test');
    git('config', 'user.email', 'ci-test@example.invalid');
    git('config', 'commit.gpgsign', 'false');
    const baseline = commit('old nonconforming message');
    check(lint(baseline, baseline), 0, 0);
    const valid = commit('ci: AGRI-75 validate new commits');
    check(lint(baseline, valid), 0, 1);
    check(lint(baseline, valid, '0'.repeat(40)), 0, 1);
    git('checkout', '-b', 'feature');
    const invalid = commit('new nonconforming message');
    check(lint(baseline, invalid, valid), 1, 1);
    git('checkout', 'main');
    git('merge', '--no-ff', 'feature', '-m', 'Merge pull request #1');
    const merge = git('rev-parse', 'HEAD');
    check(lint(baseline, merge, valid), 1, 1);
    check(lint(baseline, merge, invalid), 0, 0);
    assert.notEqual(lint('missing-baseline', merge).status, 0);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
