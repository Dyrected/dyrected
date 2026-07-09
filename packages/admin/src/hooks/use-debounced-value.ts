import * as React from "react"

/**
 * Returns a debounced copy of `value` that only updates after `delayMs` have
 * elapsed without a further change. Use it to throttle server requests driven
 * by fast-changing input, such as a search box.
 */
export function useDebouncedValue<T>(value: T, delayMs = 250): T {
  const [debounced, setDebounced] = React.useState(value)

  React.useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs)
    return () => clearTimeout(timer)
  }, [value, delayMs])

  return debounced
}
