import { describe, expect, it } from "vitest"
import { icons } from "lucide-react"
import { availableIconNames } from "./icon-picker"

describe("IconPicker registry", () => {
  it("discovers Lucide icon components from the dynamic registry", () => {
    expect(availableIconNames.length).toBeGreaterThan(1_000)
    expect(availableIconNames).toContain("Activity")
    expect(icons.Activity).toBeDefined()
  })
})
