import type { CollectionConfig, DyrectedConfig, TaskConfig, TaskLogger, TaskRunResult } from "./types/index.js";
import { createTrashPurgeTask, resolveTrashConfig } from "./trash.js";

export const TASK_LOCKS_COLLECTION = "__task_locks";

/** Internal collection holding one lock row per task. Created on demand by the runner. */
export const TASK_LOCKS_COLLECTION_CONFIG: CollectionConfig = {
  slug: TASK_LOCKS_COLLECTION,
  labels: { singular: "Task lock", plural: "Task locks" },
  fields: [
    { name: "name", type: "text", required: true },
    // Numeric and promoted so the lock compare-and-set is a real column comparison.
    { name: "lockedUntil", type: "number", required: true, promoted: true },
    { name: "lockedBy", type: "text" },
    { name: "lastScheduledFor", type: "date" },
    { name: "lastStartedAt", type: "date" },
    { name: "lastFinishedAt", type: "date" },
    { name: "lastStatus", type: "text" },
    { name: "lastError", type: "textarea" },
  ],
  access: {
    read: ({ user }) => !!user?.roles?.includes("admin"),
    create: () => false,
    update: () => false,
    delete: () => false,
  },
  admin: { hidden: true },
};

const DEFAULT_LOCK_TIMEOUT_SECONDS = 300;
const DEFAULT_TICK_MS = 30_000;

// ─── Cron ────────────────────────────────────────────────────────────────────

interface CronSchedule {
  minutes: Set<number>;
  hours: Set<number>;
  daysOfMonth: Set<number>;
  months: Set<number>;
  daysOfWeek: Set<number>;
  /** Standard cron semantics: when both day fields are restricted, either may match. */
  dayFieldsBothRestricted: boolean;
}

const MONTH_NAMES = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
const DAY_NAMES = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

function parseCronField(
  raw: string,
  min: number,
  max: number,
  names: string[] | undefined,
  nameOffset: number,
  label: string,
): Set<number> {
  const values = new Set<number>();
  const toNumber = (token: string): number => {
    const named = names?.indexOf(token.toLowerCase());
    if (named !== undefined && named >= 0) return named + nameOffset;
    if (!/^\d+$/.test(token)) throw new Error(`Invalid cron ${label} "${token}".`);
    return Number(token);
  };

  for (const part of raw.split(",")) {
    const [rangePart, stepPart] = part.split("/");
    const step = stepPart === undefined ? 1 : Number(stepPart);
    if (!Number.isInteger(step) || step < 1) throw new Error(`Invalid cron ${label} step "${part}".`);

    let start: number;
    let end: number;
    if (rangePart === "*") {
      start = min;
      end = max;
    } else if (rangePart.includes("-")) {
      const [a, b] = rangePart.split("-");
      start = toNumber(a);
      end = toNumber(b);
    } else {
      start = toNumber(rangePart);
      end = stepPart === undefined ? start : max;
    }
    if (start < min || end > max || start > end) {
      throw new Error(`Cron ${label} "${part}" is out of range (${min}-${max}).`);
    }
    for (let v = start; v <= end; v += step) values.add(v);
  }
  return values;
}

/** Parses a five-field cron expression. Throws a descriptive error when it is invalid. */
export function parseCron(expression: string): CronSchedule {
  const fields = expression.trim().split(/\s+/);
  if (fields.length !== 5) {
    throw new Error(`Cron expression "${expression}" must have 5 fields (minute hour day-of-month month day-of-week).`);
  }
  const [min, hour, dom, mon, dow] = fields;
  const daysOfWeek = parseCronField(dow, 0, 7, DAY_NAMES, 0, "day-of-week");
  if (daysOfWeek.has(7)) daysOfWeek.add(0);
  daysOfWeek.delete(7);
  return {
    minutes: parseCronField(min, 0, 59, undefined, 0, "minute"),
    hours: parseCronField(hour, 0, 23, undefined, 0, "hour"),
    daysOfMonth: parseCronField(dom, 1, 31, undefined, 0, "day-of-month"),
    months: parseCronField(mon, 1, 12, MONTH_NAMES, 1, "month"),
    daysOfWeek,
    dayFieldsBothRestricted: dom !== "*" && dow !== "*",
  };
}

function dayMatches(schedule: CronSchedule, date: Date): boolean {
  const domOk = schedule.daysOfMonth.has(date.getUTCDate());
  const dowOk = schedule.daysOfWeek.has(date.getUTCDay());
  return schedule.dayFieldsBothRestricted ? domOk || dowOk : domOk && dowOk;
}

/** The first cron slot strictly after `after`, in UTC. */
export function nextCronRun(expression: string | CronSchedule, after: Date): Date {
  const schedule = typeof expression === "string" ? parseCron(expression) : expression;
  const cursor = new Date(after.getTime());
  cursor.setUTCSeconds(0, 0);
  cursor.setUTCMinutes(cursor.getUTCMinutes() + 1);

  // Skip whole months, days and hours that cannot match, so sparse schedules stay cheap.
  const limit = after.getTime() + 5 * 366 * 24 * 60 * 60 * 1000;
  while (cursor.getTime() <= limit) {
    if (!schedule.months.has(cursor.getUTCMonth() + 1)) {
      cursor.setUTCMonth(cursor.getUTCMonth() + 1, 1);
      cursor.setUTCHours(0, 0, 0, 0);
      continue;
    }
    if (!dayMatches(schedule, cursor)) {
      cursor.setUTCDate(cursor.getUTCDate() + 1);
      cursor.setUTCHours(0, 0, 0, 0);
      continue;
    }
    if (!schedule.hours.has(cursor.getUTCHours())) {
      cursor.setUTCHours(cursor.getUTCHours() + 1, 0, 0, 0);
      continue;
    }
    if (!schedule.minutes.has(cursor.getUTCMinutes())) {
      cursor.setUTCMinutes(cursor.getUTCMinutes() + 1, 0, 0);
      continue;
    }
    return cursor;
  }
  throw new Error(`Cron expression "${typeof expression === "string" ? expression : "schedule"}" never matches.`);
}

// ─── Definition ──────────────────────────────────────────────────────────────

/**
 * Defines a background task. Validates the name, cron expression and lock
 * timeout immediately, so a typo fails at startup rather than at 3am.
 *
 * @example
 * ```ts
 * export const ledgerDrift = defineTask({
 *   name: "wallet:ledger-drift",
 *   cron: "*\/15 * * * *",
 *   lockTimeout: 300,
 *   async run({ db, logger }) {
 *     const drifts = await checkLedgerDrift(db);
 *     if (drifts.length) logger.error({ drifts }, "Ledger drift detected");
 *   },
 * });
 * ```
 */
export function defineTask<const T extends TaskConfig>(task: T): T {
  if (!task.name || !task.name.trim()) throw new Error("A task needs a non-empty name.");
  if (task.cron !== undefined) parseCron(task.cron);
  if (task.lockTimeout !== undefined && !(task.lockTimeout > 0)) {
    throw new Error(`Task "${task.name}" lockTimeout must be a positive number of seconds.`);
  }
  return task;
}

// ─── Runner ──────────────────────────────────────────────────────────────────

export interface TaskRunner {
  /**
   * Runs one task now, ignoring its schedule. Returns `skipped` with reason
   * `"locked"` when another instance is already running it.
   */
  runTask(name: string): Promise<TaskRunResult>;
  /**
   * Runs every scheduled task that is due. Safe to call from any number of
   * instances or from a platform cron: each due slot runs exactly once.
   */
  runDue(now?: Date): Promise<TaskRunResult[]>;
  /** Starts polling for due tasks. Returns immediately and never blocks startup. */
  start(options?: { intervalMs?: number }): void;
  /** Stops polling and waits for any run in progress to settle. */
  stop(): Promise<void>;
  /** Lists all registered tasks with their configured cron expression. */
  getTasks(): Array<{ name: string; cron?: string }>;
}

function resolveLogger(config: DyrectedConfig, taskName: string): TaskLogger {
  const base = (config as unknown as { logger?: { child?: (b: unknown) => TaskLogger } }).logger;
  if (base && typeof base.child === "function") return base.child({ component: "tasks", task: taskName });
  const prefix = `[dyrected/tasks] ${taskName}`;
  return {
    info: (obj, msg) => console.info(prefix, msg ?? "", obj),
    warn: (obj, msg) => console.warn(prefix, msg ?? "", obj),
    error: (obj, msg) => console.error(prefix, msg ?? "", obj),
  };
}

function floorToMinute(date: Date): Date {
  const d = new Date(date.getTime());
  d.setUTCSeconds(0, 0);
  return d;
}

/**
 * Creates the runner for the tasks in `config.tasks`. Coordination between
 * instances uses a lock row per task in the database, taken with a single
 * conditional update, so it works across processes and on every adapter.
 *
 * Core does not start it for you: a timer is unreliable on serverless, so the
 * host chooses. Call `start()` on a long-lived Node server, or call `runDue()`
 * from a platform cron.
 */
export function createTaskRunner(config: DyrectedConfig): TaskRunner {
  const db = config.db;
  if (!db) throw new Error("createTaskRunner requires config.db.");
  const tasks = new Map<string, TaskConfig & { schedule?: ReturnType<typeof parseCron> }>();
  for (const task of config.tasks ?? []) {
    if (tasks.has(task.name)) throw new Error(`Duplicate task name "${task.name}".`);
    tasks.set(task.name, { ...task, schedule: task.cron ? parseCron(task.cron) : undefined });
  }

  const hasRetention = (config.collections ?? []).some((col) => {
    const resolved = resolveTrashConfig(col, config);
    return resolved.enabled && resolved.retentionDays !== null && resolved.retentionDays > 0;
  });
  if (hasRetention && !tasks.has("dyrected:trash-purge")) {
    const purgeTask = createTrashPurgeTask(config);
    tasks.set(purgeTask.name, { ...purgeTask, schedule: purgeTask.cron ? parseCron(purgeTask.cron) : undefined });
  }

  const instanceId = globalThis.crypto?.randomUUID?.() ?? `inst_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  let timer: ReturnType<typeof setInterval> | undefined;
  let inFlight: Promise<unknown> = Promise.resolve();
  let ticking = false;

  // The lock collection needs its promoted numeric column before the first compare-and-set,
  // so the runner registers it itself rather than relying on the app having synced it.
  let ready: Promise<void> | undefined;
  function ensureReady(): Promise<void> {
    ready ??= Promise.resolve(db!.sync?.([TASK_LOCKS_COLLECTION_CONFIG], [])).then(() => undefined);
    ready.catch(() => {
      ready = undefined;
    });
    return ready;
  }

  async function ensureLockRow(name: string, now: Date): Promise<Record<string, any>> {
    await ensureReady();
    const existing = await db!.findOne({ collection: TASK_LOCKS_COLLECTION, id: name });
    if (existing) return existing;
    try {
      return await db!.create({
        collection: TASK_LOCKS_COLLECTION,
        data: {
          id: name,
          name,
          lockedUntil: 0,
          lockedBy: null,
          lastScheduledFor: floorToMinute(now).toISOString(),
          lastStartedAt: null,
          lastFinishedAt: null,
          lastStatus: null,
          lastError: null,
        },
      });
    } catch (error) {
      // Another instance created it first.
      const created = await db!.findOne({ collection: TASK_LOCKS_COLLECTION, id: name });
      if (created) return created;
      throw error;
    }
  }

  async function execute(
    task: TaskConfig,
    row: Record<string, any>,
    scheduledFor: Date | undefined,
  ): Promise<TaskRunResult> {
    const started = Date.now();
    const lockMs = (task.lockTimeout ?? DEFAULT_LOCK_TIMEOUT_SECONDS) * 1000;
    const token = `${instanceId}:${started}`;

    // Compare-and-set: the lock must be free, and for scheduled runs the slot we
    // decided was due must still be unhandled, so a slow instance cannot re-run it.
    const where: Record<string, unknown> = {
      id: { equals: task.name },
      lockedUntil: { less_than: started },
    };
    if (scheduledFor) where.lastScheduledFor = { equals: row.lastScheduledFor };

    const claimed = await db!.update({
      collection: TASK_LOCKS_COLLECTION,
      where,
      data: {
        lockedUntil: started + lockMs,
        lockedBy: token,
        lastStartedAt: new Date(started).toISOString(),
        ...(scheduledFor ? { lastScheduledFor: scheduledFor.toISOString() } : {}),
      },
    });
    if ((claimed as { affectedRows?: number }).affectedRows !== 1) {
      return { name: task.name, status: "skipped", reason: "locked", durationMs: Date.now() - started };
    }

    const logger = resolveLogger(config, task.name);
    const controller = new AbortController();
    let timeout: ReturnType<typeof setTimeout> | undefined;
    let status: "completed" | "failed" = "completed";
    let errorMessage: string | undefined;

    try {
      await Promise.race([
        Promise.resolve(task.run({ db: db!, logger, signal: controller.signal, scheduledFor })),
        new Promise<never>((_, reject) => {
          timeout = setTimeout(() => {
            // Reject first so the timeout wins even if the abort listener lets the task resolve.
            reject(new Error(`Task exceeded its lockTimeout of ${lockMs / 1000}s.`));
            controller.abort();
          }, lockMs);
        }),
      ]);
    } catch (error) {
      status = "failed";
      errorMessage = error instanceof Error ? error.message : String(error);
      logger.error({ err: error }, "Task failed");
    } finally {
      if (timeout) clearTimeout(timeout);
    }

    // Release only if we still own the lock; if it lapsed and another instance took over, leave theirs.
    try {
      await db!.update({
        collection: TASK_LOCKS_COLLECTION,
        where: { id: { equals: task.name }, lockedBy: { equals: token } },
        data: {
          lockedUntil: 0,
          lockedBy: null,
          lastFinishedAt: new Date().toISOString(),
          lastStatus: status,
          lastError: errorMessage ?? null,
        },
      });
    } catch (error) {
      logger.warn({ err: error }, "Could not release task lock; it will expire on its own");
    }

    return { name: task.name, status, error: errorMessage, durationMs: Date.now() - started };
  }

  function track<T>(work: Promise<T>): Promise<T> {
    inFlight = inFlight.then(() => work).catch(() => undefined);
    return work;
  }

  const runner: TaskRunner = {
    async runTask(name) {
      const task = tasks.get(name);
      if (!task) throw new Error(`Unknown task "${name}".`);
      const row = await ensureLockRow(name, new Date());
      return track(execute(task, row, undefined));
    },

    async runDue(now = new Date()) {
      const results: TaskRunResult[] = [];
      for (const task of tasks.values()) {
        if (!task.schedule) continue;
        const row = await ensureLockRow(task.name, now);
        const reference = new Date(String(row.lastScheduledFor));
        const due = Number.isNaN(reference.getTime())
          ? true
          : nextCronRun(task.schedule, reference).getTime() <= now.getTime();
        if (!due) {
          results.push({ name: task.name, status: "skipped", reason: "not-due", durationMs: 0 });
          continue;
        }
        results.push(await track(execute(task, row, floorToMinute(now))));
      }
      return results;
    },

    start(options) {
      if (timer) return;
      const intervalMs = options?.intervalMs ?? DEFAULT_TICK_MS;
      const tick = () => {
        if (ticking) return;
        ticking = true;
        runner
          .runDue()
          .catch((error) => resolveLogger(config, "runner").error({ err: error }, "Task tick failed"))
          .finally(() => {
            ticking = false;
          });
      };
      timer = setInterval(tick, intervalMs);
      (timer as { unref?: () => void }).unref?.();
      // First check happens off the caller's stack so booting a server is never blocked.
      setTimeout(tick, 0);
    },

    async stop() {
      if (timer) clearInterval(timer);
      timer = undefined;
      await inFlight;
    },

    getTasks() {
      return Array.from(tasks.values()).map((t) => ({ name: t.name, cron: t.cron }));
    },
  };
  return runner;
}
