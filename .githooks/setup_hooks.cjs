const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const HOOK_FILES = ['pre-commit', 'commit-msg'];

function isCiEnvironment(env = process.env) {
  const value = env.CI;
  return Boolean(value && value !== '0' && value.toLowerCase() !== 'false');
}

/**
 * Configures Git to use the tracked `.githooks` directory and ensures hook shims
 * remain executable on POSIX systems.
 */
function setupHooks(options = {}) {
  const repoRoot = options.repoRoot ?? path.resolve(__dirname, '..');
  const env = options.env ?? process.env;
  const platform = options.platform ?? process.platform;
  const fsImpl = options.fs ?? fs;
  const execGit =
    options.execGit ??
    ((args) => execFileSync('git', args, { cwd: repoRoot, stdio: 'inherit' }));
  const verbose = options.verbose ?? process.argv.includes('--verbose');
  const stdout = options.stdout ?? process.stdout;

  if (isCiEnvironment(env)) {
    return { configured: false, reason: 'ci' };
  }

  if (!fsImpl.existsSync(path.join(repoRoot, '.git'))) {
    return { configured: false, reason: 'no-git' };
  }

  execGit(['config', 'core.hooksPath', '.githooks']);

  if (platform !== 'win32') {
    for (const fileName of HOOK_FILES) {
      const hookPath = path.join(repoRoot, '.githooks', fileName);
      if (fsImpl.existsSync(hookPath)) {
        fsImpl.chmodSync(hookPath, 0o755);
      }
    }
  }

  if (verbose) {
    stdout.write('[hooks] Configured git core.hooksPath -> .githooks\n');
  }

  return { configured: true, reason: 'ok' };
}

if (require.main === module) {
  setupHooks();
}

module.exports = {
  HOOK_FILES,
  isCiEnvironment,
  setupHooks,
};
