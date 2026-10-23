import { cleanup, render, screen } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { SetupPromptUI } from "./setup-prompt"

const { useDyrectedMock, useLatestReleaseMock } = vi.hoisted(() => ({
  useDyrectedMock: vi.fn(),
  useLatestReleaseMock: vi.fn(),
}))
vi.mock("../../providers/dyrected-context", () => ({ useDyrected: () => useDyrectedMock() }))
vi.mock("../../hooks/use-latest-release", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../hooks/use-latest-release")>()),
  useLatestRelease: (options?: unknown) => useLatestReleaseMock(options),
}))

const adminUser = { collection: "users", roles: ["admin"] }

const renderSetup = (admin: Record<string, unknown>, user: Record<string, unknown> = adminUser) => {
  useDyrectedMock.mockReturnValue({
    user,
    schemas: { collections: [{ slug: "users", auth: true, fields: [] }], globals: [], admin },
  })
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <SetupPromptUI config={{ baseUrl: "https://cms.test" }} />
    </QueryClientProvider>,
  )
}

afterEach(cleanup)
beforeEach(() => {
  useDyrectedMock.mockReset()
  useLatestReleaseMock.mockReset()
  useLatestReleaseMock.mockReturnValue({ data: { version: "99.0.0" } })
})

describe("SetupPromptUI hide switches", () => {
  it("shows system info and the setup prompt by default, without naming Dyrected in the heading", () => {
    renderSetup({})
    expect(screen.getByText("System Info & Updates")).toBeTruthy()
    expect(screen.getByRole("heading", { name: "Set up your site" })).toBeTruthy()
    expect(screen.getByText("Setup prompt")).toBeTruthy()
    expect(screen.getByRole("link", { name: /Developer docs/ }).getAttribute("href")).toBe("https://docs.dyrected.com")
  })

  it("removes the system info panel and skips the release lookup when switched off", () => {
    renderSetup({ features: { systemInfo: false } })
    expect(screen.queryByText("System Info & Updates")).toBeNull()
    expect(screen.queryByText("Update available!")).toBeNull()
    expect(useLatestReleaseMock).toHaveBeenCalledWith({ enabled: false })
  })

  it("does not look up releases for people who are not administrators", () => {
    renderSetup({}, { collection: "users", roles: ["editor"] })
    expect(screen.queryByText("System Info & Updates")).toBeNull()
    expect(useLatestReleaseMock).toHaveBeenCalledWith({ enabled: false })
  })

  it("removes the setup prompt when switched off but keeps system info", () => {
    renderSetup({ features: { setupPrompt: false } })
    expect(screen.getByText("System Info & Updates")).toBeTruthy()
    expect(screen.queryByRole("heading", { name: "Set up your site" })).toBeNull()
    expect(screen.queryByText("Setup prompt")).toBeNull()
  })

  it("points the docs link at the host's help site, or removes it", () => {
    renderSetup({ links: { docs: "https://help.acme.com" } })
    expect(screen.getByRole("link", { name: /Developer docs/ }).getAttribute("href")).toBe("https://help.acme.com")
    cleanup()
    renderSetup({ links: { docs: false } })
    expect(screen.queryByRole("link", { name: /Developer docs/ })).toBeNull()
  })
})
