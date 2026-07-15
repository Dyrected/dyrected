import { describe, expect, it } from "vitest";
import { Navigation } from "./recipe.js";

describe("navigation global links recipe", () => {
  it("models navigation as repeatable rows", () => {
    const items = Navigation.fields[0];
    expect(items).toMatchObject({ name: "items", type: "array" });
  });

  it("supports one level of child links", () => {
    const items = Navigation.fields[0];
    const children = "fields" in items ? items.fields?.[2] : undefined;
    expect(children).toMatchObject({ name: "children", type: "array" });
  });
});
