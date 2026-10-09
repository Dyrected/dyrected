import { renderHook, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { describe, expect, it, vi, beforeEach } from "vitest"
import { useViewMetrics } from "../use-view-metrics"

const aggregateMock = vi.fn()
const useDyrectedMock = vi.fn()

vi.mock("../../../../providers/dyrected-context", () => ({
  useDyrected: () => useDyrectedMock(),
}))

function createWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

describe("useViewMetrics Scoping (metricsScope & metric-level scope)", () => {
  beforeEach(() => {
    aggregateMock.mockReset()
    vi.clearAllMocks()
    useDyrectedMock.mockReturnValue({
      client: {
        collection: () => ({
          aggregate: aggregateMock,
        }),
      },
    })
  })

  it("default 'view' scope merges viewFilter into aggregate where clauses", async () => {
    aggregateMock.mockResolvedValue({ m0: 10 })

    const { result } = renderHook(
      () =>
        useViewMetrics({
          slug: "orders",
          viewSlug: "pending",
          metrics: [
            {
              label: "Pending Orders",
              aggregate: { count: "*" },
            },
          ],
          viewFilter: { status: { equals: "pending" } },
        }),
      { wrapper: createWrapper() },
    )

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(aggregateMock).toHaveBeenCalledWith({
      m0: {
        count: "*",
        where: { status: { equals: "pending" } },
      },
    })
    expect(result.current.data?.[0]?.scope).toBe("view")
  })

  it("'filtered' scope uses filteredWhere when user applies toolbar filters", async () => {
    aggregateMock.mockResolvedValue({ m0: 5 })

    const { result } = renderHook(
      () =>
        useViewMetrics({
          slug: "orders",
          viewSlug: "all",
          metricsScope: "filtered",
          metrics: [
            {
              label: "Filtered Orders",
              aggregate: { count: "*" },
            },
          ],
          viewFilter: { status: { not_equals: "draft" } },
          filteredWhere: {
            AND: [
              { status: { not_equals: "draft" } },
              { amount: { gt: 100 } },
            ],
          },
        }),
      { wrapper: createWrapper() },
    )

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(aggregateMock).toHaveBeenCalledWith({
      m0: {
        count: "*",
        where: {
          AND: [
            { status: { not_equals: "draft" } },
            { amount: { gt: 100 } },
          ],
        },
      },
    })
    expect(result.current.data?.[0]?.scope).toBe("filtered")
  })

  it("'collection' scope ignores viewFilter and filteredWhere, only using metric-level where", async () => {
    aggregateMock.mockResolvedValue({ m0: 100 })

    const { result } = renderHook(
      () =>
        useViewMetrics({
          slug: "orders",
          viewSlug: "active",
          metricsScope: "filtered",
          metrics: [
            {
              label: "Lifetime Orders",
              scope: "collection",
              aggregate: { count: "*", where: { isArchived: { not_equals: true } } },
            },
          ],
          viewFilter: { status: { equals: "active" } },
          filteredWhere: { status: { equals: "active" }, amount: { gt: 500 } },
        }),
      { wrapper: createWrapper() },
    )

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(aggregateMock).toHaveBeenCalledWith({
      m0: {
        count: "*",
        where: { isArchived: { not_equals: true } },
      },
    })
    expect(result.current.data?.[0]?.scope).toBe("collection")
  })

  it("per-metric scope overrides view-level metricsScope", async () => {
    aggregateMock.mockResolvedValue({ m0: 25, m1: 500 })

    const { result } = renderHook(
      () =>
        useViewMetrics({
          slug: "orders",
          viewSlug: "default",
          metricsScope: "filtered",
          metrics: [
            {
              label: "Filtered Summary",
              aggregate: { count: "*" },
              // Inherits "filtered"
            },
            {
              label: "Baseline View Target",
              scope: "view", // Overrides to "view"
              aggregate: { count: "*" },
            },
          ],
          viewFilter: { status: { equals: "active" } },
          filteredWhere: { status: { equals: "active" }, customerId: { equals: "cust_1" } },
        }),
      { wrapper: createWrapper() },
    )

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(aggregateMock).toHaveBeenCalledWith({
      m0: {
        count: "*",
        where: { status: { equals: "active" }, customerId: { equals: "cust_1" } },
      },
      m1: {
        count: "*",
        where: { status: { equals: "active" } },
      },
    })
    expect(result.current.data?.[0]?.scope).toBe("filtered")
    expect(result.current.data?.[1]?.scope).toBe("view")
  })

  it("sub-metrics inherit parent metric scope or apply individual scope", async () => {
    aggregateMock.mockResolvedValue({ m0: 10, m0_s0: 2, m0_s1: 50 })

    const { result } = renderHook(
      () =>
        useViewMetrics({
          slug: "orders",
          viewSlug: "default",
          metricsScope: "view",
          metrics: [
            {
              label: "Active Orders",
              aggregate: { count: "*" },
              subMetrics: [
                {
                  label: "High Priority",
                  aggregate: { count: "*", where: { priority: "high" } },
                  // inherits "view"
                },
                {
                  label: "Global All-Time",
                  scope: "collection",
                  aggregate: { count: "*", where: { priority: "urgent" } },
                },
              ],
            },
          ],
          viewFilter: { status: { equals: "active" } },
        }),
      { wrapper: createWrapper() },
    )

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(aggregateMock).toHaveBeenCalledWith({
      m0: {
        count: "*",
        where: { status: { equals: "active" } },
      },
      m0_s0: {
        count: "*",
        where: {
          AND: [
            { status: { equals: "active" } },
            { priority: "high" },
          ],
        },
      },
      m0_s1: {
        count: "*",
        where: { priority: "urgent" },
      },
    })
  })
})
