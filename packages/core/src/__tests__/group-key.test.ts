import { describe, it, expect } from "vitest";
import { normalizeGroupKey } from "../utils/group-key.js";

describe("normalizeGroupKey", () => {
  it("maps null and undefined to the unassigned key", () => {
    expect(normalizeGroupKey(null)).toBe("__unassigned__");
    expect(normalizeGroupKey(undefined, "number")).toBe("__unassigned__");
  });

  it("normalizes booleans however the database returns them", () => {
    for (const truthy of [true, 1, "1", "true", "t"]) expect(normalizeGroupKey(truthy, "boolean")).toBe("true");
    for (const falsy of [false, 0, "0", "false", "f"]) expect(normalizeGroupKey(falsy, "boolean")).toBe("false");
  });

  it("normalizes decimals for number and money fields", () => {
    expect(normalizeGroupKey("1.0000", "number")).toBe("1");
    expect(normalizeGroupKey("2.5000", "number")).toBe("2.5");
    expect(normalizeGroupKey(5250000, "money")).toBe("5250000");
  });

  it("normalizes timestamps to ISO strings", () => {
    expect(normalizeGroupKey(new Date("2026-01-01T00:00:00Z"), "datetime")).toBe("2026-01-01T00:00:00.000Z");
    expect(normalizeGroupKey("2026-01-01 00:00:00.000", "datetime")).toBe("2026-01-01T00:00:00.000Z");
    expect(normalizeGroupKey("2026-01-01", "date")).toBe("2026-01-01");
  });

  it("leaves text, and values of undeclared types, as strings", () => {
    expect(normalizeGroupKey("1.0000", "text")).toBe("1.0000");
    expect(normalizeGroupKey("paid")).toBe("paid");
  });
});
