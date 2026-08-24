import { describe, expect, it } from "vitest"

import type { SerializedAction } from "../types"
import { resolveViewActions } from "../resolve-view-actions"

const customRow: SerializedAction = {
  name: "checkIn",
  label: "Check in",
  icon: "Check",
  type: "row",
}

const customBulk: SerializedAction = {
  name: "markPaid",
  label: "Mark paid",
  type: "bulk",
}

const customHeader: SerializedAction = {
  name: "sendReminders",
  label: "Send reminders",
  type: "header",
}

const allAccess = { canCreate: true, canDelete: true, hasDetail: true }

describe("resolveViewActions", () => {
  it("keeps View · Edit · Delete inline-first with customs after and Duplicate last", () => {
    const resolved = resolveViewActions(
      { actions: [customRow] },
      allAccess,
    )

    expect(resolved.rowActions.map((action) => action.name)).toEqual([
      "__view",
      "__edit",
      "__delete",
      "checkIn",
      "__duplicate",
    ])
  })

  it("splits buckets by type", () => {
    const resolved = resolveViewActions(
      { actions: [customHeader, customRow, customBulk] },
      allAccess,
    )

    expect(resolved.headerActions.map((action) => action.name)).toEqual(["sendReminders"])
    expect(resolved.bulkActions.map((action) => action.name)).toEqual(["markPaid", "__delete-bulk", "__export-selected"])
  })

  it("drops built-ins disabled through features and gates on permissions", () => {
    const resolved = resolveViewActions(
      { features: { duplicate: false, delete: false } },
      { canCreate: true, canDelete: true, hasDetail: true },
    )
    expect(resolved.rowActions.map((action) => action.name)).not.toContain("__duplicate")
    expect(resolved.bulkActions.map((action) => action.name)).not.toContain("__delete-bulk")
    // exportSelected is independent of delete access
    expect(resolved.bulkActions.map((action) => action.name)).toContain("__export-selected")

    const noCreate = resolveViewActions({}, { canCreate: false, canDelete: true, hasDetail: true })
    expect(noCreate.rowActions.map((action) => action.name)).not.toContain("__duplicate")
  })

  it("omits View when the collection has no detail page", () => {
    const resolved = resolveViewActions(
      {},
      { canCreate: true, canDelete: true, hasDetail: false },
    )
    expect(resolved.rowActions.map((action) => action.name)).not.toContain("__view")
    expect(resolved.rowActions[0]?.name).toBe("__edit")
  })

  it("honors actionOrder, including promoting customs inline", () => {
    const resolved = resolveViewActions(
      { actions: [customRow], actionOrder: ["checkIn", "edit"] },
      allAccess,
    )

    // Ranked names first (in the given order), then unranked names keep
    // their default relative order.
    expect(resolved.rowActions.map((action) => action.name)).toEqual([
      "checkIn",
      "__edit",
      "__view",
      "__delete",
      "__duplicate",
    ])
  })
})
