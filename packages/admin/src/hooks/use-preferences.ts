import * as React from "react"

export type Updater<T> = T | ((old: T) => T);

/**
 * A hook to manage and persist user preferences in the Admin UI.
 * Currently uses localStorage for persistence.
 */
export function usePreferences<T>(key: string, defaultValue: T): [T, (updater: Updater<T>) => void] {
  const [value, setValue] = React.useState<T>(() => {
    if (typeof window === "undefined") return defaultValue

    try {
      const stored = window.localStorage.getItem(`dyrected_pref_${key}`)
      return stored ? JSON.parse(stored) : defaultValue
    } catch (e) {
      console.warn(`[usePreferences] Error loading key "${key}":`, e)
      return defaultValue
    }
  })

  // Sync state if key changes (e.g. navigating between collections)
  React.useEffect(() => {
    if (typeof window === "undefined") return

    try {
      const stored = window.localStorage.getItem(`dyrected_pref_${key}`)
      if (stored) {
        setValue(JSON.parse(stored))
      } else {
        setValue(defaultValue)
      }
    } catch (e) {
      console.warn(`[usePreferences] Error syncing key "${key}":`, e)
    }
  }, [key, defaultValue])

  const updateValue = React.useCallback((updater: Updater<T>) => {
    setValue((prev) => {
      const newValue = typeof updater === 'function' 
        ? (updater as (old: T) => T)(prev) 
        : updater;
      
      if (typeof window !== "undefined") {
        try {
          window.localStorage.setItem(`dyrected_pref_${key}`, JSON.stringify(newValue))
        } catch (e) {
          console.warn(`[usePreferences] Error saving key "${key}":`, e)
        }
      }
      return newValue;
    });
  }, [key]);

  return [value, updateValue]
}
