const { spawnSync } = require('node:child_process');
const path = require('node:path');

function resolveCommitlintCli(resolveModule = require.resolve) {
  try {
    return resolveModule('@commitlint/cli/cli.js');
  } catch (error) {
    if (error && error.code === 'MODULE_NOT_FOUND') {
      return null;
    }
    throw error;
  }
}

/**
 * Validates the pending commit message file against `commitlint.config.cjs`.
 */
function runCommitMsg(options = {}) {
  const commitMsgFile = options.commitMsgFile ?? process.argv[2];
  const repoRoot = options.repoRoot ?? path.resolve(__dirname, '..');
  const spawn = options.spawn ?? spawnSync;
  const resolveModule = options.resolveModule ?? require.resolve;
  const stderr = options.stderr ?? process.stderr;

  if (!commitMsgFile) {
    stderr.write('[commit-msg] Thieu duong dan file commit message.\n');
    return 1;
  }

  const commitlintCli = resolveCommitlintCli(resolveModule);
  if (!commitlintCli) {
    stderr.write(
      '[commit-msg] Chua cai @commitlint/cli o root. Hay chay: pnpm install --frozen-lockfile\n',
    );
    return 1;
  }

  const configPath = path.resolve(repoRoot, 'commitlint.config.cjs');
  const resolvedMsgFile = path.resolve(commitMsgFile);
  const result = spawn(
    process.execPath,
    [commitlintCli, '--config', configPath, '--edit', resolvedMsgFile],
    {
      cwd: repoRoot,
      stdio: 'inherit',
    },
  );

  if (result.error) {
    stderr.write(`[commit-msg] Khong the chay commitlint: ${result.error.message}\n`);
    return 1;
  }

  if (result.status !== 0) {
    stderr.write(
      '[commit-msg] Commit message chua dung quy tac du an: <type>(<optional-scope>): AGRI-XXX <short-description>\n',
    );
    return result.status ?? 1;
  }

  return 0;
}

if (require.main === module) {
  process.exitCode = runCommitMsg();
}

module.exports = {
  resolveCommitlintCli,
  runCommitMsg,
};
