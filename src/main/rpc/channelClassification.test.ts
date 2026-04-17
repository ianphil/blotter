import { describe, it, expect } from 'vitest';
import { ELECTRON_ONLY_CHANNELS, isElectronOnlyChannel } from './channelClassification';

describe('channelClassification', () => {
  it('marks dialog-using channels as electron-only', () => {
    expect(isElectronOnlyChannel('mind:selectDirectory')).toBe(true);
    expect(isElectronOnlyChannel('genesis:pickPath')).toBe(true);
  });

  it('marks shell-using channels as electron-only', () => {
    expect(isElectronOnlyChannel('auth:startLogin')).toBe(true);
  });

  it('marks BrowserWindow-creating channels as electron-only', () => {
    expect(isElectronOnlyChannel('mind:openWindow')).toBe(true);
  });

  it('marks window:* controls as electron-only', () => {
    expect(isElectronOnlyChannel('window:minimize')).toBe(true);
    expect(isElectronOnlyChannel('window:maximize')).toBe(true);
    expect(isElectronOnlyChannel('window:close')).toBe(true);
  });

  it('portable channels are not flagged', () => {
    expect(isElectronOnlyChannel('chat:send')).toBe(false);
    expect(isElectronOnlyChannel('mind:list')).toBe(false);
    expect(isElectronOnlyChannel('auth:getStatus')).toBe(false);
    expect(isElectronOnlyChannel('chatroom:send')).toBe(false);
  });

  it('ELECTRON_ONLY_CHANNELS has no duplicates', () => {
    // Set-based so duplicates are impossible, but sanity-check the literal
    // list isn't hiding a typo via deduplication.
    expect(ELECTRON_ONLY_CHANNELS.size).toBe(7);
  });
});
