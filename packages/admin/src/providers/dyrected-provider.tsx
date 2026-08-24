import React, { useCallback, useEffect, useMemo, useState } from "react";
import { createClient, DyrectedClient, DyrectedError } from "@dyrected/sdk";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { AdminSchemas } from "../types/admin-components";
import type { Block, Field } from "@dyrected/core";
import { decodeTokenPayload, getAdminCollectionSlug, type AdminUser } from "./admin-auth";
import { DyrectedContext, type DyrectedContextType } from "./dyrected-context";

function resolveBlock(block: Block, registry: Map<string, Block>): Block {
  return {
    ...block,
    fields: block.fields.map((field) => resolveFieldBlocks(field, registry)),
  };
}

function resolveFieldBlocks(field: Field, registry: Map<string, Block>): Field {
  const next = { ...field };

  if (next.fields) {
    next.fields = next.fields.map((child) =>
      resolveFieldBlocks(child, registry),
    );
  }

  if (next.type === "blocks" && next.blockReferences?.length) {
    next.blocks = next.blockReferences
      .map((slug) => registry.get(slug))
      .filter((block): block is Block => !!block);
    next.blocks = next.blocks.map((block) => resolveBlock(block, registry));
  } else if (next.blocks) {
    next.blocks = next.blocks.map((block) => resolveBlock(block, registry));
  }

  return next;
}

function getDefaultViewColumns(collection: any): string[] {
  const adminDefault = collection.admin?.defaultColumns as string[] | undefined
  if (Array.isArray(adminDefault) && adminDefault.length > 0) {
    return adminDefault
  }
  const displayFields = (collection.fields as Field[]).filter(
    (f) => f.name && f.name !== "password" && !(f as any).admin?.hidden && f.type !== "row" && f.type !== "join",
  )
  return displayFields.slice(0, 5).map((f) => f.name!)
}

function ensureDefaultView(collection: any): any {
  const views = collection.views as unknown[] | undefined
  if (Array.isArray(views) && views.length > 0) return collection
  const columns = getDefaultViewColumns(collection)
  const defaultView = {
    slug: "list",
    label: collection.labels?.plural || collection.slug,
    layout: "table" as const,
    columns,
  }
  return { ...collection, views: [defaultView] }
}

function resolveSchemas(schema: AdminSchemas): AdminSchemas {
  const registry = new Map(
    (schema.blocks ?? []).map((block) => [block.slug, block] as const),
  );

  return {
    ...schema,
    collections: schema.collections.map((collection) => {
      const withBlocks: any = {
        ...collection,
        fields: (collection.fields as Field[]).map((field) =>
          resolveFieldBlocks(field, registry),
        ),
      }
      return ensureDefaultView(withBlocks)
    }),
    globals: schema.globals.map((global) => ({
      ...global,
      fields: global.fields.map((field) => resolveFieldBlocks(field, registry)),
    })),
  };
}

export interface DyrectedProviderProps {
  children: React.ReactNode;
  apiKey?: string;
  baseUrl?: string;
  siteId?: string;
  // @internal – not for public docs. Dyrected Cloud passes this to bypass
  // admin-level auth when the user is already authenticated at the cloud level.
  initialToken?: string;
  defaultTechStack?: string;
  components?: DyrectedContextType["components"];
}

function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  const local = localStorage.getItem("dyrected_token");
  if (local) return local;

  try {
    const match = document.cookie.match(
      /(?:^|;\s*)(?:__dyrected_token|dyrected_token)=([^;]+)/,
    );
    if (match) return decodeURIComponent(match[1]);
  } catch {
    // Ignore cookie read errors
  }

  return null;
}

export function DyrectedProvider({
  children,
  apiKey: initialApiKey,
  baseUrl: initialBaseUrl,
  siteId: initialSiteId,
  initialToken,
  defaultTechStack,
  components,
}: DyrectedProviderProps) {
  const [baseUrl, setBaseUrl] = useState<string>(
    () =>
      initialBaseUrl ||
      (typeof window !== "undefined"
        ? localStorage.getItem("dyrected_url")
        : null) ||
      "",
  );
  const [apiKey, setApiKey] = useState<string | undefined>(
    () =>
      initialApiKey ||
      (typeof window !== "undefined"
        ? localStorage.getItem("dyrected_key")
        : null) ||
      undefined,
  );
  const [siteId, setSiteId] = useState<string | undefined>(
    () =>
      initialSiteId ||
      (typeof window !== "undefined"
        ? localStorage.getItem("dyrected_site_id")
        : null) ||
      undefined,
  );
  const [isResolvingStoredSession, setIsResolvingStoredSession] = useState(false);
  const storedToken = useMemo(() => getStoredToken(), []);
  const initialTokenUser = useMemo(
    () => {
      const tok = initialToken || storedToken;
      return tok ? decodeTokenPayload(tok) : null;
    },
    [initialToken, storedToken],
  );
  const [user, setUser] = useState<AdminUser | null>(() => initialTokenUser);
  const [authCollectionSlug, setAuthCollectionSlug] = useState<string | null>(
    () =>
      (typeof window !== "undefined"
        ? localStorage.getItem("dyrected_admin_auth_collection")
        : null) || null,
  );

  const client = useMemo<DyrectedClient | null>(() => {
    if (!baseUrl) return null;
    return createClient({
      baseUrl,
      apiKey: apiKey || undefined,
      siteId: siteId || undefined,
    });
  }, [apiKey, baseUrl, siteId]);
  const queryClient = useQueryClient();

  const {
    data: schemas = null,
    error: schemasError,
  } = useQuery({
    queryKey: ["schemas", baseUrl, apiKey ?? null, siteId ?? null],
    queryFn: async () => resolveSchemas(await client!.getSchemas()),
    enabled: !!client,
  });

  useEffect(() => {
    if (schemasError) {
      console.error("Failed to fetch schemas:", schemasError);
    }
  }, [schemasError]);

  const activeUser = user ?? initialTokenUser;

  // Apply the cloud-issued token to the SDK client.
  useEffect(() => {
    if (initialToken && client) {
      client.setToken(initialToken);
    }
  }, [initialToken, client]);

  const clearPersistedAuthState = useCallback(
    (nextClient?: DyrectedClient | null) => {
      localStorage.removeItem("dyrected_token");
      localStorage.removeItem("dyrected_admin_auth_collection");
      try {
        document.cookie = "__dyrected_token=; path=/; max-age=0; SameSite=Lax";
        document.cookie = "dyrected_token=; path=/; max-age=0; SameSite=Lax";
      } catch {
        // Ignore cookie write errors
      }
      (nextClient ?? client)?.clearToken();
      setAuthCollectionSlug(null);
      setUser(null);
    },
    [client],
  );

  const shouldClearStoredAuth = useCallback((error: unknown) => {
    return (
      error instanceof DyrectedError &&
      (error.statusCode === 401 || error.statusCode === 404)
    );
  }, []);

  const logoutMutation = useMutation({
    mutationFn: async (collectionSlug: string) => {
      await client!.collection(collectionSlug).logout();
    },
    onSettled: () => {
      clearPersistedAuthState(client);
      queryClient.removeQueries({ queryKey: ["schemas"] });
    },
  });

  const setAuth = useCallback(
    (newUrl: string, newKey: string, newSiteId?: string) => {
      localStorage.setItem("dyrected_url", newUrl);
      localStorage.setItem("dyrected_key", newKey);
      if (newSiteId) localStorage.setItem("dyrected_site_id", newSiteId);
      else localStorage.removeItem("dyrected_site_id");

      setBaseUrl(newUrl);
      setApiKey(newKey);
      setSiteId(newSiteId);
    },
    [],
  );

  const setToken = useCallback(
    (token: string, collectionSlug?: string | null) => {
      if (!token) {
        clearPersistedAuthState(client);
        return;
      }

      const resolvedCollectionSlug =
        collectionSlug || authCollectionSlug || getAdminCollectionSlug(schemas);
      localStorage.setItem("dyrected_token", token);
      try {
        document.cookie = `__dyrected_token=${encodeURIComponent(token)}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`;
      } catch {
        // Ignore cookie write errors
      }

      const optimisticUser = decodeTokenPayload(token);
      if (optimisticUser) {
        setUser(optimisticUser);
      }

      if (resolvedCollectionSlug) {
        localStorage.setItem(
          "dyrected_admin_auth_collection",
          resolvedCollectionSlug,
        );
        setAuthCollectionSlug((prev) =>
          prev === resolvedCollectionSlug ? prev : resolvedCollectionSlug,
        );
      }
      if (client) {
        client.setToken(token);
        if (resolvedCollectionSlug) {
          client
            .collection(resolvedCollectionSlug)
            .me()
            .then(
              (nextUser) => setUser(nextUser as AdminUser),
              (error) => {
                if (shouldClearStoredAuth(error)) {
                  clearPersistedAuthState(client);
                  return;
                }
                if (!optimisticUser) {
                  setUser(null);
                }
              },
            );
        }
      }
    },
    [authCollectionSlug, clearPersistedAuthState, client, schemas, shouldClearStoredAuth],
  );

  useEffect(() => {
    if (initialToken || !client || !schemas) {
      queueMicrotask(() => {
        setIsResolvingStoredSession(false);
      });
      return;
    }
    const token = getStoredToken();
    const resolvedCollectionSlug =
      authCollectionSlug || getAdminCollectionSlug(schemas);

    if (!token || !resolvedCollectionSlug) {
      queueMicrotask(() => {
        setIsResolvingStoredSession(false);
      });
      return;
    }

    let cancelled = false;
    queueMicrotask(() => {
      setIsResolvingStoredSession(true);
    });
    client.setToken(token);
    client
      .collection(resolvedCollectionSlug)
      .me()
      .then(
        (nextUser) => {
          if (cancelled) return;
          setUser((prev) => {
            if (prev && JSON.stringify(prev) === JSON.stringify(nextUser)) {
              return prev;
            }
            return nextUser as AdminUser;
          });
        },
        (error) => {
          if (cancelled) return;
          if (shouldClearStoredAuth(error)) {
            clearPersistedAuthState(client);
            return;
          }
          setUser(null);
        },
      )
      .finally(() => {
        if (cancelled) return;
        setIsResolvingStoredSession(false);
      });

    return () => {
      cancelled = true;
    };
  }, [
    authCollectionSlug,
    clearPersistedAuthState,
    client,
    initialToken,
    schemas,
    shouldClearStoredAuth,
  ]);

  const logout = useCallback(() => {
    const resolvedCollectionSlug =
      authCollectionSlug || getAdminCollectionSlug(schemas);

    if (!client || !resolvedCollectionSlug) {
      clearPersistedAuthState(client);
      return;
    }

    logoutMutation.mutate(resolvedCollectionSlug, {
      onError: (error) => {
        console.warn("Failed to revoke admin session during logout:", error);
      },
    });
  }, [authCollectionSlug, clearPersistedAuthState, client, logoutMutation, schemas]);

  return (
    <DyrectedContext.Provider
      value={{
        client,
        config: { baseUrl, apiKey, siteId, defaultTechStack },
        setAuth,
        setToken,
        logout,
        isAuthenticated: !!baseUrl && !!apiKey,
        isResolvingStoredSession,
        schemas,
        user: activeUser,
        initialToken,
        components,
      }}
    >
      {children}
    </DyrectedContext.Provider>
  );
}

