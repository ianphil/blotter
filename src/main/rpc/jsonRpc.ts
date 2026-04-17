// JSON-RPC 2.0 envelope — transport-agnostic wire format.
//
// Spec: https://www.jsonrpc.org/specification
//
// Used by the WS sidecar. IPC does not use this envelope — it speaks native
// Electron `ipcMain.handle` / `webContents.send`. Both transports dispatch
// through the same `src/main/rpc/dispatcher.ts`; this module is *only* the
// envelope format for the WS transport.

import { z } from 'zod';

// ---------------------------------------------------------------------------
// Error codes (spec-defined)
// ---------------------------------------------------------------------------

export const JSON_RPC_ERROR = {
  PARSE_ERROR: -32700,
  INVALID_REQUEST: -32600,
  METHOD_NOT_FOUND: -32601,
  INVALID_PARAMS: -32602,
  INTERNAL_ERROR: -32603,
} as const;

export type JsonRpcErrorCode = (typeof JSON_RPC_ERROR)[keyof typeof JSON_RPC_ERROR];

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

export const JsonRpcIdSchema = z.union([z.string(), z.number(), z.null()]);
export type JsonRpcId = z.infer<typeof JsonRpcIdSchema>;

const ParamsSchema = z.union([z.record(z.string(), z.unknown()), z.array(z.unknown())]).optional();

export const JsonRpcRequestSchema = z.object({
  jsonrpc: z.literal('2.0'),
  id: JsonRpcIdSchema,
  method: z.string().min(1),
  params: ParamsSchema,
});
export type JsonRpcRequest = z.infer<typeof JsonRpcRequestSchema>;

export const JsonRpcNotificationSchema = z.object({
  jsonrpc: z.literal('2.0'),
  method: z.string().min(1),
  params: ParamsSchema,
});
export type JsonRpcNotification = z.infer<typeof JsonRpcNotificationSchema>;

export const JsonRpcErrorObjectSchema = z.object({
  code: z.number().int(),
  message: z.string(),
  data: z.unknown().optional(),
});
export type JsonRpcErrorObject = z.infer<typeof JsonRpcErrorObjectSchema>;

export const JsonRpcSuccessResponseSchema = z.object({
  jsonrpc: z.literal('2.0'),
  id: JsonRpcIdSchema,
  result: z.unknown(),
});
export type JsonRpcSuccessResponse = z.infer<typeof JsonRpcSuccessResponseSchema>;

export const JsonRpcErrorResponseSchema = z.object({
  jsonrpc: z.literal('2.0'),
  id: JsonRpcIdSchema,
  error: JsonRpcErrorObjectSchema,
});
export type JsonRpcErrorResponse = z.infer<typeof JsonRpcErrorResponseSchema>;

export type JsonRpcResponse = JsonRpcSuccessResponse | JsonRpcErrorResponse;

// ---------------------------------------------------------------------------
// Inbound parsing
// ---------------------------------------------------------------------------

export type InboundMessage =
  | { kind: 'request'; value: JsonRpcRequest }
  | { kind: 'notification'; value: JsonRpcNotification }
  | { kind: 'parse-error'; detail: string }
  | { kind: 'invalid-request'; detail: string; id: JsonRpcId };

/**
 * Parses a raw wire message into a tagged union. Never throws — malformed
 * input is reported as `parse-error` or `invalid-request`, so the caller can
 * emit a proper JSON-RPC error response rather than dropping the connection.
 */
export function parseInbound(raw: string): InboundMessage {
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch (err) {
    return { kind: 'parse-error', detail: err instanceof Error ? err.message : 'parse error' };
  }

  if (!json || typeof json !== 'object' || Array.isArray(json)) {
    return { kind: 'invalid-request', detail: 'message must be a JSON object', id: null };
  }

  const obj = json as Record<string, unknown>;
  const candidateId: JsonRpcId = (() => {
    const parsed = JsonRpcIdSchema.safeParse(obj.id);
    return parsed.success ? parsed.data : null;
  })();

  // Request (has id) vs notification (no id field at all)
  if ('id' in obj) {
    const req = JsonRpcRequestSchema.safeParse(obj);
    if (req.success) return { kind: 'request', value: req.data };
    return {
      kind: 'invalid-request',
      detail: req.error.issues.map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`).join('; '),
      id: candidateId,
    };
  }

  const note = JsonRpcNotificationSchema.safeParse(obj);
  if (note.success) return { kind: 'notification', value: note.data };
  return {
    kind: 'invalid-request',
    detail: note.error.issues.map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`).join('; '),
    id: null,
  };
}

// ---------------------------------------------------------------------------
// Outbound encoding
// ---------------------------------------------------------------------------

export function encodeResult(id: JsonRpcId, result: unknown): string {
  const response: JsonRpcSuccessResponse = { jsonrpc: '2.0', id, result };
  return JSON.stringify(response);
}

export function encodeError(
  id: JsonRpcId,
  code: number,
  message: string,
  data?: unknown,
): string {
  const err: JsonRpcErrorObject = data === undefined ? { code, message } : { code, message, data };
  const response: JsonRpcErrorResponse = { jsonrpc: '2.0', id, error: err };
  return JSON.stringify(response);
}

export function encodeNotification(method: string, params?: unknown): string {
  const note: JsonRpcNotification = { jsonrpc: '2.0', method };
  if (params !== undefined) {
    // params is constrained to object/array by the spec, but we defer shape
    // checking to the outbound registry — this module is pure envelope.
    (note as { params?: unknown }).params = params;
  }
  return JSON.stringify(note);
}

