import type { ComponentType } from "react";
import type { AdminConfig, CollectionConfig, GlobalConfig } from "@dyrected/core";
import type { DyrectedClient, PaginatedResult } from "@dyrected/sdk";

export interface AdminSchemas {
  collections: CollectionConfig[];
  globals: GlobalConfig[];
  admin?: AdminConfig;
}

export interface DashboardSlotProps {
  client: DyrectedClient;
  user: Record<string, unknown> | null;
  schemas: AdminSchemas;
}

export interface CollectionListSlotProps {
  client: DyrectedClient;
  user: Record<string, unknown> | null;
  collection: CollectionConfig;
  collectionSlug: string;
  response: PaginatedResult<Record<string, unknown>> | undefined;
  documents: Record<string, unknown>[];
  isLoading: boolean;
  pagination: {
    page: number;
    totalPages: number;
    total: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
  permissions: {
    canRead: boolean;
    canCreate: boolean;
  };
  urls: {
    collection: string;
    create: string;
  };
}

export interface AdminComponents {
  fields?: Record<string, ComponentType<any>>;
  dashboard?: Record<string, ComponentType<DashboardSlotProps>>;
  collectionList?: Record<string, ComponentType<CollectionListSlotProps>>;
}
