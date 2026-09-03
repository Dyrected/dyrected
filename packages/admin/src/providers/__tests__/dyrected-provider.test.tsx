import { act, cleanup, render, screen, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { DyrectedProvider } from "../dyrected-provider"
import { useDyrected } from "../dyrected-context"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"

function makeToken(payload: Record<string, unknown>): string {
  const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }))
  const body = btoa(JSON.stringify(payload))
  return `${header}.${body}.signature`
}

function TestConsumer() {
  const { user, logout, setToken } = useDyrected()
  return (
    <div>
      <div data-testid="user-id">{user ? String(user.id || user.sub || "") : "no-user"}</div>
      <button data-testid="logout-btn" onClick={logout}>
        Logout
      </button>
      <button
        data-testid="login-btn"
        onClick={() => setToken(makeToken({ sub: "user-123", email: "test@example.com" }), "users")}
      >
        Login
      </button>
    </div>
  )
}

describe("DyrectedProvider auth and session management", () => {
  let queryClient: QueryClient
  let originalFetch: typeof globalThis.fetch

  beforeEach(() => {
    originalFetch = globalThis.fetch
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    })
    localStorage.clear()

    globalThis.fetch = vi.fn().mockImplementation(async (url: string | URL | Request, _init?: RequestInit) => {
      const urlStr = typeof url === "string" ? url : url.toString()

      if (urlStr.includes("/api/schemas")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            collections: [{ slug: "users", auth: true, fields: [] }],
            globals: [],
          }),
        } as Response
      }

      if (urlStr.includes("/api/collections/users/logout")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ success: true }),
        } as Response
      }

      if (urlStr.includes("/api/collections/users/me")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ id: "user-123", email: "test@example.com" }),
        } as Response
      }

      if (urlStr.includes("/api/collections/users/refresh-token")) {
        return {
          ok: false,
          status: 401,
          json: async () => ({ message: "Invalid or expired token." }),
        } as Response
      }

      return {
        ok: true,
        status: 200,
        json: async () => ({}),
      } as Response
    })
  })

  afterEach(() => {
    cleanup()
    localStorage.clear()
    globalThis.fetch = originalFetch
  })

  it("clears user state and calls backend logout when logout is invoked", async () => {
    const validToken = makeToken({ sub: "user-123", email: "test@example.com", exp: Math.floor(Date.now() / 1000) + 3600 })
    localStorage.setItem("dyrected_token", validToken)
    localStorage.setItem("dyrected_admin_auth_collection", "users")

    render(
      <QueryClientProvider client={queryClient}>
        <DyrectedProvider baseUrl="http://api.test" apiKey="test-key">
          <TestConsumer />
        </DyrectedProvider>
      </QueryClientProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId("user-id").textContent).toBe("user-123")
    })

    const logoutBtn = screen.getByTestId("logout-btn")
    await act(async () => {
      logoutBtn.click()
    })

    await waitFor(() => {
      expect(screen.getByTestId("user-id").textContent).toBe("no-user")
    })
    expect(localStorage.getItem("dyrected_token")).toBeNull()
  })

  it("handles 401 unauthorized event by clearing session if refresh fails", async () => {
    const validToken = makeToken({ sub: "user-123", email: "test@example.com", exp: Math.floor(Date.now() / 1000) + 3600 })
    localStorage.setItem("dyrected_token", validToken)
    localStorage.setItem("dyrected_admin_auth_collection", "users")

    render(
      <QueryClientProvider client={queryClient}>
        <DyrectedProvider baseUrl="http://api.test" apiKey="test-key">
          <TestConsumer />
        </DyrectedProvider>
      </QueryClientProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId("user-id").textContent).toBe("user-123")
    })

    await act(async () => {
      window.dispatchEvent(
        new CustomEvent("dyrected:auth-unauthorized", {
          detail: { message: "Invalid or expired token.", path: "/api/preferences/theme" },
        })
      )
    })

    await waitFor(() => {
      expect(screen.getByTestId("user-id").textContent).toBe("no-user")
    })
  })

  it("updates stored token when refresh succeeds on 401 unauthorized", async () => {
    const expiredToken = makeToken({ sub: "user-123", email: "test@example.com", exp: Math.floor(Date.now() / 1000) + 3600 })
    const freshToken = makeToken({ sub: "user-123", email: "test@example.com", exp: Math.floor(Date.now() / 1000) + 7200 })
    localStorage.setItem("dyrected_token", expiredToken)
    localStorage.setItem("dyrected_admin_auth_collection", "users")

    const originalCustomFetch = globalThis.fetch
    globalThis.fetch = vi.fn().mockImplementation(async (url: string | URL | Request, _init?: RequestInit) => {
      const urlStr = typeof url === "string" ? url : url.toString()
      if (urlStr.includes("/api/collections/users/refresh-token")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ token: freshToken }),
        } as Response
      }
      return originalCustomFetch(url, _init)
    })

    render(
      <QueryClientProvider client={queryClient}>
        <DyrectedProvider baseUrl="http://api.test" apiKey="test-key">
          <TestConsumer />
        </DyrectedProvider>
      </QueryClientProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId("user-id").textContent).toBe("user-123")
    })

    await act(async () => {
      window.dispatchEvent(
        new CustomEvent("dyrected:auth-unauthorized", {
          detail: { message: "Invalid or expired token.", path: "/api/preferences/theme" },
        })
      )
    })

    await waitFor(() => {
      expect(localStorage.getItem("dyrected_token")).toBe(freshToken)
      expect(screen.getByTestId("user-id").textContent).toBe("user-123")
    })
  })
})
