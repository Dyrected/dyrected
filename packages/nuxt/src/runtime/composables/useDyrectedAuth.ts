// @ts-ignore
import { useRuntimeConfig, useCookie } from '#app'
import { useDyrectedAuth as useGenericAuth } from '@dyrected/vue'

/**
 * useDyrectedAuth — Nuxt-specific wrapper around @dyrected/vue auth logic.
 */
export function useDyrectedAuth(collection: string) {
  const config = useRuntimeConfig().public.dyrected
  
  const tokenCookie = useCookie<string | null>(`dyrected_token_${collection}`, {
    default: () => null,
    maxAge: 60 * 60 * 24 * 7, // 7 days
    sameSite: 'lax',
  })

  const storage = {
    getItem: () => tokenCookie.value || null,
    setItem: (key: string, value: string) => { tokenCookie.value = value },
    removeItem: () => { tokenCookie.value = null }
  }

  return useGenericAuth(collection, {
    baseUrl: config.baseUrl,
    apiKey: config.apiKey,
    siteId: config.siteId,
    storage
  })
}
