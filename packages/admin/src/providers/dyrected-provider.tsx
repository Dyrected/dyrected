import React, { useCallback, useEffect, useMemo, useState } from "react";
import { createClient, DyrectedClient } from "@dyrected/sdk";
import type { AdminSchemas } from "../types/admin-components";
import { getAdminCollectionSlug, type AdminUser } from "./admin-auth";
import { DyrectedContext, type DyrectedContextType } from "./dyrected-context";

export interface DyrectedProviderProps {
  children: React.ReactNode;
  apiKey?: string;
  baseUrl?: string;
  siteId?: string;
  // @internal – not for public docs. Dyrected Cloud passes this to bypass
  // admin-level auth when the user is already authenticated at the cloud level.
  initialToken?: string;
  defaultTechStack?: string;
  components?: DyrectedContextType['components'];
}

export function DyrectedProvider({
  children,
  apiKey: initialApiKey,
  baseUrl: initialBaseUrl,
  siteId: initialSiteId,
  initialToken,
  defaultTechStack,
  components
}: DyrectedProviderProps) {
  const [baseUrl, setBaseUrl] = useState<string>(() => initialBaseUrl || (typeof window !== 'undefined' ? localStorage.getItem("dyrected_url") : null) || "");
  const [apiKey, setApiKey] = useState<string | undefined>(() => initialApiKey || (typeof window !== 'undefined' ? localStorage.getItem("dyrected_key") : null) || undefined);
  const [siteId, setSiteId] = useState<string | undefined>(() => initialSiteId || (typeof window !== 'undefined' ? localStorage.getItem("dyrected_site_id") : null) || undefined);
  const [schemas, setSchemas] = useState<AdminSchemas | null>(null);
  const [user, setUser] = useState<AdminUser | null>(null);

  const client = useMemo<DyrectedClient | null>(() => {
    if (!baseUrl) return null;
    return createClient({
      baseUrl,
      apiKey: apiKey || undefined,
      siteId: siteId || undefined,
    });
  }, [apiKey, baseUrl, siteId]);

  useEffect(() => {
    let cancelled = false;

    if (!client) {
      return () => {
        cancelled = true;
      };
    }

    client.getSchemas().then(
      (nextSchemas) => {
        if (cancelled) return;
        setSchemas((prev) => (prev === nextSchemas ? prev : nextSchemas));
      },
      (err) => {
        if (cancelled) return;
        console.error("Failed to fetch schemas:", err);
        setSchemas((prev) => (prev === null ? prev : null));
      },
    );

    return () => {
      cancelled = true;
    };
  }, [client]);

  // Apply the cloud-issued token to the SDK client so API calls include it.
  // Does not call me() — AuthGate skips auth entirely when initialToken is present.
  useEffect(() => {
    if (initialToken && client) {
      client.setToken(initialToken);
    }
  }, [initialToken, client]);

  const setAuth = useCallback((newUrl: string, newKey: string, newSiteId?: string) => {
    localStorage.setItem("dyrected_url", newUrl);
    localStorage.setItem("dyrected_key", newKey);
    if (newSiteId) localStorage.setItem("dyrected_site_id", newSiteId);
    else localStorage.removeItem("dyrected_site_id");
    
    setBaseUrl(newUrl);
    setApiKey(newKey);
    setSiteId(newSiteId);
  }, []);

  const setToken = useCallback((token: string) => {
    if (!token) {
      localStorage.removeItem("dyrected_token");
      if (client) client.clearToken();
      setUser(null);
      return;
    }
    localStorage.setItem("dyrected_token", token);
    if (client) {
      client.setToken(token);
      const authCollection = getAdminCollectionSlug(schemas);
      if (authCollection) {
        client.collection(authCollection).me().then(
          (nextUser) => setUser(nextUser as AdminUser),
          () => setUser(null),
        );
      }
    }
  }, [client, schemas]);

  useEffect(() => {
    if (initialToken || !client || !schemas || user) return;
    const token = localStorage.getItem("dyrected_token");
    const authCollection = getAdminCollectionSlug(schemas);

    if (!token || !authCollection) return;

    client.setToken(token);
    client.collection(authCollection).me().then(
      (nextUser) => setUser(nextUser as AdminUser),
      () => setUser(null),
    );
  }, [client, initialToken, schemas, user]);

  const logout = useCallback(() => {
    localStorage.removeItem("dyrected_url");
    localStorage.removeItem("dyrected_key");
    localStorage.removeItem("dyrected_site_id");
    localStorage.removeItem("dyrected_token");
    setBaseUrl("");
    setApiKey(undefined);
    setSiteId(undefined);
    setUser(null);
    setSchemas(null);
  }, []);

  return (
    <DyrectedContext.Provider value={{
      client,
      config: { baseUrl, apiKey, siteId, defaultTechStack },
      setAuth,
      setToken,
      logout,
      isAuthenticated: !!baseUrl && !!apiKey,
      schemas,
      user,
      initialToken,
      components
    }}>
      {children}
    </DyrectedContext.Provider>
  );
}
