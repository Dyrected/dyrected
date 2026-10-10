import { render, screen, fireEvent, cleanup } from "@testing-library/react"
import { describe, expect, it, vi, afterEach } from "vitest"
import { MetricCards } from "../metric-cards"
import type { ResolvedMetric } from "../use-view-metrics"

describe("MetricCards Component", () => {
  afterEach(() => {
    cleanup()
  })
  const sampleMetrics: ResolvedMetric[] = [
    {
      label: "Pending Orders",
      value: 42,
      formatted: "42",
      unit: "Orders",
      scope: "view",
      filterTarget: {
        columnId: "status",
        value: "pending",
        operator: "eq",
      },
      subMetrics: [
        {
          label: "Urgent",
          value: 10,
          formatted: "10",
          filterTarget: {
            columnId: "priority",
            value: "urgent",
            operator: "eq",
          },
        },
        {
          label: "Normal",
          value: 32,
          formatted: "32",
        },
      ],
    },
    {
      label: "All Total",
      value: 1200,
      formatted: "1,200",
      scope: "collection",
    },
  ]

  it("renders metric cards with labels, formatted values, units, and submetrics", () => {
    render(<MetricCards metrics={sampleMetrics} />)

    expect(screen.getByText("Pending Orders")).toBeDefined()
    expect(screen.getByText("42")).toBeDefined()
    expect(screen.getByText("Orders")).toBeDefined()

    expect(screen.getByText("Urgent:")).toBeDefined()
    expect(screen.getByText("10")).toBeDefined()
    expect(screen.getByText("Normal:")).toBeDefined()
    expect(screen.getByText("32")).toBeDefined()

    expect(screen.getByText("All Total")).toBeDefined()
    expect(screen.getByText("1,200")).toBeDefined()
  })

  it("calls onToggleFilter when a clickable card is clicked or key pressed", () => {
    const handleToggle = vi.fn()
    render(<MetricCards metrics={sampleMetrics} onToggleFilter={handleToggle} />)

    const pendingCard = screen.getByText("Pending Orders").closest("[role='button']")
    expect(pendingCard).not.toBeNull()

    // Click card
    fireEvent.click(pendingCard!)
    expect(handleToggle).toHaveBeenCalledTimes(1)
    expect(handleToggle).toHaveBeenCalledWith({
      columnId: "status",
      value: "pending",
      operator: "eq",
    })

    // Keyboard activation (Enter & Space)
    fireEvent.keyDown(pendingCard!, { key: "Enter" })
    expect(handleToggle).toHaveBeenCalledTimes(2)

    fireEvent.keyDown(pendingCard!, { key: " " })
    expect(handleToggle).toHaveBeenCalledTimes(3)
  })

  it("displays Active badge and ring when card matches activeFilters", () => {
    const activeFilters = [{ id: "status", value: "pending" }]
    render(
      <MetricCards
        metrics={sampleMetrics}
        activeFilters={activeFilters}
        onToggleFilter={vi.fn()}
      />
    )

    expect(screen.getByText("Active")).toBeDefined()
  })

  it("allows clicking interactive submetrics without firing parent card click", () => {
    const handleToggle = vi.fn()
    render(<MetricCards metrics={sampleMetrics} onToggleFilter={handleToggle} />)

    const urgentButton = screen.getByText("Urgent:").closest("button")
    expect(urgentButton).not.toBeNull()

    fireEvent.click(urgentButton!)
    expect(handleToggle).toHaveBeenCalledTimes(1)
    expect(handleToggle).toHaveBeenCalledWith({
      columnId: "priority",
      value: "urgent",
      operator: "eq",
    })
  })

  it("renders segmented distribution bar and allows clicking segments", () => {
    const handleToggle = vi.fn()
    render(<MetricCards metrics={sampleMetrics} onToggleFilter={handleToggle} />)

    const bar = screen.getByRole("group", { name: "Sub-metric distribution breakdown" })
    expect(bar).not.toBeNull()

    const urgentSegment = screen.getByTestId("distribution-segment-Urgent")
    expect(urgentSegment).not.toBeNull()
    expect(urgentSegment.style.width).toMatch(/23\.8/)

    // Clicking segment toggles filter
    fireEvent.click(urgentSegment)
    expect(handleToggle).toHaveBeenCalledWith({
      columnId: "priority",
      value: "urgent",
      operator: "eq",
    })

    // Percentages are shown alongside submetric rows
    expect(screen.getByText("(24%)")).toBeDefined()
    expect(screen.getByText("(76%)")).toBeDefined()
  })

  it("omits distribution bar when showDistribution is false", () => {
    const metricsWithoutDistribution: ResolvedMetric[] = [
      {
        ...sampleMetrics[0],
        showDistribution: false,
      },
    ]

    render(<MetricCards metrics={metricsWithoutDistribution} />)
    expect(screen.queryByRole("group", { name: "Sub-metric distribution breakdown" })).toBeNull()
    expect(screen.queryByText("(24%)")).toBeNull()
  })

  it("applies responsive column spanning classes based on metric.span", () => {
    const spanningMetrics: ResolvedMetric[] = [
      {
        label: "Wide Summary",
        value: 100,
        formatted: "100",
        span: 2,
      },
      {
        label: "Full Width KPI",
        value: 500,
        formatted: "500",
        span: "full",
      },
    ]

    render(<MetricCards metrics={spanningMetrics} />)
    const wideCard = screen.getByText("Wide Summary").closest(".dy-col-span-1")
    expect(wideCard?.className).toContain("md:dy-col-span-2")

    const fullCard = screen.getByText("Full Width KPI").closest(".dy-col-span-full")
    expect(fullCard).not.toBeNull()
  })

  it("applies color-harmonized active ring and pill styles to prevent primary theme conflicts", () => {
    const amberMetric: ResolvedMetric[] = [
      {
        label: "Asoebi Status",
        value: 11,
        formatted: "11",
        color: "amber",
        subMetrics: [
          {
            label: "Paid in Full",
            value: 8,
            formatted: "8",
            filterTarget: { columnId: "status", value: "paid" },
          },
        ],
      },
    ]

    render(
      <MetricCards
        metrics={amberMetric}
        activeFilters={[{ id: "status", value: "paid" }]}
        onToggleFilter={vi.fn()}
      />
    )

    const paidButton = screen.getByText("Paid in Full:").closest("button")
    expect(paidButton).not.toBeNull()
    // Must use amber-specific active styling rather than generic dy-bg-primary
    expect(paidButton?.className).toContain("dy-bg-amber-500")
    expect(paidButton?.className).not.toContain("dy-bg-primary/15")
  })

  it("renders interactive Other popover drilldown when submetric has overflowGroups", () => {
    const handleToggle = vi.fn()
    const overflowMetrics: ResolvedMetric[] = [
      {
        label: "Community Breakdown",
        value: 350,
        formatted: "350",
        subMetrics: [
          {
            label: "Lagos Island",
            value: 120,
            formatted: "120",
            filterTarget: { columnId: "community", value: "lagos_island" },
          },
          {
            label: "Other (30)",
            value: 65,
            formatted: "65",
            filterTarget: { columnId: "community", value: ["lagos_island"], operator: "not_in" },
            overflowGroups: [
              { label: "Ikeja", value: "ikeja", filterTarget: { columnId: "community", value: "ikeja", operator: "eq" } },
              { label: "Lekki", value: "lekki", filterTarget: { columnId: "lekki", value: "lekki", operator: "eq" } },
            ],
          },
        ],
      },
    ]

    render(<MetricCards metrics={overflowMetrics} onToggleFilter={handleToggle} />)

    const otherTrigger = screen.getByText("Other (30):").closest("button")
    expect(otherTrigger).not.toBeNull()

    // Clicking trigger opens drilldown popover
    fireEvent.click(otherTrigger!)

    expect(screen.getByText("Other Breakdown (2)")).toBeDefined()
    expect(screen.getByText("Ikeja")).toBeDefined()
    expect(screen.getByText("Lekki")).toBeDefined()

    // Clicking item in popover toggles its filter
    fireEvent.click(screen.getByText("Ikeja"))
    expect(handleToggle).toHaveBeenCalledWith({
      columnId: "community",
      value: "ikeja",
      operator: "eq",
    })
  })

  it("applies harmonic trackBg and segmented palette on colored cards", () => {
    const amberMetric: ResolvedMetric[] = [
      {
        label: "Amber Stat",
        value: 100,
        formatted: "100",
        color: "amber",
        subMetrics: [
          { label: "Phase 1", value: 60, formatted: "60" },
          { label: "Phase 2", value: 40, formatted: "40" },
        ],
      },
    ]

    render(<MetricCards metrics={amberMetric} />)

    const bar = screen.getByRole("group", { name: "Sub-metric distribution breakdown" })
    expect(bar.className).toContain("dy-bg-amber-500/15")

    const segment1 = screen.getByTestId("distribution-segment-Phase 1")
    const segment2 = screen.getByTestId("distribution-segment-Phase 2")
    // Should use warm amber/orange harmonic palette instead of default emerald/sky
    expect(segment1.className).toContain("dy-bg-amber-500")
    expect(segment2.className).toContain("dy-bg-orange-500")
  })
})
