import { renderHook } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { DEFAULT_DOCS_URL, useAdminFeatures } from "../use-admin-features"

const { useDyrectedMock } = vi.hoisted(() => ({ useDyrectedMock: vi.fn() }))
vi.mock("../../providers/dyrected-context", () => ({ useDyrected: () => useDyrectedMock() }))

const adminUser = { collection: "users", roles: ["admin"] }
const editorUser = { collection: "users", roles: ["editor"] }

const setup = (admin: Record<string, unknown> | undefined, user: Record<string, unknown> | null = adminUser) => {
  useDyrectedMock.mockReturnValue({
    user,
    schemas: { collections: [{ slug: "users", auth: true, fields: [] }], globals: [], admin },
  })
  return renderHook(() => useAdminFeatures()).result.current
}

describe("useAdminFeatures", () => {
  beforeEach(() => useDyrectedMock.mockReset())

  it("keeps everything on for administrators by default", () => {
    expect(setup({})).toEqual({
      setupPrompt: true,
      systemInfo: true,
      docsUrl: DEFAULT_DOCS_URL,
      setupPageVisible: true,
    })
  })

  it("never shows system info to people who are not administrators", () => {
    const features = setup({}, editorUser)
    expect(features.systemInfo).toBe(false)
    expect(features.setupPrompt).toBe(true)
    expect(features.setupPageVisible).toBe(true)
  })

  it("hides system info when the host turns it off", () => {
    expect(setup({ features: { systemInfo: false } }).systemInfo).toBe(false)
  })

  it("hides the whole Setup page once both parts are off", () => {
    expect(setup({ features: { systemInfo: false, setupPrompt: false } }).setupPageVisible).toBe(false)
    expect(setup({ features: { setupPrompt: false } }).setupPageVisible).toBe(true)
    expect(setup({ features: { setupPrompt: false } }, editorUser).setupPageVisible).toBe(false)
  })

  it("lets the host point docs links elsewhere or remove them", () => {
    expect(setup({ links: { docs: "https://help.acme.com" } }).docsUrl).toBe("https://help.acme.com")
    expect(setup({ links: { docs: false } }).docsUrl).toBeNull()
    expect(setup({ links: { docs: "  " } }).docsUrl).toBe(DEFAULT_DOCS_URL)
  })

  it("is safe before the schemas load or without a user", () => {
    useDyrectedMock.mockReturnValue({ user: null, schemas: null })
    const features = renderHook(() => useAdminFeatures()).result.current
    expect(features.systemInfo).toBe(false)
    expect(features.docsUrl).toBe(DEFAULT_DOCS_URL)
  })
})
