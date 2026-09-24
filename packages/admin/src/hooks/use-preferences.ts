import * as React from "react"
import { useDyrected } from "../providers/dyrected-context"
import type { DyrectedPreferences } from "../types/preferences"

export type Updater<T> = T | ((old: T) => T);

export interface UsePreferenceOptions<T> {
  scope?: "personal" | "role" | "global";
  role?: string;
  version?: number;
  migrate?: (stored: unknown, fromVersion: number) => T;
  validate?: (stored: unknown) => boolean;
  debounceMs?: number; // Defaults to 400ms
}

export function arePreferenceValuesEqual<T>(a: T, b: T): boolean {
  if (Object.is(a, b)) return true
  try {
    return JSON.stringify(a) === JSON.stringify(b)
  } catch {
    return false
  }
}

/**
 * Enhanced hook to manage and persist user preferences in the Dyrected Admin UI.
 * - 0ms immediate optimistic UI and localStorage updates.
 * - 400ms debounced remote sync via authenticated Dyrected client.
 * - Client-side schema migrations (version & migrate).
 * - Validation & corruption fallback safety.
 * - 3-tier resolution support (personal, role, global).
 */
export function usePreference<K extends keyof DyrectedPreferences>(
  key: K,
  defaultValue: DyrectedPreferences[K],
  options?: UsePreferenceOptions<DyrectedPreferences[K]>
): [DyrectedPreferences[K], (updater: Updater<DyrectedPreferences[K]>) => void];

export function usePreference<T>(
  key: string,
  defaultValue: T,
  options?: UsePreferenceOptions<T>
): [T, (updater: Updater<T>) => void];

export function usePreference<T>(
  key: string,
  defaultValue: T,
  options: UsePreferenceOptions<T> = {}
): [T, (updater: Updater<T>) => void] {
  const { client, user } = useDyrected()
  const {
    scope = "personal",
    role,
    version,
    migrate,
    validate,
    debounceMs = 400,
  } = options

  const localStorageKey = `dyrected_pref_${scope}${role ? `_${role}` : ""}_${key}`
  const localWriteVersionRef = React.useRef(0)
  const defaultValueRef = React.useRef(defaultValue)
  const debounceTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  React.useEffect(() => {
    defaultValueRef.current = defaultValue
  }, [defaultValue])

  // Helper to validate and optionally migrate parsed preference data
  const processStoredData = React.useCallback(
    (stored: unknown): T => {
      if (stored === null || stored === undefined) {
        return defaultValueRef.current
      }

      // 1. Run validation if supplied
      if (validate && !validate(stored)) {
        console.warn(`[usePreference] Validation failed for key "${key}", falling back to default.`)
        return defaultValueRef.current
      }

      // 2. Run client migration if version is supplied and stored version is older
      if (
        version !== undefined &&
        typeof stored === "object" &&
        stored !== null &&
        "_version" in stored &&
        typeof (stored as any)._version === "number"
      ) {
        const storedVersion = (stored as any)._version
        if (storedVersion < version && migrate) {
          try {
            return migrate(stored, storedVersion)
          } catch (e) {
            console.warn(`[usePreference] Migration failed for key "${key}":`, e)
            return defaultValueRef.current
          }
        }
      }

      return stored as T
    },
    [key, validate, version, migrate]
  )

  const [value, setValue] = React.useState<T>(() => {
    if (typeof window === "undefined") return defaultValue

    try {
      const storedRaw = window.localStorage.getItem(localStorageKey)
      if (storedRaw) {
        const parsed = JSON.parse(storedRaw)
        return processStoredData(parsed)
      }
      return defaultValue
    } catch (e) {
      console.warn(`[usePreference] Error loading key "${key}":`, e)
      return defaultValue
    }
  })

  const instanceIdRef = React.useRef(Math.random().toString(36).slice(2))

  // Sync local state if key, scope, or role changes
  React.useEffect(() => {
    if (typeof window === "undefined") return

    try {
      const storedRaw = window.localStorage.getItem(localStorageKey)
      const nextValue = storedRaw ? processStoredData(JSON.parse(storedRaw)) : defaultValueRef.current
      setValue((prev) => (arePreferenceValuesEqual(prev, nextValue) ? prev : nextValue))
    } catch (e) {
      console.warn(`[usePreference] Error syncing key "${key}":`, e)
    }
  }, [key, localStorageKey, processStoredData])

  // Listen for local custom events (real-time cross-component sync in same window)
  React.useEffect(() => {
    if (typeof window === "undefined") return

    const handlePreferenceChange = (event: Event) => {
      const ce = event as CustomEvent<{
        key: string
        localStorageKey: string
        value: unknown
        senderId: string
      }>
      if (ce.detail?.senderId === instanceIdRef.current) return
      if (ce.detail?.key === key || ce.detail?.localStorageKey === localStorageKey) {
        const nextValue = processStoredData(ce.detail.value)
        setValue((prev) => (arePreferenceValuesEqual(prev, nextValue) ? prev : nextValue))
      }
    }

    window.addEventListener("dyrected:preference-change", handlePreferenceChange)
    return () => {
      window.removeEventListener("dyrected:preference-change", handlePreferenceChange)
    }
  }, [key, localStorageKey, processStoredData])

  // Listen for storage events (real-time cross-tab sync)
  React.useEffect(() => {
    if (typeof window === "undefined") return

    const handleStorage = (event: StorageEvent) => {
      if (event.key === localStorageKey && event.newValue) {
        try {
          const parsed = JSON.parse(event.newValue)
          const nextValue = processStoredData(parsed)
          setValue((prev) => (arePreferenceValuesEqual(prev, nextValue) ? prev : nextValue))
        } catch {
          // ignore parsing error
        }
      }
    }

    window.addEventListener("storage", handleStorage)
    return () => {
      window.removeEventListener("storage", handleStorage)
    }
  }, [localStorageKey, processStoredData])

  // Remote fetching with cancellation flag and write version guarding
  React.useEffect(() => {
    if (!client || !user) return

    let cancelled = false
    const currentWriteVersion = localWriteVersionRef.current

    client
      .getPreference<T>(key, { scope, role })
      .then((result) => {
        if (cancelled || result.value === null || localWriteVersionRef.current !== currentWriteVersion) return
        const processed = processStoredData(result.value)
        setValue((prev) => (arePreferenceValuesEqual(prev, processed) ? prev : processed))

        if (typeof window !== "undefined") {
          try {
            window.localStorage.setItem(localStorageKey, JSON.stringify(processed))
          } catch (e) {
            console.warn(`[usePreference] Error updating localStorage for key "${key}":`, e)
          }
        }
      })
      .catch((e) => {
        if (e?.statusCode === 401 || (e instanceof Error && e.message.includes("401"))) return
        // Do not crash UI on preference fetch errors; gracefully retain local state
      })

    return () => {
      cancelled = true
    }
  }, [client, user, key, scope, role, localStorageKey, processStoredData])

  // Cleanup debounce timer on unmount
  React.useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [])

  const latestValueRef = React.useRef<T>(value)
  latestValueRef.current = value

  const updateValue = React.useCallback(
    (updater: Updater<T>) => {
      localWriteVersionRef.current += 1
      const prev = latestValueRef.current
      const newValue = typeof updater === "function" ? (updater as (old: T) => T)(prev) : updater

      if (arePreferenceValuesEqual(prev, newValue)) return

      latestValueRef.current = newValue
      setValue(newValue)

      // 1. Synchronous 0ms immediate persistence in localStorage
      if (typeof window !== "undefined") {
        try {
          window.localStorage.setItem(localStorageKey, JSON.stringify(newValue))
        } catch (e) {
          console.warn(`[usePreference] Error saving key "${key}" to localStorage:`, e)
        }

        // 2. Dispatch cross-component broadcast asynchronously via microtask
        // so listener components don't invoke setState synchronously during the current component's render
        const detail = {
          key,
          localStorageKey,
          value: newValue,
          senderId: instanceIdRef.current,
        }
        if (typeof queueMicrotask === "function") {
          queueMicrotask(() => {
            window.dispatchEvent(new CustomEvent("dyrected:preference-change", { detail }))
          })
        } else {
          setTimeout(() => {
            window.dispatchEvent(new CustomEvent("dyrected:preference-change", { detail }))
          }, 0)
        }
      }

      // 3. Debounced remote network sync (default 400ms)
      if (client && user) {
        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current)
        }

        debounceTimerRef.current = setTimeout(() => {
          client.setPreference(key, newValue, { scope, role }).catch((e) => {
            if (e?.statusCode === 401 || (e instanceof Error && e.message.includes("401"))) return
            console.warn(`[usePreference] Error saving remote key "${key}":`, e)
          })
        }, debounceMs)
      }
    },
    [client, user, key, scope, role, localStorageKey, debounceMs]
  )

  return [value, updateValue]
}

/**
 * Backward-compatible alias for {@link usePreference}.
 */
export const usePreferences = usePreference
