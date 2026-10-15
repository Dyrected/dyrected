import { describe, it, expect } from "vitest";
import { collectReferencedComponentKeys } from "../utils/component-keys.js";

describe("collectReferencedComponentKeys", () => {
  it("returns empty sets for missing or malformed input", () => {
    for (const input of [undefined, null, 42, {}]) {
      const keys = collectReferencedComponentKeys(input);
      expect(keys.fields.size).toBe(0);
      expect(keys.pages.size).toBe(0);
    }
  });

  it("collects keys from every surface the schema can reference", () => {
    const keys = collectReferencedComponentKeys({
      admin: {
        components: { beforeDashboard: ["a"], afterDashboard: ["b"] },
        pages: [{ slug: "scan", component: "door-scanner" }, { slug: "no-component" }],
      },
      blocks: [{ slug: "hero", fields: [{ name: "x", type: "text", admin: { component: "block-field" } }] }],
      collections: [
        {
          slug: "posts",
          fields: [
            { name: "g", type: "group", fields: [{ name: "n", type: "text", admin: { component: "nested" } }] },
            { name: "b", type: "blocks", blocks: [{ slug: "cta", fields: [{ name: "y", type: "text", admin: { component: "in-block" } }] }] },
          ],
          admin: {
            components: { beforeList: ["list-a"], afterListTable: ["list-b"], collectionView: { afterViewHeader: ["view-a"] } },
          },
          views: [{ slug: "v", components: { beforeViewContent: ["view-b"] } }],
          detail: [
            { type: "section", title: "S", items: [{ type: "custom", name: "chart" }, { type: "grid", columns: 2, items: [{ type: "custom", name: "deep" }] }] },
          ],
        },
      ],
      globals: [{ slug: "site", fields: [{ name: "z", type: "text", admin: { component: "global-field" } }], detail: [{ type: "custom", name: "g-detail" }] }],
    });

    expect([...keys.dashboard].sort()).toEqual(["a", "b"]);
    expect([...keys.pages]).toEqual(["door-scanner"]);
    expect([...keys.fields].sort()).toEqual(["block-field", "global-field", "in-block", "nested"]);
    expect([...keys.collectionList].sort()).toEqual(["list-a", "list-b"]);
    expect([...keys.collectionView].sort()).toEqual(["view-a", "view-b"]);
    expect([...keys.customComponents].sort()).toEqual(["chart", "deep", "g-detail"]);
  });
});
