import { describe, it, expect } from "vitest"
import { canReadSchema } from "../schema-access"

describe("canReadSchema", () => {
  it("allows when no rule is present", () => {
    expect(canReadSchema({ access: {} }, null)).toBe(true)
    expect(canReadSchema(undefined, null)).toBe(true)
  })
  it("denies when the server resolved the rule to false", () => {
    expect(canReadSchema({ access: { read: false } }, null)).toBe(false)
  })
  it("evaluates Jexl strings against the user", () => {
    const schema = { access: { read: "'editor' in user.roles" } }
    expect(canReadSchema(schema, { roles: ["editor"] })).toBe(true)
    expect(canReadSchema(schema, { roles: ["viewer"] })).toBe(false)
  })
  it("denies when a Jexl rule cannot be evaluated", () => {
    expect(canReadSchema({ access: { read: "((" } }, {})).toBe(false)
  })
})
