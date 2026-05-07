import React, { createContext, useContext, useState, useEffect } from "react";
import { createClient, DyrectedClient } from "@dyrected/sdk";

interface DyrectedContextType {
  client: DyrectedClient | null;
  config: {
    baseUrl: string;
    apiKey: string | null;
  };
  setAuth: (baseUrl: string, apiKey: string) => void;
  logout: () => void;
  isAuthenticated: boolean;
}

const DyrectedContext = createContext<DyrectedContextType | undefined>(undefined);

export function DyrectedProvider({ children }: { children: React.ReactNode }) {
  const [baseUrl, setBaseUrl] = useState<string>(() => localStorage.getItem("dyrected_url") || "");
  const [apiKey, setApiKey] = useState<string | null>(() => localStorage.getItem("dyrected_key"));
  const [client, setClient] = useState<DyrectedClient | null>(null);

  useEffect(() => {
    if (baseUrl) {
      const newClient = createClient({
        baseUrl,
        apiKey: apiKey || undefined,
      });
      setClient(newClient);
    }
  }, [baseUrl, apiKey]);

  const setAuth = (newUrl: string, newKey: string) => {
    localStorage.setItem("dyrected_url", newUrl);
    localStorage.setItem("dyrected_key", newKey);
    setBaseUrl(newUrl);
    setApiKey(newKey);
  };

  const logout = () => {
    localStorage.removeItem("dyrected_url");
    localStorage.removeItem("dyrected_key");
    setBaseUrl("");
    setApiKey(null);
    setClient(null);
  };

  return (
    <DyrectedContext.Provider value={{
      client,
      config: { baseUrl, apiKey },
      setAuth,
      logout,
      isAuthenticated: !!baseUrl && !!apiKey
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
