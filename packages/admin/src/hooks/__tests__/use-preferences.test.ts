import { renderHook, act } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { clearCachedUserPreferences, usePreference } from "../use-preferences"

const mockGetPreference = vi.fn()
const mockSetPreference = vi.fn()

const mockClient = {
  getPreference: mockGetPreference,
  setPreference: mockSetPreference,
}

const defaultUser = {
  id: "user-1",
  email: "admin@example.com",
  roles: ["admin"],
}
let mockUser: Record<string, unknown> | null = defaultUser

vi.mock("../../providers/dyrected-context", () => ({
  useDyrected: () => ({
    client: mockClient,
    user: mockUser,
  }),
}))

describe("usePreference Hook", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.clearAllMocks()
    mockUser = defaultUser
    window.localStorage.clear()
    mockGetPreference.mockResolvedValue({ key: "test-key", value: null })
    mockSetPreference.mockResolvedValue({ key: "test-key", value: true })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("initializes with defaultValue when nothing in localStorage or remote", () => {
    const { result } = renderHook(() => usePreference("test-key", { count: 0 }))
    expect(result.current[0]).toEqual({ count: 0 })
  })

  it("updates local state and localStorage immediately (0ms latency)", () => {
    const { result } = renderHook(() => usePreference("test-key", { count: 0 }))

    act(() => {
      result.current[1]({ count: 42 })
    })

    // Local state updated immediately
    expect(result.current[0]).toEqual({ count: 42 })

    // localStorage updated immediately
    const stored = window.localStorage.getItem("dyrected_pref_u::user-1:personal_test-key")
    expect(stored).toBe(JSON.stringify({ count: 42 }))

    // Remote client.setPreference NOT called yet (debounced)
    expect(mockSetPreference).not.toHaveBeenCalled()
  })

  it("debounces remote client.setPreference by 400ms", async () => {
    const { result } = renderHook(() => usePreference("test-key", 0, { debounceMs: 400 }))

    act(() => {
      result.current[1](1)
      result.current[1](2)
      result.current[1](3)
    })

    // Only latest value in state
    expect(result.current[0]).toBe(3)
    expect(mockSetPreference).not.toHaveBeenCalled()

    // Advance timer past debounceMs
    act(() => {
      vi.advanceTimersByTime(400)
    })

    expect(mockSetPreference).toHaveBeenCalledTimes(1)
    expect(mockSetPreference).toHaveBeenCalledWith("test-key", 3, { scope: "personal", role: undefined })
  })

  it("falls back to defaultValue if validate function returns false", () => {
    window.localStorage.setItem(
      "dyrected_pref_u::user-1:personal_test-key",
      JSON.stringify({ score: -50 })
    )

    const { result } = renderHook(() =>
      usePreference(
        "test-key",
        { score: 100 },
        {
          validate: (val: any) => typeof val?.score === "number" && val.score >= 0,
        }
      )
    )

    // Failed validation, so falls back to 100
    expect(result.current[0]).toEqual({ score: 100 })
  })

  it("runs migration if stored version is older than options.version", () => {
    window.localStorage.setItem(
      "dyrected_pref_u::user-1:personal_test-key",
      JSON.stringify({ _version: 1, oldField: "hello" })
    )

    const migrate = vi.fn((stored: any, _fromVer: number) => ({
      _version: 2,
      newField: `${stored.oldField}-migrated`,
    }))

    const { result } = renderHook(() =>
      usePreference(
        "test-key",
        { _version: 2, newField: "default" },
        {
          version: 2,
          migrate,
        }
      )
    )

    expect(migrate).toHaveBeenCalledWith({ _version: 1, oldField: "hello" }, 1)
    expect(result.current[0]).toEqual({ _version: 2, newField: "hello-migrated" })
  })

  it("passes scope and role options to client.setPreference", () => {
    const { result } = renderHook(() =>
      usePreference("test-role-key", "default-role", {
        scope: "role",
        role: "compliance-reviewer",
        debounceMs: 200,
      })
    )

    act(() => {
      result.current[1]("updated-role-value")
    })

    act(() => {
      vi.advanceTimersByTime(200)
    })

    expect(mockSetPreference).toHaveBeenCalledWith(
      "test-role-key",
      "updated-role-value",
      { scope: "role", role: "compliance-reviewer" }
    )
  })

  it("synchronizes updates across multiple hook instances in real-time without reloads", async () => {
    const { result: hook1 } = renderHook(() => usePreference("shared-key", "initial"))
    const { result: hook2 } = renderHook(() => usePreference("shared-key", "initial"))

    expect(hook1.current[0]).toBe("initial")
    expect(hook2.current[0]).toBe("initial")

    await act(async () => {
      hook1.current[1]("updated-from-customizer")
    })

    expect(hook1.current[0]).toBe("updated-from-customizer")
    expect(hook2.current[0]).toBe("updated-from-customizer")
  })

  describe("per-user local cache", () => {
    it("does not hand one user's cached value to the next user on the same browser", () => {
      const first = renderHook(() => usePreference("nav", { items: [] as string[] }))
      act(() => {
        first.result.current[1]({ items: ["secret"] })
      })
      first.unmount()

      mockUser = { id: "user-2", email: "external@example.com", roles: ["external"] }
      const second = renderHook(() => usePreference("nav", { items: [] as string[] }))

      expect(second.result.current[0]).toEqual({ items: [] })
    })

    it("resets to the default when the server has no saved value", async () => {
      window.localStorage.setItem("dyrected_pref_u::user-1:personal_nav", JSON.stringify({ items: ["stale"] }))
      mockGetPreference.mockResolvedValue({ key: "nav", value: null })

      const { result } = renderHook(() => usePreference("nav", { items: [] as string[] }))
      expect(result.current[0]).toEqual({ items: ["stale"] })

      await act(async () => {
        await Promise.resolve()
      })

      expect(result.current[0]).toEqual({ items: [] })
      expect(window.localStorage.getItem("dyrected_pref_u::user-1:personal_nav")).toBeNull()
    })

    it("does not read or write the cache when the user cannot be identified", () => {
      mockUser = {}
      window.localStorage.setItem("dyrected_pref_personal_nav", JSON.stringify({ items: ["legacy"] }))

      const { result } = renderHook(() => usePreference("nav", { items: [] as string[] }))
      expect(result.current[0]).toEqual({ items: [] })

      act(() => {
        result.current[1]({ items: ["x"] })
      })
      expect(window.localStorage.getItem("dyrected_pref_personal_nav")).toBe(JSON.stringify({ items: ["legacy"] }))
    })

    it("shares one device-level value across users when localScope is device", () => {
      const first = renderHook(() => usePreference("theme", "system", { localScope: "device" }))
      act(() => {
        first.result.current[1]("dark")
      })
      first.unmount()

      mockUser = { id: "user-2" }
      const second = renderHook(() => usePreference("theme", "system", { localScope: "device" }))
      expect(second.result.current[0]).toBe("dark")
    })

    it("clearCachedUserPreferences drops user and legacy navigation keys but keeps device keys", () => {
      window.localStorage.setItem("dyrected_pref_u::user-1:personal_nav", "1")
      window.localStorage.setItem("dyrected_pref_personal_admin:navigation", "1")
      window.localStorage.setItem("dyrected_pref_role_editor_admin:navigation", "1")
      window.localStorage.setItem("dyrected_pref_personal_theme", JSON.stringify("dark"))

      clearCachedUserPreferences()

      expect(window.localStorage.getItem("dyrected_pref_u::user-1:personal_nav")).toBeNull()
      expect(window.localStorage.getItem("dyrected_pref_personal_admin:navigation")).toBeNull()
      expect(window.localStorage.getItem("dyrected_pref_role_editor_admin:navigation")).toBeNull()
      expect(window.localStorage.getItem("dyrected_pref_personal_theme")).toBe(JSON.stringify("dark"))
    })
  })

  describe("auto scope", () => {
    it("reads through the personal, role, global waterfall and writes personally", async () => {
      mockGetPreference.mockResolvedValue({ key: "nav", value: { items: ["from-role-default"] } })
      const { result } = renderHook(() => usePreference("nav", { items: [] as string[] }, { scope: "auto" }))

      await act(async () => {
        await Promise.resolve()
      })
      expect(mockGetPreference).toHaveBeenCalledWith("nav", { scope: undefined, role: undefined })
      expect(result.current[0]).toEqual({ items: ["from-role-default"] })

      act(() => {
        result.current[1]({ items: ["mine"] })
      })
      act(() => {
        vi.advanceTimersByTime(500)
      })
      expect(mockSetPreference).toHaveBeenCalledWith("nav", { items: ["mine"] }, { scope: "personal", role: undefined })
    })

    it("reset forgets the personal value and falls back to the shared default", async () => {
      mockGetPreference.mockResolvedValue({ key: "nav", value: { items: ["mine"] } })
      const mockDelete = vi.fn().mockResolvedValue({ success: true })
      ;(mockClient as any).deletePreference = mockDelete

      const { result } = renderHook(() => usePreference("nav", { items: [] as string[] }, { scope: "auto" }))
      await act(async () => {
        await Promise.resolve()
      })
      expect(result.current[0]).toEqual({ items: ["mine"] })

      mockGetPreference.mockResolvedValue({ key: "nav", value: { items: ["role-default"] } })
      await act(async () => {
        await result.current[2]()
      })

      expect(mockDelete).toHaveBeenCalledWith("nav", { scope: "personal", role: undefined })
      expect(result.current[0]).toEqual({ items: ["role-default"] })
    })

    it("reset returns to the hook default when nothing is shared", async () => {
      mockGetPreference.mockResolvedValue({ key: "nav", value: { items: ["mine"] } })
      ;(mockClient as any).deletePreference = vi.fn().mockResolvedValue({ success: true })

      const { result } = renderHook(() => usePreference("nav", { items: [] as string[] }, { scope: "auto" }))
      await act(async () => {
        await Promise.resolve()
      })

      mockGetPreference.mockResolvedValue({ key: "nav", value: null })
      await act(async () => {
        await result.current[2]()
      })
      expect(result.current[0]).toEqual({ items: [] })
    })
  })
})
