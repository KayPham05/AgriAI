const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const GITLEAKS_DOCKER_IMAGE = 'ghcr.io/gitleaks/gitleaks:v8.24.2';
const GITLEAKS_CONFIG_FILE = '.gitleaks.toml';

function hasStagedChanges(repoRoot, spawn = spawnSync) {
  const result = spawn('git', ['diff', '--cached', '--quiet', '--exit-code'], {
    cwd: repoRoot,
    stdio: 'ignore',
  });

  if (result.error) {
    throw result.error;
  }
  if (result.status === 0) {
    return false;
  }
  if (result.status === 1) {
    return true;
  }

  throw new Error(`git diff --cached exited unexpectedly with code ${result.status}`);
}

function isCommandAvailable(command, args, spawn = spawnSync) {
  const result = spawn(command, args, { stdio: 'ignore' });
  return !result.error && result.status === 0;
}

function buildScannerCommand(repoRoot, { hasNativeGitleaks, hasRunningDocker, hasConfig }) {
  const configPath = path.join(repoRoot, GITLEAKS_CONFIG_FILE);

  if (hasNativeGitleaks) {
    const args = ['git', repoRoot, '--pre-commit', '--staged'];
    if (hasConfig) {
      args.push('--config', configPath);
    }
    args.push('--no-banner', '--redact', '--verbose');
    return { mode: 'native', command: 'gitleaks', args };
  }

  if (hasRunningDocker) {
    const args = [
      'run',
      '--rm',
      '--volume',
      `${repoRoot}:/repo:ro`,
      GITLEAKS_DOCKER_IMAGE,
      'git',
      '/repo',
      '--pre-commit',
      '--staged',
    ];
    if (hasConfig) {
      args.push('--config', `/repo/${GITLEAKS_CONFIG_FILE}`);
    }
    args.push('--no-banner', '--redact', '--verbose');
    return { mode: 'docker', command: 'docker', args };
  }

  return null;
}

function resolveRepoRoot(spawn = spawnSync) {
  const result = spawn('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8' });
  if (!result.error && result.status === 0 && result.stdout) {
    return result.stdout.trim();
  }
  return path.resolve(__dirname, '..');
}

/**
 * Scans staged Git changes for secrets using local Gitleaks or the pinned CI
 * Docker image. Fails closed when no scanner is available.
 */
function runPreCommit(options = {}) {
  const spawn = options.spawn ?? spawnSync;
  const repoRoot = options.repoRoot ?? resolveRepoRoot(spawn);
  const fsImpl = options.fs ?? fs;
  const stderr = options.stderr ?? process.stderr;

  if (!hasStagedChanges(repoRoot, spawn)) {
    return 0;
  }

  const hasNativeGitleaks = isCommandAvailable('gitleaks', ['version'], spawn);
  const hasRunningDocker = hasNativeGitleaks
    ? false
    : isCommandAvailable('docker', ['info'], spawn);
  const hasConfig = fsImpl.existsSync(path.join(repoRoot, GITLEAKS_CONFIG_FILE));

  const scanner = buildScannerCommand(repoRoot, {
    hasNativeGitleaks,
    hasRunningDocker,
    hasConfig,
  });

  if (!scanner) {
    stderr.write(
      '[pre-commit] Khong tim thay `gitleaks` tren PATH va Docker daemon chua chay.\n' +
        `[pre-commit] Hay cai gitleaks (vd: winget install Gitleaks.Gitleaks) hoac bat Docker Desktop (image ${GITLEAKS_DOCKER_IMAGE}) roi commit lai.\n`,
    );
    return 1;
  }

  const result = spawn(scanner.command, scanner.args, {
    cwd: repoRoot,
    stdio: 'inherit',
  });

  if (result.error) {
    stderr.write(`[pre-commit] Khong the chay ${scanner.command}: ${result.error.message}\n`);
    return 1;
  }

  if (result.status !== 0) {
    stderr.write(
      '[pre-commit] Gitleaks phat hien nguy co lo secret/credential trong thay doi da stage. Commit da bi chan.\n',
    );
    return result.status ?? 1;
  }

  return 0;
}

if (require.main === module) {
  process.exitCode = runPreCommit();
}

module.exports = {
  GITLEAKS_CONFIG_FILE,
  GITLEAKS_DOCKER_IMAGE,
  buildScannerCommand,
  hasStagedChanges,
  isCommandAvailable,
  runPreCommit,
};
