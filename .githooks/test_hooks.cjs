const assert = require('node:assert/strict');
const { execFileSync, spawnSync } = require('node:child_process');
const { mkdtempSync, rmSync, writeFileSync } = require('node:fs');
const { tmpdir } = require('node:os');
const path = require('node:path');
const { test } = require('node:test');

const { setupHooks } = require('./setup_hooks.cjs');
const {
  GITLEAKS_DOCKER_IMAGE,
  buildScannerCommand,
  runPreCommit,
} = require('./run_pre_commit.cjs');
const { runCommitMsg } = require('./run_commit_msg.cjs');

const REPO_ROOT = path.resolve(__dirname, '..');

function createCaptureStream() {
  let buffer = '';
  return {
    stream: {
      write(chunk) {
        buffer += String(chunk);
      },
    },
    read: () => buffer,
  };
}

test('setupHooks skips CI and missing .git, and configures core.hooksPath locally', () => {
  const calls = [];
  const chmodCalls = [];
  const fakeFs = {
    existsSync: (target) => target.endsWith('.git') || target.includes('.githooks'),
    chmodSync: (target, mode) => chmodCalls.push({ target, mode }),
  };

  assert.deepEqual(
    setupHooks({ repoRoot: '/repo', env: { CI: 'true' }, fs: fakeFs }),
    { configured: false, reason: 'ci' },
  );

  assert.deepEqual(
    setupHooks({
      repoRoot: '/repo',
      env: {},
      fs: { existsSync: () => false },
    }),
    { configured: false, reason: 'no-git' },
  );

  const stdout = createCaptureStream();
  const result = setupHooks({
    repoRoot: '/repo',
    env: {},
    platform: 'linux',
    fs: fakeFs,
    execGit: (args) => calls.push(args),
    verbose: true,
    stdout: stdout.stream,
  });

  assert.deepEqual(result, { configured: true, reason: 'ok' });
  assert.deepEqual(calls, [['config', 'core.hooksPath', '.githooks']]);
  assert.equal(chmodCalls.length, 2);
  assert.match(stdout.read(), /core\.hooksPath -> \.githooks/);
});

test('runPreCommit skips scan when nothing is staged', () => {
  const invoked = [];
  const result = runPreCommit({
    repoRoot: REPO_ROOT,
    spawn: (cmd, args) => {
      invoked.push([cmd, ...args]);
      return { status: 0 };
    },
  });

  assert.equal(result, 0);
  assert.equal(invoked.length, 1);
  assert.equal(invoked[0][0], 'git');
});

test('runPreCommit uses native gitleaks when available and blocks on findings', () => {
  const invoked = [];
  const stderr = createCaptureStream();
  const spawnStub = (cmd, args) => {
    invoked.push([cmd, args]);
    if (cmd === 'git') return { status: 1 };
    if (cmd === 'gitleaks' && args[0] === 'version') return { status: 0 };
    if (cmd === 'gitleaks' && args[0] === 'git') return { status: 1 };
    throw new Error(`Unexpected command: ${cmd}`);
  };

  const exitCode = runPreCommit({
    repoRoot: REPO_ROOT,
    spawn: spawnStub,
    stderr: stderr.stream,
  });

  assert.equal(exitCode, 1);
  assert.equal(invoked[2][0], 'gitleaks');
  assert.deepEqual(invoked[2][1], [
    'git',
    REPO_ROOT,
    '--pre-commit',
    '--staged',
    '--config',
    path.join(REPO_ROOT, '.gitleaks.toml'),
    '--no-banner',
    '--redact',
    '--verbose',
  ]);
  assert.match(stderr.read(), /Commit da bi chan/);
});

test('runPreCommit falls back to pinned Docker gitleaks image when native binary is absent', () => {
  const invoked = [];
  const spawnStub = (cmd, args) => {
    invoked.push([cmd, args]);
    if (cmd === 'git') return { status: 1 };
    if (cmd === 'gitleaks') return { error: new Error('ENOENT'), status: null };
    if (cmd === 'docker' && args[0] === 'info') return { status: 0 };
    if (cmd === 'docker' && args[0] === 'run') return { status: 0 };
    throw new Error(`Unexpected command: ${cmd}`);
  };

  const exitCode = runPreCommit({
    repoRoot: REPO_ROOT,
    spawn: spawnStub,
  });

  assert.equal(exitCode, 0);
  const dockerRun = invoked.find(([cmd, args]) => cmd === 'docker' && args[0] === 'run');
  assert.ok(dockerRun);
  assert.ok(dockerRun[1].includes(GITLEAKS_DOCKER_IMAGE));
  assert.ok(dockerRun[1].includes('--pre-commit'));
  assert.ok(dockerRun[1].includes('--staged'));
  assert.ok(dockerRun[1].includes('/repo/.gitleaks.toml'));
});

test('runPreCommit fails closed when neither gitleaks nor running Docker is available', () => {
  const stderr = createCaptureStream();
  const spawnStub = (cmd) => {
    if (cmd === 'git') return { status: 1 };
    return { error: new Error('unavailable'), status: 1 };
  };

  const exitCode = runPreCommit({
    repoRoot: REPO_ROOT,
    spawn: spawnStub,
    stderr: stderr.stream,
  });

  assert.equal(exitCode, 1);
  assert.match(stderr.read(), /Khong tim thay `gitleaks`/);
});

test('buildScannerCommand omits --config when .gitleaks.toml is absent', () => {
  const cmd = buildScannerCommand('/tmp/repo', {
    hasNativeGitleaks: true,
    hasRunningDocker: false,
    hasConfig: false,
  });
  assert.equal(cmd.args.includes('--config'), false);
});

test('runCommitMsg reports missing commitlint dependency cleanly', () => {
  const stderr = createCaptureStream();
  const exitCode = runCommitMsg({
    commitMsgFile: 'COMMIT_EDITMSG',
    repoRoot: REPO_ROOT,
    resolveModule: () => {
      const err = new Error('missing');
      err.code = 'MODULE_NOT_FOUND';
      throw err;
    },
    stderr: stderr.stream,
  });

  assert.equal(exitCode, 1);
  assert.match(stderr.read(), /pnpm install --frozen-lockfile/);
});

test('runCommitMsg validates real commit messages using commitlint.config.cjs', () => {
  const directory = mkdtempSync(path.join(tmpdir(), 'agrivision-hook-msg-'));
  const msgFile = path.join(directory, 'COMMIT_EDITMSG');
  try {
    writeFileSync(msgFile, 'chore(ci): AGRI-145 add local git hooks\n', 'utf8');
    const ok = runCommitMsg({ commitMsgFile: msgFile, repoRoot: REPO_ROOT });
    assert.equal(ok, 0);

    writeFileSync(msgFile, 'feat: missing jira key\n', 'utf8');
    const stderr = createCaptureStream();
    const bad = runCommitMsg({
      commitMsgFile: msgFile,
      repoRoot: REPO_ROOT,
      stderr: stderr.stream,
    });
    assert.equal(bad, 1);
    assert.match(stderr.read(), /AGRI-XXX/);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test('git commit invokes .githooks/pre-commit and .githooks/commit-msg end-to-end', () => {
  const directory = mkdtempSync(path.join(tmpdir(), 'agrivision-hook-git-'));
  const git = (...args) =>
    spawnSync('git', args, { cwd: directory, encoding: 'utf8' });
  try {
    execFileSync('git', ['init', '--initial-branch=main'], { cwd: directory });
    execFileSync('git', ['config', 'user.name', 'Hook Test'], { cwd: directory });
    execFileSync('git', ['config', 'user.email', 'hook-test@example.invalid'], {
      cwd: directory,
    });
    execFileSync('git', ['config', 'commit.gpgsign', 'false'], { cwd: directory });
    execFileSync(
      'git',
      ['config', 'core.hooksPath', path.join(REPO_ROOT, '.githooks')],
      { cwd: directory },
    );

    const rejected = git('commit', '--allow-empty', '-m', 'bad message');
    assert.notEqual(rejected.status, 0, rejected.stdout + rejected.stderr);

    const accepted = git(
      'commit',
      '--allow-empty',
      '-m',
      'chore(ci): AGRI-145 verify git hooks',
    );
    assert.equal(accepted.status, 0, accepted.stdout + accepted.stderr);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
