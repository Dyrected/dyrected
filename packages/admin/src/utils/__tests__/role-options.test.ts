import { describe, expect, it } from "vitest"
import { resolveRoleOptions } from "../role-options"

describe("resolveRoleOptions", () => {
  it("reads string options from a roles select field", () => {
    const schema = { fields: [{ name: "roles", type: "select", options: ["external", "finance", "field_ops"] }] }
    expect(resolveRoleOptions(schema)).toEqual([
      { value: "external", label: "external" },
      { value: "finance", label: "finance" },
      { value: "field_ops", label: "field_ops" },
    ])
  })

  it("reads { label, value } options and keeps the label", () => {
    const schema = { fields: [{ name: "role", type: "select", options: [{ label: "Field ops", value: "field_ops" }] }] }
    expect(resolveRoleOptions(schema)).toEqual([{ value: "field_ops", label: "Field ops" }])
  })

  it("finds a select marked admin.inviteRole when the field has another name", () => {
    const schema = { fields: [{ name: "accessLevel", type: "select", admin: { inviteRole: true }, options: ["intern"] }] }
    expect(resolveRoleOptions(schema)).toEqual([{ value: "intern", label: "intern" }])
  })

  it("drops duplicates and empty values", () => {
    const schema = { fields: [{ name: "roles", type: "select", options: ["a", "a", "", { value: "  " }, { value: "b" }] }] }
    expect(resolveRoleOptions(schema).map((o) => o.value)).toEqual(["a", "b"])
  })

  it("returns an empty list when roles have no fixed options", () => {
    expect(resolveRoleOptions({ fields: [{ name: "roles", type: "json" }] })).toEqual([])
    expect(resolveRoleOptions({ fields: [{ name: "roles", type: "select", options: { resolver: "x" } }] })).toEqual([])
    expect(resolveRoleOptions({ fields: [{ name: "email", type: "email" }] })).toEqual([])
    expect(resolveRoleOptions(undefined)).toEqual([])
  })
})
