import { ref, shallowRef } from "vue";
import type { AdminSchemas, AdminSchemasResult } from "@dyrected/admin/public";
import { useDyrectedClient } from "./useDyrected";

const schemaCache = new WeakMap<object, Promise<AdminSchemas>>();

async function loadSchemas(client: object & { getSchemas: () => Promise<AdminSchemas> }) {
  const cached = schemaCache.get(client);
  if (cached) return cached;

  const request = client.getSchemas();
  schemaCache.set(client, request);
  return request;
}

export type VueStateify<T> = {
  [K in keyof T]:
    T[K] extends (...args: any[]) => any
      ? T[K]
      : Readonly<import("vue").Ref<T[K]>>
}

/**
 * Loads the admin schema registry for the current Dyrected client.
 *
 * Most apps will use higher-level composables like `useMediaUpload` instead of
 * calling this directly. It exists as the schema-aware foundation for custom
 * Vue admin UI.
 */
export function useAdminSchemas(): VueStateify<AdminSchemasResult> {
  const client = useDyrectedClient();
  const schemas = shallowRef<AdminSchemas | null>(null);
  const isLoading = ref(false);
  const error = shallowRef<Error | null>(null);

  const refresh = async () => {
    isLoading.value = true;
    error.value = null;

    try {
      const nextSchemas = await loadSchemas(client as object & { getSchemas: () => Promise<AdminSchemas> });
      schemas.value = nextSchemas;
      return nextSchemas;
    } catch (nextError) {
      const normalizedError = nextError instanceof Error ? nextError : new Error(String(nextError));
      error.value = normalizedError;
      throw normalizedError;
    } finally {
      isLoading.value = false;
    }
  };

  void refresh().catch(() => undefined);

  return {
    /** The schema registry. */
    schemas,
    /** Whether the schema is loading. */
    isLoading,
    /** The error, if any. */
    error,
    /** Refresh the schema. */
    refresh,
  };
}
