import { describe, it, expect } from "vitest";
import { defineCustomView, defineView } from "../types/views.js";
import { collectReferencedComponentKeys } from "../utils/component-keys.js";
import { serializeViewForApi } from "../router.js";

describe("custom view layouts", () => {
  it("keeps config as authored", () => {
    const view = defineCustomView({
      slug: "seating",
      label: "Seating",
      layout: "custom",
      component: "guests.seatingChart",
      options: { tableField: "table" },
      data: { fetchAll: true },
    });
    expect(view.component).toBe("guests.seatingChart");
    expect(defineView(view)).toBe(view);
  });

  it("rejects a custom view without a component", () => {
    expect(() => defineCustomView({ slug: "x", label: "X", layout: "custom" } as any)).toThrow(
      /uses layout: "custom" but has no `component`/,
    );
    expect(() => defineView({ slug: "x", label: "X", layout: "custom", component: " " } as any)).toThrow();
  });

  it("reports the component as a referenced viewLayouts key", () => {
    const keys = collectReferencedComponentKeys({
      collections: [{ slug: "guests", fields: [], views: [{ slug: "s", layout: "custom", component: "guests.seatingChart" }, { slug: "t", layout: "table" }] }],
    });
    expect([...keys.viewLayouts]).toEqual(["guests.seatingChart"]);
  });

  it("serializes component, options and data for the admin", async () => {
    const serialized = await serializeViewForApi(
      { slug: "s", label: "S", layout: "custom", component: "c", options: { a: 1 }, data: { pageSize: 20 } },
      async (access) => access,
    );
    expect(serialized).toMatchObject({ layout: "custom", component: "c", options: { a: 1 }, data: { pageSize: 20 } });
  });

  it("does not leak custom fields onto built-in layouts", async () => {
    const serialized = await serializeViewForApi({ slug: "t", label: "T", layout: "table", component: "ignored" }, async (a) => a);
    expect(serialized.component).toBeUndefined();
  });
});
