import * as React from "react"

const QUERY = "(hover: hover) and (pointer: fine)"

function subscribe(onChange: () => void) {
  const mql = window.matchMedia(QUERY)
  mql.addEventListener("change", onChange)
  return () => mql.removeEventListener("change", onChange)
}

/**
 * True when the primary input can hover precisely, such as a mouse or trackpad. This follows
 * the input device, not the window width: a tablet with a mouse gets hover behaviour, and a
 * narrow desktop window keeps it. Defaults to true where `matchMedia` is unavailable.
 */
export function useHoverCapable(): boolean {
  return React.useSyncExternalStore(
    subscribe,
    () => (typeof window.matchMedia === "function" ? window.matchMedia(QUERY).matches : true),
    () => true,
  )
}
