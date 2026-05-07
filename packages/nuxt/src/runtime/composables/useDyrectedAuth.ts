// @ts-ignore
import { useRuntimeConfig, useState, useCookie, computed } from '#app'
import { createClient } from '@dyrected/sdk'

export interface DyrectedAuthUser {
  id: string
  email: string
  [key: string]: any
}

/**
 * useDyrectedAuth — composable for auth collections.
 *
 * Usage:
 *   const { login, logout, user, isLoggedIn } = useDyrectedAuth('customers')
 *
 * The JWT is persisted in a cookie (`dyrected_token_<collection>`) so it
 * survives page reloads and is available server-side on the next request.
 */
export function useDyrectedAuth(collection: string) {
  const config = useRuntimeConfig().public.dyrected
  const cookieName = `dyrected_token_${collection}`

  // Persist token in an httpOnly-style cookie (SSR-compatible)
  const tokenCookie = useCookie<string | null>(cookieName, {
    default: () => null,
    maxAge: 60 * 60 * 24 * 7, // 7 days
    sameSite: 'lax',
  })

  const user = useState<DyrectedAuthUser | null>(`dyrected:auth:user:${collection}`, () => null)

  const isLoggedIn = computed(() => !!tokenCookie.value)

  function buildClient() {
    const client = createClient({
      baseUrl: config.baseUrl,
      apiKey: config.apiKey,
      siteId: config.siteId,
    })
    if (tokenCookie.value) {
      client.setToken(tokenCookie.value)
    }
    return client
  }

  /**
   * Log in with email + password.
   * On success: stores the JWT in the cookie and populates `user`.
   */
  async function login(email: string, password: string): Promise<DyrectedAuthUser> {
    const client = buildClient()
    const { token, user: userData } = await client.collection(collection).login(email, password)
    tokenCookie.value = token
    user.value = userData as DyrectedAuthUser
    return userData as DyrectedAuthUser
  }

  /**
   * Log out the current user.
   * Clears the cookie and nullifies `user`.
   */
  async function logout(): Promise<void> {
    if (tokenCookie.value) {
      try {
        const client = buildClient()
        await client.collection(collection).logout()
      } catch {
        // Best-effort — always clear local state
      }
    }
    tokenCookie.value = null
    user.value = null
  }

  /**
   * Fetch the currently authenticated user from the server.
   * Call this on app boot if a token cookie is already present.
   */
  async function fetchMe(): Promise<DyrectedAuthUser | null> {
    if (!tokenCookie.value) return null
    try {
      const client = buildClient()
      const me = await client.collection(collection).me()
      user.value = me as DyrectedAuthUser
      return me as DyrectedAuthUser
    } catch {
      // Token is invalid — clear it
      tokenCookie.value = null
      user.value = null
      return null
    }
  }

  return {
    /** Reactive: the authenticated user, or null. */
    user,
    /** Reactive: true when a valid JWT cookie exists. */
    isLoggedIn,
    login,
    logout,
    fetchMe,
  }
}
