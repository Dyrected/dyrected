import React, { createContext, useContext, useState, useEffect } from "react";
import { createClient, DyrectedClient } from "@dyrected/sdk";

interface DyrectedContextType {
  client: DyrectedClient | null;
  config: {
    baseUrl: string;
    apiKey: string | undefined;
    siteId: string | undefined;
  };
  setAuth: (baseUrl: string, apiKey: string, siteId?: string) => void;
  logout: () => void;
  isAuthenticated: boolean;
  schemas: { collections: any[]; globals: any[]; admin?: any } | null;
  user: any | null;
  setToken: (token: string) => void;
  // @internal – set by Dyrected Cloud to bypass admin-level auth
  initialToken?: string;
  components?: {
    fields?: Record<string, React.ComponentType<any>>;
    [key: string]: any;
  };
}

const DyrectedContext = createContext<DyrectedContextType | undefined>(undefined);

export interface DyrectedProviderProps {
  children: React.ReactNode;
  apiKey?: string;
  baseUrl?: string;
  siteId?: string;
  // @internal – not for public docs. Dyrected Cloud passes this to bypass
  // admin-level auth when the user is already authenticated at the cloud level.
  initialToken?: string;
  components?: DyrectedContextType['components'];
}

export function DyrectedProvider({
  children,
  apiKey: initialApiKey,
  baseUrl: initialBaseUrl,
  siteId: initialSiteId,
  initialToken,
  components
}: DyrectedProviderProps) {
  const [baseUrl, setBaseUrl] = useState<string>(() => initialBaseUrl || (typeof window !== 'undefined' ? localStorage.getItem("dyrected_url") : null) || "");
  const [apiKey, setApiKey] = useState<string | undefined>(() => initialApiKey || (typeof window !== 'undefined' ? localStorage.getItem("dyrected_key") : null) || undefined);
  const [siteId, setSiteId] = useState<string | undefined>(() => initialSiteId || (typeof window !== 'undefined' ? localStorage.getItem("dyrected_site_id") : null) || undefined);
  const [client, setClient] = useState<DyrectedClient | null>(null);
  const [schemas, setSchemas] = useState<{ collections: any[]; globals: any[]; admin?: any } | null>(null);
  const [user, setUser] = useState<any | null>(null);

  useEffect(() => {
    if (baseUrl) {
      const newClient = createClient({
        baseUrl,
        apiKey: apiKey || undefined,
        siteId: siteId || undefined,
      });
      setClient(newClient);
      
      // Fetch schemas
      newClient.getSchemas().then(setSchemas).catch(err => {
        console.error("Failed to fetch schemas:", err);
        setSchemas(null);
      });
    }
  }, [baseUrl, apiKey, siteId]);

  // Apply the cloud-issued token to the SDK client so API calls include it.
  // Does not call me() — AuthGate skips auth entirely when initialToken is present.
  useEffect(() => {
    if (initialToken && client) {
      client.setToken(initialToken);
    }
  }, [initialToken, client]);

  useEffect(() => {
    if (initialToken) return; // cloud-managed: localStorage auth is not used
    const token = localStorage.getItem("dyrected_token");
    if (token && client && schemas && !user) {
      setToken(token);
    }
  }, [initialToken, client, schemas, user]);

  const setAuth = (newUrl: string, newKey: string, newSiteId?: string) => {
    localStorage.setItem("dyrected_url", newUrl);
    localStorage.setItem("dyrected_key", newKey);
    if (newSiteId) localStorage.setItem("dyrected_site_id", newSiteId);
    else localStorage.removeItem("dyrected_site_id");
    
    setBaseUrl(newUrl);
    setApiKey(newKey);
    setSiteId(newSiteId);
  };

  const setToken = (token: string) => {
    localStorage.setItem("dyrected_token", token);
    if (client) {
      client.setToken(token);
      // Prefer __admins for the dashboard session; fall back to the first auth collection.
      const authCollection =
        schemas?.collections.find((c: any) => c.slug === '__admins') ??
        schemas?.collections.find((c: any) => c.auth);
      if (authCollection) {
        client.collection(authCollection.slug).me().then(setUser).catch(() => setUser(null));
      }
    }
  };

  const logout = () => {
    localStorage.removeItem("dyrected_url");
    localStorage.removeItem("dyrected_key");
    localStorage.removeItem("dyrected_site_id");
    localStorage.removeItem("dyrected_token");
    setBaseUrl("");
    setApiKey(undefined);
    setSiteId(undefined);
    setClient(null);
    setUser(null);
  };

  return (
    <DyrectedContext.Provider value={{
      client,
      config: { baseUrl, apiKey, siteId },
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

export const useDyrected = () => {
  const context = useContext(DyrectedContext);
  if (!context) throw new Error("useDyrected must be used within a DyrectedProvider");
  return context;
};
