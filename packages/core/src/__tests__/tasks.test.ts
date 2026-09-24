import { describe, it, expect, beforeEach, vi } from "vitest";
import { InMemoryAdapter } from "./mocks.js";
import { defineConfig, normalizeConfig, defineTask, createTaskRunner, nextCronRun, parseCron, TASK_LOCKS_COLLECTION } from "../index.js";

const at = (iso: string) => new Date(iso);

describe("cron", () => {
  it("finds the next slot for common expressions (UTC)", () => {
    expect(nextCronRun("*/15 * * * *", at("2026-01-01T10:07:30Z")).toISOString()).toBe("2026-01-01T10:15:00.000Z");
    expect(nextCronRun("0 3 * * *", at("2026-01-01T03:00:00Z")).toISOString()).toBe("2026-01-02T03:00:00.000Z");
    expect(nextCronRun("30 9 1 * *", at("2026-01-15T00:00:00Z")).toISOString()).toBe("2026-02-01T09:30:00.000Z");
    expect(nextCronRun("0 0 * * mon", at("2026-01-01T00:00:00Z")).toISOString()).toBe("2026-01-05T00:00:00.000Z");
    expect(nextCronRun("0 12 * jun *", at("2026-01-01T00:00:00Z")).toISOString()).toBe("2026-06-01T12:00:00.000Z");
  });

  it("matches either day field when both are restricted, per cron convention", () => {
    // 13th of the month OR any Friday: 2026-02-13 is a Friday, so Feb 6 (a Friday) comes first.
    expect(nextCronRun("0 0 13 * 5", at("2026-02-01T00:00:00Z")).toISOString()).toBe("2026-02-06T00:00:00.000Z");
  });

  it("rejects malformed expressions", () => {
    expect(() => parseCron("* * * *")).toThrow(/5 fields/);
    expect(() => parseCron("61 * * * *")).toThrow(/out of range/);
    expect(() => parseCron("*/0 * * * *")).toThrow(/step/);
    expect(() => parseCron("a * * * *")).toThrow(/Invalid/);
  });
});

describe("defineTask", () => {
  it("validates at definition time", () => {
    expect(() => defineTask({ name: "", run: () => {} })).toThrow(/name/);
    expect(() => defineTask({ name: "x", cron: "nope", run: () => {} })).toThrow();
    expect(() => defineTask({ name: "x", lockTimeout: 0, run: () => {} })).toThrow(/lockTimeout/);
    expect(defineTask({ name: "ok", cron: "* * * * *", run: () => {} }).name).toBe("ok");
  });
});

describe("task runner", () => {
  let db: InMemoryAdapter;
  beforeEach(() => {
    db = new InMemoryAdapter();
  });

  const build = (...tasks: ReturnType<typeof defineTask>[]) =>
    defineConfig({ collections: [], globals: [], db, tasks });

  it("registers the lock collection when tasks are configured", () => {
    const config = normalizeConfig(build(defineTask({ name: "t", run: () => {} })));
    expect(config.collections.some((c) => c.slug === TASK_LOCKS_COLLECTION)).toBe(true);
  });

  it("runs a task and records the outcome", async () => {
    const run = vi.fn();
    const runner = createTaskRunner(build(defineTask({ name: "t", run })));
    const result = await runner.runTask("t");
    expect(result).toMatchObject({ name: "t", status: "completed" });
    expect(run).toHaveBeenCalledOnce();
    const row = await db.findOne({ collection: TASK_LOCKS_COLLECTION, id: "t" });
    expect(row).toMatchObject({ lockedUntil: 0, lockedBy: null, lastStatus: "completed", lastError: null });
  });

  it("lets exactly one of many concurrent runs execute", async () => {
    let running = 0;
    let maxRunning = 0;
    const run = vi.fn(async () => {
      running++;
      maxRunning = Math.max(maxRunning, running);
      await new Promise((r) => setTimeout(r, 30));
      running--;
    });
    const config = build(defineTask({ name: "t", run }));
    // Separate runners model separate server instances sharing one database.
    const results = await Promise.all(Array.from({ length: 10 }, () => createTaskRunner(config).runTask("t")));
    expect(results.filter((r) => r.status === "completed")).toHaveLength(1);
    expect(results.filter((r) => r.reason === "locked")).toHaveLength(9);
    expect(run).toHaveBeenCalledOnce();
    expect(maxRunning).toBe(1);
  });

  it("records failures, releases the lock, and allows a rerun", async () => {
    let fail = true;
    const runner = createTaskRunner(
      build(
        defineTask({
          name: "t",
          run: () => {
            if (fail) throw new Error("boom");
          },
        }),
      ),
    );
    const failed = await runner.runTask("t");
    expect(failed).toMatchObject({ status: "failed", error: "boom" });
    expect(await db.findOne({ collection: TASK_LOCKS_COLLECTION, id: "t" })).toMatchObject({
      lastStatus: "failed",
      lastError: "boom",
      lockedUntil: 0,
    });
    fail = false;
    expect((await runner.runTask("t")).status).toBe("completed");
  });

  it("aborts the signal and fails a run that exceeds lockTimeout", async () => {
    let aborted = false;
    const runner = createTaskRunner(
      build(
        defineTask({
          name: "slow",
          lockTimeout: 0.05,
          run: ({ signal }) =>
            new Promise<void>((resolve) => {
              signal.addEventListener("abort", () => {
                aborted = true;
                resolve();
              });
            }),
        }),
      ),
    );
    const result = await runner.runTask("slow");
    expect(result.status).toBe("failed");
    expect(result.error).toMatch(/lockTimeout/);
    expect(aborted).toBe(true);
  });

  it("takes over a lock that has expired", async () => {
    const run = vi.fn();
    const runner = createTaskRunner(build(defineTask({ name: "t", run })));
    await runner.runTask("t");
    await db.update({
      collection: TASK_LOCKS_COLLECTION,
      id: "t",
      data: { lockedUntil: Date.now() + 60_000, lockedBy: "dead-instance" },
    });
    expect((await runner.runTask("t")).reason).toBe("locked");
    await db.update({ collection: TASK_LOCKS_COLLECTION, id: "t", data: { lockedUntil: Date.now() - 1 } });
    expect((await runner.runTask("t")).status).toBe("completed");
  });

  it("runs a due slot once across instances, then waits for the next slot", async () => {
    const run = vi.fn();
    const config = build(defineTask({ name: "cron", cron: "*/15 * * * *", run }));
    const first = createTaskRunner(config);

    // Fixed times keep this independent of the wall clock.
    const now = at("2026-03-10T10:07:00Z");
    // First sighting registers the task; nothing is due until a slot passes.
    expect((await first.runDue(now))[0]).toMatchObject({ status: "skipped", reason: "not-due" });

    const later = at("2026-03-10T10:23:00Z"); // the 10:15 slot has passed
    const results = (
      await Promise.all(Array.from({ length: 5 }, () => createTaskRunner(config).runDue(later)))
    ).flat();
    expect(results.filter((r) => r.status === "completed")).toHaveLength(1);
    expect(run).toHaveBeenCalledOnce();

    // The slot is handled; a minute later the next slot (10:30) has not arrived.
    expect((await first.runDue(at("2026-03-10T10:24:00Z")))[0].reason).toBe("not-due");
    // Once 10:30 passes, it runs again.
    expect((await first.runDue(at("2026-03-10T10:31:00Z")))[0].status).toBe("completed");
    expect(run).toHaveBeenCalledTimes(2);
  });

  it("ignores tasks without a cron in runDue and rejects unknown names", async () => {
    const run = vi.fn();
    const runner = createTaskRunner(build(defineTask({ name: "manual", run })));
    expect(await runner.runDue(new Date(Date.now() + 86_400_000))).toEqual([]);
    await expect(runner.runTask("nope")).rejects.toThrow(/Unknown task/);
  });

  it("start returns immediately and stop settles", async () => {
    const runner = createTaskRunner(build(defineTask({ name: "t", cron: "* * * * *", run: () => {} })));
    const t0 = Date.now();
    runner.start({ intervalMs: 10 });
    expect(Date.now() - t0).toBeLessThan(50);
    await new Promise((r) => setTimeout(r, 40));
    await runner.stop();
  });
});
