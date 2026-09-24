import { describe, expect, it } from "vitest"
import {
  deserializeFilter,
  formatOperator,
  getFieldKind,
  OPERATORS_BY_KIND,
  serializeFilter,
} from "../filter-dsl"

describe("Filter DSL Utilities", () => {
  const mockFields = [
    { name: "title", type: "text" },
    { name: "status", type: "select", options: ["draft", "active", "archived"] },
    { name: "priority", type: "number" },
    { name: "isFeatured", type: "boolean" },
    { name: "publishedAt", type: "datetime" },
  ]

  describe("getFieldKind", () => {
    it("identifies field kinds correctly", () => {
      expect(getFieldKind({ name: "title", type: "text" })).toBe("text")
      expect(getFieldKind({ name: "amount", type: "currency" })).toBe("number")
      expect(getFieldKind({ name: "publishedAt", type: "datetime" })).toBe("date")
      expect(getFieldKind({ name: "stage", type: "select" })).toBe("select")
      expect(getFieldKind({ name: "is_active", type: "boolean" })).toBe("boolean")
    })

    it("falls back based on naming heuristics", () => {
      expect(getFieldKind({ name: "createdAt" })).toBe("date")
      expect(getFieldKind({ name: "order_total" })).toBe("number")
      expect(getFieldKind({ name: "notes" })).toBe("text")
    })
  })

  describe("OPERATORS_BY_KIND", () => {
    it("defines valid operators for select, text, number, date, and boolean", () => {
      expect(OPERATORS_BY_KIND.select.map((o) => o.value)).toContain("in")
      expect(OPERATORS_BY_KIND.text.map((o) => o.value)).toContain("contains")
      expect(OPERATORS_BY_KIND.number.map((o) => o.value)).toContain("between")
      expect(OPERATORS_BY_KIND.date.map((o) => o.value)).toContain("between")
      expect(OPERATORS_BY_KIND.boolean.map((o) => o.value)).toContain("equals")
    })
  })

  describe("formatOperator", () => {
    it("formats operators into human-readable representations", () => {
      expect(formatOperator("equals")).toBe("is")
      expect(formatOperator("not_equals")).toBe("is not")
      expect(formatOperator("greater_than")).toBe(">")
      expect(formatOperator("greater_than_or_equal")).toBe("≥")
      expect(formatOperator("less_than")).toBe("<")
      expect(formatOperator("less_than_or_equal")).toBe("≤")
      expect(formatOperator("contains")).toBe("contains")
      expect(formatOperator("in")).toBe("in")
      expect(formatOperator("between")).toBe("between")
      expect(formatOperator("exists")).toBe("is set")
      expect(formatOperator("not_exists")).toBe("is empty")
    })
  })

  describe("deserializeFilter", () => {
    it("handles undefined or empty filter", () => {
      expect(deserializeFilter(undefined)).toEqual([])
      expect(deserializeFilter({})).toEqual([])
    })

    it("deserializes simple equals filters", () => {
      const rows = deserializeFilter({ status: "active" })
      expect(rows).toHaveLength(1)
      expect(rows[0].field).toBe("status")
      expect(rows[0].operator).toBe("equals")
      expect(rows[0].value).toBe("active")
    })

    it("deserializes operator objects", () => {
      const rows = deserializeFilter({
        priority: { greater_than: 5 },
        title: { contains: "vip" },
      })
      expect(rows).toHaveLength(2)

      const priorityRow = rows.find((r) => r.field === "priority")
      expect(priorityRow).toBeDefined()
      expect(priorityRow?.operator).toBe("greater_than")
      expect(priorityRow?.value).toBe(5)

      const titleRow = rows.find((r) => r.field === "title")
      expect(titleRow).toBeDefined()
      expect(titleRow?.operator).toBe("contains")
      expect(titleRow?.value).toBe("vip")
    })

    it("deserializes between conditions", () => {
      const rows = deserializeFilter({
        priority: { greater_than_or_equal: 10, less_than_or_equal: 50 },
      })
      expect(rows).toHaveLength(1)
      expect(rows[0].operator).toBe("between")
      expect(rows[0].value).toBe(10)
      expect(rows[0].value2).toBe(50)
    })

    it("deserializes in / not_in conditions", () => {
      const rows = deserializeFilter({
        status: { in: ["active", "pending"] },
      })
      expect(rows).toHaveLength(1)
      expect(rows[0].operator).toBe("in")
      expect(rows[0].value).toBe("active, pending")
    })

    it("deserializes exists / not_exists conditions", () => {
      const rows = deserializeFilter({
        publishedAt: { exists: true },
        archivedAt: { exists: false },
      })
      expect(rows).toHaveLength(2)

      const pubRow = rows.find((r) => r.field === "publishedAt")
      expect(pubRow?.operator).toBe("exists")

      const archRow = rows.find((r) => r.field === "archivedAt")
      expect(archRow?.operator).toBe("not_exists")
    })
  })

  describe("serializeFilter", () => {
    it("returns undefined for empty rows", () => {
      expect(serializeFilter([], mockFields)).toBeUndefined()
    })

    it("serializes equals correctly with type casting", () => {
      const rows = [
        { id: "1", field: "status", operator: "equals", value: "active" },
        { id: "2", field: "priority", operator: "equals", value: "10" },
        { id: "3", field: "isFeatured", operator: "equals", value: "true" },
      ]
      const filter = serializeFilter(rows, mockFields)
      expect(filter).toEqual({
        status: "active",
        priority: 10,
        isFeatured: true,
      })
    })

    it("serializes comparison operators", () => {
      const rows = [
        { id: "1", field: "priority", operator: "greater_than", value: "5" },
        { id: "2", field: "title", operator: "contains", value: "hello" },
      ]
      const filter = serializeFilter(rows, mockFields)
      expect(filter).toEqual({
        priority: { greater_than: 5 },
        title: { contains: "hello" },
      })
    })

    it("serializes between operator", () => {
      const rows = [
        { id: "1", field: "priority", operator: "between", value: "5", value2: "20" },
      ]
      const filter = serializeFilter(rows, mockFields)
      expect(filter).toEqual({
        priority: {
          greater_than_or_equal: 5,
          less_than_or_equal: 20,
        },
      })
    })

    it("serializes in / not_in comma-separated lists", () => {
      const rows = [
        { id: "1", field: "status", operator: "in", value: "draft, active" },
      ]
      const filter = serializeFilter(rows, mockFields)
      expect(filter).toEqual({
        status: { in: ["draft", "active"] },
      })
    })

    it("serializes exists / not_exists operators", () => {
      const rows = [
        { id: "1", field: "publishedAt", operator: "exists", value: "" },
        { id: "2", field: "priority", operator: "not_exists", value: "" },
      ]
      const filter = serializeFilter(rows, mockFields)
      expect(filter).toEqual({
        publishedAt: { exists: true },
        priority: { exists: false },
      })
    })
  })
})
