import { z } from 'zod';

/**
 * Phase 1 scope: schematize ONLY the arg tuples crossing IPC.
 *
 * A2A payload types (Message / Task / AgentCard / Parts) include
 * `Uint8Array` fields that are NOT JSON-RPC safe. Translating those to
 * a transport-safe shape (e.g. base64) is a Phase 2 task. Consumers
 * must continue to import payload types from `src/shared/a2a-types.ts`
 * until that work lands.
 */

export const A2aTaskFilterSchema = z.object({
  contextId: z.string().min(1).optional(),
  status: z.string().min(1).optional(),
});
export type A2aTaskFilter = z.infer<typeof A2aTaskFilterSchema>;

/** `a2a:listAgents` — [] */
export const A2aListAgentsArgs = z.tuple([]);
/** `a2a:getTask` — [taskId] | [taskId, historyLength] */
export const A2aGetTaskArgs = z.tuple([
  z.string().min(1),
  z.number().int().nonnegative().optional(),
]);
/** `a2a:listTasks` — [] | [filter] */
export const A2aListTasksArgs = z.tuple([A2aTaskFilterSchema.optional()]);
/** `a2a:cancelTask` — [taskId] */
export const A2aCancelTaskArgs = z.tuple([z.string().min(1)]);
