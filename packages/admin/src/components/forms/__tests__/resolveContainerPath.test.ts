import { describe, it, expect } from "vitest"
import { resolveContainerPath } from "../utils"
import type { Field as FieldSchema } from "@dyrected/sdk"

// A page schema: a `blocks` field whose "hero" block contains a plain object
// `cta`, plus a drillIn object `seo` and a drillIn array `items`.
const fields: FieldSchema[] = [
  { name: "title", type: "text" },
  {
    name: "body",
    type: "blocks",
    blocks: [
      {
        slug: "hero",
        fields: [
          { name: "heading", type: "text" },
          { name: "cta", type: "object", fields: [{ name: "url", type: "text" }] },
        ],
      },
      {
        slug: "gallery",
        fields: [
          {
            name: "items",
            type: "array",
            admin: { drillIn: true },
            fields: [{ name: "icon", type: "text" }],
          },
        ],
      },
    ],
  },
  {
    name: "seo",
    type: "object",
    admin: { drillIn: true },
    fields: [{ name: "description", type: "textarea" }],
  },
] as unknown as FieldSchema[]

// Deterministic stub: id is `${basePath}#${index}`.
const getStableId = (basePath: string, index: number) => `${basePath}#${index}`

describe("resolveContainerPath", () => {
  it("resolves a leaf inside a blocks item to one boundary at the item", () => {
    const trail = resolveContainerPath(fields, "body.2.heading", getStableId)
    expect(trail).toEqual([
      {
        fieldName: "body",
        basePath: "body.2",
        stableId: "body#2",
        breadcrumbLabel: "Body",
      },
    ])
  })

  it("does not emit a boundary for a plain (non-drillIn) object inside a block", () => {
    // cta is a plain object → consumed, not emitted. Only body.2 is a boundary.
    const trail = resolveContainerPath(fields, "body.2.cta.url", getStableId)
    expect(trail).toEqual([
      {
        fieldName: "body",
        basePath: "body.2",
        stableId: "body#2",
        breadcrumbLabel: "Body",
      },
    ])
  })

  it("emits a boundary for a drillIn array nested inside a block, with cumulative basePath", () => {
    const trail = resolveContainerPath(fields, "body.1.items.3.icon", getStableId)
    expect(trail).toEqual([
      { fieldName: "body", basePath: "body.1", stableId: "body#1", breadcrumbLabel: "Body" },
      // basePath must be cumulative: body.1.items.3 (not items.3), and the
      // stableId must be resolved against the cumulative array path.
      { fieldName: "items", basePath: "body.1.items.3", stableId: "body.1.items#3", breadcrumbLabel: "Items" },
    ])
  })

  it("emits a boundary for a top-level drillIn object (no index, no stableId)", () => {
    const trail = resolveContainerPath(fields, "seo.description", getStableId)
    expect(trail).toEqual([
      { fieldName: "seo", basePath: "seo", stableId: undefined, breadcrumbLabel: "Seo" },
    ])
  })

  it("returns [] for a top-level leaf field (no drillable boundary)", () => {
    expect(resolveContainerPath(fields, "title", getStableId)).toEqual([])
  })

  it("does not emit a boundary when the path ends at the container itself", () => {
    // "body.2" with no trailing field → not a drillable *field* position.
    expect(resolveContainerPath(fields, "body", getStableId)).toEqual([])
  })

  it("returns null when the path does not match the schema", () => {
    expect(resolveContainerPath(fields, "nope.0.x", getStableId)).toBeNull()
  })
})
