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
  schemas: { collections: any[]; globals: any[] } | null;
}

const DyrectedContext = createContext<DyrectedContextType | undefined>(undefined);

export interface DyrectedProviderProps {
  children: React.ReactNode;
  apiKey?: string;
  baseUrl?: string;
  siteId?: string;
}

export function DyrectedProvider({ 
  children, 
  apiKey: initialApiKey, 
  baseUrl: initialBaseUrl,
  siteId: initialSiteId
}: DyrectedProviderProps) {
  const [baseUrl, setBaseUrl] = useState<string>(() => initialBaseUrl || (typeof window !== 'undefined' ? localStorage.getItem("dyrected_url") : null) || "");
  const [apiKey, setApiKey] = useState<string | undefined>(() => initialApiKey || (typeof window !== 'undefined' ? localStorage.getItem("dyrected_key") : null) || undefined);
  const [siteId, setSiteId] = useState<string | undefined>(() => initialSiteId || (typeof window !== 'undefined' ? localStorage.getItem("dyrected_site_id") : null) || undefined);
  const [client, setClient] = useState<DyrectedClient | null>(null);
  const [schemas, setSchemas] = useState<{ collections: any[]; globals: any[] } | null>(null);

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

  const setAuth = (newUrl: string, newKey: string, newSiteId?: string) => {
    localStorage.setItem("dyrected_url", newUrl);
    localStorage.setItem("dyrected_key", newKey);
    if (newSiteId) localStorage.setItem("dyrected_site_id", newSiteId);
    else localStorage.removeItem("dyrected_site_id");
    
    setBaseUrl(newUrl);
    setApiKey(newKey);
    setSiteId(newSiteId);
  };

  const logout = () => {
    localStorage.removeItem("dyrected_url");
    localStorage.removeItem("dyrected_key");
    localStorage.removeItem("dyrected_site_id");
    setBaseUrl("");
    setApiKey(undefined);
    setSiteId(undefined);
    setClient(null);
  };

  return (
    <DyrectedContext.Provider value={{
      client,
      config: { baseUrl, apiKey, siteId },
      setAuth,
      logout,
      isAuthenticated: !!baseUrl && !!apiKey,
      schemas
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
