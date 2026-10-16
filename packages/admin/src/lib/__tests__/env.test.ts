import { afterEach, describe, expect, it, vi } from "vitest"
import { isDevelopment } from "../env"

describe("isDevelopment", () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it("follows the host's NODE_ENV at call time", () => {
    vi.stubEnv("NODE_ENV", "development")
    expect(isDevelopment()).toBe(true)

    vi.stubEnv("NODE_ENV", "production")
    expect(isDevelopment()).toBe(false)
  })
})
