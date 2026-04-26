// SDK bootstrap — local install and shim generation for packaged builds.

import { app } from 'electron';
import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

const isWindows = process.platform === 'win32';

// Required SDK version. Bumped together with the `@github/copilot-sdk`
// dependency in the app's package.json. The packaged app caches the SDK in
// userData; we use this to detect stale caches and force a reinstall.
const REQUIRED_SDK_MAJOR = 0;
const REQUIRED_SDK_MINOR = 3;
const REQUIRED_SDK_SPEC = `@github/copilot-sdk@^${REQUIRED_SDK_MAJOR}.${REQUIRED_SDK_MINOR}.0`;

let bootstrapPromise: Promise<void> | null = null;

// ---------------------------------------------------------------------------
// Path helpers
// ---------------------------------------------------------------------------

export function getBootstrapDir(): string {
  return path.join(app.getPath('userData'), 'copilot');
}

export function getLocalNodeModulesDir(): string {
  return path.join(getBootstrapDir(), 'node_modules');
}

export function getBundledNodeRoot(): string | null {
  if (!app.isPackaged) return null;
  const root = path.join(process.resourcesPath, 'node');
  return fs.existsSync(root) ? root : null;
}

export function getBundledNodePath(): string | null {
  const root = getBundledNodeRoot();
  if (!root) return null;
  const p = isWindows
    ? path.join(root, 'node.exe')
    : path.join(root, 'bin', 'node');
  return fs.existsSync(p) ? p : null;
}

export function getBundledNpmCliPath(): string | null {
  const root = getBundledNodeRoot();
  if (!root) return null;
  const candidates = [
    path.join(root, 'node_modules', 'npm', 'bin', 'npm-cli.js'),
    path.join(root, 'lib', 'node_modules', 'npm', 'bin', 'npm-cli.js'),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return null;
}

export function getCliPathFromModules(modulesDir: string): string | null {
  const nestedCli = path.join(
    modulesDir, '@github', 'copilot-sdk', 'node_modules', '@github', 'copilot', 'npm-loader.js',
  );
  if (fs.existsSync(nestedCli)) return nestedCli;

  const flatCli = path.join(modulesDir, '@github', 'copilot', 'npm-loader.js');
  if (fs.existsSync(flatCli)) return flatCli;

  return null;
}

// ---------------------------------------------------------------------------
// Local (bootstrap) install — used in packaged builds
// ---------------------------------------------------------------------------

export function getInstalledSdkVersion(): string | null {
  const sdkPkg = path.join(getLocalNodeModulesDir(), '@github', 'copilot-sdk', 'package.json');
  if (!fs.existsSync(sdkPkg)) return null;
  try {
    const parsed = JSON.parse(fs.readFileSync(sdkPkg, 'utf-8')) as { version?: string };
    return typeof parsed.version === 'string' ? parsed.version : null;
  } catch {
    return null;
  }
}

function isInstalledSdkCompatible(): boolean {
  const version = getInstalledSdkVersion();
  if (!version) return false;
  const match = /^(\d+)\.(\d+)\./.exec(version);
  if (!match) return false;
  const major = Number(match[1]);
  const minor = Number(match[2]);
  if (major !== REQUIRED_SDK_MAJOR) return false;
  if (REQUIRED_SDK_MAJOR === 0) {
    // Pre-1.0 minors are breaking; require an exact minor match.
    return minor === REQUIRED_SDK_MINOR;
  }
  return minor >= REQUIRED_SDK_MINOR;
}

export function isLocalInstallReady(): boolean {
  if (!isInstalledSdkCompatible()) return false;
  return Boolean(getCliPathFromModules(getLocalNodeModulesDir()));
}

async function runNpmInstall(): Promise<void> {
  const nodePath = getBundledNodePath();
  const npmCliPath = getBundledNpmCliPath();
  if (!nodePath || !npmCliPath) {
    throw new Error('Bundled Node runtime not found. Please reinstall Chamber.');
  }

  const prefixDir = getBootstrapDir();
  const cacheDir = path.join(prefixDir, '.npm-cache');
  fs.mkdirSync(prefixDir, { recursive: true });

  await new Promise<void>((resolve, reject) => {
    const child = spawn(nodePath, [
      npmCliPath,
      'install',
      '--no-fund',
      '--no-audit',
      '--loglevel=warn',
      '--prefix', prefixDir,
      REQUIRED_SDK_SPEC,
    ], {
      env: {
        ...process.env,
        npm_config_prefix: prefixDir,
        npm_config_cache: cacheDir,
        npm_config_update_notifier: 'false',
      },
    });

    child.stdout.on('data', (d) => console.log('[SdkLoader]', d.toString().trim()));
    child.stderr.on('data', (d) => console.warn('[SdkLoader]', d.toString().trim()));
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`npm install exited with code ${code}`));
    });
  });
}

export function ensureCopilotShim(): void {
  const cliPath = getCliPathFromModules(getLocalNodeModulesDir());
  const nodePath = getBundledNodePath();
  if (!cliPath || !nodePath || !fs.existsSync(cliPath) || !fs.existsSync(nodePath)) return;

  const shimPath = path.join(getBootstrapDir(), isWindows ? 'copilot.cmd' : 'copilot');
  const shimContent = isWindows
    ? `@echo off\r\n"${nodePath}" "${cliPath}" %*\r\n`
    : `#!/bin/sh\n"${nodePath}" "${cliPath}" "$@"\n`;
  const existing = fs.existsSync(shimPath) ? fs.readFileSync(shimPath, 'utf-8') : null;
  if (existing === shimContent) return;

  fs.mkdirSync(getBootstrapDir(), { recursive: true });
  fs.writeFileSync(shimPath, shimContent, { encoding: 'utf-8' });
  if (!isWindows) fs.chmodSync(shimPath, 0o755);
}

export async function ensureSdkInstalled(): Promise<void> {
  if (!app.isPackaged) return; // dev mode — use the repo-local install only

  if (isLocalInstallReady()) {
    ensureCopilotShim();
    return;
  }

  if (bootstrapPromise) return bootstrapPromise;

  bootstrapPromise = (async () => {
    const installedVersion = getInstalledSdkVersion();
    if (installedVersion) {
      console.log(
        `[SdkLoader] Cached SDK ${installedVersion} is incompatible with required ${REQUIRED_SDK_SPEC}. Refreshing...`,
      );
      const githubScopeDir = path.join(getLocalNodeModulesDir(), '@github');
      if (fs.existsSync(githubScopeDir)) {
        fs.rmSync(githubScopeDir, { recursive: true, force: true });
      }
    } else {
      console.log('[SdkLoader] SDK not found locally — installing via bundled Node...');
    }
    await runNpmInstall();
    if (!isLocalInstallReady()) {
      throw new Error('SDK installation did not complete.');
    }
    ensureCopilotShim();
    console.log('[SdkLoader] SDK installed successfully.');
  })();

  try {
    await bootstrapPromise;
  } catch (err) {
    console.error('[SdkLoader] Install failed:', err);
    throw err;
  } finally {
    bootstrapPromise = null;
  }
}
