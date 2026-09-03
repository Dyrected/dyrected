import { cleanup, render, fireEvent, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { ActionFormDialog } from "../action-form-dialog"

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
  },
})

const useDyrectedMock = vi.fn()

vi.mock("../../../../providers/dyrected-context", () => ({
  useDyrected: () => useDyrectedMock(),
}))

function renderWithProviders(ui: React.ReactElement) {
  return render(
    <QueryClientProvider client={queryClient}>
      {ui}
    </QueryClientProvider>,
  )
}

describe("ActionFormDialog Reactivity and Dynamic Defaults", () => {
  beforeEach(() => {
    useDyrectedMock.mockReturnValue({
      user: { id: "user_123", email: "admin@dyrected.com", roles: ["admin"] },
    })
  })

  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it("evaluates function defaultValue using doc context on open", () => {
    const fields = [
      {
        name: "amount",
        type: "number",
        label: "Amount Due",
        defaultValue: ({ doc }: any) => (doc?.totalDue || 0) - (doc?.amountPaid || 0),
      },
    ]

    renderWithProviders(
      <ActionFormDialog
        open={true}
        label="Record Payment"
        fields={fields}
        doc={{ totalDue: 50000, amountPaid: 20000 }}
        isRunning={false}
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
      />,
    )

    const input = document.querySelector('input[name="amount"]') as HTMLInputElement
    expect(input).not.toBeNull()
    expect(input.value).toBe("30000")
  })

  it("evaluates JEXL expression defaultValue using doc context", () => {
    const fields = [
      {
        name: "balance",
        type: "number",
        label: "Calculated Balance",
        defaultValue: "doc.totalDue - (doc.amountPaid || 0)",
      },
    ]

    renderWithProviders(
      <ActionFormDialog
        open={true}
        label="Check Balance"
        fields={fields}
        doc={{ totalDue: 75000, amountPaid: 25000 }}
        isRunning={false}
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
      />,
    )

    const input = document.querySelector('input[name="balance"]') as HTMLInputElement
    expect(input).not.toBeNull()
    expect(input.value).toBe("50000")
  })

  it("executes admin.hooks.onChange reactively when sibling input changes", async () => {
    const fields = [
      {
        name: "quantity",
        type: "number",
        label: "Quantity",
        defaultValue: 2,
      },
      {
        name: "totalPrice",
        type: "number",
        label: "Total Price",
        defaultValue: 0,
        admin: {
          hooks: {
            onChange: ({ siblingData, doc }: any) => {
              return (Number(siblingData.quantity) || 0) * (doc?.unitPrice || 1000)
            },
          },
        },
      },
    ]

    renderWithProviders(
      <ActionFormDialog
        open={true}
        label="Bulk Order"
        fields={fields}
        doc={{ unitPrice: 5000 }}
        isRunning={false}
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
      />,
    )

    const quantityInput = document.querySelector('input[name="quantity"]') as HTMLInputElement
    expect(quantityInput).not.toBeNull()

    // Initially computed from quantity = 2 * 5000 = 10000
    await waitFor(() => {
      const totalInput = document.querySelector('input[name="totalPrice"]') as HTMLInputElement
      expect(totalInput?.value).toBe("10000")
    })

    // Change quantity to 4
    fireEvent.change(quantityInput, { target: { value: "4" } })

    await waitFor(() => {
      const totalInput = document.querySelector('input[name="totalPrice"]') as HTMLInputElement
      expect(totalInput?.value).toBe("20000")
    })
  })

  it("dynamically shows and hides fields using admin.condition", async () => {
    const fields = [
      {
        name: "reason",
        type: "text",
        label: "Reason",
        defaultValue: "standard",
      },
      {
        name: "details",
        type: "text",
        label: "Other Details",
        defaultValue: "",
        admin: {
          condition: ({ siblingData }: any) => siblingData.reason === "other",
        },
      },
    ]

    renderWithProviders(
      <ActionFormDialog
        open={true}
        label="Reason Modal"
        fields={fields}
        isRunning={false}
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
      />,
    )

    // With reason = 'standard', Details field should NOT be visible
    expect(document.querySelector('input[name="details"]')).toBeNull()

    // Change reason to 'other'
    const reasonInput = document.querySelector('input[name="reason"]') as HTMLInputElement
    expect(reasonInput).not.toBeNull()
    fireEvent.change(reasonInput, { target: { value: "other" } })

    // Details field should now become visible
    await waitFor(() => {
      expect(document.querySelector('input[name="details"]')).not.toBeNull()
    })
  })
})
