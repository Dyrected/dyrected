import { act, cleanup, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { LoginPage } from "./login-page"

const { acceptInviteMock, useDyrectedMock, toastMock } = vi.hoisted(() => ({
  acceptInviteMock: vi.fn(),
  useDyrectedMock: vi.fn(),
  toastMock: {
    info: vi.fn(),
    success: vi.fn(),
    error: vi.fn(),
  },
}))

vi.mock("../../providers/dyrected-context", () => ({
  useDyrected: () => useDyrectedMock(),
}))

vi.mock("sonner", () => ({
  toast: toastMock,
}))

describe("LoginPage invite flow", () => {
  beforeEach(() => {
    acceptInviteMock.mockReset()
    Object.values(toastMock).forEach((mock) => mock.mockReset())

    useDyrectedMock.mockReturnValue({
      client: {
        collection: vi.fn(() => ({
          acceptInvite: acceptInviteMock,
          login: vi.fn(),
          sendResetLink: vi.fn(),
          resetPassword: vi.fn(),
        })),
      },
    })

    window.history.replaceState({}, "", "/?inviteToken=invite-token-123")
  })

  afterEach(() => {
    cleanup()
    window.history.replaceState({}, "", "/")
  })

  it("switches to the invite setup view when an invite token is present", async () => {
    render(<LoginPage collectionSlug="users" onLogin={vi.fn()} />)
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0))
    })

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Accept Invitation" })).toBeTruthy()
    })
    expect(screen.getByLabelText("Create Password")).toBeTruthy()
    expect(toastMock.info).toHaveBeenCalled()
  })

  it("accepts an invite and forwards the signed-in payload", async () => {
    const onLogin = vi.fn()
    acceptInviteMock.mockResolvedValue({ token: "session-token", user: { id: "user-1" } })

    render(<LoginPage collectionSlug="users" onLogin={onLogin} />)
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0))
    })

    const user = userEvent.setup()
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Accept Invitation" })).toBeTruthy()
    })
    await user.type(screen.getByLabelText("Create Password"), "StrongPass123!")
    await user.type(screen.getByLabelText("Confirm Password"), "StrongPass123!")
    await user.click(screen.getAllByRole("button", { name: "Accept Invitation" })[0])

    await waitFor(() => {
      expect(acceptInviteMock).toHaveBeenCalledWith("invite-token-123", "StrongPass123!")
    })
    expect(onLogin).toHaveBeenCalledWith({ token: "session-token", user: { id: "user-1" } })
    expect(toastMock.success).toHaveBeenCalled()
  })
})

describe("LoginPage white-label branding", () => {
  const baseClient = {
    getBaseUrl: () => "http://localhost:3000",
    collection: vi.fn(() => ({ acceptInvite: vi.fn(), login: vi.fn(), sendResetLink: vi.fn(), resetPassword: vi.fn() })),
  }
  const withAdmin = (admin: Record<string, unknown> | null) =>
    useDyrectedMock.mockReturnValue({ client: baseClient, schemas: admin === null ? null : { collections: [], globals: [], admin } })

  afterEach(() => {
    cleanup()
    window.history.replaceState({}, "", "/")
  })

  beforeEach(() => {
    window.history.replaceState({}, "", "/")
  })

  const renderLogin = async () => {
    render(<LoginPage collectionSlug="users" onLogin={vi.fn()} />)
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
  }

  it("shows the configured logo above the heading, with the app name as its alt text", async () => {
    withAdmin({ branding: { appName: "Acme", logo: "https://cdn.test/acme.svg" } })
    await renderLogin()
    const logo = screen.getByRole("img", { name: "Acme" }) as HTMLImageElement
    expect(logo.src).toBe("https://cdn.test/acme.svg")
  })

  it("uses the dark logo variant when one is configured", async () => {
    withAdmin({ branding: { appName: "Acme", logo: "https://cdn.test/l.svg", logoDark: "https://cdn.test/d.svg" } })
    await renderLogin()
    const images = screen.getAllByRole("img", { name: "Acme" }) as HTMLImageElement[]
    expect(images.map((i) => i.src)).toEqual(["https://cdn.test/l.svg", "https://cdn.test/d.svg"])
  })

  it("falls back to the logo mark, then to the app name as text", async () => {
    withAdmin({ branding: { appName: "Acme", logoMark: "https://cdn.test/m.svg" } })
    await renderLogin()
    expect((screen.getByRole("img", { name: "Acme" }) as HTMLImageElement).src).toBe("https://cdn.test/m.svg")
    cleanup()

    withAdmin({ branding: { appName: "Acme" } })
    await renderLogin()
    expect(screen.getByTestId("auth-brand").textContent).toBe("Acme")
  })

  it("honours logoAlt over the app name", async () => {
    withAdmin({ branding: { appName: "Acme", logo: "https://cdn.test/l.svg", logoAlt: "Acme Studio" } })
    await renderLogin()
    expect(screen.getByRole("img", { name: "Acme Studio" })).toBeTruthy()
  })

  it("shows no brand mark until the schemas have loaded, and none when nothing is configured", async () => {
    withAdmin(null)
    await renderLogin()
    expect(screen.queryByTestId("auth-brand")).toBeNull()
    expect(screen.queryByText("Dyrected CMS")).toBeNull()
    cleanup()

    withAdmin({})
    await renderLogin()
    expect(screen.queryByTestId("auth-brand")).toBeNull()
  })

  it("keeps the Dyrected credit by default and removes it with hidePoweredBy", async () => {
    withAdmin({ branding: { appName: "Acme" } })
    await renderLogin()
    expect(screen.getByText("Dyrected CMS")).toBeTruthy()
    cleanup()

    withAdmin({ branding: { appName: "Acme", hidePoweredBy: true } })
    await renderLogin()
    expect(screen.queryByText("Dyrected CMS")).toBeNull()
  })

  it("lets the host rewrite the sign-in heading and subtitle", async () => {
    withAdmin({
      branding: { appName: "Acme" },
      strings: { "auth.signIn.title": "Welcome to {appName}", "auth.signIn.subtitle": "Sign in to manage your content." },
    })
    await renderLogin()
    expect(screen.getByRole("heading", { name: "Welcome to Acme" })).toBeTruthy()
    expect(screen.getByText("Sign in to manage your content.")).toBeTruthy()
  })

  it("names the host's product, not Dyrected, when activating an invited account", async () => {
    window.history.replaceState({}, "", "/?inviteToken=abc")
    withAdmin({ branding: { appName: "Acme" } })
    await renderLogin()
    await screen.findByRole("heading", { name: "Accept Invitation" })
    expect(screen.getByText("Create your password to activate your Acme account")).toBeTruthy()
    expect(screen.queryByText(/Dyrected account/)).toBeNull()
  })

  it("keeps activation copy neutral when no app name is configured", async () => {
    window.history.replaceState({}, "", "/?inviteToken=abc")
    withAdmin({})
    await renderLogin()
    await screen.findByRole("heading", { name: "Accept Invitation" })
    expect(screen.getByText("Create your password to activate your account")).toBeTruthy()
  })
})
