import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as path from 'path';

const mocks = vi.hoisted(() => ({
  app: {
    isPackaged: false,
    getAppPath: vi.fn(() => 'C:\\repo'),
  },
  existsSync: vi.fn(),
  getCliPathFromModules: vi.fn(),
  getLocalNodeModulesDir: vi.fn(() => 'C:\\local\\node_modules'),
  isLocalInstallReady: vi.fn(() => false),
  getGlobalNodeModules: vi.fn(() => 'C:\\global\\node_modules'),
}));

vi.mock('electron', () => ({ app: mocks.app }));
vi.mock('fs', () => ({ existsSync: mocks.existsSync }));
vi.mock('./SdkBootstrap', () => ({
  getCliPathFromModules: mocks.getCliPathFromModules,
  getLocalNodeModulesDir: mocks.getLocalNodeModulesDir,
  isLocalInstallReady: mocks.isLocalInstallReady,
}));
vi.mock('./SdkDiscovery', () => ({
  getGlobalNodeModules: mocks.getGlobalNodeModules,
}));

import { resolveNodeModulesDir } from './sdkPaths';

describe('resolveNodeModulesDir', () => {
  let cwdSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.app.isPackaged = false;
    mocks.app.getAppPath.mockReturnValue(path.join('C:', 'repo'));
    cwdSpy = vi.spyOn(process, 'cwd').mockReturnValue(path.join('C:', 'repo'));
  });

  afterEach(() => {
    cwdSpy.mockRestore();
  });

  it('uses packaged local install when the app is packaged', () => {
    mocks.app.isPackaged = true;
    mocks.isLocalInstallReady.mockReturnValue(true);

    expect(resolveNodeModulesDir()).toBe(path.join('C:', 'local', 'node_modules'));
    expect(mocks.getGlobalNodeModules).not.toHaveBeenCalled();
  });

  it('prefers repo-local node_modules in dev mode', () => {
    const localModulesDir = path.join('C:', 'repo', 'node_modules');
    mocks.existsSync.mockImplementation((candidate) => (
      candidate === path.join(localModulesDir, '@github', 'copilot-sdk', 'package.json')
    ));
    mocks.getCliPathFromModules.mockImplementation((candidate) => (
      candidate === localModulesDir ? path.join(candidate, '@github', 'copilot', 'npm-loader.js') : null
    ));

    expect(resolveNodeModulesDir()).toBe(localModulesDir);
    expect(mocks.getGlobalNodeModules).not.toHaveBeenCalled();
  });

  it('falls back to global node_modules when dev local SDK is unavailable', () => {
    mocks.existsSync.mockReturnValue(false);
    mocks.getCliPathFromModules.mockReturnValue(null);

    expect(resolveNodeModulesDir()).toBe(path.join('C:', 'global', 'node_modules'));
  });
});
