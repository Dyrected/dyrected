import { renderHook } from "@testing-library/react"
import type { ReactNode } from "react"
import { describe, expect, it } from "vitest"
import { DyrectedContext, type DyrectedContextType } from "../../providers/dyrected-context"
import { useAdminClient } from "../use-admin-client"

function wrapperWith(value: Partial<DyrectedContextType> | undefined) {
  return ({ children }: { children: ReactNode }) => (
    <DyrectedContext.Provider value={value as DyrectedContextType | undefined}>{children}</DyrectedContext.Provider>
  )
}

describe("useAdminClient", () => {
  it("returns the client the admin is signed in with", () => {
    const client = { collection: () => ({}) }
    const { result } = renderHook(() => useAdminClient(), { wrapper: wrapperWith({ client: client as never }) })
    expect(result.current).toBe(client)
  })

  it("explains itself when used outside the admin", () => {
    expect(() => renderHook(() => useAdminClient())).toThrow(/inside a component rendered by the Dyrected admin/)
  })

  it("explains itself before the editor has signed in", () => {
    expect(() =>
      renderHook(() => useAdminClient(), { wrapper: wrapperWith({ client: null }) }),
    ).toThrow(/after the editor has signed in/)
  })
})
