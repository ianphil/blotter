import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('electron', () => ({
  ipcMain: { on: vi.fn() },
}));

import { ipcMain } from 'electron';
import { setupWindowIPC } from './window';

type OnCall = [string, (event: unknown, ...args: unknown[]) => void];

function getListener(channel: string): (event: unknown, ...args: unknown[]) => void {
  const calls = vi.mocked(ipcMain.on).mock.calls as OnCall[];
  const match = calls.find((c) => c[0] === channel);
  if (!match) throw new Error(`No listener registered for ${channel}`);
  return match[1];
}

describe('Window IPC', () => {
  let win: {
    minimize: ReturnType<typeof vi.fn>;
    maximize: ReturnType<typeof vi.fn>;
    unmaximize: ReturnType<typeof vi.fn>;
    close: ReturnType<typeof vi.fn>;
    isMaximized: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    win = {
      minimize: vi.fn(),
      maximize: vi.fn(),
      unmaximize: vi.fn(),
      close: vi.fn(),
      isMaximized: vi.fn(() => false),
    };
    setupWindowIPC(() => win as unknown as Electron.BrowserWindow);
  });

  it('minimize invokes minimize()', () => {
    getListener('window:minimize')({});
    expect(win.minimize).toHaveBeenCalled();
  });

  it('maximize toggles: maximizes when not maximized', () => {
    getListener('window:maximize')({});
    expect(win.maximize).toHaveBeenCalled();
    expect(win.unmaximize).not.toHaveBeenCalled();
  });

  it('maximize toggles: unmaximizes when already maximized', () => {
    win.isMaximized.mockReturnValue(true);
    getListener('window:maximize')({});
    expect(win.unmaximize).toHaveBeenCalled();
    expect(win.maximize).not.toHaveBeenCalled();
  });

  it('close invokes close()', () => {
    getListener('window:close')({});
    expect(win.close).toHaveBeenCalled();
  });

  it('invalid extra args are logged and dropped (no action taken)', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    getListener('window:minimize')({}, 'extra');
    expect(win.minimize).not.toHaveBeenCalled();
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it('tolerates missing main window', () => {
    vi.clearAllMocks();
    vi.mocked(ipcMain.on).mockClear();
    setupWindowIPC(() => null);
    expect(() => getListener('window:close')({})).not.toThrow();
  });
});
