import type { ConformanceAssert } from "./types.js";

const stable = (value: unknown): string =>
  JSON.stringify(value, (_key, v) =>
    v && typeof v === "object" && !Array.isArray(v)
      ? Object.fromEntries(Object.entries(v).sort(([a], [b]) => a.localeCompare(b)))
      : v,
  );

export class ConformanceFailure extends Error {
  constructor(message: string, readonly actual?: unknown, readonly expected?: unknown) {
    super(message);
    this.name = "ConformanceFailure";
  }
}

export const assert: ConformanceAssert = {
  equal(actual, expected, message) {
    if (actual !== expected) {
      throw new ConformanceFailure(
        `${message ?? "Values differ"}: expected ${stable(expected)}, got ${stable(actual)}`,
        actual,
        expected,
      );
    }
  },
  deepEqual(actual, expected, message) {
    if (stable(actual) !== stable(expected)) {
      throw new ConformanceFailure(
        `${message ?? "Values differ"}: expected ${stable(expected)}, got ${stable(actual)}`,
        actual,
        expected,
      );
    }
  },
  ok(value, message) {
    if (!value) throw new ConformanceFailure(message ?? "Expected a truthy value");
  },
};
