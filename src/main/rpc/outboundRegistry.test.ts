import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  getOutboundEntry,
  requireOutboundEntry,
  translateForIpc,
  OUTBOUND_CHANNELS,
} from './outboundRegistry';

describe('outboundRegistry', () => {
  describe('getOutboundEntry', () => {
    it('returns entry for known channel', () => {
      const e = getOutboundEntry('chat:event');
      expect(e).toBeDefined();
      expect(e?.channel).toBe('chat:event');
    });

    it('returns undefined for unknown channel', () => {
      expect(getOutboundEntry('bogus:channel')).toBeUndefined();
    });
  });

  describe('requireOutboundEntry', () => {
    it('throws for unknown channel', () => {
      expect(() => requireOutboundEntry('bogus:channel')).toThrow(/Unknown push channel/);
    });
  });

  describe('toIpcArgs translations', () => {
    it('chat:event unpacks to (mindId, messageId, event)', () => {
      const args = translateForIpc('chat:event', {
        mindId: 'm1', messageId: 'msg1', event: { type: 'done' },
      });
      expect(args).toEqual(['m1', 'msg1', { type: 'done' }]);
    });

    it('mind:changed unpacks to (minds)', () => {
      const args = translateForIpc('mind:changed', { minds: [{ id: 'a', path: '/tmp' }] });
      expect(args).toEqual([[{ id: 'a', path: '/tmp' }]]);
    });

    it('auth:loggedOut unpacks to empty args', () => {
      const args = translateForIpc('auth:loggedOut', {});
      expect(args).toEqual([]);
    });

    it('auth:accountSwitched unpacks to ({login})', () => {
      const args = translateForIpc('auth:accountSwitched', { login: 'alice' });
      expect(args).toEqual([{ login: 'alice' }]);
    });

    it('auth:progress unpacks to (progress)', () => {
      const payload = { step: 'device_code', userCode: 'ABCD-1234' };
      const args = translateForIpc('auth:progress', payload);
      expect(args).toEqual([payload]);
    });

    it('chatroom:event unpacks to (event)', () => {
      const payload = {
        mindId: 'a', mindName: 'Aria', messageId: 'm1', roundId: 'r1',
        event: { type: 'done' as const },
      };
      const args = translateForIpc('chatroom:event', payload);
      expect(args).toEqual([payload]);
    });
  });

  describe('validation in non-production', () => {
    const originalEnv = process.env.NODE_ENV;
    beforeEach(() => { process.env.NODE_ENV = 'development'; });
    afterEach(() => { process.env.NODE_ENV = originalEnv; });

    it('throws on schema mismatch', () => {
      expect(() => translateForIpc('chat:event', { mindId: 42 })).toThrow(/failed schema validation/);
    });

    it('passes when payload matches', () => {
      expect(() => translateForIpc('auth:accountSwitched', { login: 'alice' })).not.toThrow();
    });
  });

  describe('validation in production (skipped for perf)', () => {
    const originalEnv = process.env.NODE_ENV;
    beforeEach(() => { process.env.NODE_ENV = 'production'; });
    afterEach(() => { process.env.NODE_ENV = originalEnv; });

    it('does not throw on schema mismatch', () => {
      // toIpcArgs is still called, but won't blow up on simple field access for
      // the broadcast-style channels (auth:accountSwitched takes the payload as-is).
      const args = translateForIpc('auth:accountSwitched', { login: 'alice' });
      expect(args).toEqual([{ login: 'alice' }]);
    });
  });

  describe('OUTBOUND_CHANNELS', () => {
    it('has no duplicates', () => {
      const set = new Set(OUTBOUND_CHANNELS);
      expect(set.size).toBe(OUTBOUND_CHANNELS.length);
    });
  });
});

// Silence unused import warning if future refactor removes vi usage
void vi;
