import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { execSync } from 'node:child_process';
import { OUTBOUND_CHANNELS } from './outboundRegistry';

/**
 * Exhaustive outbound-channel coverage test.
 *
 * Scans every `webContents.send(...)` call site under `src/main/` and asserts
 * the channel string is registered in `outboundRegistry.ts`. One missed
 * registration = silent divergence between IPC and WS payload shapes.
 *
 * Mirrors the invariant-style of `src/main/ipc/coverage.test.ts`.
 */
describe('outbound channel coverage', () => {
  const REPO_ROOT = join(__dirname, '..', '..', '..');
  const SRC_MAIN = join(REPO_ROOT, 'src', 'main');

  function listMainSourceFiles(): string[] {
    const out = execSync('git ls-files src/main', { cwd: REPO_ROOT, encoding: 'utf8' });
    return out
      .split(/\r?\n/)
      .filter((f) => f.endsWith('.ts') && !f.endsWith('.test.ts'))
      .map((f) => join(REPO_ROOT, f));
  }

  function collectChannels(file: string): string[] {
    const src = readFileSync(file, 'utf8');
    const channels: string[] = [];
    // match: .webContents.send('channel', ...) or .webContents.send("channel", ...)
    const re = /webContents\.send\(\s*['"]([^'"]+)['"]/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(src)) !== null) {
      channels.push(m[1]);
    }
    return channels;
  }

  it('every webContents.send channel is registered in outboundRegistry', () => {
    const files = listMainSourceFiles();
    expect(files.length).toBeGreaterThan(0);

    const missing: { file: string; channel: string }[] = [];
    for (const file of files) {
      // Skip the registry itself and this test file
      if (file.endsWith('outboundRegistry.ts') || file.endsWith('outboundRegistry.coverage.test.ts')) continue;
      for (const channel of collectChannels(file)) {
        if (!OUTBOUND_CHANNELS.includes(channel)) {
          missing.push({ file: file.replace(SRC_MAIN, 'src/main'), channel });
        }
      }
    }

    expect(
      missing,
      `Unregistered push channels found:\n${missing
        .map((m) => `  ${m.file}: '${m.channel}'`)
        .join('\n')}\n\nAdd them to src/main/rpc/outboundRegistry.ts and src/contracts/outbound.ts.`,
    ).toEqual([]);
  });

  it('registry contains expected channels', () => {
    // Sanity — guards against accidental deletion from the registry.
    const expected = [
      'chat:event',
      'mind:changed',
      'auth:progress',
      'auth:loggedOut',
      'auth:accountSwitchStarted',
      'auth:accountSwitched',
      'genesis:progress',
      'chatroom:event',
      'a2a:incoming',
      'a2a:task-status-update',
      'a2a:task-artifact-update',
    ];
    for (const channel of expected) {
      expect(OUTBOUND_CHANNELS).toContain(channel);
    }
  });
});
