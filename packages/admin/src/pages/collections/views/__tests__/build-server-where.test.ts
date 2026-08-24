import { describe, expect, it } from "vitest"
import { buildServerWhere, translateColumnFilter } from "../build-server-where"

describe("buildServerWhere", () => {
  const schema = {
    fields: [
      { name: "name", type: "text" },
      { name: "email", type: "email" },
      { name: "guestCount", type: "number" },
      { name: "attending", type: "boolean" },
      { name: "status", type: "select", options: ["requested", "paid", "collected"] },
      { name: "createdAt", type: "date" },
    ],
  }

  describe("translateColumnFilter", () => {
    it("translates multi-select array to { field: { in: [...] } } with boolean coercion", () => {
      const result = translateColumnFilter("attending", ["true", "false"], schema)
      expect(result).toEqual({ attending: { in: [true, false] } })
    })

    it("translates multi-select array with string values", () => {
      const result = translateColumnFilter("status", ["paid", "collected"], schema)
      expect(result).toEqual({ status: { in: ["paid", "collected"] } })
    })

    it("translates text contains / iLike operator", () => {
      const result = translateColumnFilter("name", { operator: "iLike", value: "Ade" }, schema)
      expect(result).toEqual({ name: { contains: "Ade" } })
    })

    it("translates equality operators", () => {
      const eq = translateColumnFilter("attending", { operator: "eq", value: "true" }, schema)
      expect(eq).toEqual({ attending: { equals: true } })

      const ne = translateColumnFilter("status", { operator: "ne", value: "paid" }, schema)
      expect(ne).toEqual({ status: { not_equals: "paid" } })
    })

    it("translates numeric comparison operators", () => {
      expect(translateColumnFilter("guestCount", { operator: "gt", value: "2" }, schema)).toEqual({
        guestCount: { gt: 2 },
      })
      expect(translateColumnFilter("guestCount", { operator: "lte", value: 5 }, schema)).toEqual({
        guestCount: { lte: 5 },
      })
      expect(
        translateColumnFilter("guestCount", { operator: "isBetween", value: 1, value2: 4 }, schema),
      ).toEqual({
        guestCount: { gte: 1, lte: 4 },
      })
    })

    it("translates isEmpty and isNotEmpty operators", () => {
      const empty = translateColumnFilter("email", { operator: "isEmpty" }, schema)
      expect(empty).toEqual({
        OR: [{ email: null }, { email: "" }, { email: { exists: false } }],
      })

      const notEmpty = translateColumnFilter("email", { operator: "isNotEmpty" }, schema)
      expect(notEmpty).toEqual({
        AND: [{ email: { not_equals: null } }, { email: { not_equals: "" } }],
      })
    })

    it("translates raw string search filter", () => {
      expect(translateColumnFilter("name", "John", schema)).toEqual({
        name: { contains: "John" },
      })
    })

    it("returns null for empty filter values", () => {
      expect(translateColumnFilter("name", undefined, schema)).toBeNull()
      expect(translateColumnFilter("name", "", schema)).toBeNull()
      expect(translateColumnFilter("status", [], schema)).toBeNull()
    })
  })

  describe("buildServerWhere", () => {
    it("returns undefined when no base filter, search, or column filters exist", () => {
      expect(buildServerWhere({})).toBeUndefined()
    })

    it("returns base filter when no interactive filters are present", () => {
      const base = { attending: { equals: true } }
      expect(buildServerWhere({ baseFilter: base })).toEqual(base)
    })

    it("merges base filter with column filters using AND", () => {
      const base = { attending: { equals: true } }
      const columnFilters = [{ id: "status", value: ["paid"] }]
      const result = buildServerWhere({ baseFilter: base, columnFilters, schema })
      expect(result).toEqual({
        AND: [base, { status: { in: ["paid"] } }],
      })
    })

    it("combines global search across searchable fields using OR", () => {
      const result = buildServerWhere({
        search: "Ade",
        searchableFields: ["name", "email"],
        schema,
      })
      expect(result).toEqual({
        OR: [{ name: { contains: "Ade" } }, { email: { contains: "Ade" } }],
      })
    })

    it("combines base filter, search, and multiple column filters", () => {
      const base = { attending: { equals: true } }
      const columnFilters = [
        { id: "status", value: ["paid", "collected"] },
        { id: "guestCount", value: { operator: "gte", value: 2 } },
      ]
      const result = buildServerWhere({
        baseFilter: base,
        columnFilters,
        search: "Ade",
        searchableFields: ["name"],
        schema,
      })
      expect(result).toEqual({
        AND: [
          base,
          { OR: [{ name: { contains: "Ade" } }] },
          { status: { in: ["paid", "collected"] } },
          { guestCount: { gte: 2 } },
        ],
      })
    })

    it("combines multiple column filters with OR when joinOperator is 'or'", () => {
      const columnFilters = [
        { id: "status", value: ["paid"] },
        { id: "guestCount", value: { operator: "gt", value: 3 } },
      ]
      const result = buildServerWhere({
        columnFilters,
        schema,
        joinOperator: "or",
      })
      expect(result).toEqual({
        OR: [
          { status: { in: ["paid"] } },
          { guestCount: { gt: 3 } },
        ],
      })
    })

    it("combines baseFilter with OR-joined column filters", () => {
      const base = { attending: { equals: true } }
      const columnFilters = [
        { id: "status", value: ["paid"] },
        { id: "status", value: ["collected"] },
      ]
      const result = buildServerWhere({
        baseFilter: base,
        columnFilters,
        schema,
        joinOperator: "or",
      })
      expect(result).toEqual({
        AND: [
          base,
          {
            OR: [
              { status: { in: ["paid"] } },
              { status: { in: ["collected"] } },
            ],
          },
        ],
      })
    })
  })
})
