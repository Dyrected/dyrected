// @ts-ignore
import { useRuntimeConfig, useAsyncData, useState, useCookie } from '#app'
import { createClient, type DyrectedClient, type BaseSchema } from '@dyrected/sdk'

function getClient<TSchema extends BaseSchema = any>(): DyrectedClient<TSchema> {
  const config = useRuntimeConfig().public.dyrected
  return createClient<TSchema>({
    baseUrl: config.baseUrl,
    apiKey: config.apiKey,
    siteId: config.siteId,
  })
}

// ---------------------------------------------------------------------------
// useDyrected — returns the raw SDK client (SSR-friendly singleton per request)
// ---------------------------------------------------------------------------
export const useDyrected = <TSchema extends BaseSchema = any>(): DyrectedClient<TSchema> => {
  return getClient<TSchema>()
}

// ---------------------------------------------------------------------------
// useDyrectedDoc — convenience shorthand for a single document
// ---------------------------------------------------------------------------
export const useDyrectedDoc = <T = any, TSchema extends BaseSchema = any>(
  collection: keyof TSchema['collections'] | string, 
  id: string, 
  options?: { depth?: number; initialData?: T }
) => {
  const client = getClient<TSchema>()
  return useAsyncData<T>(
    `dyrected:doc:${collection as string}:${id}`,
    () => client.findOne<T>(collection as any, id, options)
  )
}

// ---------------------------------------------------------------------------
// useDyrectedCollection — convenience shorthand for a collection
// ---------------------------------------------------------------------------
export const useDyrectedCollection = <T = any, TSchema extends BaseSchema = any>(
  collection: keyof TSchema['collections'] | string,
  options?: { 
    depth?: number; 
    limit?: number; 
    page?: number; 
    sort?: string; 
    where?: any;
    initialData?: T[];
  }
) => {
  const client = getClient<TSchema>()
  return useAsyncData(
    `dyrected:collection:${collection as string}`,
    () => client.collection<any>(collection as any).find(options).exec()
  )
}

// ---------------------------------------------------------------------------
// useDyrectedGlobal — wraps client.global(slug).get() in useAsyncData
// Returns: { data, pending, error, refresh }
// ---------------------------------------------------------------------------
export function useDyrectedGlobal<T = any, TSchema extends BaseSchema = any>(
  slug: keyof TSchema['globals'] | string,
  options?: { depth?: number; initialData?: T; watch?: any[] }
) {
  const client = getClient<TSchema>()
  return useAsyncData<T>(
    `dyrected:global:${slug as string}`,
    () => client.global<any>(slug as any).get(options),
    { watch: options?.watch }
  )
}
