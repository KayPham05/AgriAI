// @vitest-environment node
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmdirSync, unlinkSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const frontendRoot = fileURLToPath(new URL('../../', import.meta.url));
const biomeCli = fileURLToPath(
  new URL('../../node_modules/@biomejs/biome/bin/biome', import.meta.url),
);

function lintSource(source: string, filePath: string) {
  const fixtureDirectory = mkdtempSync(join(frontendRoot, dirname(filePath), 'lint-probe-'));
  const fixtureFile = join(fixtureDirectory, 'Probe.tsx');
  try {
    writeFileSync(fixtureFile, `${source}\n`, 'utf8');
    const result = spawnSync(process.execPath, [biomeCli, 'lint', fixtureFile], {
      cwd: frontendRoot,
      encoding: 'utf8',
      timeout: 15_000,
    });
    if (result.error) throw result.error;
    return { status: result.status, output: result.stdout + result.stderr };
  } finally {
    // Remove only this test's new file and empty directory, never a source tree.
    unlinkSync(fixtureFile);
    rmdirSync(fixtureDirectory);
  }
}

describe('frontend lint boundaries', () => {
  it('rejects direct Radix imports outside the shared UI layer', () => {
    const result = lintSource('export { Dialog } from "radix-ui";', 'src/views/LintProbe.tsx');

    expect(result.output).toContain('lint/style/noRestrictedImports');
    expect(result.status).toBe(1);
  });

  it('allows Radix inside shared primitives and their consumers to use shadcn', () => {
    const primitiveResult = lintSource(
      'export { Dialog } from "radix-ui";',
      'src/components/ui/lint-probe.tsx',
    );
    const consumerResult = lintSource(
      'export { Dialog } from "@/components/ui/dialog";',
      'src/views/LintProbe.tsx',
    );

    expect(primitiveResult.status, primitiveResult.output).toBe(0);
    expect(consumerResult.status, consumerResult.output).toBe(0);
  });

  it('rejects a shared primitive importing application services', () => {
    const result = lintSource(
      'export * from "@/services/authApi";',
      'src/components/ui/lint-probe.tsx',
    );

    expect(result.output).toContain('lint/style/noRestrictedImports');
    expect(result.status).toBe(1);
  });

  it('reports conditional hooks instead of treating TypeScript as a linter', () => {
    const result = lintSource(
      'import { useState } from "react"; export function Probe({ active }: { active: boolean }) { if (active) { useState(0); } return null; }',
      'src/views/LintProbe.tsx',
    );

    expect(result.output).toContain('lint/correctness/useHookAtTopLevel');
    expect(result.status).toBe(1);
  });
});
