import { describe, expect, it } from "vitest";
import { resolveActionMutation } from "../utils/action-mutation.js";

describe("resolveActionMutation", () => {
  const ctx = {
    doc: { name: "Tunde Bakare", email: "tunde@example.com", guestCount: 2 },
    input: { tableNumber: 12, notes: "Near window" },
    user: { sub: "user-1", email: "admin@example.com" },
  };

  it("passes literals through untouched", () => {
    expect(
      resolveActionMutation({ checkedIn: true, count: 0, tag: "vip", nothing: null }, ctx),
    ).toEqual({ checkedIn: true, count: 0, tag: "vip", nothing: null });
  });

  it("resolves now() to an ISO timestamp", () => {
    const result = resolveActionMutation({ checkedInAt: "now()" }, ctx);
    expect(result.checkedInAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  });

  it("resolves input paths", () => {
    expect(resolveActionMutation({ tableNumber: "input.tableNumber" }, ctx)).toEqual({
      tableNumber: 12,
    });
    expect(resolveActionMutation({ seatingNotes: "input.notes" }, ctx)).toEqual({
      seatingNotes: "Near window",
    });
  });

  it("resolves doc and user paths", () => {
    expect(resolveActionMutation({ email: "doc.email", createdBy: "user.sub" }, ctx)).toEqual({
      email: "tunde@example.com",
      createdBy: "user-1",
    });
  });

  it("returns undefined for missing paths instead of throwing", () => {
    expect(resolveActionMutation({ value: "input.missing.deep" }, ctx)).toEqual({
      value: undefined,
    });
  });

  it("resolves nested objects and arrays recursively", () => {
    expect(
      resolveActionMutation(
        {
          nested: { at: "now()", from: "input.tableNumber", literal: "keep" },
          list: ["input.tableNumber", 5],
        },
        ctx,
      ),
    ).toEqual({
      nested: { at: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/), from: 12, literal: "keep" },
      list: [12, 5],
    });
  });

  it("returns an empty object when no mutation is defined", () => {
    expect(resolveActionMutation(undefined, ctx)).toEqual({});
  });

  it("keeps plain strings that merely contain dots untouched", () => {
    expect(resolveActionMutation({ status: "requested" }, ctx)).toEqual({ status: "requested" });
    expect(resolveActionMutation({ note: "input.tableNumber was nice" }, ctx)).toEqual({
      note: "input.tableNumber was nice",
    });
  });
});
