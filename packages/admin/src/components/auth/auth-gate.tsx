import React, { useEffect, useMemo, useRef, useState } from "react";
import { useDyrected } from "../../providers/dyrected-context";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { LoginPage } from "../../pages/auth/login-page";
import { FirstUserPage } from "../../pages/auth/first-user-page";
import { ExternalLoginPage } from "../../pages/auth/external-login-page";
import { AdminSplash } from "../layout/admin-splash";
import type { CollectionConfig } from "@dyrected/core";

/**
 * AuthGate protects the admin dashboard and handles the initial bootstrap flow.
 * 
 * 1. Checks if any user collection has 'auth: true'.
 * 2. If yes, checks if at least one user exists (initialized).
 * 3. If not initialized, shows the 'First User' registration page.
 * 4. If initialized but not logged in, shows the 'Login' page.
 * 5. If logged in (or no auth required), renders the children.
 */
export function AuthGate({ children }: { children: React.ReactNode }) {
  const { client, user, setToken, schemas, initialToken, config, isResolvingStoredSession } = useDyrected();
  const queryClient = useQueryClient();
  const handledExternalTokenRef = useRef<string | null>(null);
  const [externalExchangeError, setExternalExchangeError] = useState<string | null>(null);

  const adminAuth = schemas?.adminAuth;
  const isExternalAdminAuth = adminAuth?.mode === "external" && (adminAuth.providers?.length ?? 0) > 0;
  const externalParams = useMemo(() => {
    if (typeof window === "undefined") {
      return { token: null, error: null };
    }
    const params = new URLSearchParams(window.location.search);
    return {
      token: params.get("dyrectedExternalToken"),
      provider: params.get("dyrectedExternalProvider"),
      collection: params.get("dyrectedAdminCollection"),
      error: params.get("dyrectedExternalError"),
    };
  }, []);
  const [pendingExternalToken, setPendingExternalToken] = useState(() => !!externalParams.token);
  const externalError = externalExchangeError ?? externalParams.error;

  const authCollection = resolveAdminAuthCollection(schemas?.collections, adminAuth?.collectionSlug);
  const clearExternalAuthParams = React.useCallback(() => {
    if (typeof window === "undefined") return;

    const params = new URLSearchParams(window.location.search);
    params.delete("dyrectedExternalToken");
    params.delete("dyrectedExternalProvider");
    params.delete("dyrectedAdminCollection");
    params.delete("dyrectedExternalError");
    const nextSearch = params.toString();
    const nextUrl = `${window.location.pathname}${nextSearch ? `?${nextSearch}` : ""}${window.location.hash}`;
    window.history.replaceState({}, document.title, nextUrl);
    setPendingExternalToken(false);
  }, []);
  const exchangeExternalAuthMutation = useMutation({
    mutationFn: async ({ provider, token }: { provider: string; token: string }) => {
      return client!.exchangeAdminAuth(provider, { token });
    },
  });

  useEffect(() => {
    if (
      !isExternalAdminAuth ||
      !externalParams.token ||
      handledExternalTokenRef.current === externalParams.token ||
      (externalParams.provider && !client)
    ) {
      return;
    }

    handledExternalTokenRef.current = externalParams.token;
    let cancelled = false;

    if (!externalParams.provider) {
      setToken(externalParams.token, externalParams.collection);
      queueMicrotask(() => {
        clearExternalAuthParams();
      });
      return;
    }

    exchangeExternalAuthMutation.mutate(
      { provider: externalParams.provider, token: externalParams.token },
      {
        onSuccess: (exchanged) => {
          if (cancelled) return;
          setExternalExchangeError(null);
          setToken(exchanged.token, exchanged.collectionSlug);
        },
        onError: (error) => {
          if (cancelled) return;
          handledExternalTokenRef.current = null;
          setExternalExchangeError(
            error instanceof Error ? error.message : "External authentication failed.",
          );
        },
        onSettled: () => {
          if (cancelled) return;
          clearExternalAuthParams();
        },
      },
    );

    return () => {
      cancelled = true;
    }
  }, [clearExternalAuthParams, client, exchangeExternalAuthMutation, externalParams.collection, externalParams.provider, externalParams.token, isExternalAdminAuth, setToken]);

  useEffect(() => {
    if (!isExternalAdminAuth || user || !client) return;
    const providers = adminAuth?.providers || [];
    if (!pendingExternalToken && !externalError && providers.length === 1 && providers[0].autoRedirect !== false) {
      window.location.assign(buildProviderStartUrl(client.getBaseUrl(), providers[0].id, config.apiKey));
    }
  }, [adminAuth?.providers, client, externalError, isExternalAdminAuth, pendingExternalToken, user, config.apiKey]);

  // 1. Check if the collection is initialized for local auth only
  const { data: initData, isLoading: isLoadingInit } = useQuery({
    queryKey: ["auth-init", authCollection?.slug],
    queryFn: () => client!.collection(authCollection!.slug).isInitialized(),
    enabled: !!client && !!authCollection && !isExternalAdminAuth,
  });

  const isLoading =
    !schemas ||
    isResolvingStoredSession ||
    exchangeExternalAuthMutation.isPending ||
    pendingExternalToken ||
    (!isExternalAdminAuth && authCollection && isLoadingInit);

  // Cloud-managed: host application has already authenticated the user.
  // Skip setup and login flow — render the admin shell directly.
  if (initialToken) return <>{children}</>;

  if (isLoading) {
    return <AdminSplash />;
  }

  // If no auth collection exists, the app is open
  if (!authCollection) {
    return <>{children}</>;
  }

  if (isExternalAdminAuth) {
    if (!user) {
      const providers = adminAuth.providers || [];
      if (!pendingExternalToken && !externalError && providers.length === 1 && providers[0].autoRedirect !== false) return null;

      return (
        <ExternalLoginPage
          providers={providers}
          error={externalError}
          onStart={(providerId) => {
            window.location.assign(buildProviderStartUrl(client!.getBaseUrl(), providerId, config.apiKey));
          }}
        />
      );
    }

    return <>{children}</>;
  }

  // If not initialized, show first user registration
  if (initData && !initData.initialized) {
    return (
      <FirstUserPage
        collectionSlug={authCollection.slug}
        onComplete={(data: unknown) => {
          const token = readToken(data);
          if (!token) return;
          setToken(token);
          queryClient.invalidateQueries({ queryKey: ["auth-init", authCollection.slug] });
        }}
      />
    );
  }

  // If not logged in, show login page
  if (!user) {
    return (
      <LoginPage
        collectionSlug={authCollection.slug}
        onLogin={(data: unknown) => {
          const token = readToken(data);
          if (token) setToken(token);
        }}
      />
    );
  }

  return <>{children}</>;
}

function buildProviderStartUrl(baseUrl: string, providerId: string, apiKey?: string) {
  const startUrl = new URL(`${baseUrl.replace(/\/$/, "")}/api/admin/auth/${providerId}/start`);
  startUrl.searchParams.set("returnTo", window.location.href);
  if (apiKey) {
    startUrl.searchParams.set("apikey", apiKey);
  }
  return startUrl.toString();
}

function resolveAdminAuthCollection(
  collections: CollectionConfig[] | undefined,
  collectionSlug?: string,
) {
  if (!collections) return undefined;
  return (
    collections.find((collection) => collection.slug === "__admins") ??
    collections.find((collection) => collection.slug === collectionSlug) ??
    collections.find((collection) => collection.auth)
  );
}

function readToken(value: unknown): string | null {
  if (!value || typeof value !== "object" || !("token" in value)) return null;
  const token = (value as { token?: unknown }).token;
  return typeof token === "string" ? token : null;
}
