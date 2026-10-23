import * as React from "react"
import { useDyrected } from "../providers/dyrected-context"
import type { DyrectedPreferences } from "../types/preferences"

export type Updater<T> = T | ((old: T) => T);

export interface UsePreferenceOptions<T> {
  /**
   * Which saved value to read and write.
   * - `"personal"` (default): the signed-in user's own value.
   * - `"role"` / `"global"`: the shared default for a role or for everyone.
   * - `"auto"`: read the first value that exists in the order personal, then the
   *   user's role default, then the global default. Writes always go to the
   *   user's personal value, so a user can override a shared default without
   *   changing it for anyone else.
   */
  scope?: "personal" | "role" | "global" | "auto";
  role?: string;
  /**
   * Where the local cache lives. `"user"` (default) keys the cached value by the
   * signed-in user so a different user on the same browser never inherits it.
   * `"device"` shares one cached value per browser, for settings that must apply
   * before sign-in such as the colour theme.
   */
  localScope?: "user" | "device";
  version?: number;
  migrate?: (stored: unknown, fromVersion: number) => T;
  validate?: (stored: unknown) => boolean;
  debounceMs?: number; // Defaults to 400ms
}

const PREF_PREFIX = "dyrected_pref_"
const USER_PREF_PREFIX = `${PREF_PREFIX}u:`
/** Device-wide cache keys written before preferences were keyed by user. */
const LEGACY_USER_PREF_KEY = /^dyrected_pref_(?:personal|role|global)\S*?admin:navigation$/

/**
 * Stable identity for the signed-in user, used to key their cached preferences.
 * Returns `null` when the user cannot be identified so callers never share a key.
 */
export function getPreferenceUserKey(user: Record<string, unknown> | null | undefined): string | null {
  if (!user) return null
  const id = user.id ?? user.sub ?? user.email
  if (typeof id !== "string" && typeof id !== "number") return null
  const collection = typeof user.collection === "string" ? user.collection : ""
  return `${collection}:${id}`
}

/**
 * Removes every locally cached per-user preference. Called on sign-out so the
 * next user on this browser starts from the server's value, not the last user's.
 * Device-level preferences such as the theme are kept.
 */
export function clearCachedUserPreferences(storage: Storage | undefined = typeof window === "undefined" ? undefined : window.localStorage) {
  if (!storage) return
  try {
    const stale: string[] = []
    for (let i = 0; i < storage.length; i++) {
      const key = storage.key(i)
      if (key && (key.startsWith(USER_PREF_PREFIX) || LEGACY_USER_PREF_KEY.test(key))) stale.push(key)
    }
    stale.forEach((key) => storage.removeItem(key))
  } catch {
    // Storage can be unavailable (private mode); nothing to clear.
  }
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
): [DyrectedPreferences[K], (updater: Updater<DyrectedPreferences[K]>) => void, () => Promise<void>];

export function usePreference<T>(
  key: string,
  defaultValue: T,
  options?: UsePreferenceOptions<T>
): [T, (updater: Updater<T>) => void, () => Promise<void>];

export function usePreference<T>(
  key: string,
  defaultValue: T,
  options: UsePreferenceOptions<T> = {}
): [T, (updater: Updater<T>) => void, () => Promise<void>] {
  const { client, user } = useDyrected()
  const {
    scope = "personal",
    role,
    localScope = "user",
    version,
    migrate,
    validate,
    debounceMs = 400,
  } = options

  const userKey = localScope === "user" ? getPreferenceUserKey(user) : null
  // A user-scoped preference without an identifiable user has no safe cache slot.
  const cacheable = localScope === "device" || userKey !== null
  const localStorageKey = `${userKey ? `${USER_PREF_PREFIX}${userKey}:` : PREF_PREFIX}${scope}${role ? `_${role}` : ""}_${key}`
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
    if (typeof window === "undefined" || !cacheable) return defaultValue

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
      const storedRaw = cacheable ? window.localStorage.getItem(localStorageKey) : null
      const nextValue = storedRaw ? processStoredData(JSON.parse(storedRaw)) : defaultValueRef.current
      setValue((prev) => (arePreferenceValuesEqual(prev, nextValue) ? prev : nextValue))
    } catch (e) {
      console.warn(`[usePreference] Error syncing key "${key}":`, e)
    }
  }, [key, localStorageKey, cacheable, processStoredData])

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
    if (typeof client?.getPreference !== "function" || !user) return

    let cancelled = false
    const currentWriteVersion = localWriteVersionRef.current
    const readCache = () => {
      if (typeof window === "undefined" || !cacheable) return null
      try {
        return window.localStorage.getItem(localStorageKey)
      } catch {
        return null
      }
    }
    const cacheAtRequest = readCache()

    client
      .getPreference<T>(key, { scope: scope === "auto" ? undefined : scope, role })
      .then((result) => {
        if (cancelled || localWriteVersionRef.current !== currentWriteVersion) return
        // Another hook instance may have written (not yet synced) while this request
        // was in flight; its value is newer than an empty server response.
        if (result.value === null && readCache() !== cacheAtRequest) return
        // No saved value on the server is authoritative: fall back to the default
        // and drop any cached copy instead of keeping a stale local one.
        const processed = result.value === null ? defaultValueRef.current : processStoredData(result.value)
        setValue((prev) => (arePreferenceValuesEqual(prev, processed) ? prev : processed))

        if (typeof window !== "undefined" && cacheable) {
          try {
            if (result.value === null) window.localStorage.removeItem(localStorageKey)
            else window.localStorage.setItem(localStorageKey, JSON.stringify(processed))
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
  }, [client, user, key, scope, role, localStorageKey, cacheable, processStoredData])

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
      if (typeof window !== "undefined" && cacheable) {
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
          client.setPreference(key, newValue, { scope: scope === "auto" ? "personal" : scope, role }).catch((e) => {
            if (e?.statusCode === 401 || (e instanceof Error && e.message.includes("401"))) return
            console.warn(`[usePreference] Error saving remote key "${key}":`, e)
          })
        }, debounceMs)
      }
    },
    [client, user, key, scope, role, localStorageKey, cacheable, debounceMs]
  )

  /**
   * Removes the user's personal value and falls back to the shared default (for
   * `scope: "auto"`) or the hook's default value. The returned promise resolves
   * once the server has been asked to forget the personal value.
   */
  const resetValue = React.useCallback(async () => {
    localWriteVersionRef.current += 1
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)

    const publish = (next: T) => {
      latestValueRef.current = next
      setValue(next)
      if (typeof window === "undefined") return
      if (cacheable) {
        try {
          window.localStorage.removeItem(localStorageKey)
        } catch {
          // Storage unavailable; the in-memory value is still correct.
        }
      }
      window.dispatchEvent(
        new CustomEvent("dyrected:preference-change", {
          detail: { key, localStorageKey, value: next, senderId: instanceIdRef.current },
        }),
      )
    }

    publish(defaultValueRef.current)
    if (!client || !user) return

    try {
      await client.deletePreference(key, { scope: scope === "auto" ? "personal" : scope, role })
      if (scope === "auto") {
        const result = await client.getPreference<T>(key, { role })
        if (result.value !== null) publish(processStoredData(result.value))
      }
    } catch (e) {
      console.warn(`[usePreference] Error resetting key "${key}":`, e)
    }
  }, [client, user, key, scope, role, localStorageKey, cacheable, processStoredData])

  return [value, updateValue, resetValue]
}

/**
 * Backward-compatible alias for {@link usePreference}.
 */
export const usePreferences = usePreference
