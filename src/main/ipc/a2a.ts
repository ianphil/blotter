import { ipcMain, BrowserWindow } from 'electron';
import type { EventEmitter } from 'events';
import type { AgentCardRegistry } from '../services/a2a/AgentCardRegistry';
import type { TaskManager } from '../services/a2a/TaskManager';
import type { TaskStatusUpdateEvent, TaskArtifactUpdateEvent } from '../services/a2a/types';
import { withValidation } from './withValidation';
import {
  A2aCancelTaskArgs,
  A2aGetTaskArgs,
  A2aListAgentsArgs,
  A2aListTasksArgs,
} from '../../contracts/a2a';

export function setupA2AIPC(
  ipcEmitter: EventEmitter,
  agentCardRegistry: AgentCardRegistry,
  taskManager: TaskManager,
): void {
  // Forward a2a:incoming events to all renderer windows
  ipcEmitter.on('a2a:incoming', (payload) => {
    for (const win of BrowserWindow.getAllWindows()) {
      win.webContents.send('a2a:incoming', payload);
    }
  });

  // Forward A2A chat events (streaming from target agent) to all renderer windows
  ipcEmitter.on('a2a:chat-event', (payload: { mindId: string; messageId: string; event: unknown }) => {
    for (const win of BrowserWindow.getAllWindows()) {
      win.webContents.send('chat:event', payload.mindId, payload.messageId, payload.event);
    }
  });

  // Forward task events to all renderer windows
  ipcEmitter.on('task:status-update', (payload: TaskStatusUpdateEvent) => {
    for (const win of BrowserWindow.getAllWindows()) {
      win.webContents.send('a2a:task-status-update', payload);
    }
  });

  ipcEmitter.on('task:artifact-update', (payload: TaskArtifactUpdateEvent) => {
    for (const win of BrowserWindow.getAllWindows()) {
      win.webContents.send('a2a:task-artifact-update', payload);
    }
  });

  ipcMain.handle(
    'a2a:listAgents',
    withValidation('a2a:listAgents', A2aListAgentsArgs, async () => agentCardRegistry.getCards()),
  );

  ipcMain.handle(
    'a2a:getTask',
    withValidation('a2a:getTask', A2aGetTaskArgs, async (_event, taskId, historyLength) => {
      return taskManager.getTask(taskId, historyLength);
    }),
  );

  ipcMain.handle(
    'a2a:listTasks',
    withValidation('a2a:listTasks', A2aListTasksArgs, async (_event, filter) => {
      return taskManager.listTasks(filter);
    }),
  );

  ipcMain.handle(
    'a2a:cancelTask',
    withValidation('a2a:cancelTask', A2aCancelTaskArgs, async (_event, taskId) => {
      return taskManager.cancelTask(taskId);
    }),
  );
}
