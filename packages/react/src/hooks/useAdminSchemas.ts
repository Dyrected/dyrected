import * as React from "react";
import type { AdminSchemas, AdminSchemasResult } from "@dyrected/admin/public";
import { useDyrected } from "./useDyrected";

const schemaCache = new WeakMap<object, Promise<AdminSchemas>>();

async function loadSchemas(client: object & { getSchemas: () => Promise<AdminSchemas> }) {
  const cached = schemaCache.get(client);
  if (cached) return cached;

  const request = client.getSchemas();
  schemaCache.set(client, request);
  return request;
}

/**
 * Loads the admin schema registry for the current Dyrected client.
 *
 * This is primarily a low-level helper for higher-level admin hooks like
 * `useMediaUpload` and `useMediaLibrary`. You usually won't call it directly
 * unless you are building your own schema-aware UI.
 */
export function useAdminSchemas(): AdminSchemasResult {
  const { client } = useDyrected();
  const [schemas, setSchemas] = React.useState<AdminSchemas | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<Error | null>(null);

  const refresh = React.useCallback(async () => {
    let nextSchemas: AdminSchemas;
    setIsLoading(true);
    setError(null);

    try {
      nextSchemas = await loadSchemas(client as object & { getSchemas: () => Promise<AdminSchemas> });
    } catch (nextError) {
      const normalizedError =
        nextError instanceof Error ? nextError : new Error(String(nextError));
      setError(normalizedError);
      setIsLoading(false);
      throw normalizedError;
    }

    setSchemas((currentSchemas) => (currentSchemas === nextSchemas ? currentSchemas : nextSchemas));
    setIsLoading(false);
    return nextSchemas;
  }, [client]);

  React.useEffect(() => {
    let cancelled = false;

    setIsLoading(true);
    setError(null);

    loadSchemas(client as object & { getSchemas: () => Promise<AdminSchemas> }).then(
      (nextSchemas) => {
        if (cancelled) return;
        setSchemas((currentSchemas) => (currentSchemas === nextSchemas ? currentSchemas : nextSchemas));
        setIsLoading(false);
      },
      (nextError) => {
        if (cancelled) return;
        const normalizedError =
          nextError instanceof Error ? nextError : new Error(String(nextError));
        setError(normalizedError);
        setIsLoading(false);
      }
    );

    return () => {
      cancelled = true;
    };
  }, [client]);

  return {
    schemas,
    isLoading,
    error,
    refresh,
  };
}
