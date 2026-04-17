import { z } from 'zod';
import { ChatEventSchema } from './chatEvent';
import { MindIdSchema, MessageIdSchema, JsonRecordSchema } from './primitives';
import { MindRecordSchema } from './mind';
import { AuthProgressSchema } from './auth';
import { GenesisProgressSchema } from './genesis';
import { ChatroomStreamEventSchema } from './chatroom';

/**
 * Outbound channel schemas — the object-form payload shape for every push
 * channel. These are authoritative: the Phase 2 outbound registry
 * (`src/main/rpc/outboundRegistry.ts`) is built from them, and every
 * `webContents.send(...)` call site must round-trip through the registry.
 *
 * IPC transport converts the object form to positional args via the registry's
 * `toIpcArgs` function. WS transport emits the object form directly as
 * JSON-RPC notification `params`.
 */

/** `chat:event` — IPC positional: (mindId, messageId, event). */
export const ChatEventPushSchema = z.object({
  mindId: MindIdSchema,
  messageId: MessageIdSchema,
  event: ChatEventSchema,
});
export type ChatEventPush = z.infer<typeof ChatEventPushSchema>;

/** `mind:changed` — IPC positional: (minds[]). */
export const MindChangedPushSchema = z.object({
  minds: z.array(MindRecordSchema),
});
export type MindChangedPush = z.infer<typeof MindChangedPushSchema>;

/** `auth:progress` — IPC positional: (progress). */
export const AuthProgressPushSchema = AuthProgressSchema;
export type AuthProgressPush = z.infer<typeof AuthProgressPushSchema>;

/** `auth:loggedOut` — IPC positional: (). No payload. */
export const AuthLoggedOutPushSchema = z.object({});
export type AuthLoggedOutPush = z.infer<typeof AuthLoggedOutPushSchema>;

/** `auth:accountSwitchStarted` — IPC positional: ({login}). */
export const AuthAccountSwitchStartedPushSchema = z.object({
  login: z.string().min(1),
});
export type AuthAccountSwitchStartedPush = z.infer<typeof AuthAccountSwitchStartedPushSchema>;

/** `auth:accountSwitched` — IPC positional: ({login}). */
export const AuthAccountSwitchedPushSchema = z.object({
  login: z.string().min(1),
});
export type AuthAccountSwitchedPush = z.infer<typeof AuthAccountSwitchedPushSchema>;

/** `genesis:progress` — IPC positional: (progress). */
export const GenesisProgressPushSchema = GenesisProgressSchema;
export type GenesisProgressPush = z.infer<typeof GenesisProgressPushSchema>;

/** `chatroom:event` — IPC positional: (event). */
export const ChatroomEventPushSchema = ChatroomStreamEventSchema;
export type ChatroomEventPush = z.infer<typeof ChatroomEventPushSchema>;

/**
 * A2A push channels — `passthrough` envelopes. `Part.raw: Uint8Array` is not
 * JSON-RPC safe, so WS transport currently rejects A2A methods with -32601.
 * The object form here matches the IPC payload 1:1 for IPC delivery; WS
 * serialization awaits a dedicated base64 codec (see `rpc-a2a-migration`).
 */
export const A2aIncomingPushSchema = JsonRecordSchema;
export type A2aIncomingPush = z.infer<typeof A2aIncomingPushSchema>;

export const A2aTaskStatusUpdatePushSchema = JsonRecordSchema;
export type A2aTaskStatusUpdatePush = z.infer<typeof A2aTaskStatusUpdatePushSchema>;

export const A2aTaskArtifactUpdatePushSchema = JsonRecordSchema;
export type A2aTaskArtifactUpdatePush = z.infer<typeof A2aTaskArtifactUpdatePushSchema>;

