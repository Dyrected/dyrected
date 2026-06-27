import { createContext, useContext } from "react";
import type { DyrectedClient } from "@dyrected/sdk";
import type { AdminComponents, AdminSchemas } from "../types/admin-components";
import type { AdminUser } from "./admin-auth";

export interface DyrectedContextType {
  client: DyrectedClient | null;
  config: {
    baseUrl: string;
    apiKey: string | undefined;
    siteId: string | undefined;
    defaultTechStack?: string;
  };
  setAuth: (baseUrl: string, apiKey: string, siteId?: string) => void;
  logout: () => void;
  isAuthenticated: boolean;
  schemas: AdminSchemas | null;
  user: AdminUser | null;
  setToken: (token: string, collectionSlug?: string | null) => void;
  initialToken?: string;
  components?: AdminComponents;
}

export const DyrectedContext = createContext<DyrectedContextType | undefined>(undefined);

export function useDyrected(): DyrectedContextType {
  const context = useContext(DyrectedContext);
  if (!context) throw new Error("useDyrected must be used within a DyrectedProvider");
  return context;
}
