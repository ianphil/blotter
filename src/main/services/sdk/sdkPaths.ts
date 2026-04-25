// Shared SDK path resolution — used by both sdkImport and CopilotClientFactory

import { app } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import { getGlobalNodeModules } from './SdkDiscovery';
import { getCliPathFromModules, getLocalNodeModulesDir, isLocalInstallReady } from './SdkBootstrap';

function hasSdkInstall(modulesDir: string): boolean {
  return fs.existsSync(path.join(modulesDir, '@github', 'copilot-sdk', 'package.json'))
    && Boolean(getCliPathFromModules(modulesDir));
}

function getDevNodeModulesDir(): string | null {
  const candidates = [
    path.join(process.cwd(), 'node_modules'),
    typeof app.getAppPath === 'function'
      ? path.join(app.getAppPath(), 'node_modules')
      : null,
  ];

  for (const modulesDir of Array.from(new Set(candidates))) {
    if (!modulesDir) continue;
    if (hasSdkInstall(modulesDir)) return modulesDir;
  }

  return null;
}

export function resolveNodeModulesDir(): string {
  if (app.isPackaged && isLocalInstallReady()) {
    return getLocalNodeModulesDir();
  }
  const devModulesDir = getDevNodeModulesDir();
  if (devModulesDir) return devModulesDir;
  return getGlobalNodeModules();
}
