import { renderHook, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { useRemoteComponents } from "../use-remote-components"

const loadRemoteComponents = vi.fn()

vi.mock("../../lib/remote-components", async () => {
  const actual = await vi.importActual<typeof import("../../lib/remote-components")>("../../lib/remote-components")
  return { ...actual, loadRemoteComponents: (...args: unknown[]) => loadRemoteComponents(...args) }
})
// The real public entry pulls in the whole admin; the hook only needs to hand it to the bundle.
vi.mock("../../public/index", () => ({ marker: "admin-public-api" }))

beforeEach(() => {
  loadRemoteComponents.mockReset()
})

describe("useRemoteComponents", () => {
  it("stays idle without a url and never loads anything", () => {
    const { result } = renderHook(() => useRemoteComponents({}))
    expect(result.current.status).toBe("idle")
    expect(loadRemoteComponents).not.toHaveBeenCalled()
  })

  it("loads once and exposes the registry", async () => {
    loadRemoteComponents.mockResolvedValue({ fields: { x: () => null } })
    const { result } = renderHook(() => useRemoteComponents({ url: "https://x.test/c.js", integrity: "sha384-abc" }))

    expect(result.current.status).toBe("loading")
    await waitFor(() => expect(result.current.status).toBe("ready"))
    expect(Object.keys(result.current.components!.fields!)).toEqual(["x"])
    expect(loadRemoteComponents).toHaveBeenCalledTimes(1)
  })

  it("hands the bundle this admin's React and public API, and the integrity hash", async () => {
    loadRemoteComponents.mockResolvedValue({})
    renderHook(() => useRemoteComponents({ url: "https://x.test/c.js", integrity: "sha384-abc" }))
    await waitFor(() => expect(loadRemoteComponents).toHaveBeenCalled())

    const options = loadRemoteComponents.mock.calls[0][0]
    expect(options).toMatchObject({ url: "https://x.test/c.js", integrity: "sha384-abc" })
    expect(Object.keys(options.shared).sort()).toEqual(
      ["@dyrected/admin", "react", "react-dom", "react-dom/client", "react/jsx-dev-runtime", "react/jsx-runtime"].sort(),
    )
    expect(options.shared["@dyrected/admin"]).toEqual({ marker: "admin-public-api" })
  })

  it("reports a failure instead of throwing, so the admin can still render", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined)
    loadRemoteComponents.mockRejectedValue(new Error("integrity failed"))
    const { result } = renderHook(() => useRemoteComponents({ url: "https://x.test/c.js" }))

    await waitFor(() => expect(result.current.status).toBe("error"))
    expect(result.current.error?.message).toBe("integrity failed")
    expect(consoleError).toHaveBeenCalled()
    consoleError.mockRestore()
  })

  it("does not reload on re-render, and loads the new bundle when the url changes", async () => {
    loadRemoteComponents.mockResolvedValueOnce({ fields: { a: () => null } }).mockResolvedValueOnce({ fields: { b: () => null } })
    const { result, rerender } = renderHook(({ url }) => useRemoteComponents({ url }), { initialProps: { url: "https://x.test/1.js" } })
    await waitFor(() => expect(result.current.status).toBe("ready"))

    rerender({ url: "https://x.test/1.js" })
    expect(loadRemoteComponents).toHaveBeenCalledTimes(1)

    rerender({ url: "https://x.test/2.js" })
    await waitFor(() => expect(Object.keys(result.current.components?.fields ?? {})).toEqual(["b"]))
    expect(loadRemoteComponents).toHaveBeenCalledTimes(2)
  })

  it("discards a stale result when the url changes mid-load", async () => {
    let resolveOld!: (value: unknown) => void
    loadRemoteComponents.mockImplementation(({ url }: { url: string }) =>
      url.endsWith("old.js") ? new Promise((resolve) => (resolveOld = resolve)) : Promise.resolve({ fields: { fresh: () => null } }),
    )
    const { result, rerender } = renderHook(({ url }) => useRemoteComponents({ url }), { initialProps: { url: "https://x.test/old.js" } })
    await waitFor(() => expect(loadRemoteComponents).toHaveBeenCalledTimes(1))

    rerender({ url: "https://x.test/new.js" })
    await waitFor(() => expect(Object.keys(result.current.components?.fields ?? {})).toEqual(["fresh"]))

    resolveOld({ fields: { stale: () => null } })
    await new Promise((resolve) => setTimeout(resolve, 10))
    expect(Object.keys(result.current.components!.fields!)).toEqual(["fresh"])
  })

  it("does not start a download for a url that was replaced before the admin API loaded", async () => {
    loadRemoteComponents.mockResolvedValue({})
    const { rerender } = renderHook(({ url }) => useRemoteComponents({ url }), { initialProps: { url: "https://x.test/1.js" } })
    rerender({ url: "https://x.test/2.js" })
    await waitFor(() => expect(loadRemoteComponents).toHaveBeenCalled())
    await new Promise((resolve) => setTimeout(resolve, 20))

    expect(loadRemoteComponents.mock.calls.map((call) => call[0].url)).toEqual(["https://x.test/2.js"])
  })
})
