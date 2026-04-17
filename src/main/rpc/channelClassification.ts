// Channel classification — portable vs electron-only.
//
// PORTABLE channels have pure business-logic handlers that can run in any
// environment (Electron main, an apps/server process, tests). Both transports
// (IPC and WS) fully support them.
//
// ELECTRON_ONLY channels need Electron-specific APIs (dialog, shell,
// BrowserWindow creation, window controls). They're registered on the
// dispatcher for discoverability, but the WS transport returns -32601
// (METHOD_NOT_FOUND) when a remote client calls them — no amount of
// JSON-RPC plumbing can pop a native file picker on a remote machine.
//
// Adding a new channel? Decide portable vs electron-only up-front and list
// it here. The dispatcher + WS server consult this table.

export const ELECTRON_ONLY_CHANNELS: ReadonlySet<string> = new Set([
  // dialog.showOpenDialog
  'mind:selectDirectory',
  'genesis:pickPath',

  // BrowserWindow creation for popout
  'mind:openWindow',

  // shell.openExternal
  'auth:startLogin',

  // window controls (ipcMain.on)
  'window:minimize',
  'window:maximize',
  'window:close',
]);

export function isElectronOnlyChannel(channel: string): boolean {
  return ELECTRON_ONLY_CHANNELS.has(channel);
}
