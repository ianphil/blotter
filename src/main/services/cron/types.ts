export type CronJobType = 'prompt' | 'shell' | 'webhook' | 'notification';
export type CronRunStatus = 'completed' | 'failed' | 'timed-out' | 'skipped';

export interface PromptJobPayload {
  recipient?: string;
  prompt: string;
}

export interface ShellJobPayload {
  command: string;
  args?: string[];
}

export interface WebhookJobPayload {
  url: string;
  body?: unknown;
  headers?: Record<string, string>;
}

export interface NotificationJobPayload {
  title: string;
  body: string;
}

interface CronJobBase<TType extends CronJobType, TPayload> {
  id: string;
  name: string;
  schedule: string;
  type: TType;
  payload: TPayload;
  enabled: boolean;
  timeoutMs?: number;
  createdAt: string;
  updatedAt: string;
  lastRunAt?: string;
  lastRunStatus?: CronRunStatus;
  lastTaskId?: string;
  lastFireAttempt?: string;
}

export type PromptCronJob = CronJobBase<'prompt', PromptJobPayload>;
export type ShellCronJob = CronJobBase<'shell', ShellJobPayload>;
export type WebhookCronJob = CronJobBase<'webhook', WebhookJobPayload>;
export type NotificationCronJob = CronJobBase<'notification', NotificationJobPayload>;

export type CronJob =
  | PromptCronJob
  | ShellCronJob
  | WebhookCronJob
  | NotificationCronJob;

export type CronJobPayload =
  | PromptJobPayload
  | ShellJobPayload
  | WebhookJobPayload
  | NotificationJobPayload;

export interface CreateCronJobInput {
  name: string;
  schedule: string;
  type: CronJobType;
  payload: CronJobPayload;
  enabled?: boolean;
  timeoutMs?: number;
}

export interface CronJobRunRecord {
  id: string;
  jobId: string;
  mindId: string;
  type: CronJobType;
  status: CronRunStatus;
  startedAt: string;
  endedAt: string;
  taskId?: string;
  output?: string;
  error?: string;
  source: 'scheduled' | 'manual' | 'resume';
}

export type CronJobListEntry = CronJob & {
  nextRun: string | null;
};

export interface StoredCronJobs {
  jobs: CronJob[];
}

export interface StoredCronRuns {
  runs: Record<string, CronJobRunRecord[]>;
}
