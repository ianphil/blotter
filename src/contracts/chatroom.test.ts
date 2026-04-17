import { describe, it, expect } from 'vitest';
import {
  ChatroomSendArgs,
  ChatroomHistoryArgs,
  ChatroomClearArgs,
  ChatroomStopArgs,
  ChatroomMessageSchema,
} from './chatroom';

describe('chatroom contract', () => {
  it('chatroom:send accepts [message] or [message, model]', () => {
    expect(ChatroomSendArgs.safeParse(['hi']).success).toBe(true);
    expect(ChatroomSendArgs.safeParse(['hi', 'gpt-5']).success).toBe(true);
    expect(ChatroomSendArgs.safeParse(['']).success).toBe(false);
    expect(ChatroomSendArgs.safeParse([]).success).toBe(false);
  });

  it('argless channels reject extra args', () => {
    for (const schema of [ChatroomHistoryArgs, ChatroomClearArgs, ChatroomStopArgs]) {
      expect(schema.safeParse([]).success).toBe(true);
      expect(schema.safeParse(['x']).success).toBe(false);
    }
  });

  it('ChatroomMessage requires sender + roundId', () => {
    expect(
      ChatroomMessageSchema.safeParse({
        id: 'm1',
        role: 'assistant',
        blocks: [{ type: 'text', content: 'hi' }],
        timestamp: 1,
        sender: { mindId: 'a', name: 'Aria' },
        roundId: 'r1',
      }).success,
    ).toBe(true);

    expect(
      ChatroomMessageSchema.safeParse({
        id: 'm1',
        role: 'assistant',
        blocks: [],
        timestamp: 1,
        roundId: 'r1',
      }).success,
    ).toBe(false);
  });
});
