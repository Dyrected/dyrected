import { describe, expect, it } from "vitest";
import { Events } from "./recipe.js";

describe("cross-field validation recipe", () => {
  it("rejects an end time before the start time", () => {
    const hook = Events.hooks?.beforeChange?.[0];
    expect(() =>
      hook?.({
        data: {
          startsAt: "2026-06-20T12:00:00Z",
          endsAt: "2026-06-20T11:00:00Z",
        },
        operation: "create",
      } as never),
    ).toThrow("must be after");
  });

  it("accepts a valid time range", () => {
    const hook = Events.hooks?.beforeChange?.[0];
    expect(
      hook?.({
        data: {
          startsAt: "2026-06-20T11:00:00Z",
          endsAt: "2026-06-20T12:00:00Z",
        },
        operation: "create",
      } as never),
    ).toMatchObject({ endsAt: "2026-06-20T12:00:00Z" });
  });

  it("validates a partial update against the stored document", () => {
    const hook = Events.hooks?.beforeChange?.[0];
    expect(() =>
      hook?.({
        data: { endsAt: "2026-06-20T10:00:00Z" },
        doc: { startsAt: "2026-06-20T11:00:00Z" },
        operation: "update",
      } as never),
    ).toThrow("must be after");
  });

  it("rejects invalid date strings", () => {
    const hook = Events.hooks?.beforeChange?.[0];
    expect(() =>
      hook?.({
        data: { startsAt: "not-a-date", endsAt: "2026-06-20T12:00:00Z" },
        operation: "create",
      } as never),
    ).toThrow("valid date");
  });
});
