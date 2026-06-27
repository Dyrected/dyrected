import * as React from "react"
import { useDyrected } from "../providers/dyrected-context"

export type Updater<T> = T | ((old: T) => T);

function arePreferenceValuesEqual<T>(a: T, b: T) {
  if (Object.is(a, b)) return true
  try {
    return JSON.stringify(a) === JSON.stringify(b)
  } catch {
    return false
  }
}

/**
 * A hook to manage and persist user preferences in the Admin UI.
 * Uses localStorage for immediate persistence and syncs to the user profile
 * when an authenticated Dyrected client is available.
 */
export function usePreferences<T>(key: string, defaultValue: T): [T, (updater: Updater<T>) => void] {
  const { client, user } = useDyrected()
  const localStorageKey = `dyrected_pref_${key}`
  const localWriteVersionRef = React.useRef(0)
  const defaultValueRef = React.useRef(defaultValue)
  defaultValueRef.current = defaultValue

  const [value, setValue] = React.useState<T>(() => {
    if (typeof window === "undefined") return defaultValue

    try {
      const stored = window.localStorage.getItem(localStorageKey)
      return stored ? JSON.parse(stored) : defaultValue
    } catch (e) {
      console.warn(`[usePreferences] Error loading key "${key}":`, e)
      return defaultValue
    }
  })

  // Sync local state if key changes (e.g. navigating between collections).
  React.useEffect(() => {
    if (typeof window === "undefined") return

    try {
      const stored = window.localStorage.getItem(localStorageKey)
      const nextValue = stored ? JSON.parse(stored) : defaultValueRef.current
      setValue((prev) => arePreferenceValuesEqual(prev, nextValue) ? prev : nextValue)
    } catch (e) {
      console.warn(`[usePreferences] Error syncing key "${key}":`, e)
    }
  }, [key, localStorageKey])

  // Prefer authenticated, server-backed preferences when available.
  React.useEffect(() => {
    if (!client || !user) return

    let cancelled = false
    const writeVersion = localWriteVersionRef.current

    client.getPreference<T>(key)
      .then((result) => {
        if (cancelled || result.value === null || localWriteVersionRef.current !== writeVersion) return
        setValue((prev) => arePreferenceValuesEqual(prev, result.value as T) ? prev : result.value as T)
        if (typeof window !== "undefined") {
          window.localStorage.setItem(localStorageKey, JSON.stringify(result.value))
        }
      })
      .catch((e) => {
        console.warn(`[usePreferences] Error loading remote key "${key}":`, e)
      })

    return () => {
      cancelled = true
    }
  }, [client, user, key, localStorageKey])

  const updateValue = React.useCallback((updater: Updater<T>) => {
    setValue((prev) => {
      localWriteVersionRef.current += 1
      const newValue = typeof updater === 'function' 
        ? (updater as (old: T) => T)(prev) 
        : updater;

      if (arePreferenceValuesEqual(prev, newValue)) return prev
      
      if (typeof window !== "undefined") {
        try {
          window.localStorage.setItem(localStorageKey, JSON.stringify(newValue))
        } catch (e) {
          console.warn(`[usePreferences] Error saving key "${key}":`, e)
        }
      }

      if (client && user) {
        client.setPreference(key, newValue).catch((e) => {
          console.warn(`[usePreferences] Error saving remote key "${key}":`, e)
        })
      }

      return newValue;
    });
  }, [client, user, key, localStorageKey]);

  return [value, updateValue]
}
