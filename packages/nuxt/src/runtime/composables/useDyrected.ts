// @ts-ignore -- #app is a Nuxt virtual module, resolved in the consuming app
import { useRuntimeConfig, useAsyncData, useRequestFetch } from "#app";
// The runtime import above is ts-ignored (so `useAsyncData` is `any` here),
// which would make every composable's inferred return type `any`. Import the
// real `AsyncData` type from `nuxt/app` (resolvable at build) and annotate the
// returns explicitly so consumers get typed `data`.
import type { AsyncData } from "nuxt/app";
import {
  createClient,
  type DyrectedClient,
  type SchemaShape,
  type RegisteredSchema,
  type PaginatedResult,
} from "@dyrected/sdk";

/** A collection slug from your registered schema (or any string until types are generated). */
type CollectionSlug = keyof RegisteredSchema["collections"] & string;
/** The document type for a given collection slug. */
type CollectionDoc<K extends CollectionSlug> = RegisteredSchema["collections"][K];
/** A global slug from your registered schema. */
type GlobalSlug = keyof RegisteredSchema["globals"] & string;
/** The data type for a given global slug. */
type GlobalData<K extends GlobalSlug> = RegisteredSchema["globals"][K];

function getClient<TSchema extends SchemaShape = RegisteredSchema>(): DyrectedClient<TSchema> {
  const config = useRuntimeConfig().public.dyrected;
  const fetcher = useRequestFetch();

  return createClient<TSchema>({
    baseUrl: config.baseUrl,
    apiKey: config.apiKey,
    siteId: config.siteId,
    fetch: fetcher as any,
  });
}

export const useDyrectedClient = <TSchema extends SchemaShape = RegisteredSchema>(): DyrectedClient<TSchema> => {
  return getClient<TSchema>();
};

export const useDyrected = <TSchema extends SchemaShape = RegisteredSchema>(): DyrectedClient<TSchema> =>
  getClient<TSchema>();

// ---------------------------------------------------------------------------
// useDyrectedDoc — convenience shorthand for a single document
// ---------------------------------------------------------------------------
export const useDyrectedDoc = <K extends CollectionSlug, T = CollectionDoc<K>>(
  collection: K,
  id: string,
  options?: { depth?: number; initialData?: T },
): AsyncData<T | null, Error> => {
  const client = getClient();
  return useAsyncData<T>(`dyrected:doc:${collection as string}:${id}`, () =>
    client.findOne<T>(collection as any, id, options as any),
  );
};

// ---------------------------------------------------------------------------
// useDyrectedCollection — convenience shorthand for a collection
// ---------------------------------------------------------------------------
export const useDyrectedCollection = <K extends CollectionSlug, T = CollectionDoc<K>>(
  collection: K,
  options?: {
    depth?: number;
    limit?: number;
    page?: number;
    sort?: string;
    where?: any;
    initialData?: T[];
  },
): AsyncData<PaginatedResult<T> | null, Error> => {
  const client = getClient();
  const key = `dyrected:coll:${collection as string}:${JSON.stringify(options || {})}`;
  return useAsyncData<PaginatedResult<T>>(
    key,
    () =>
      client
        .collection(collection as any)
        .find(options as any)
        .exec() as Promise<PaginatedResult<T>>,
  );
};

// ---------------------------------------------------------------------------
// useDyrectedGlobal — wraps client.global(slug).get() in useAsyncData
// Returns: { data, pending, error, refresh }
// ---------------------------------------------------------------------------
export function useDyrectedGlobal<K extends GlobalSlug, T = GlobalData<K>>(
  slug: K,
  options?: { depth?: number; initialData?: T; watch?: any[] },
): AsyncData<T | null, Error> {
  const client = getClient();
  const key = `dyrected:global:${slug as string}:${JSON.stringify(options || {})}`;
  const { watch, ...clientOptions } = options || {};
  return useAsyncData<T>(key, () => client.global(slug as any).get(clientOptions as any) as Promise<T>, {
    watch: watch,
  });
}
