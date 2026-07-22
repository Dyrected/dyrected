// @vitest-environment jsdom
import * as React from "react"
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest"
import { fireEvent, render, screen } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { TextField } from "./text-field"
import { SelectField } from "./select-field"
import { MultiSelect } from "./multi-select"
import { DatePicker } from "./date-picker"

vi.mock("../../../providers/dyrected-context", () => ({
  useDyrected: () => ({
    client: null,
    schemas: { collections: [], admin: { siteUrl: "https://example.com" } },
  }),
}))

function renderWithQueryClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      {ui}
    </QueryClientProvider>
  )
}

describe("format-aware edit inputs", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-07-22T12:00:00Z"))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("renders currency adornments and numeric steppers", async () => {
    const onChange = vi.fn()

    render(
      <TextField
        schema={{
          type: "number",
          name: "price",
          label: "Price",
          admin: { format: { type: "currency", currency: "USD" } },
        }}
        field={{ value: 25, onChange, name: "price", ref: { current: null } }}
      />
    )

    expect(screen.getByText("$")).toBeTruthy()

    fireEvent.click(screen.getByRole("button", { name: "Increase Price" }))
    expect(onChange).toHaveBeenCalledWith(25.01)
  })

  it("uses the rating control as the number editor", async () => {
    const onChange = vi.fn()

    render(
      <TextField
        schema={{
          type: "number",
          name: "rating",
          label: "Rating",
          admin: { format: { type: "rating", max: 5 } },
        }}
        field={{ value: 3, onChange, name: "rating", ref: { current: null } }}
      />
    )

    expect(screen.getByRole("radiogroup", { name: "Rating rating" })).toBeTruthy()
    fireEvent.click(screen.getByRole("radio", { name: "Set rating to 5" }))
    expect(onChange).toHaveBeenCalledWith(5)
  })

  it("renders badge-formatted options inside select and multiselect editors", () => {
    renderWithQueryClient(
      <div>
        <SelectField
          schema={{
            type: "select",
            name: "status",
            label: "Status",
            options: [
              { label: "Published", value: "published" },
              { label: "Draft", value: "draft" },
            ],
            admin: {
              format: {
                type: "badge",
                labels: { published: "Live" },
                tones: { published: "success" },
              },
            },
          }}
          field={{ value: "published", onChange: vi.fn() }}
        />
        <MultiSelect
          options={[
            { label: "Published", value: "published" },
            { label: "Draft", value: "draft" },
          ]}
          value={["published"]}
          onChange={vi.fn()}
          schema={{
            type: "multiSelect",
            name: "statuses",
            label: "Statuses",
            options: [
              { label: "Published", value: "published" },
              { label: "Draft", value: "draft" },
            ],
            admin: {
              format: {
                type: "badge",
                labels: { published: "Live" },
                tones: { published: "success" },
              },
            },
          }}
        />
      </div>
    )

    const liveLabels = screen.getAllByText("Live")
    expect(liveLabels.length).toBeGreaterThanOrEqual(2)
  })

  it("shows a date display helper when the field uses a date format", () => {
    render(
      <DatePicker
        value="2026-07-21T12:00:00.000Z"
        onChange={vi.fn()}
        fieldType="datetime"
        withTime
        format="relative"
      />
    )

    expect(screen.getByText("Display: yesterday")).toBeTruthy()
  })
})
