import { ipcMain, BrowserWindow } from 'electron';
import type { ChatroomService } from '../services/chatroom/ChatroomService';
import { withValidation } from './withValidation';
import {
  ChatroomClearArgs,
  ChatroomHistoryArgs,
  ChatroomSendArgs,
  ChatroomStopArgs,
} from '../../contracts/chatroom';

export function setupChatroomIPC(chatroomService: ChatroomService): void {
  ipcMain.handle(
    'chatroom:send',
    withValidation('chatroom:send', ChatroomSendArgs, async (_event, message, model) => {
      await chatroomService.broadcast(message, model);
    }),
  );

  ipcMain.handle(
    'chatroom:history',
    withValidation('chatroom:history', ChatroomHistoryArgs, async () => {
      return chatroomService.getHistory();
    }),
  );

  ipcMain.handle(
    'chatroom:clear',
    withValidation('chatroom:clear', ChatroomClearArgs, async () => {
      await chatroomService.clearHistory();
    }),
  );

  ipcMain.handle(
    'chatroom:stop',
    withValidation('chatroom:stop', ChatroomStopArgs, async () => {
      chatroomService.stopAll();
    }),
  );

  // Forward chatroom streaming events to all renderer windows
  chatroomService.on('chatroom:event', (event) => {
    for (const win of BrowserWindow.getAllWindows()) {
      if (!win.isDestroyed()) {
        win.webContents.send('chatroom:event', event);
      }
    }
  });
}
