import { cleanup, render, screen, waitFor } from "@testing-library/react"
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

    expect(await screen.findByRole("heading", { name: "Accept Invitation" })).toBeTruthy()
    expect(screen.getByLabelText("Create Password")).toBeTruthy()
    expect(toastMock.info).toHaveBeenCalled()
  })

  it("accepts an invite and forwards the signed-in payload", async () => {
    const onLogin = vi.fn()
    acceptInviteMock.mockResolvedValue({ token: "session-token", user: { id: "user-1" } })

    render(<LoginPage collectionSlug="users" onLogin={onLogin} />)

    const user = userEvent.setup()
    await screen.findByRole("heading", { name: "Accept Invitation" })
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
