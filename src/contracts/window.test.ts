import { describe, it, expect } from 'vitest';
import { WindowMinimizeArgs, WindowMaximizeArgs, WindowCloseArgs } from './window';

describe('window contract', () => {
  it('argless channels accept [] and reject extras', () => {
    for (const schema of [WindowMinimizeArgs, WindowMaximizeArgs, WindowCloseArgs]) {
      expect(schema.safeParse([]).success).toBe(true);
      expect(schema.safeParse(['x']).success).toBe(false);
    }
  });
});
