// @ts-ignore
import { useRuntimeConfig, useAsyncData, useState, useCookie } from '#app'
import { createClient, type DyrectedClient } from '@dyrected/sdk'

function getClient(): DyrectedClient {
  const config = useRuntimeConfig().public.dyrected
  return createClient({
    baseUrl: config.baseUrl,
    apiKey: config.apiKey,
    siteId: config.siteId,
  })
}

// ---------------------------------------------------------------------------
// useDyrected — returns the raw SDK client (SSR-friendly singleton per request)
// ---------------------------------------------------------------------------
export const useDyrected = (): DyrectedClient => {
  return getClient()
}

// ---------------------------------------------------------------------------
// useDyrectedDoc — convenience shorthand for a single document
// ---------------------------------------------------------------------------
export const useDyrectedDoc = (collection: string, id: string, options?: { depth?: number }) => {
  const client = getClient()
  return client.collection(collection).findOne(id, options)
}

// ---------------------------------------------------------------------------
// useDyrectedGlobal — wraps client.global(slug).get() in useAsyncData
// Returns: { data, pending, error, refresh }
// ---------------------------------------------------------------------------
export function useDyrectedGlobal<T = any>(
  slug: string,
  options?: { depth?: number; watch?: any[] }
) {
  const client = getClient()
  return useAsyncData<T>(
    `dyrected:global:${slug}`,
    () => client.global<T>(slug).get({ depth: options?.depth }),
    { watch: options?.watch }
  )
}
