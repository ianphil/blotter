// Outbound channel registry — single source of truth for every `webContents.send`
// push in the app. Translates between the object form (used by WS transport
// JSON-RPC notifications + authoritative contracts/outbound.ts schemas) and the
// positional args form (used by Electron `webContents.send` today).
//
// Adding a new push channel? Add an OutboundEntry below AND a schema in
// `src/contracts/outbound.ts`. The coverage test
// (`outboundRegistry.coverage.test.ts`) will fail your build if a
// `webContents.send(channel, ...)` call site references a channel not
// registered here.
//
// Scope is NOT a registry property — it's a runtime decision per emit,
// expressed via `ctx.reply.emit` (caller-only) vs `pushBus.publish`
// (broadcast). Some channels (e.g. `chat:event`) are emitted at different
// scopes from different call sites.

import type { ZodType } from 'zod';
import {
  ChatEventPushSchema,
  MindChangedPushSchema,
  AuthProgressPushSchema,
  AuthLoggedOutPushSchema,
  AuthAccountSwitchStartedPushSchema,
  AuthAccountSwitchedPushSchema,
  GenesisProgressPushSchema,
  ChatroomEventPushSchema,
  A2aIncomingPushSchema,
  A2aTaskStatusUpdatePushSchema,
  A2aTaskArtifactUpdatePushSchema,
} from '../../contracts/outbound';
import type {
  ChatEventPush,
  MindChangedPush,
  AuthProgressPush,
  AuthLoggedOutPush,
  AuthAccountSwitchStartedPush,
  AuthAccountSwitchedPush,
  GenesisProgressPush,
  ChatroomEventPush,
  A2aIncomingPush,
  A2aTaskStatusUpdatePush,
  A2aTaskArtifactUpdatePush,
} from '../../contracts/outbound';

export interface OutboundEntry<T> {
  /** Channel name shared between IPC (`webContents.send`) and WS (JSON-RPC method). */
  readonly channel: string;
  /** Object-form payload schema. Validated in dev at emit time. */
  readonly schema: ZodType<T>;
  /**
   * Translate the canonical object form into the positional args array expected
   * by the legacy `webContents.send(channel, ...args)` wire format so the
   * renderer's existing IPC listeners don't have to change.
   */
  readonly toIpcArgs: (payload: T) => unknown[];
}

// Helper — forces TS to check schema/payload alignment without losing inference
function entry<T>(e: OutboundEntry<T>): OutboundEntry<T> {
  return e;
}

const ENTRIES = [
  entry<ChatEventPush>({
    channel: 'chat:event',
    schema: ChatEventPushSchema,
    toIpcArgs: (p) => [p.mindId, p.messageId, p.event],
  }),
  entry<MindChangedPush>({
    channel: 'mind:changed',
    schema: MindChangedPushSchema,
    toIpcArgs: (p) => [p.minds],
  }),
  entry<AuthProgressPush>({
    channel: 'auth:progress',
    schema: AuthProgressPushSchema,
    toIpcArgs: (p) => [p],
  }),
  entry<AuthLoggedOutPush>({
    channel: 'auth:loggedOut',
    schema: AuthLoggedOutPushSchema,
    toIpcArgs: () => [],
  }),
  entry<AuthAccountSwitchStartedPush>({
    channel: 'auth:accountSwitchStarted',
    schema: AuthAccountSwitchStartedPushSchema,
    toIpcArgs: (p) => [p],
  }),
  entry<AuthAccountSwitchedPush>({
    channel: 'auth:accountSwitched',
    schema: AuthAccountSwitchedPushSchema,
    toIpcArgs: (p) => [p],
  }),
  entry<GenesisProgressPush>({
    channel: 'genesis:progress',
    schema: GenesisProgressPushSchema,
    toIpcArgs: (p) => [p],
  }),
  entry<ChatroomEventPush>({
    channel: 'chatroom:event',
    schema: ChatroomEventPushSchema,
    toIpcArgs: (p) => [p],
  }),
  entry<A2aIncomingPush>({
    channel: 'a2a:incoming',
    schema: A2aIncomingPushSchema,
    toIpcArgs: (p) => [p],
  }),
  entry<A2aTaskStatusUpdatePush>({
    channel: 'a2a:task-status-update',
    schema: A2aTaskStatusUpdatePushSchema,
    toIpcArgs: (p) => [p],
  }),
  entry<A2aTaskArtifactUpdatePush>({
    channel: 'a2a:task-artifact-update',
    schema: A2aTaskArtifactUpdatePushSchema,
    toIpcArgs: (p) => [p],
  }),
] as const;

const BY_CHANNEL = new Map<string, OutboundEntry<unknown>>(
  ENTRIES.map((e) => [e.channel, e as OutboundEntry<unknown>]),
);

export const OUTBOUND_CHANNELS: ReadonlyArray<string> = ENTRIES.map((e) => e.channel);

export function getOutboundEntry(channel: string): OutboundEntry<unknown> | undefined {
  return BY_CHANNEL.get(channel);
}

export function requireOutboundEntry(channel: string): OutboundEntry<unknown> {
  const e = BY_CHANNEL.get(channel);
  if (!e) {
    throw new Error(
      `[outboundRegistry] Unknown push channel '${channel}'. ` +
        `Add an entry in src/main/rpc/outboundRegistry.ts and a schema in src/contracts/outbound.ts.`,
    );
  }
  return e;
}

/**
 * Translate object-form payload to positional args for IPC transport. In dev
 * the payload is validated against the schema; in production validation is
 * skipped for performance but the translation still runs.
 */
export function translateForIpc(channel: string, payload: unknown): unknown[] {
  const e = requireOutboundEntry(channel);
  if (process.env.NODE_ENV !== 'production') {
    const parsed = e.schema.safeParse(payload);
    if (!parsed.success) {
      throw new Error(
        `[outboundRegistry] Payload for '${channel}' failed schema validation: ` +
          parsed.error.issues.map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`).join('; '),
      );
    }
    return e.toIpcArgs(parsed.data);
  }
  return e.toIpcArgs(payload);
}

