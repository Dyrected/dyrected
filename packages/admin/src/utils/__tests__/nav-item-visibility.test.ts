import { describe, expect, it } from "vitest"
import type { CompiledNavItem } from "@dyrected/core"
import { isNavItemVisible } from "../nav-item-visibility"

const schemas = {
  collections: [
    { slug: "orders", access: { read: true } },
    { slug: "secrets", access: { read: false } },
  ],
  globals: [{ slug: "settings", access: { read: true } }],
}

const item = (overrides: Partial<CompiledNavItem>): CompiledNavItem => ({
  id: "workspace_x",
  type: "workspace",
  slug: "x",
  label: "X",
  order: 1,
  views: [],
  ...overrides,
})

describe("isNavItemVisible", () => {
  it("shows server-tree workspaces without further checks", () => {
    expect(isNavItemVisible(item({}), schemas, {})).toBe(true)
  })

  it("hides server-tree collections the user cannot read", () => {
    expect(isNavItemVisible(item({ type: "collection", slug: "secrets" }), schemas, {})).toBe(false)
    expect(isNavItemVisible(item({ type: "collection", slug: "orders" }), schemas, {})).toBe(true)
  })

  it("shows a user-defined item only when its collection is readable", () => {
    expect(isNavItemVisible(item({ userDefined: true, collection: "orders" }), schemas, {})).toBe(true)
    expect(isNavItemVisible(item({ userDefined: true, collection: "secrets" }), schemas, {})).toBe(false)
  })

  it("hides a user-defined item if any view targets an unreadable collection", () => {
    const views = [{ slug: "v", label: "V", collection: "secrets" }] as any
    expect(isNavItemVisible(item({ userDefined: true, collection: "orders", views }), schemas, {})).toBe(false)
  })

  it("hides a user-defined item that points at an unknown collection or at nothing", () => {
    expect(isNavItemVisible(item({ userDefined: true, collection: "ghost" }), schemas, {})).toBe(false)
    expect(isNavItemVisible(item({ userDefined: true }), schemas, {})).toBe(false)
  })

  it("checks user-defined globals", () => {
    expect(isNavItemVisible(item({ userDefined: true, global: "settings" }), schemas, {})).toBe(true)
    expect(isNavItemVisible(item({ userDefined: true, global: "ghost" }), schemas, {})).toBe(false)
  })
})
