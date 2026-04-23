// Internal mind context — main process only, not exposed to renderer
// Extends the shared MindContext with infrastructure details

import type { MindContext } from '../../../shared/types.js';
import type { CopilotClient, CopilotSession, Tool as SdkTool } from '@github/copilot-sdk';
import type { LoadedExtension } from '../extensions/ExtensionLoader';

export type { CopilotClient, CopilotSession };

// Match the SDK's own SessionConfig.tools signature (Tool<any>[]), so that any
// tool flavor — ExtensionTool, SessionTool, or SDK Tool — satisfies it without casts.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Tool = SdkTool<any>;

export interface InternalMindContext extends MindContext {
  client: CopilotClient;
  session: CopilotSession | null;
  extensions: LoadedExtension[];
}
