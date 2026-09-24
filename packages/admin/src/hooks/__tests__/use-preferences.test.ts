import { renderHook, act } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { usePreference } from "../use-preferences"

const mockGetPreference = vi.fn()
const mockSetPreference = vi.fn()

const mockClient = {
  getPreference: mockGetPreference,
  setPreference: mockSetPreference,
}

const mockUser = {
  id: "user-1",
  email: "admin@example.com",
  roles: ["admin"],
}

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
    const stored = window.localStorage.getItem("dyrected_pref_personal_test-key")
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
      "dyrected_pref_personal_test-key",
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
      "dyrected_pref_personal_test-key",
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
})
