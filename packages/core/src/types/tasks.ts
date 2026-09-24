import type { DatabaseAdapter } from "./adapters.js";

/** Minimal structural logger handed to task handlers (a pino logger satisfies it). */
export interface TaskLogger {
  info(obj: unknown, msg?: string): void;
  warn(obj: unknown, msg?: string): void;
  error(obj: unknown, msg?: string): void;
}

export interface TaskContext {
  /** The database adapter. */
  db: DatabaseAdapter;
  /** Logger scoped to this task. */
  logger: TaskLogger;
  /**
   * Aborted when the run exceeds `lockTimeout`. Pass it to `fetch` or check it
   * in long loops so an overrunning task stops touching data after its lock lapses.
   */
  signal: AbortSignal;
  /** The cron slot this run was started for, or `undefined` for a manual run. */
  scheduledFor?: Date;
}

/**
 * A named background job. Define it with `defineTask` and list it under
 * `tasks` in your config, then run it with `createTaskRunner`.
 */
export interface TaskConfig {
  /** Unique, stable name, for example `wallet:ledger-drift`. Also the lock key. */
  name: string;
  /**
   * Standard five-field cron expression (`minute hour day-of-month month day-of-week`),
   * evaluated in UTC. Omit for a task that only runs when you call `runTask`.
   */
  cron?: string;
  /**
   * Seconds a run may hold its lock before another instance may take over,
   * and before its `signal` is aborted. Defaults to 300.
   */
  lockTimeout?: number;
  /** The work to do. Throw to record the run as failed. */
  run: (context: TaskContext) => void | Promise<void>;
}

export type TaskRunStatus = "completed" | "failed" | "skipped";

export interface TaskRunResult {
  name: string;
  status: TaskRunStatus;
  /** Why a run was skipped. */
  reason?: "locked" | "not-due";
  /** Failure message when `status` is `"failed"`. */
  error?: string;
  durationMs: number;
}
