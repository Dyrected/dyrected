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
  const initialTokenUser = useMemo(() => (initialToken ? decodeTokenPayload(initialToken) : null), [initialToken]);
  const [user, setUser] = useState<AdminUser | null>(() => initialTokenUser);
  const [authCollectionSlug, setAuthCollectionSlug] = useState<string | null>(
    () => (typeof window !== "undefined" ? localStorage.getItem("dyrected_admin_auth_collection") : null) || null,
  );

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

  const activeUser = initialTokenUser ?? user;

  // Apply the cloud-issued token to the SDK client.
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

  const setToken = useCallback((token: string, collectionSlug?: string | null) => {
    if (!token) {
      localStorage.removeItem("dyrected_token");
      localStorage.removeItem("dyrected_admin_auth_collection");
      if (client) client.clearToken();
      setAuthCollectionSlug(null);
      setUser(null);
      return;
    }

    const resolvedCollectionSlug = collectionSlug || authCollectionSlug || getAdminCollectionSlug(schemas);
    localStorage.setItem("dyrected_token", token);
    if (resolvedCollectionSlug) {
      localStorage.setItem("dyrected_admin_auth_collection", resolvedCollectionSlug);
      setAuthCollectionSlug((prev) => (prev === resolvedCollectionSlug ? prev : resolvedCollectionSlug));
    }
    if (client) {
      client.setToken(token);
      if (resolvedCollectionSlug) {
        client.collection(resolvedCollectionSlug).me().then(
          (nextUser) => setUser(nextUser as AdminUser),
          () => setUser(null),
        );
      }
    }
  }, [authCollectionSlug, client, schemas]);

  useEffect(() => {
    if (initialToken || !client || !schemas || activeUser) return;
    const token = localStorage.getItem("dyrected_token");
    const resolvedCollectionSlug = authCollectionSlug || getAdminCollectionSlug(schemas);

    if (!token || !resolvedCollectionSlug) return;

    client.setToken(token);
    client.collection(resolvedCollectionSlug).me().then(
      (nextUser) => setUser(nextUser as AdminUser),
      () => setUser(null),
    );
  }, [activeUser, authCollectionSlug, client, initialToken, schemas]);

  const logout = useCallback(() => {
    localStorage.removeItem("dyrected_url");
    localStorage.removeItem("dyrected_key");
    localStorage.removeItem("dyrected_site_id");
    localStorage.removeItem("dyrected_token");
    localStorage.removeItem("dyrected_admin_auth_collection");
    setBaseUrl("");
    setApiKey(undefined);
    setSiteId(undefined);
    setAuthCollectionSlug(null);
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
      user: activeUser,
      initialToken,
      components
    }}>
      {children}
    </DyrectedContext.Provider>
  );
}

function decodeTokenPayload(token: string): AdminUser | null {
  const payload = token.split(".")[1];
  if (!payload) return null;

  try {
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
    const json = decodeURIComponent(
      atob(padded)
        .split("")
        .map((char) => `%${char.charCodeAt(0).toString(16).padStart(2, "0")}`)
        .join(""),
    );
    const parsed = JSON.parse(json);
    if (!parsed || typeof parsed !== "object") return null;

    const user = parsed as AdminUser;
    const roles = Array.isArray(user.roles)
      ? user.roles.filter((role): role is string => typeof role === "string").map(normalizeCloudRole)
      : [];
    const role = typeof user.role === "string" ? normalizeCloudRole(user.role) : undefined;

    return {
      ...user,
      ...(role ? { role } : {}),
      roles: roles.length > 0 ? roles : role ? [role] : roles,
    };
  } catch {
    return null;
  }
}

function normalizeCloudRole(role: string) {
  return role === "owner" ? "admin" : role;
}
