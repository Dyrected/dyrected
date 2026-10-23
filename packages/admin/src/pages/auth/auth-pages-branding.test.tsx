import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { FirstUserPage } from "./first-user-page"
import { ExternalLoginPage } from "./external-login-page"

const { useDyrectedMock } = vi.hoisted(() => ({ useDyrectedMock: vi.fn() }))

vi.mock("../../providers/dyrected-context", () => ({
  useDyrected: () => useDyrectedMock(),
}))
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }))

const withAdmin = (admin: Record<string, unknown>) =>
  useDyrectedMock.mockReturnValue({
    client: { getBaseUrl: () => "http://localhost:3000" },
    schemas: { collections: [], globals: [], admin },
  })

afterEach(cleanup)
beforeEach(() => useDyrectedMock.mockReset())

describe("FirstUserPage branding", () => {
  it("shows the configured logo and heading overrides", () => {
    withAdmin({
      branding: { appName: "Acme", logo: "https://cdn.test/l.svg" },
      strings: { "auth.firstUser.title": "Set up {appName}", "auth.firstUser.subtitle": "Create the owner account." },
    })
    render(<FirstUserPage collectionSlug="users" onComplete={vi.fn()} />)
    expect(screen.getByRole("img", { name: "Acme" })).toBeTruthy()
    expect(screen.getByRole("heading", { name: "Set up Acme" })).toBeTruthy()
    expect(screen.getByText("Create the owner account.")).toBeTruthy()
  })

  it("links the Dyrected credit by default and hides it with hidePoweredBy", () => {
    withAdmin({ branding: { appName: "Acme" } })
    render(<FirstUserPage collectionSlug="users" onComplete={vi.fn()} />)
    const link = screen.getByRole("link", { name: "Dyrected CMS" }) as HTMLAnchorElement
    expect(link.href).toContain("dyrected.com")
    cleanup()

    withAdmin({ branding: { appName: "Acme", hidePoweredBy: true } })
    render(<FirstUserPage collectionSlug="users" onComplete={vi.fn()} />)
    expect(screen.queryByRole("link", { name: "Dyrected CMS" })).toBeNull()
  })
})

describe("ExternalLoginPage branding", () => {
  it("shows the logo, the overridable heading, and no Dyrected credit", () => {
    withAdmin({
      branding: { appName: "Acme", logo: "https://cdn.test/l.svg" },
      strings: { "auth.signIn.title": "Sign in to {appName}" },
    })
    render(<ExternalLoginPage providers={[{ id: "okta", displayName: "Okta" }]} onStart={vi.fn()} />)
    expect(screen.getByRole("img", { name: "Acme" })).toBeTruthy()
    expect(screen.getByRole("heading", { name: "Sign in to Acme" })).toBeTruthy()
    expect(screen.getByRole("button", { name: "Continue with Okta" })).toBeTruthy()
    expect(screen.queryByText(/Dyrected/)).toBeNull()
  })
})
