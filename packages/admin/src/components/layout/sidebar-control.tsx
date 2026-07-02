import { createContext, useContext } from "react"

export interface SidebarControlValue {
  /** Whether the desktop nav sidebar is currently collapsed. */
  collapsed: boolean
  /** Set the collapsed state imperatively (e.g. auto-collapse for live preview). */
  setCollapsed: (collapsed: boolean) => void
}

const SidebarControlContext = createContext<SidebarControlValue | null>(null)

export const SidebarControlProvider = SidebarControlContext.Provider

/**
 * Access the admin shell's sidebar collapse control. Returns null when rendered
 * outside the shell (e.g. embedded previews, tests), so callers should guard.
 */
export function useSidebarControl(): SidebarControlValue | null {
  return useContext(SidebarControlContext)
}
