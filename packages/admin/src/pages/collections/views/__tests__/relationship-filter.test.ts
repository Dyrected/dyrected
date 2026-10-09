import { describe, expect, it } from "vitest"
import { relationshipFilter, multiSelectFilter, operatorDateFilter, buildViewColumns } from "../build-view-columns"
import { translateColumnFilter, buildServerWhere } from "../build-server-where"

describe("Relationship Filtering", () => {
  const schema = {
    slug: "posts",
    fields: [
      { name: "title", type: "text" },
      { name: "author", type: "relationship", relationTo: "users" },
      { name: "tags", type: "relationship", relationTo: "tags", hasMany: true },
    ],
  }

  describe("relationshipFilter (TanStack filter matcher)", () => {
    it("matches single unpopulated relationship ID", () => {
      const row = {
        getValue: (id: string) => (id === "author" ? "usr_123" : undefined),
      }
      expect(relationshipFilter(row, "author", ["usr_123", "usr_456"])).toBe(true)
      expect(relationshipFilter(row, "author", ["usr_999"])).toBe(false)
    })

    it("matches populated document object with ID", () => {
      const row = {
        getValue: (id: string) => (id === "author" ? { id: "usr_123", name: "Jane" } : undefined),
      }
      expect(relationshipFilter(row, "author", ["usr_123"])).toBe(true)
      expect(relationshipFilter(row, "author", ["usr_999"])).toBe(false)
    })

    it("matches multi-relation (hasMany) array of IDs", () => {
      const row = {
        getValue: (id: string) => (id === "tags" ? ["tag_1", "tag_2"] : undefined),
      }
      expect(relationshipFilter(row, "tags", ["tag_2", "tag_3"])).toBe(true)
      expect(relationshipFilter(row, "tags", ["tag_99"])).toBe(false)
    })

    it("matches multi-relation (hasMany) array of populated objects", () => {
      const row = {
        getValue: (id: string) => (id === "tags" ? [{ id: "tag_1" }, { id: "tag_2" }] : undefined),
      }
      expect(relationshipFilter(row, "tags", ["tag_1"])).toBe(true)
      expect(relationshipFilter(row, "tags", ["tag_99"])).toBe(false)
    })

    it("returns true when filter value is empty", () => {
      const row = {
        getValue: () => "usr_123",
      }
      expect(relationshipFilter(row, "author", [])).toBe(true)
    })

    it("returns false when cell is null or empty", () => {
      const row = {
        getValue: () => null,
      }
      expect(relationshipFilter(row, "author", ["usr_123"])).toBe(false)
    })
  })

  describe("buildViewColumns relationship metadata", () => {
    it("assigns variant 'relationship', relationTo, and hasMany to column meta", () => {
      const columns = buildViewColumns({
        schema,
        client: {},
        schemas: {},
      })

      const authorCol = columns.find((c: any) => c.id === "author")
      expect(authorCol).toBeDefined()
      expect(authorCol?.meta).toMatchObject({
        fieldName: "author",
        variant: "relationship",
        relationTo: "users",
        hasMany: false,
      })
      expect((authorCol as any)?.filterFn).toBe(relationshipFilter)

      const tagsCol = columns.find((c: any) => c.id === "tags")
      expect(tagsCol).toBeDefined()
      expect(tagsCol?.meta).toMatchObject({
        fieldName: "tags",
        variant: "relationship",
        relationTo: "tags",
        hasMany: true,
      })
      expect((tagsCol as any)?.filterFn).toBe(relationshipFilter)
    })
  })

  describe("translateColumnFilter and buildServerWhere for relationships", () => {
    it("translates relationship filter array to { field: { in: [...] } }", () => {
      const result = translateColumnFilter("author", ["usr_1", "usr_2"], schema)
      expect(result).toEqual({ author: { in: ["usr_1", "usr_2"] } })
    })

    it("builds server where including relationship filters", () => {
      const where = buildServerWhere({
        schema,
        columnFilters: [
          { id: "author", value: ["usr_1", "usr_2"] },
        ],
      })
      expect(where).toEqual({ author: { in: ["usr_1", "usr_2"] } })
    })
  })

  describe("multiSelectFilter for select and multiSelect fields", () => {
    it("matches single scalar string in select field", () => {
      const row = {
        getValue: (id: string) => (id === "status" ? "published" : undefined),
      }
      expect(multiSelectFilter(row, "status", ["draft", "published"])).toBe(true)
      expect(multiSelectFilter(row, "status", ["archived"])).toBe(false)
    })

    it("matches array of values in multiSelect field", () => {
      const row = {
        getValue: (id: string) => (id === "categories" ? ["tech", "ai"] : undefined),
      }
      expect(multiSelectFilter(row, "categories", ["ai", "design"])).toBe(true)
      expect(multiSelectFilter(row, "categories", ["sports"])).toBe(false)
    })
  })

  describe("operatorDateFilter for date and datetime fields", () => {
    // Record created on Oct 9, 2026 at 2:32 PM UTC
    const rowOct9 = {
      getValue: (id: string) => (id === "createdAt" ? "2026-10-09T14:32:00.000Z" : undefined),
    }
    // Record created on Oct 11, 2026 at 10:00 AM UTC
    const rowOct11 = {
      getValue: (id: string) => (id === "createdAt" ? "2026-10-11T10:00:00.000Z" : undefined),
    }

    it("matches full day for 'eq' (Is) regardless of record time-of-day", () => {
      expect(
        operatorDateFilter(rowOct9, "createdAt", {
          operator: "eq",
          value: "2026-10-09T00:00:00.000Z",
        }),
      ).toBe(true)

      expect(
        operatorDateFilter(rowOct11, "createdAt", {
          operator: "eq",
          value: "2026-10-09T00:00:00.000Z",
        }),
      ).toBe(false)
    })

    it("excludes the day for 'ne' (Is not)", () => {
      expect(
        operatorDateFilter(rowOct9, "createdAt", {
          operator: "ne",
          value: "2026-10-09T00:00:00.000Z",
        }),
      ).toBe(false)

      expect(
        operatorDateFilter(rowOct11, "createdAt", {
          operator: "ne",
          value: "2026-10-09T00:00:00.000Z",
        }),
      ).toBe(true)
    })

    it("correctly matches date ranges for 'isBetween' spanning two dates", () => {
      const rangeFilter = {
        operator: "isBetween",
        value: "2026-10-09T00:00:00.000Z",
        value2: "2026-10-11T00:00:00.000Z",
      }

      // Both Oct 9 and Oct 11 fall within the range [Oct 9 00:00:00 -> Oct 11 23:59:59]
      expect(operatorDateFilter(rowOct9, "createdAt", rangeFilter)).toBe(true)
      expect(operatorDateFilter(rowOct11, "createdAt", rangeFilter)).toBe(true)

      // Oct 15 is outside the range
      const rowOct15 = {
        getValue: (id: string) => (id === "createdAt" ? "2026-10-15T09:00:00.000Z" : undefined),
      }
      expect(operatorDateFilter(rowOct15, "createdAt", rangeFilter)).toBe(false)
    })

    it("handles isEmpty and isNotEmpty", () => {
      const emptyRow = { getValue: () => null }
      expect(operatorDateFilter(emptyRow, "createdAt", { operator: "isEmpty" })).toBe(true)
      expect(operatorDateFilter(emptyRow, "createdAt", { operator: "isNotEmpty" })).toBe(false)
      expect(operatorDateFilter(rowOct9, "createdAt", { operator: "isEmpty" })).toBe(false)
      expect(operatorDateFilter(rowOct9, "createdAt", { operator: "isNotEmpty" })).toBe(true)
    })
  })
})
