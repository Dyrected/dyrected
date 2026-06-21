import { describe, expect, it } from "vitest";
import { Pages } from "./recipe.js";

describe("page builder blocks recipe", () => {
  it("registers reusable blocks on the layout field", () => {
    const layout = Pages.fields.find((field) => field.name === "layout");
    expect(layout).toMatchObject({ type: "blocks", label: "Page layout" });
    expect(layout && "blocks" in layout ? layout.blocks.map((block) => block.slug) : []).toEqual(["hero", "callToAction"]);
  });
});
