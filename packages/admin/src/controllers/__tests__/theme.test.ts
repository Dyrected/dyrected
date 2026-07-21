import { describe, expect, it, vi } from "vitest"
import { createAdminThemeController } from "../theme"

describe("createAdminThemeController", () => {
  it("derives resolved theme and class name from theme preference and system theme", () => {
    const controller = createAdminThemeController({
      theme: "system",
      systemTheme: "dark",
    })

    expect(controller.getState()).toMatchObject({
      theme: "system",
      systemTheme: "dark",
      resolvedTheme: "dark",
      themeClassName: "dy-admin-ui dark",
    })

    controller.setSystemTheme("light")

    expect(controller.getState()).toMatchObject({
      resolvedTheme: "light",
      themeClassName: "dy-admin-ui",
    })
  })

  it("calls onThemeChange when the preferred theme changes", () => {
    const onThemeChange = vi.fn()
    const controller = createAdminThemeController({
      onThemeChange,
    })

    controller.setTheme("dark")

    expect(controller.getState().theme).toBe("dark")
    expect(controller.getState().resolvedTheme).toBe("dark")
    expect(onThemeChange).toHaveBeenCalledWith("dark")
  })
})
