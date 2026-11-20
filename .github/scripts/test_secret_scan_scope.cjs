const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const { mkdtempSync, readFileSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');
const path = require('node:path');
const { test } = require('node:test');

// Exercise Git with the revision options actually supplied to Gitleaks in CI.
const workflow = readFileSync(path.join(__dirname, '../workflows/ci.yml'), 'utf8');
const scanJob = workflow.split('\n  secret-scan:')[1].split('\n  compose-smoke:')[0];
const scanScope = scanJob.match(/--log-opts="([^"]+)"/)[1].split(/\s+/);

function repository(t) {
  const directory = mkdtempSync(path.join(tmpdir(), 'agrivision-scan-scope-'));
  t.after(() => {
    assert.equal(path.dirname(directory), path.resolve(tmpdir()));
    assert.ok(path.basename(directory).startsWith('agrivision-scan-scope-'));
    rmSync(directory, { recursive: true, force: true });
  });
  const git = (...args) => execFileSync('git', args, {
    cwd: directory,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    timeout: 10_000,
  }).trim();
  git('init', '--initial-branch=main');
  git('config', 'user.name', 'CI Scope Fixture');
  git('config', 'user.email', 'ci-scope@example.invalid');
  git('config', 'commit.gpgsign', 'false');
  const commit = (message) => git('commit', '--allow-empty', '-m', message);
  commit('shared-base');
  const scannedCommits = () => git('log', ...scanScope, '--format=%s').split('\n');
  return { git, commit, scannedCommits };
}

test('an unrelated remote branch cannot fail the current checkout scan', (t) => {
  const { git, commit, scannedCommits } = repository(t);
  git('checkout', '-b', 'unrelated');
  commit('unrelated-credential');
  git('update-ref', 'refs/remotes/origin/unrelated', git('rev-parse', 'HEAD'));
  git('checkout', 'main');
  commit('current-feature');
  git('checkout', '--detach');
  assert.deepEqual(scannedCommits(), ['current-feature', 'shared-base']);
});

test('all earlier commits remain in scope, including a removed credential', (t) => {
  const { commit, scannedCommits } = repository(t);
  commit('introduce-credential');
  commit('remove-credential');
  assert.deepEqual(scannedCommits(), ['remove-credential', 'introduce-credential', 'shared-base']);
});

test('a pull-request merge scan includes both parents and their ancestors', (t) => {
  const { git, commit, scannedCommits } = repository(t);
  git('checkout', '-b', 'feature');
  commit('feature-credential');
  git('checkout', 'main');
  commit('base-update');
  git('merge', '--no-ff', 'feature', '-m', 'pull-request-merge');
  git('checkout', '--detach');
  assert.deepEqual(new Set(scannedCommits()), new Set([
    'pull-request-merge', 'base-update', 'feature-credential', 'shared-base',
  ]));
});
