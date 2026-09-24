import { describe, expect, it } from "vitest";
import { resolveAction, supportDeskWorkspace } from "./recipe.js";

describe("support-desk-workspace recipe", () => {
  it("lists open, urgent, and resolved views with open first", () => {
    expect(supportDeskWorkspace.views?.map((view) => view.slug)).toEqual([
      "open",
      "urgent",
      "resolved",
    ]);
  });

  it("narrows the urgent view to open urgent tickets and badges it", () => {
    const urgent = supportDeskWorkspace.views?.[1];
    expect(urgent?.filter).toEqual({
      status: { equals: "open" },
      priority: { equals: "urgent" },
    });
    expect(urgent?.badge).toMatchObject({ variant: "destructive" });
  });

  it("counts open tickets in the workspace badge", () => {
    expect(supportDeskWorkspace.badge).toMatchObject({
      aggregate: { collection: "tickets", where: { status: { equals: "open" } } },
    });
  });

  it("resolves tickets with a declarative mutation", () => {
    expect(resolveAction.mutation).toEqual({ status: "resolved", resolvedAt: "now()" });
  });
});
