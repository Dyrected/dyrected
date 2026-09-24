import { createContext, useContext } from "react";
import type { DyrectedClient, CompiledNavTree } from "@dyrected/sdk";
import type { AdminComponents, AdminSchemas } from "../types/admin-components";
import type { AdminUser } from "./admin-auth";

export type NavigationBadges = Record<string, { count?: number; variant?: string; text?: string }>;

export interface DyrectedContextType {
  client: DyrectedClient | null;
  config: {
    baseUrl: string;
    apiKey: string | undefined;
    siteId: string | undefined;
    defaultTechStack?: string;
  };
  setAuth: (baseUrl: string, apiKey: string, siteId?: string) => void;
  setSiteId: (siteId: string | undefined) => void;
  logout: () => void;
  isAuthenticated: boolean;
  isResolvingStoredSession: boolean;
  schemas: AdminSchemas | null;
  navigation: CompiledNavTree | null;
  badges: NavigationBadges | null;
  refetchNavigation: () => Promise<void>;
  refetchBadges: () => Promise<void>;
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
