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

describe("useViewMetrics Dynamic Grouping (groupBy)", () => {
  const findMock = vi.fn()

  beforeEach(() => {
    aggregateMock.mockReset()
    findMock.mockReset()
    vi.clearAllMocks()
    useDyrectedMock.mockReturnValue({
      client: {
        collection: (_col: string) => ({
          aggregate: aggregateMock,
          find: findMock,
        }),
      },
    })
  })

  it("expands ViewMetric.groupBy into multiple cards with templated labels and group where constraints", async () => {
    findMock.mockResolvedValue({
      docs: [
        { id: "comm_1", name: "Lagos Community" },
        { id: "comm_2", name: "Abuja Community" },
      ],
    })

    aggregateMock.mockResolvedValue({
      m0: 150,
      m0_s0: 500000,
      m1: 90,
      m1_s0: 350000,
    })

    const schema = {
      fields: [
        { name: "community", type: "relationship", relationTo: "communities" },
        { name: "shares", type: "number" },
      ],
    }

    const { result } = renderHook(
      () =>
        useViewMetrics({
          slug: "ipo_reservations",
          viewSlug: "by-community",
          schema,
          metrics: [
            {
              groupBy: "community",
              label: "{{group.label}}",
              unit: "Reservations",
              aggregate: { count: "*" },
              subMetrics: [
                {
                  label: "Shares",
                  aggregate: { sum: "shares", cast: "number" },
                },
              ],
            },
          ],
        }),
      { wrapper: createWrapper() },
    )

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(findMock).toHaveBeenCalledWith({
      limit: 12,
      where: undefined,
    })

    // Batch aggregate call: all cards and submetrics evaluated in one database request!
    expect(aggregateMock).toHaveBeenCalledWith({
      m0: {
        count: "*",
        where: { community: { equals: "comm_1" } },
      },
      m0_s0: {
        sum: "shares",
        cast: "number",
        where: { community: { equals: "comm_1" } },
      },
      m1: {
        count: "*",
        where: { community: { equals: "comm_2" } },
      },
      m1_s0: {
        sum: "shares",
        cast: "number",
        where: { community: { equals: "comm_2" } },
      },
    })

    const cards = result.current.data ?? []
    expect(cards).toHaveLength(2)
    expect(cards[0].label).toBe("Lagos Community")
    expect(cards[0].formatted).toBe("150")
    expect(cards[0].subMetrics?.[0].label).toBe("Shares")
    expect(cards[0].subMetrics?.[0].formatted).toBe("500,000")

    expect(cards[1].label).toBe("Abuja Community")
    expect(cards[1].formatted).toBe("90")
    expect(cards[1].subMetrics?.[0].label).toBe("Shares")
    expect(cards[1].subMetrics?.[0].formatted).toBe("350,000")
  })

  it("expands ViewSubMetric.groupBy into multiple submetric rows inside a single card", async () => {
    findMock.mockResolvedValue({
      docs: [
        { id: "comm_1", name: "Lagos Community" },
        { id: "comm_2", name: "Abuja Community" },
      ],
    })

    aggregateMock.mockResolvedValue({
      m0: 240,
      m0_s0: 500000,
      m0_s1: 350000,
    })

    const schema = {
      fields: [
        { name: "community", type: "relationship", relationTo: "communities" },
        { name: "shares", type: "number" },
      ],
    }

    const { result } = renderHook(
      () =>
        useViewMetrics({
          slug: "ipo_reservations",
          viewSlug: "overview",
          schema,
          metrics: [
            {
              label: "All Reservations",
              unit: "Total",
              aggregate: { count: "*" },
              subMetrics: [
                {
                  groupBy: "community",
                  label: "{{group.label}}",
                  aggregate: { sum: "shares", cast: "number" },
                },
              ],
            },
          ],
        }),
      { wrapper: createWrapper() },
    )

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(aggregateMock).toHaveBeenCalledWith({
      m0: {
        count: "*",
      },
      m0_s0: {
        sum: "shares",
        cast: "number",
        where: { community: { equals: "comm_1" } },
      },
      m0_s1: {
        sum: "shares",
        cast: "number",
        where: { community: { equals: "comm_2" } },
      },
    })

    const cards = result.current.data ?? []
    expect(cards).toHaveLength(1)
    expect(cards[0].label).toBe("All Reservations")
    expect(cards[0].formatted).toBe("240")
    expect(cards[0].subMetrics).toHaveLength(2)
    expect(cards[0].subMetrics?.[0].label).toBe("Lagos Community")
    expect(cards[0].subMetrics?.[0].formatted).toBe("500,000")
    expect(cards[0].subMetrics?.[1].label).toBe("Abuja Community")
    expect(cards[0].subMetrics?.[1].formatted).toBe("350,000")
  })

  it("supports predefined select options for groupBy without extra collection queries", async () => {
    aggregateMock.mockResolvedValue({
      m0: 12,
      m1: 3,
    })

    const schema = {
      fields: [
        {
          name: "status",
          type: "select",
          options: [
            { value: "open", label: "Open Issues" },
            { value: "closed", label: "Closed Issues" },
          ],
        },
      ],
    }

    const { result } = renderHook(
      () =>
        useViewMetrics({
          slug: "issues",
          viewSlug: "status-cards",
          schema,
          metrics: [
            {
              groupBy: "status",
              label: "{{group.label}}",
              aggregate: { count: "*" },
            },
          ],
        }),
      { wrapper: createWrapper() },
    )

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(findMock).not.toHaveBeenCalled()
    expect(aggregateMock).toHaveBeenCalledWith({
      m0: {
        count: "*",
        where: { status: { equals: "open" } },
      },
      m1: {
        count: "*",
        where: { status: { equals: "closed" } },
      },
    })

    const cards = result.current.data ?? []
    expect(cards).toHaveLength(2)
    expect(cards[0].label).toBe("Open Issues")
    expect(cards[0].formatted).toBe("12")
    expect(cards[1].label).toBe("Closed Issues")
    expect(cards[1].formatted).toBe("3")
  })

  it("resolves relationship titles using target collection admin.useAsTitle", async () => {
    findMock.mockResolvedValue({
      docs: [
        { id: "comm_1", communityName: "Lekki Phase 1" },
        { id: "comm_2", communityName: "Victoria Island" },
      ],
    })

    aggregateMock.mockResolvedValue({
      m0: 50,
      m1: 80,
    })

    useDyrectedMock.mockReturnValue({
      client: {
        collection: (_target: string) => ({
          find: findMock,
          aggregate: aggregateMock,
        }),
      },
      schemas: {
        collections: [
          {
            slug: "communities",
            admin: { useAsTitle: "communityName" },
            fields: [{ name: "communityName", type: "text" }],
          },
        ],
      },
    })

    const schema = {
      fields: [
        { name: "community", type: "relationship", relationTo: "communities" },
      ],
    }

    const { result } = renderHook(
      () =>
        useViewMetrics({
          slug: "ipo_reservations",
          viewSlug: "by-community",
          schema,
          metrics: [
            {
              groupBy: "community",
              label: "{{group.label}} IPO",
              aggregate: { count: "*" },
            },
          ],
        }),
      { wrapper: createWrapper() },
    )

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    const cards = result.current.data ?? []
    expect(cards).toHaveLength(2)
    expect(cards[0].label).toBe("Lekki Phase 1 IPO")
    expect(cards[1].label).toBe("Victoria Island IPO")
  })
})

