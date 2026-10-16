import { describe, expect, it } from "vitest"
import { BUILT_IN_LAYOUTS, USER_SELECTABLE_LAYOUTS, getLayoutCapabilities } from "../layout-registry"

describe("layout registry", () => {
  it("describes every built-in layout", () => {
    for (const name of BUILT_IN_LAYOUTS) {
      const caps = getLayoutCapabilities(name)
      expect(caps.label).toBeTruthy()
      expect(caps.icon).toBeTruthy()
    }
  })

  it("only treats table and spreadsheet as tabular", () => {
    const tabular = BUILT_IN_LAYOUTS.filter((name) => getLayoutCapabilities(name).tabular)
    expect(tabular).toEqual(["table", "spreadsheet"])
  })

  it("offers the customizer exactly the layouts it offered before, in order", () => {
    expect(USER_SELECTABLE_LAYOUTS.map((layout) => layout.value)).toEqual([
      "table",
      "kanban",
      "cards",
      "calendar",
      "gantt",
    ])
  })

  it("keeps spreadsheet and custom out of the picker", () => {
    const values = USER_SELECTABLE_LAYOUTS.map((layout) => layout.value as string)
    expect(values).not.toContain("spreadsheet")
    expect(values).not.toContain("custom")
  })

  it("says gantt renders as a table until it has its own renderer, and unknown names fall back to table", () => {
    expect(getLayoutCapabilities("gantt").rendersAs).toBe("table")
    expect(getLayoutCapabilities("not-a-layout")).toBe(getLayoutCapabilities("table"))
    expect(getLayoutCapabilities(undefined)).toBe(getLayoutCapabilities("table"))
  })
})
