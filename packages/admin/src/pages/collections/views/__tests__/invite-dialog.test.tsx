import "@testing-library/jest-dom/vitest"
import { cleanup, render, screen, fireEvent, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { InviteDialog } from "../../../../components/collections/invite-dialog"

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false },
  },
})

const mutateAsyncMock = vi.fn()
const resetMock = vi.fn()

vi.mock("../../../../hooks/use-collection-invite", () => ({
  useCollectionInvite: () => ({
    mutateAsync: mutateAsyncMock,
    reset: resetMock,
    isPending: false,
  }),
}))

function renderWithProviders(ui: React.ReactElement) {
  return render(
    <QueryClientProvider client={queryClient}>
      {ui}
    </QueryClientProvider>,
  )
}

describe("InviteDialog delivery status handling", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    })
  })

  afterEach(() => {
    cleanup()
  })

  it("displays success state when emailSent is true", async () => {
    mutateAsyncMock.mockResolvedValueOnce({
      email: "newuser@example.com",
      inviteUrl: "https://example.com/admin?inviteToken=token_123",
      emailSent: true,
      token: "token_123",
    })

    renderWithProviders(
      <InviteDialog
        collectionSlug="users"
        collectionLabel="Users"
      />,
    )

    // Open dialog
    fireEvent.click(screen.getByRole("button", { name: /invite users/i }))

    // Fill email
    const emailInput = screen.getByLabelText(/email address/i)
    fireEvent.change(emailInput, { target: { value: "newuser@example.com" } })

    // Submit
    fireEvent.click(screen.getByRole("button", { name: /send invite/i }))

    await waitFor(() => {
      expect(screen.getByText(/invite ready for newuser@example.com/i)).toBeInTheDocument()
      expect(screen.getByText(/the email has been sent/i)).toBeInTheDocument()
    })

    const inviteLinkInput = screen.getByLabelText(/invite link/i) as HTMLInputElement
    expect(inviteLinkInput.value).toBe("https://example.com/admin?inviteToken=token_123")
  })

  it("displays amber warning when emailSent is false (headless or unconfigured email)", async () => {
    mutateAsyncMock.mockResolvedValueOnce({
      email: "guest@example.com",
      inviteUrl: "https://example.com/admin?inviteToken=token_headless",
      emailSent: false,
      token: "token_headless",
    })

    renderWithProviders(
      <InviteDialog
        collectionSlug="customers"
        collectionLabel="Customers"
      />,
    )

    // Open dialog
    fireEvent.click(screen.getByRole("button", { name: /invite customers/i }))

    // Fill email
    const emailInput = screen.getByLabelText(/email address/i)
    fireEvent.change(emailInput, { target: { value: "guest@example.com" } })

    // Submit
    fireEvent.click(screen.getByRole("button", { name: /send invite/i }))

    await waitFor(() => {
      expect(screen.getByText(/invite created for guest@example.com/i)).toBeInTheDocument()
      expect(
        screen.getByText(/email delivery was skipped \(or not configured\)\. share this invite link directly with the user\./i),
      ).toBeInTheDocument()
    })

    const inviteLinkInput = screen.getByLabelText(/invite link/i) as HTMLInputElement
    expect(inviteLinkInput.value).toBe("https://example.com/admin?inviteToken=token_headless")
  })

  it("copies invite link when copy button is clicked", async () => {
    mutateAsyncMock.mockResolvedValueOnce({
      email: "copy@example.com",
      inviteUrl: "https://example.com/admin?inviteToken=copy_token",
      emailSent: false,
      token: "copy_token",
    })

    renderWithProviders(
      <InviteDialog
        collectionSlug="users"
        collectionLabel="Users"
      />,
    )

    fireEvent.click(screen.getByRole("button", { name: /invite users/i }))
    fireEvent.change(screen.getByLabelText(/email address/i), { target: { value: "copy@example.com" } })
    fireEvent.click(screen.getByRole("button", { name: /send invite/i }))

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /copy/i })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole("button", { name: /copy/i }))
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith("https://example.com/admin?inviteToken=copy_token")
  })
})
