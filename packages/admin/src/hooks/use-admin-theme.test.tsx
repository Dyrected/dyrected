import { render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import {
  AdminThemeProvider,
  AdminThemedRoot,
} from "./admin-theme-provider"
import { resolveAdminTheme } from "./admin-theme"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "../components/ui/dialog"

vi.mock("../providers/dyrected-context", () => ({
  useDyrected: () => ({
    client: null,
    user: null,
  }),
}))

function mockSystemDark(matches: boolean) {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  })
}

function renderThemedRoot(children = <div>Admin</div>) {
  return render(
    <AdminThemeProvider>
      <AdminThemedRoot>{children}</AdminThemedRoot>
    </AdminThemeProvider>,
  )
}

describe("admin theme", () => {
  beforeEach(() => {
    window.localStorage.clear()
    mockSystemDark(false)
  })

  it("resolves system, light, and dark preferences", () => {
    expect(resolveAdminTheme("system", "dark")).toBe("dark")
    expect(resolveAdminTheme("light", "dark")).toBe("light")
    expect(resolveAdminTheme("dark", "light")).toBe("dark")
  })

  it("defaults to the system dark preference", () => {
    mockSystemDark(true)

    const { container } = renderThemedRoot()
    const root = container.querySelector(".dy-admin-ui")

    expect(root?.classList.contains("dark")).toBe(true)
    expect(root?.getAttribute("data-theme")).toBe("dark")
  })

  it("uses explicit light preference over system dark", () => {
    mockSystemDark(true)
    window.localStorage.setItem("dyrected_pref_theme", JSON.stringify("light"))

    const { container } = renderThemedRoot()
    const root = container.querySelector(".dy-admin-ui")

    expect(root?.classList.contains("dark")).toBe(false)
    expect(root?.getAttribute("data-theme")).toBe("light")
  })

  it("uses explicit dark preference over system light", () => {
    window.localStorage.setItem("dyrected_pref_theme", JSON.stringify("dark"))

    const { container } = renderThemedRoot()
    const root = container.querySelector(".dy-admin-ui")

    expect(root?.classList.contains("dark")).toBe(true)
    expect(root?.getAttribute("data-theme")).toBe("dark")
  })

  it("applies dark mode to portal wrappers", () => {
    window.localStorage.setItem("dyrected_pref_theme", JSON.stringify("dark"))

    renderThemedRoot(
      <Dialog open>
        <DialogContent>
          <DialogTitle>Theme portal</DialogTitle>
          <DialogDescription>Portal theme marker check</DialogDescription>
        </DialogContent>
      </Dialog>,
    )

    expect(screen.getByText("Theme portal")).toBeTruthy()
    expect(document.body.querySelector(".dy-admin-ui.dark[data-theme='dark']")).toBeTruthy()
  })
})
