import { describe, it, expect } from 'vitest';
import {
  GenesisConfigSchema,
  GenesisProgressSchema,
  GenesisCreateResultSchema,
  GenesisGetDefaultPathArgs,
  GenesisPickPathArgs,
  GenesisCreateArgs,
} from './genesis';

describe('genesis contract', () => {
  const valid = {
    name: 'Aria',
    role: 'Research assistant',
    voice: 'warm',
    voiceDescription: 'A warm, curious voice.',
    basePath: '/tmp/agents',
  };

  it('GenesisConfig requires all fields', () => {
    expect(GenesisConfigSchema.safeParse(valid).success).toBe(true);
    expect(GenesisConfigSchema.safeParse({ ...valid, name: '' }).success).toBe(false);
    const { basePath: _omit, ...missing } = valid;
    void _omit;
    expect(GenesisConfigSchema.safeParse(missing).success).toBe(false);
  });

  it('GenesisProgress requires step + detail', () => {
    expect(GenesisProgressSchema.safeParse({ step: 'boot', detail: 'starting' }).success).toBe(true);
    expect(GenesisProgressSchema.safeParse({ step: 'boot' }).success).toBe(false);
  });

  it('GenesisCreateResult accepts success and error shapes', () => {
    expect(GenesisCreateResultSchema.safeParse({ success: true, mindPath: '/tmp' }).success).toBe(true);
    expect(GenesisCreateResultSchema.safeParse({ success: false, error: 'boom' }).success).toBe(true);
    expect(GenesisCreateResultSchema.safeParse({ success: 'yes' }).success).toBe(false);
  });

  it('argless channels reject extra args', () => {
    for (const schema of [GenesisGetDefaultPathArgs, GenesisPickPathArgs]) {
      expect(schema.safeParse([]).success).toBe(true);
      expect(schema.safeParse(['x']).success).toBe(false);
    }
  });

  it('genesis:create requires full config payload', () => {
    expect(GenesisCreateArgs.safeParse([valid]).success).toBe(true);
    expect(GenesisCreateArgs.safeParse([{ ...valid, basePath: '' }]).success).toBe(false);
    expect(GenesisCreateArgs.safeParse([]).success).toBe(false);
  });
});
