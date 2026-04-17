import { describe, it, expect } from 'vitest';
import {
  JSON_RPC_ERROR,
  parseInbound,
  encodeResult,
  encodeError,
  encodeNotification,
} from './jsonRpc';

describe('jsonRpc envelope', () => {
  describe('parseInbound', () => {
    it('parses a valid request', () => {
      const msg = parseInbound(JSON.stringify({
        jsonrpc: '2.0', id: 1, method: 'chat:send', params: { mindId: 'm1' },
      }));
      expect(msg.kind).toBe('request');
      if (msg.kind === 'request') {
        expect(msg.value.id).toBe(1);
        expect(msg.value.method).toBe('chat:send');
      }
    });

    it('parses a request with null id', () => {
      const msg = parseInbound(JSON.stringify({ jsonrpc: '2.0', id: null, method: 'ping' }));
      expect(msg.kind).toBe('request');
      if (msg.kind === 'request') expect(msg.value.id).toBeNull();
    });

    it('parses a request with string id', () => {
      const msg = parseInbound(JSON.stringify({ jsonrpc: '2.0', id: 'abc', method: 'ping' }));
      expect(msg.kind).toBe('request');
    });

    it('parses a notification (no id field)', () => {
      const msg = parseInbound(JSON.stringify({ jsonrpc: '2.0', method: 'chat:event' }));
      expect(msg.kind).toBe('notification');
    });

    it('distinguishes notification from request even when id is explicitly null', () => {
      // Per spec, `{id: null}` is a request (a response can be correlated).
      // An omitted id means notification.
      const withNullId = parseInbound(JSON.stringify({ jsonrpc: '2.0', id: null, method: 'x' }));
      const withoutId = parseInbound(JSON.stringify({ jsonrpc: '2.0', method: 'x' }));
      expect(withNullId.kind).toBe('request');
      expect(withoutId.kind).toBe('notification');
    });

    it('returns parse-error for non-JSON input', () => {
      const msg = parseInbound('not json');
      expect(msg.kind).toBe('parse-error');
    });

    it('returns invalid-request for array top-level (batch not supported in Phase 2)', () => {
      const msg = parseInbound('[{"jsonrpc":"2.0","id":1,"method":"x"}]');
      expect(msg.kind).toBe('invalid-request');
    });

    it('returns invalid-request when jsonrpc version missing', () => {
      const msg = parseInbound(JSON.stringify({ id: 1, method: 'x' }));
      expect(msg.kind).toBe('invalid-request');
      if (msg.kind === 'invalid-request') expect(msg.id).toBe(1);
    });

    it('returns invalid-request when method missing on a request', () => {
      const msg = parseInbound(JSON.stringify({ jsonrpc: '2.0', id: 1 }));
      expect(msg.kind).toBe('invalid-request');
      if (msg.kind === 'invalid-request') expect(msg.id).toBe(1);
    });

    it('preserves id on invalid-request when id is usable', () => {
      const msg = parseInbound(JSON.stringify({ jsonrpc: '1.0', id: 42, method: 'x' }));
      expect(msg.kind).toBe('invalid-request');
      if (msg.kind === 'invalid-request') expect(msg.id).toBe(42);
    });

    it('sets id to null on invalid-request when id itself is malformed', () => {
      const msg = parseInbound(JSON.stringify({ jsonrpc: '2.0', id: { weird: true }, method: 'x' }));
      expect(msg.kind).toBe('invalid-request');
      if (msg.kind === 'invalid-request') expect(msg.id).toBeNull();
    });
  });

  describe('encoders', () => {
    it('encodeResult produces spec-shaped success response', () => {
      const s = encodeResult(7, { ok: true });
      expect(JSON.parse(s)).toEqual({ jsonrpc: '2.0', id: 7, result: { ok: true } });
    });

    it('encodeError omits data when not provided', () => {
      const s = encodeError(7, JSON_RPC_ERROR.METHOD_NOT_FOUND, 'nope');
      expect(JSON.parse(s)).toEqual({
        jsonrpc: '2.0', id: 7, error: { code: -32601, message: 'nope' },
      });
    });

    it('encodeError includes data when provided', () => {
      const s = encodeError(null, JSON_RPC_ERROR.INVALID_PARAMS, 'bad', { issues: [] });
      expect(JSON.parse(s)).toEqual({
        jsonrpc: '2.0', id: null,
        error: { code: -32602, message: 'bad', data: { issues: [] } },
      });
    });

    it('encodeNotification omits params when not provided', () => {
      const s = encodeNotification('ping');
      expect(JSON.parse(s)).toEqual({ jsonrpc: '2.0', method: 'ping' });
    });

    it('encodeNotification includes params when provided', () => {
      const s = encodeNotification('chat:event', { mindId: 'm1' });
      expect(JSON.parse(s)).toEqual({ jsonrpc: '2.0', method: 'chat:event', params: { mindId: 'm1' } });
    });
  });

  describe('error code constants', () => {
    it('matches the JSON-RPC 2.0 spec', () => {
      expect(JSON_RPC_ERROR.PARSE_ERROR).toBe(-32700);
      expect(JSON_RPC_ERROR.INVALID_REQUEST).toBe(-32600);
      expect(JSON_RPC_ERROR.METHOD_NOT_FOUND).toBe(-32601);
      expect(JSON_RPC_ERROR.INVALID_PARAMS).toBe(-32602);
      expect(JSON_RPC_ERROR.INTERNAL_ERROR).toBe(-32603);
    });
  });
});
