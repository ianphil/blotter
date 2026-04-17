import { describe, it, expect } from 'vitest';
import {
  A2aListAgentsArgs,
  A2aGetTaskArgs,
  A2aListTasksArgs,
  A2aCancelTaskArgs,
  A2aTaskFilterSchema,
} from './a2a';

describe('a2a contract', () => {
  it('a2a:listAgents takes no args', () => {
    expect(A2aListAgentsArgs.safeParse([]).success).toBe(true);
    expect(A2aListAgentsArgs.safeParse(['x']).success).toBe(false);
  });

  it('a2a:getTask accepts [taskId] and [taskId, historyLength]', () => {
    expect(A2aGetTaskArgs.safeParse(['t1']).success).toBe(true);
    expect(A2aGetTaskArgs.safeParse(['t1', 5]).success).toBe(true);
    expect(A2aGetTaskArgs.safeParse(['']).success).toBe(false);
    expect(A2aGetTaskArgs.safeParse(['t1', -1]).success).toBe(false);
    expect(A2aGetTaskArgs.safeParse(['t1', 1.5]).success).toBe(false);
  });

  it('a2a:listTasks accepts [] or [filter]', () => {
    expect(A2aListTasksArgs.safeParse([]).success).toBe(true);
    expect(A2aListTasksArgs.safeParse([{}]).success).toBe(true);
    expect(A2aListTasksArgs.safeParse([{ contextId: 'c1' }]).success).toBe(true);
    expect(A2aListTasksArgs.safeParse([{ contextId: 'c1', status: 'working' }]).success).toBe(true);
    expect(A2aListTasksArgs.safeParse([{ contextId: 42 }]).success).toBe(false);
  });

  it('a2a:cancelTask requires taskId string', () => {
    expect(A2aCancelTaskArgs.safeParse(['t1']).success).toBe(true);
    expect(A2aCancelTaskArgs.safeParse(['']).success).toBe(false);
    expect(A2aCancelTaskArgs.safeParse([]).success).toBe(false);
  });

  it('A2aTaskFilter silently drops unknown properties', () => {
    const parsed = A2aTaskFilterSchema.parse({ contextId: 'c1', extra: 'nope' });
    expect(parsed).toEqual({ contextId: 'c1' });
  });
});
