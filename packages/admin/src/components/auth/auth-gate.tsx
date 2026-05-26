import React from "react";
import { useDyrected } from "../../providers/dyrected-provider";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { LoginPage } from "../../pages/auth/login-page";
import { FirstUserPage } from "../../pages/auth/first-user-page";

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
  const { client, user, setToken, schemas } = useDyrected();
  const queryClient = useQueryClient();

  // 1. Prefer __admins as the sole dashboard auth collection; fall back to the first auth collection.
  const authCollection =
    schemas?.collections.find((c: any) => c.slug === '__admins') ??
    schemas?.collections.find((c: any) => c.auth);

  // 2. Check if the collection is initialized
  const { data: initData, isLoading: isLoadingInit } = useQuery({
    queryKey: ["auth-init", authCollection?.slug],
    queryFn: () => client!.collection(authCollection!.slug).isInitialized(),
    enabled: !!client && !!authCollection,
  });

  const isLoading = !schemas || (authCollection && isLoadingInit);

  if (isLoading) {
    return (
      <div className="dy-flex dy-h-screen dy-items-center dy-justify-center dy-bg-background">
        <div className="dy-flex dy-flex-col dy-items-center dy-gap-4">
          <div className="dy-h-8 dy-w-8 dy-animate-spin dy-rounded-full dy-border-2 dy-border-primary dy-border-t-transparent" />
          <p className="dy-text-sm dy-text-muted-foreground dy-animate-pulse">Authenticating...</p>
        </div>
      </div>
    );
  }

  // If no auth collection exists, the app is open
  if (!authCollection) {
    return <>{children}</>;
  }

  // If not initialized, show first user registration
  if (initData && !initData.initialized) {
    return <FirstUserPage collectionSlug={authCollection.slug} onComplete={(data: any) => {
      setToken(data.token);
      queryClient.invalidateQueries({ queryKey: ["auth-init", authCollection.slug] });
    }} />;
  }

  // If not logged in, show login page
  if (!user) {
    return <LoginPage collectionSlug={authCollection.slug} onLogin={(data: any) => {
      setToken(data.token);
    }} />;
  }

  return <>{children}</>;
}
