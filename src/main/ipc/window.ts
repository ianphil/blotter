import { ipcMain, type BrowserWindow } from 'electron';
import { withValidationOn } from './withValidation';
import {
  WindowCloseArgs,
  WindowMaximizeArgs,
  WindowMinimizeArgs,
} from '../../contracts/window';

/**
 * Wires window:* control channels. These use `ipcMain.on` (send, not invoke),
 * so invalid payloads are logged and dropped rather than rejected.
 */
export function setupWindowIPC(getMainWindow: () => BrowserWindow | null): void {
  ipcMain.on(
    'window:minimize',
    withValidationOn('window:minimize', WindowMinimizeArgs, () => {
      getMainWindow()?.minimize();
    }),
  );

  ipcMain.on(
    'window:maximize',
    withValidationOn('window:maximize', WindowMaximizeArgs, () => {
      const win = getMainWindow();
      if (!win) return;
      if (win.isMaximized()) win.unmaximize();
      else win.maximize();
    }),
  );

  ipcMain.on(
    'window:close',
    withValidationOn('window:close', WindowCloseArgs, () => {
      getMainWindow()?.close();
    }),
  );
}
