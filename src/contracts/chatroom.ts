import { z } from 'zod';
import { ChatMessageSchema, ChatMessageSenderSchema } from './chat';
import { ChatEventSchema } from './chatEvent';
import { MessageIdSchema, MindIdSchema } from './primitives';

/** Chatroom message — ChatMessage with required sender + roundId. */
export const ChatroomMessageSchema = ChatMessageSchema.extend({
  sender: ChatMessageSenderSchema,
  roundId: z.string().min(1),
});
export type ChatroomMessage = z.infer<typeof ChatroomMessageSchema>;

export const ChatroomTranscriptSchema = z.object({
  version: z.literal(1),
  messages: z.array(ChatroomMessageSchema),
});
export type ChatroomTranscript = z.infer<typeof ChatroomTranscriptSchema>;

export const ChatroomStreamEventSchema = z.object({
  mindId: MindIdSchema,
  mindName: z.string().min(1),
  messageId: MessageIdSchema,
  roundId: z.string().min(1),
  event: ChatEventSchema,
});
export type ChatroomStreamEvent = z.infer<typeof ChatroomStreamEventSchema>;

/** `chatroom:send` — [message] | [message, model] */
export const ChatroomSendArgs = z.tuple([z.string().min(1), z.string().min(1).optional()]);
/** `chatroom:history` — [] */
export const ChatroomHistoryArgs = z.tuple([]);
/** `chatroom:clear` — [] */
export const ChatroomClearArgs = z.tuple([]);
/** `chatroom:stop` — [] */
export const ChatroomStopArgs = z.tuple([]);
