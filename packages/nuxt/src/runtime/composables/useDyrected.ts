// @ts-ignore
import { useRuntimeConfig, useAsyncData, useState, useCookie, useRequestFetch } from '#app'
import { createClient, type DyrectedClient, type BaseSchema } from '@dyrected/sdk'

function getClient<TSchema extends BaseSchema = any>(): DyrectedClient<TSchema> {
  const config = useRuntimeConfig().public.dyrected
  const fetcher = useRequestFetch()
  
  return createClient<TSchema>({
    baseUrl: config.baseUrl,
    apiKey: config.apiKey,
    siteId: config.siteId,
    fetch: fetcher as any,
  })
}

export const useDyrectedClient = <TSchema extends BaseSchema = any>(): DyrectedClient<TSchema> => {
  return getClient<TSchema>()
}

export const useDyrected = useDyrectedClient

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
  const key = `dyrected:coll:${collection as string}:${JSON.stringify(options || {})}`
  return useAsyncData(
    key,
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
  const key = `dyrected:global:${slug as string}:${JSON.stringify(options || {})}`
  return useAsyncData<T>(
    key,
    () => client.global<any>(slug as any).get(options),
    { watch: options?.watch }
  )
}
