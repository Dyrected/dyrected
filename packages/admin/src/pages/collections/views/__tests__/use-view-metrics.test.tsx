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

  it("attaches filterTarget to grouped cards and single cards with simple where clause", async () => {
    findMock.mockResolvedValue({
      docs: [
        { id: "comm_1", name: "Lagos Community" },
      ],
    })

    aggregateMock.mockResolvedValue({
      m0: 10,
      m1: 5,
    })

    const schema = {
      fields: [
        { name: "community", type: "relationship", relationTo: "communities" },
        { name: "status", type: "select" },
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
              groupBy: "community",
              label: "{{group.label}}",
              aggregate: { count: "*" },
            },
            {
              label: "Pending Reservations",
              aggregate: { count: "*", where: { status: { equals: "pending" } } },
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
    // Grouped card filterTarget:
    expect(cards[0].filterTarget).toEqual({
      columnId: "community",
      value: "comm_1",
      operator: "eq",
    })
    // Single aggregate card filterTarget inferred from where clause:
    expect(cards[1].filterTarget).toEqual({
      columnId: "status",
      value: "pending",
      operator: "eq",
    })
  })

  it("supports orderBy: 'count' to sort grouped cards descending by aggregate value", async () => {
    findMock.mockResolvedValue({
      docs: [
        { id: "comm_1", name: "Small Community" },
        { id: "comm_2", name: "Huge Community" },
      ],
    })

    // Notice comm_1 has 5, comm_2 has 500
    aggregateMock.mockResolvedValue({
      m0: 5,
      m1: 500,
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
          viewSlug: "overview",
          schema,
          metrics: [
            {
              groupBy: { field: "community", orderBy: "count" },
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

    const cards = result.current.data ?? []
    expect(cards).toHaveLength(2)
    // comm_2 (Huge Community, value: 500) should be first
    expect(cards[0].label).toBe("Huge Community")
    expect(cards[0].formatted).toBe("500")
    expect(cards[1].label).toBe("Small Community")
    expect(cards[1].formatted).toBe("5")
  })

  it("applies Top-N limit to groupBy options query", async () => {
    findMock.mockResolvedValue({
      docs: [
        { id: "comm_1", name: "Comm 1" },
        { id: "comm_2", name: "Comm 2" },
        { id: "comm_3", name: "Comm 3" },
      ],
    })

    aggregateMock.mockResolvedValue({
      m0: 1,
      m1: 2,
      m2: 3,
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
          viewSlug: "top-3",
          schema,
          metrics: [
            {
              groupBy: { field: "community", limit: 3 },
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

    expect(findMock).toHaveBeenCalledWith({
      limit: 3,
      where: undefined,
    })
  })

  it("preserves span on resolved metric objects", async () => {
    aggregateMock.mockResolvedValue({ m0: 42 })

    const { result } = renderHook(
      () =>
        useViewMetrics({
          slug: "orders",
          viewSlug: "wide",
          metrics: [
            {
              label: "Revenue Overview",
              aggregate: { count: "*" },
              span: 2,
            },
          ],
        }),
      { wrapper: createWrapper() },
    )

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(result.current.data?.[0]?.span).toBe(2)
  })

  it("filters out zero-count groups from groupBy submetrics unless filterZero is false", async () => {
    findMock.mockResolvedValue({
      docs: [
        { id: "comm_1", name: "Active Comm" },
        { id: "comm_2", name: "Zero Comm" },
        { id: "comm_3", name: "Tiny Comm" },
      ],
    })

    aggregateMock.mockResolvedValue({
      m0: 15,
      m0_s0: 12,
      m0_s1: 0, // Zero Comm
      m0_s2: 3,
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
          viewSlug: "overview",
          schema,
          metrics: [
            {
              label: "Top Communities",
              aggregate: { count: "*" },
              subMetrics: [
                {
                  label: "{{group.label}}",
                  groupBy: { field: "community", limit: 5, orderBy: "count" },
                  aggregate: { count: "*" },
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

    const card = result.current.data?.[0]
    expect(card).toBeDefined()
    // Zero Comm (value: 0) must be filtered out!
    expect(card?.subMetrics).toHaveLength(2)
    expect(card?.subMetrics?.[0]?.label).toBe("Active Comm")
    expect(card?.subMetrics?.[0]?.formatted).toBe("12")
    expect(card?.subMetrics?.[1]?.label).toBe("Tiny Comm")
    expect(card?.subMetrics?.[1]?.formatted).toBe("3")
  })

  it("rolls up submetric groups exceeding limit into Other (N) with overflowGroups", async () => {
    const findMock = vi.fn().mockResolvedValue({
      docs: [
        { id: "c1", title: "Community 1" },
        { id: "c2", title: "Community 2" },
        { id: "c3", title: "Community 3" },
        { id: "c4", title: "Community 4" },
      ],
    })

    useDyrectedMock.mockReturnValue({
      client: {
        collection: (slug: string) => {
          if (slug === "communities") {
            return { find: findMock }
          }
          return { aggregate: aggregateMock }
        },
      },
      schemas: {
        collections: [
          {
            slug: "communities",
            admin: { useAsTitle: "title" },
          },
        ],
      },
    })

    aggregateMock.mockResolvedValue({
      m0: 50,
      m0_s0: 20,
      m0_s1: 15,
      m0_s2: 15, // Other
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
          viewSlug: "top-2",
          schema,
          metrics: [
            {
              label: "Reservations",
              aggregate: { count: "*" },
              subMetrics: [
                {
                  label: "{{group.label}}",
                  groupBy: { field: "community", limit: 2 },
                  aggregate: { count: "*" },
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

    const card = result.current.data?.[0]
    expect(card).toBeDefined()
    expect(card?.subMetrics?.length).toBe(3) // 2 top + 1 Other
    expect(card?.subMetrics?.[0]?.label).toBe("Community 1")
    expect(card?.subMetrics?.[1]?.label).toBe("Community 2")

    const otherSub = card?.subMetrics?.[2]
    expect(otherSub?.label).toBe("Other (2)")
    expect(otherSub?.overflowGroups?.length).toBe(2)
    expect(otherSub?.overflowGroups?.[0]?.label).toBe("Community 3")
    expect(otherSub?.overflowGroups?.[1]?.label).toBe("Community 4")
  })
})

describe("useViewMetrics Time-Bucket Grouping (bucket: 'day' | 'week' | 'month' | 'quarter' | 'year')", () => {
  beforeEach(() => {
    aggregateMock.mockReset()
    vi.clearAllMocks()
    useDyrectedMock.mockReturnValue({
      client: {
        collection: () => ({
          aggregate: aggregateMock,
        }),
      },
      schemas: { collections: [] },
    })
  })

  it("generates discrete monthly time buckets with ISO range where filters and isBetween filter targets", async () => {
    aggregateMock.mockResolvedValue({
      m0: 15,
      m1: 22,
      m2: 30,
    })

    const { result } = renderHook(
      () =>
        useViewMetrics({
          slug: "signups",
          viewSlug: "pipeline",
          metrics: [
            {
              label: "Signups ({{group.label}})",
              groupBy: {
                field: "createdAt",
                bucket: "month",
                limit: 3,
                orderBy: "asc",
              },
              aggregate: { count: "*" },
            },
          ],
        }),
      { wrapper: createWrapper() },
    )

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(result.current.data?.length).toBe(3)
    const cards = result.current.data!
    expect(cards[0].label).toContain("Signups (")
    expect(cards[0].value).toBe(15)
    expect(cards[1].value).toBe(22)
    expect(cards[2].value).toBe(30)

    // Verify filter targets are configured with isBetween
    expect(cards[0].filterTarget?.columnId).toBe("createdAt")
    expect(cards[0].filterTarget?.operator).toBe("isBetween")
    expect(cards[0].filterTarget?.value).toBeDefined()
    expect(cards[0].filterTarget?.value2).toBeDefined()

    // Verify aggregate was called with single batched request containing range filters
    expect(aggregateMock).toHaveBeenCalledTimes(1)
    const calledArg = aggregateMock.mock.calls[0][0]
    expect(calledArg.m0.count).toBe("*")
    expect(calledArg.m0.where.createdAt.gte).toBeDefined()
    expect(calledArg.m0.where.createdAt.lte).toBeDefined()
  })

  it("supports daily time buckets inside submetrics", async () => {
    aggregateMock.mockResolvedValue({
      m0: 70,
      m0_s0: 10,
      m0_s1: 15,
      m0_s2: 20,
    })

    const { result } = renderHook(
      () =>
        useViewMetrics({
          slug: "activity",
          viewSlug: "daily",
          metrics: [
            {
              label: "Weekly Total",
              aggregate: { count: "*" },
              subMetrics: [
                {
                  label: "{{group.label}}",
                  groupBy: {
                    field: "createdAt",
                    bucket: "day",
                    limit: 3,
                    orderBy: "asc",
                  },
                  aggregate: { count: "*" },
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

    const card = result.current.data?.[0]
    expect(card).toBeDefined()
    expect(card?.value).toBe(70)
    expect(card?.subMetrics?.length).toBe(3)
    expect(card?.subMetrics?.[0]?.value).toBe(10)
    expect(card?.subMetrics?.[1]?.value).toBe(15)
    expect(card?.subMetrics?.[2]?.value).toBe(20)
    expect(card?.subMetrics?.[0]?.filterTarget?.operator).toBe("isBetween")
  })
})

describe("useViewMetrics Period-over-Period Trend Deltas (trend)", () => {
  beforeEach(() => {
    aggregateMock.mockReset()
    vi.clearAllMocks()
    useDyrectedMock.mockReturnValue({
      client: {
        collection: () => ({
          aggregate: aggregateMock,
        }),
      },
      schemas: { collections: [] },
    })
  })

  it("queries current and companion previous interval aggregate in a single batched query and computes positive trend", async () => {
    // Current revenue = 120, Previous revenue = 100 -> +20%
    aggregateMock.mockResolvedValue({
      m0: 120,
      m0_prev: 100,
    })

    const { result } = renderHook(
      () =>
        useViewMetrics({
          slug: "orders",
          viewSlug: "overview",
          metrics: [
            {
              label: "Revenue",
              aggregate: { sum: "amount" },
              trend: {
                dateField: "createdAt",
                period: "previous_month",
              },
            },
          ],
        }),
      { wrapper: createWrapper() },
    )

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    // Verify batched aggregate call
    expect(aggregateMock).toHaveBeenCalledTimes(1)
    const arg = aggregateMock.mock.calls[0][0]
    expect(arg.m0).toBeDefined()
    expect(arg.m0_prev).toBeDefined()

    const card = result.current.data?.[0]
    expect(card?.value).toBe(120)
    expect(card?.trend).toBeDefined()
    expect(card?.trend?.deltaPct).toBe(20)
    expect(card?.trend?.direction).toBe("up")
    expect(card?.trend?.formatted).toBe("+20%")
    expect(card?.trend?.tone).toBe("emerald")
    expect(card?.trend?.previousValue).toBe(100)
  })

  it("computes negative trend and styles with rose tone", async () => {
    // Current = 75, Previous = 100 -> -25%
    aggregateMock.mockResolvedValue({
      m0: 75,
      m0_prev: 100,
    })

    const { result } = renderHook(
      () =>
        useViewMetrics({
          slug: "orders",
          viewSlug: "overview",
          metrics: [
            {
              label: "Orders",
              aggregate: { count: "*" },
              trend: {
                dateField: "createdAt",
                period: "previous_week",
              },
            },
          ],
        }),
      { wrapper: createWrapper() },
    )

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    const card = result.current.data?.[0]
    expect(card?.trend?.deltaPct).toBe(-25)
    expect(card?.trend?.direction).toBe("down")
    expect(card?.trend?.formatted).toBe("-25%")
    expect(card?.trend?.tone).toBe("rose")
  })

  it("supports invertColors for negative polarity metrics (e.g. churn or error count)", async () => {
    // Decreased error count from 50 to 30 (-40%), which is GOOD -> should be emerald with invertColors
    aggregateMock.mockResolvedValue({
      m0: 30,
      m0_prev: 50,
    })

    const { result } = renderHook(
      () =>
        useViewMetrics({
          slug: "errors",
          viewSlug: "system",
          metrics: [
            {
              label: "Error Count",
              aggregate: { count: "*" },
              trend: {
                dateField: "createdAt",
                period: "previous_day",
                invertColors: true,
              },
            },
          ],
        }),
      { wrapper: createWrapper() },
    )

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    const card = result.current.data?.[0]
    expect(card?.trend?.direction).toBe("down")
    expect(card?.trend?.formatted).toBe("-40%")
    expect(card?.trend?.tone).toBe("emerald")
  })

  it("supports trend on submetrics", async () => {
    aggregateMock.mockResolvedValue({
      m0: 200,
      m0_s0: 80,
      m0_s0_prev: 60,
    })

    const { result } = renderHook(
      () =>
        useViewMetrics({
          slug: "events",
          viewSlug: "rsvps",
          metrics: [
            {
              label: "Total Guests",
              aggregate: { count: "*" },
              subMetrics: [
                {
                  label: "Confirmed",
                  aggregate: { count: "*", where: { confirmed: { equals: true } } },
                  trend: { period: "previous_week" },
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

    const sub = result.current.data?.[0]?.subMetrics?.[0]
    expect(sub?.trend).toBeDefined()
    expect(sub?.trend?.deltaPct).toBe(33.3)
    expect(sub?.trend?.direction).toBe("up")
    expect(sub?.trend?.formatted).toBe("+33.3%")
    expect(sub?.trend?.tone).toBe("emerald")
  })
})


