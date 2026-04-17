import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Boundary test — enforces that `src/main/rpc/**` does not import from
 * 'electron'. This keeps the RPC layer server-safe so a future extraction
 * into `apps/server` is a `git mv`, not a rewrite.
 *
 * The ESLint override in `.eslintrc.json` catches this at lint time. This
 * test catches it at test time — belt and suspenders, since a lint waiver
 * shouldn't be able to rot the boundary.
 */
describe('rpc electron-import boundary', () => {
  const RPC_DIR = join(__dirname);

  function walk(dir: string, acc: string[] = []): string[] {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) walk(full, acc);
      else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx'))) {
        acc.push(full);
      }
    }
    return acc;
  }

  it('no file in src/main/rpc imports from electron', () => {
    const files = walk(RPC_DIR);
    expect(files.length).toBeGreaterThan(0);

    // Match real import/require statements at the start of a line — not
    // prose in comments or strings.
    const IMPORT_RE = /^\s*(?:import\b[^;\n]*\bfrom\s+['"]electron['"]|(?:const|let|var)\b[^;\n]*=\s*require\(\s*['"]electron['"]\s*\))/m;
    const offenders: string[] = [];
    for (const file of files) {
      // Skip test files: they may legitimately mock electron APIs.
      if (file.endsWith('.test.ts') || file.endsWith('.test.tsx')) continue;
      const src = readFileSync(file, 'utf8');
      if (IMPORT_RE.test(src)) offenders.push(file);
    }

    expect(
      offenders,
      `The following files in src/main/rpc/ import from 'electron':\n${offenders.join('\n')}\n\n` +
        'src/main/rpc must remain transport-agnostic. Move electron-specific concerns to src/main/ipc/.',
    ).toEqual([]);
  });
});
