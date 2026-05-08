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
export const useDyrectedDoc = <T = any>(
  collection: string, 
  id: string, 
  options?: { depth?: number; initialData?: T }
) => {
  const client = getClient()
  return useAsyncData<T>(
    `dyrected:doc:${collection}:${id}`,
    () => client.findOne<T>(collection, id, options)
  )
}

// ---------------------------------------------------------------------------
// useDyrectedCollection — convenience shorthand for a collection
// ---------------------------------------------------------------------------
export const useDyrectedCollection = <T = any>(
  collection: string,
  options?: { 
    depth?: number; 
    limit?: number; 
    page?: number; 
    sort?: string; 
    where?: any;
    initialData?: T[];
  }
) => {
  const client = getClient()
  return useAsyncData(
    `dyrected:collection:${collection}`,
    () => client.collection<T>(collection).find(options).exec()
  )
}

// ---------------------------------------------------------------------------
// useDyrectedGlobal — wraps client.global(slug).get() in useAsyncData
// Returns: { data, pending, error, refresh }
// ---------------------------------------------------------------------------
export function useDyrectedGlobal<T = any>(
  slug: string,
  options?: { depth?: number; initialData?: T; watch?: any[] }
) {
  const client = getClient()
  return useAsyncData<T>(
    `dyrected:global:${slug}`,
    () => client.global<T>(slug).get(options),
    { watch: options?.watch }
  )
}
