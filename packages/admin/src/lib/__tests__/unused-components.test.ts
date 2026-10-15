import { describe, it, expect } from "vitest";
import { findUnusedComponentKeys } from "../unused-components";

const C = () => null;

describe("findUnusedComponentKeys", () => {
  it("returns nothing until both components and schemas are available", () => {
    expect(findUnusedComponentKeys(undefined, { collections: [], globals: [] } as any)).toEqual([]);
    expect(findUnusedComponentKeys({ fields: { a: C } }, null)).toEqual([]);
  });

  it("flags registered keys the schema never references", () => {
    const schemas = {
      collections: [{ slug: "posts", fields: [{ name: "t", type: "text", admin: { component: "used" } }] }],
      globals: [],
    } as any;
    expect(findUnusedComponentKeys({ fields: { used: C, orphan: C }, pages: { stray: C } }, schemas)).toEqual([
      "fields:orphan",
      "pages:stray",
    ]);
  });
});
