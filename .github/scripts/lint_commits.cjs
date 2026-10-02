// Exclude legacy history while enforcing the existing rules on new content commits.
const { execFileSync, spawnSync } = require('node:child_process');

const { COMMITLINT_BASELINE, BASE_SHA, HEAD_SHA = 'HEAD' } = process.env;
if (!COMMITLINT_BASELINE) {
  throw new Error('COMMITLINT_BASELINE must identify the last exempt legacy commit');
}

const revisions = [HEAD_SHA, `^${COMMITLINT_BASELINE}`];
if (BASE_SHA && !/^0+$/.test(BASE_SHA)) {
  revisions.push(`^${BASE_SHA}`);
}
const commits = execFileSync('git', ['rev-list', '--reverse', '--no-merges', ...revisions], {
  encoding: 'utf8',
}).trim().split('\n').filter(Boolean);

console.log(`Checking ${commits.length} new content commit(s); legacy baseline: ${COMMITLINT_BASELINE}`);
let failed = false;
for (const commit of commits) {
  const message = execFileSync('git', ['show', '-s', '--format=%B', commit], { encoding: 'utf8' });
  console.log(`Checking ${commit}`);
  const result = spawnSync(process.execPath, [require.resolve('@commitlint/cli/cli.js'), '--verbose'], {
    input: message,
    encoding: 'utf8',
  });
  if (result.error) throw result.error;
  process.stdout.write(result.stdout);
  process.stderr.write(result.stderr);
  if (result.status !== 0) failed = true;
}
process.exitCode = failed ? 1 : 0;
