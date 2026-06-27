// @vitest-environment jsdom
import * as React from "react"
import { describe, it, expect, vi } from "vitest"
import { cleanup, render, waitFor, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { FormEngine } from "../form-engine"
import type { FieldSchema } from "../form-engine"
import { afterEach } from "vitest"

if (typeof window !== "undefined") {
  window.HTMLElement.prototype.hasPointerCapture = () => false
  window.HTMLElement.prototype.scrollIntoView = () => {}
  window.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
}

// Mock useDyrected
vi.mock("../../../providers/dyrected-context", () => ({
  useDyrected: () => ({
    client: null,
    config: { baseUrl: "", apiKey: "", siteId: "" },
    setAuth: () => {},
    setToken: () => {},
    logout: () => {},
    isAuthenticated: false,
    schemas: { collections: [], globals: [] },
    user: null,
    components: {},
  }),
}))

// Minimal mocks for UI components that might need radix/context
vi.mock("../../ui/button", () => ({
  Button: ({ children, ...props }: { children: React.ReactNode; [key: string]: unknown }) => (
    <button {...props}>{children}</button>
  ),
}))

afterEach(() => {
  cleanup()
  document.body.removeAttribute("data-scroll-locked")
  document.body.style.pointerEvents = ""
})

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

describe("Frontend UI Hooks Reactivity", () => {
  it("should dynamically update slug field when title changes", async () => {
    const user = userEvent.setup()
    const onChangeSpy = vi.fn(({ siblingData }) => {
      return (siblingData?.title || "").toLowerCase().replace(/\s+/g, "-")
    })

    const fields: FieldSchema[] = [
      { name: "title", type: "text", label: "Title" },
      {
        name: "slug",
        type: "text",
        label: "Slug",
        admin: {
          hooks: {
            onChange: onChangeSpy,
          },
        },
      },
    ]

    renderWithQueryClient(
      <FormEngine
        collection="posts"
        fields={fields}
        onSubmit={() => {}}
      />
    )

    const titleInput = document.querySelector('input[name="title"]') as HTMLInputElement
    const slugInput = document.querySelector('input[name="slug"]') as HTMLInputElement

    expect(titleInput).not.toBeNull()
    expect(slugInput).not.toBeNull()

    // Simulate typing in Title
    await user.type(titleInput, "hello world")

    // Assert that the onChange hook was evaluated and updated the slug value
    await waitFor(() => {
      expect(onChangeSpy).toHaveBeenCalled()
    })
    
    await waitFor(() => {
      expect(slugInput.value).toBe("hello-world")
    })
  });

  it("should dynamically update dropdown options based on sibling values (Dependent Dropdowns)", async () => {
    const user = userEvent.setup()
    const stateHookSpy = vi.fn(({ siblingData }) => {
      if (siblingData.country === "us") {
        return [
          { label: "California", value: "CA" },
          { label: "New York", value: "NY" },
        ]
      }
      if (siblingData.country === "ca") {
        return [
          { label: "Ontario", value: "ON" },
          { label: "Quebec", value: "QC" },
        ]
      }
      return []
    })

    const fields: FieldSchema[] = [
      {
        name: "country",
        type: "select",
        label: "Country",
        options: [
          { label: "United States", value: "us" },
          { label: "Canada", value: "ca" },
        ],
      },
      {
        name: "state",
        type: "select",
        label: "State",
        options: [],
        admin: {
          hooks: {
            options: stateHookSpy,
          },
        },
      },
    ]

    renderWithQueryClient(
      <FormEngine
        collection="locations"
        fields={fields}
        onSubmit={() => {}}
        defaultValues={{ country: "us", state: "NY" }}
      />
    )

    // Verify hook ran initially with us country
    await waitFor(() => {
      expect(stateHookSpy).toHaveBeenCalled()
    })

    // Find the Country select trigger and click it
    const comboboxes = screen.getAllByRole("combobox")
    const countryCombobox = comboboxes[0]
    expect(countryCombobox).not.toBeNull()

    // Open dropdown and select Canada
    await user.click(countryCombobox)
    const canadaOption = screen.getByRole("option", { name: "Canada" })
    await user.click(canadaOption)

    // Verify hook was re-evaluated with the new country "ca"
    await waitFor(() => {
      expect(stateHookSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          siblingData: expect.objectContaining({ country: "ca" })
        })
      )
    })

    // The State value (previously "NY") should be reset (no longer "New York")
    const stateCombobox = comboboxes[1]
    expect(stateCombobox.textContent).not.toContain("New York")

    // Open State dropdown and check that Ontario and Quebec are now the options
    await user.click(stateCombobox)
    expect(screen.getByRole("option", { name: "Ontario" })).not.toBeNull()
    expect(screen.getByRole("option", { name: "Quebec" })).not.toBeNull()
  })

  it("should run async option hooks", async () => {
    const stateOptionsHook = vi.fn(async ({ siblingData }) => {
      if (siblingData.country === "us") return [{ label: "California", value: "CA" }]
      return []
    })

    const fields: FieldSchema[] = [
      {
        name: "country",
        type: "select",
        label: "Country",
        options: [{ label: "United States", value: "us" }],
      },
      {
        name: "state",
        type: "select",
        label: "State",
        options: [],
        admin: {
          hooks: {
            options: stateOptionsHook,
          },
        },
      },
    ]

    renderWithQueryClient(
      <FormEngine
        collection="locations"
        fields={fields}
        onSubmit={() => {}}
        defaultValues={{ country: "us" }}
      />
    )

    await waitFor(() => {
      expect(stateOptionsHook).toHaveBeenCalled()
    })

    let stateCombobox = screen.getAllByRole("combobox")[1]
    await waitFor(() => {
      stateCombobox = screen.getAllByRole("combobox")[1]
      expect(stateCombobox.getAttribute("disabled")).toBeNull()
    })
    await userEvent.click(stateCombobox)

    await waitFor(() => {
      expect(screen.getByRole("option", { name: "California" })).not.toBeNull()
    })
  })
})
