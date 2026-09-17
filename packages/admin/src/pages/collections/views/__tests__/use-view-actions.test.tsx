import { renderHook, act, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { describe, expect, it, vi, beforeEach } from "vitest"
import { toast } from "sonner"
import { useViewActions, useCollectionActions } from "../use-view-actions"

const runActionMock = vi.fn()
const runCollectionActionMock = vi.fn()
const useDyrectedMock = vi.fn()

vi.mock("../../../../providers/dyrected-context", () => ({
  useDyrected: () => useDyrectedMock(),
}))

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

function wrapper({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}

describe("useViewActions / useCollectionActions", () => {
  beforeEach(() => {
    runActionMock.mockReset()
    runCollectionActionMock.mockReset()
    vi.clearAllMocks()
    useDyrectedMock.mockReturnValue({
      client: {
        collection: () => ({
          runAction: runActionMock,
          runCollectionAction: runCollectionActionMock,
        }),
      },
    })
  })

  it("useViewActions runs an action with no confirm/fields immediately, via runAction(viewSlug, name, ...)", async () => {
    runActionMock.mockResolvedValue({ id: "doc-1", checkedIn: true })

    const { result } = renderHook(() => useViewActions({ slug: "guests", viewSlug: "attending" }), { wrapper })

    act(() => {
      result.current.initiate({ name: "checkIn", label: "Check in" }, ["doc-1"])
    })

    await waitFor(() => {
      expect(runActionMock).toHaveBeenCalledWith("attending", "checkIn", { id: "doc-1", input: undefined })
    })
    expect(toast.success).toHaveBeenCalledWith("Check in completed")
    expect(result.current.pending).toBeNull()
  })

  it("useViewActions stages a confirm-required action instead of running it immediately", () => {
    const { result } = renderHook(() => useViewActions({ slug: "guests", viewSlug: "attending" }), { wrapper })

    act(() => {
      result.current.initiate({ name: "checkIn", label: "Check in", confirm: "Sure?" }, ["doc-1"])
    })

    expect(runActionMock).not.toHaveBeenCalled()
    expect(result.current.pending).toMatchObject({ actionName: "checkIn", confirm: "Sure?" })
  })

  it("useCollectionActions runs a root-level action via runCollectionAction(name, ...) — no viewSlug", async () => {
    runCollectionActionMock.mockResolvedValue({ id: "order-1", status: "shipped" })
    const onSuccess = vi.fn()

    const { result } = renderHook(() => useCollectionActions({ slug: "orders", onSuccess }), { wrapper })

    act(() => {
      result.current.initiate({ name: "markShipped", label: "Mark as shipped" }, ["order-1"])
    })

    await waitFor(() => {
      expect(runCollectionActionMock).toHaveBeenCalledWith("markShipped", { id: "order-1", input: undefined })
    })
    expect(runActionMock).not.toHaveBeenCalled()
    expect(toast.success).toHaveBeenCalledWith("Mark as shipped completed")
    expect(onSuccess).toHaveBeenCalled()
  })

  it("useCollectionActions shows an error toast and does not call onSuccess when the request rejects", async () => {
    runCollectionActionMock.mockRejectedValue(new Error("Access denied"))
    const onSuccess = vi.fn()

    const { result } = renderHook(() => useCollectionActions({ slug: "orders", onSuccess }), { wrapper })

    act(() => {
      result.current.initiate({ name: "markShipped", label: "Mark as shipped" }, ["order-1"])
    })

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Mark as shipped failed", { description: "Access denied" })
    })
    expect(onSuccess).not.toHaveBeenCalled()
  })

  it("resolve() runs a staged action with form input and clears pending state", async () => {
    runCollectionActionMock.mockResolvedValue({ id: "order-1", status: "shipped" })

    const { result } = renderHook(() => useCollectionActions({ slug: "orders" }), { wrapper })

    act(() => {
      result.current.initiate(
        { name: "markShipped", label: "Mark as shipped", fields: [{ name: "note", type: "text" }] },
        ["order-1"],
      )
    })
    expect(result.current.pending).not.toBeNull()

    await act(async () => {
      await result.current.resolve({ note: "left at door" })
    })

    expect(runCollectionActionMock).toHaveBeenCalledWith("markShipped", { id: "order-1", input: { note: "left at door" } })
    expect(result.current.pending).toBeNull()
  })

  it("cancel() clears a staged action without running it", () => {
    const { result } = renderHook(() => useCollectionActions({ slug: "orders" }), { wrapper })

    act(() => {
      result.current.initiate({ name: "markShipped", label: "Mark as shipped", confirm: "Sure?" }, ["order-1"])
    })
    expect(result.current.pending).not.toBeNull()

    act(() => {
      result.current.cancel()
    })

    expect(result.current.pending).toBeNull()
    expect(runCollectionActionMock).not.toHaveBeenCalled()
  })
})
