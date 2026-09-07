import { render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { Dashboard } from "./dashboard"

const useDyrectedMock = vi.fn()
const useQueryMock = vi.fn()

vi.mock("../../providers/dyrected-context", () => ({
  useDyrected: () => useDyrectedMock(),
}))

vi.mock("@tanstack/react-query", () => ({
  useQuery: (options: unknown) => useQueryMock(options),
  useQueries: () => [],
}))

describe("Dashboard component slots", () => {
  beforeEach(() => {
    const schemas = {
      collections: [{ slug: "members", auth: true, fields: [] }],
      globals: [],
      admin: {
        components: {
          beforeDashboard: ["before"],
          afterDashboard: ["after"],
        },
      },
    }

    useQueryMock.mockReturnValue({ data: schemas, isLoading: false })
    useDyrectedMock.mockReturnValue({
      client: { getSchemas: vi.fn() },
      user: { id: "admin-1" },
      schemas,
      components: {
        dashboard: {
          before: ({ schemas: received }: { schemas: typeof schemas }) => (
            <div data-testid="before-dashboard" data-collections={received.collections.length} />
          ),
          after: () => <div data-testid="after-dashboard" />,
        },
      },
    })
  })

  it("renders dashboard slots in order and passes the loaded schemas", () => {
    const { container } = render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>,
    )

    const html = container.innerHTML
    expect(html.indexOf('data-testid="before-dashboard"')).toBeLessThan(html.indexOf("Dashboard"))
    expect(html.indexOf('data-testid="after-dashboard"')).toBeGreaterThan(html.indexOf("Needs attention"))
    expect(screen.getByTestId("before-dashboard").getAttribute("data-collections")).toBe("1")
  })
})
