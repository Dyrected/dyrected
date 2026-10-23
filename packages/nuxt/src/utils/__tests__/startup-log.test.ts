import { describe, expect, it } from "vitest"
import { formatStartupLines } from "../startup-log"

describe("formatStartupLines", () => {
  it("prints the admin and API URLs with the defaults", () => {
    expect(formatStartupLines("http://localhost:3000/", {})).toEqual([
      "\n  ➜  Dyrected admin:  http://localhost:3000/cms",
      "  ➜  Dyrected API:    http://localhost:3000/dyrected\n",
    ])
  })

  it("uses the configured admin path and API base", () => {
    const [admin, api] = formatStartupLines("http://localhost:3000", { adminPath: "admin", apiBase: "/cms-api" })
    expect(admin).toContain("http://localhost:3000/admin")
    expect(api).toContain("http://localhost:3000/cms-api")
  })

  it("leaves an absolute API base untouched", () => {
    const [, api] = formatStartupLines("http://localhost:3000", { apiBase: "https://api.example.com" })
    expect(api).toContain("https://api.example.com")
    expect(api).not.toContain("localhost")
  })
})
