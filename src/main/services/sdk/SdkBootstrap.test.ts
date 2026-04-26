import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as path from 'path';

const { mockApp, mockExistsSync, mockReadFileSync } = vi.hoisted(() => ({
  mockApp: { isPackaged: true, getPath: vi.fn(() => 'C:\\userData') },
  mockExistsSync: vi.fn(),
  mockReadFileSync: vi.fn(),
}));

vi.mock('electron', () => ({ app: mockApp }));

vi.mock('fs', () => ({
  existsSync: mockExistsSync,
  readFileSync: mockReadFileSync,
  mkdirSync: vi.fn(),
  writeFileSync: vi.fn(),
  rmSync: vi.fn(),
  chmodSync: vi.fn(),
}));

import {
  getInstalledSdkVersion,
  isLocalInstallReady,
  getLocalNodeModulesDir,
} from './SdkBootstrap';

describe('SdkBootstrap version checks', () => {
  const sdkPkg = path.join(getLocalNodeModulesDir(), '@github', 'copilot-sdk', 'package.json');
  const cliFlat = path.join(getLocalNodeModulesDir(), '@github', 'copilot', 'npm-loader.js');

  beforeEach(() => {
    vi.clearAllMocks();
    mockExistsSync.mockReturnValue(false);
  });

  it('returns null when no SDK is installed', () => {
    expect(getInstalledSdkVersion()).toBeNull();
  });

  it('returns the installed version when present', () => {
    mockExistsSync.mockImplementation((p) => String(p) === sdkPkg);
    mockReadFileSync.mockReturnValue(JSON.stringify({ version: '0.3.1' }));
    expect(getInstalledSdkVersion()).toBe('0.3.1');
  });

  it('treats a stale 0.2.x install as not ready', () => {
    mockExistsSync.mockImplementation((p) => String(p) === sdkPkg || String(p) === cliFlat);
    mockReadFileSync.mockReturnValue(JSON.stringify({ version: '0.2.2' }));
    expect(isLocalInstallReady()).toBe(false);
  });

  it('treats a matching 0.3.x install as ready', () => {
    mockExistsSync.mockImplementation((p) => String(p) === sdkPkg || String(p) === cliFlat);
    mockReadFileSync.mockReturnValue(JSON.stringify({ version: '0.3.0' }));
    expect(isLocalInstallReady()).toBe(true);
  });

  it('treats an unrelated major as not ready', () => {
    mockExistsSync.mockImplementation((p) => String(p) === sdkPkg || String(p) === cliFlat);
    mockReadFileSync.mockReturnValue(JSON.stringify({ version: '1.0.0' }));
    expect(isLocalInstallReady()).toBe(false);
  });
});
