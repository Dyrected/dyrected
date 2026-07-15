import { ref, inject, onMounted, watch, type Ref, type InjectionKey } from 'vue';
import { createClient, type DyrectedClient, type SchemaShape, type RegisteredSchema } from '@dyrected/sdk';

/** A collection slug from your registered schema (or any string until types are generated). */
type CollectionSlug = keyof RegisteredSchema['collections'] & string;
/** The document type for a given collection slug. */
type CollectionDoc<K extends CollectionSlug> = RegisteredSchema['collections'][K];
/** A global slug from your registered schema. */
type GlobalSlug = keyof RegisteredSchema['globals'] & string;
/** The data type for a given global slug. */
type GlobalData<K extends GlobalSlug> = RegisteredSchema['globals'][K];

export const DYRECTED_CLIENT_KEY: InjectionKey<DyrectedClient> = Symbol('dyrected-client');

/**
 * useDyrectedClient — Returns the injected Dyrected client.
 */
export function useDyrectedClient<TSchema extends SchemaShape = RegisteredSchema>(): DyrectedClient<TSchema> {
  const client = inject(DYRECTED_CLIENT_KEY);
  if (!client) {
    throw new Error('Dyrected client not found. Use provideDyrectedClient() or the DyrectedVue plugin.');
  }
  return client as unknown as DyrectedClient<TSchema>;
}

/**
 * provideDyrectedClient — Provides a Dyrected client to the Vue app.
 */
export function provideDyrectedClient(client: DyrectedClient) {
  // This is usually called in the setup of a root component or a plugin
  return { [DYRECTED_CLIENT_KEY as any]: client };
}

export interface UseDyrectedOptions {
  depth?: number;
  [key: string]: any;
}

/**
 * useDyrected — Reactive composable for fetching a single document.
 */
export function useDyrected<
  K extends CollectionSlug,
  T = CollectionDoc<K>
>(
  collection: K,
  idOrSlug: string,
  options: UseDyrectedOptions = {}
) {
  const client = useDyrectedClient();
  const doc = ref<T | null>(null) as Ref<T | null>;
  const pending = ref(true);
  const error = ref<any>(null);

  const fetch = async () => {
    pending.value = true;
    try {
      const result = await client.findOne(collection, idOrSlug, options);
      doc.value = result as T;
      error.value = null;
    } catch (err) {
      console.error(`[useDyrected] Error fetching ${collection}:${idOrSlug}`, err);
      error.value = err;
    } finally {
      pending.value = false;
    }
  };

  onMounted(fetch);
  
  // Watch for changes in parameters
  watch(() => [collection, idOrSlug, JSON.stringify(options)], fetch);

  return { 
    doc, 
    pending, 
    error, 
    refresh: fetch 
  };
}

/**
 * useDyrectedCollection — Reactive composable for fetching a collection.
 */
export function useDyrectedCollection<
  K extends CollectionSlug,
  T = CollectionDoc<K>
>(
  collection: K,
  options: UseDyrectedOptions = {}
) {
  const client = useDyrectedClient();
  const docs = ref<T[]>([]) as Ref<T[]>;
  const pending = ref(true);
  const error = ref<any>(null);

  const fetch = async () => {
    pending.value = true;
    try {
      const result = await client.collection(collection).find(options).exec();
      docs.value = (result.docs || []) as T[];
      error.value = null;
    } catch (err) {
      console.error(`[useDyrectedCollection] Error fetching ${collection}`, err);
      error.value = err;
    } finally {
      pending.value = false;
    }
  };

  onMounted(fetch);
  watch(() => [collection, JSON.stringify(options)], fetch);

  return { 
    docs, 
    pending, 
    error, 
    refresh: fetch 
  };
}

/**
 * useDyrectedGlobal — Reactive composable for fetching a global.
 */
export function useDyrectedGlobal<
  K extends GlobalSlug,
  T = GlobalData<K>
>(
  slug: K,
  options: UseDyrectedOptions = {}
) {
  const client = useDyrectedClient();
  const data = ref<T | null>(null) as Ref<T | null>;
  const pending = ref(true);
  const error = ref<any>(null);

  const fetch = async () => {
    pending.value = true;
    try {
      const result = await client.global(slug).get(options);
      data.value = result as T;
      error.value = null;
    } catch (err) {
      console.error(`[useDyrectedGlobal] Error fetching ${slug}`, err);
      error.value = err;
    } finally {
      pending.value = false;
    }
  };

  onMounted(fetch);
  watch(() => [slug, JSON.stringify(options)], fetch);

  return { 
    data, 
    pending, 
    error, 
    refresh: fetch 
  };
}
