import { describe, expect, it } from "vitest"
import { Database, icons } from "lucide-react"
import { isAdminIconName, resolveAdminIcon } from "./admin-icons"

describe("admin navigation icons", () => {
  it("resolves a configured Lucide icon", () => {
    expect(isAdminIconName("Newspaper")).toBe(true)
    expect(resolveAdminIcon("Newspaper", Database)).toBe(icons.Newspaper)
  })

  it("falls back safely for values received from untyped clients", () => {
    expect(isAdminIconName("DefinitelyNotAnIcon")).toBe(false)
    expect(resolveAdminIcon("DefinitelyNotAnIcon", Database)).toBe(Database)
  })
})
