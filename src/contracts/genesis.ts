import { z } from 'zod';

export const GenesisConfigSchema = z.object({
  name: z.string().min(1),
  role: z.string().min(1),
  voice: z.string().min(1),
  voiceDescription: z.string().min(1),
  basePath: z.string().min(1),
});
export type GenesisConfig = z.infer<typeof GenesisConfigSchema>;

export const GenesisProgressSchema = z.object({
  step: z.string().min(1),
  detail: z.string(),
});
export type GenesisProgress = z.infer<typeof GenesisProgressSchema>;

export const GenesisCreateResultSchema = z.object({
  success: z.boolean(),
  mindPath: z.string().min(1).optional(),
  error: z.string().optional(),
});
export type GenesisCreateResult = z.infer<typeof GenesisCreateResultSchema>;

/** `genesis:getDefaultPath` — [] */
export const GenesisGetDefaultPathArgs = z.tuple([]);
/** `genesis:pickPath` — [] */
export const GenesisPickPathArgs = z.tuple([]);
/** `genesis:create` — [config] */
export const GenesisCreateArgs = z.tuple([GenesisConfigSchema]);
