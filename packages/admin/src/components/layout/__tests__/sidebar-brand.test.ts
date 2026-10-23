import { describe, expect, it } from "vitest"
import { resolveSidebarBrand } from "../sidebar-brand"

describe("resolveSidebarBrand", () => {
  it("shows the app name as text when there is no logo image", () => {
    expect(resolveSidebarBrand({ branding: { appName: "Acme" } })).toEqual({
      appName: "Acme",
      brandText: "Acme",
      logoAlt: "Acme",
    })
  })

  it("prefers explicit logo text over the app name", () => {
    expect(resolveSidebarBrand({ branding: { appName: "Acme", logoText: "Acme Studio CU" } }).brandText).toBe("Acme Studio CU")
  })

  it("never replaces a configured logo image with the app name", () => {
    const brand = resolveSidebarBrand({ branding: { appName: "Acme", logo: "/l.svg" } })
    expect(brand.brandText).toBe("")
    expect(brand.appName).toBe("Acme")
    expect(brand.logoAlt).toBe("Acme")
  })

  it("treats a logo mark as a logo image too", () => {
    expect(resolveSidebarBrand({ branding: { appName: "Acme", logoMark: "/m.svg" } }).brandText).toBe("")
  })

  it("uses logoAlt for the image description", () => {
    expect(resolveSidebarBrand({ branding: { appName: "Acme", logo: "/l.svg", logoAlt: "Acme Studio" } }).logoAlt).toBe("Acme Studio")
  })

  it("derives the name from the legacy title suffix so existing setups keep their sidebar name", () => {
    expect(resolveSidebarBrand({ meta: { titleSuffix: "— Acme Admin" } }).brandText).toBe("Acme Admin")
  })

  it("is empty, never Dyrected, when nothing is configured", () => {
    expect(resolveSidebarBrand(undefined)).toEqual({ appName: "", brandText: "", logoAlt: "" })
  })
})
