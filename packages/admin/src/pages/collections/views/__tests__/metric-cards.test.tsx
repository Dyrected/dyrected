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
})
