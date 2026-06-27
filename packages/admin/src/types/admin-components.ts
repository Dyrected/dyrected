import type { ComponentType } from "react";
import type { AdminConfig, CollectionConfig, GlobalConfig, PublicAdminAuthConfig } from "@dyrected/core";
import type { DyrectedClient, PaginatedResult } from "@dyrected/sdk";

/** All collection and global schemas returned by the backend, plus optional admin config. */
export interface AdminSchemas {
  collections: CollectionConfig[];
  globals: GlobalConfig[];
  admin?: AdminConfig;
  adminAuth?: PublicAdminAuthConfig;
}

/** Props injected into custom dashboard slot components. */
export interface DashboardSlotProps {
  /** Authenticated SDK client — use this to call any API. */
  client: DyrectedClient;
  /** Currently logged-in user document, or `null` when unauthenticated. */
  user: Record<string, unknown> | null;
  /** All schemas loaded from the backend. */
  schemas: AdminSchemas;
}

/** Props injected into custom collection list slot components. */
export interface CollectionListSlotProps {
  /** Authenticated SDK client. */
  client: DyrectedClient;
  /** Currently logged-in user document, or `null` when unauthenticated. */
  user: Record<string, unknown> | null;
  /** Schema config for the collection being rendered. */
  collection: CollectionConfig;
  /** URL slug of the collection (e.g. `"posts"`). */
  collectionSlug: string;
  /** Raw paginated response from the last `find()` call. */
  response: PaginatedResult<Record<string, unknown>> | undefined;
  /** Unwrapped document array from `response`. */
  documents: Record<string, unknown>[];
  /** `true` while the list query is in-flight. */
  isLoading: boolean;
  pagination: {
    page: number;
    totalPages: number;
    total: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
  permissions: {
    /** Whether the current user may read documents in this collection. */
    canRead: boolean;
    /** Whether the current user may create new documents. */
    canCreate: boolean;
  };
  urls: {
    /** Admin URL for the collection list view. */
    collection: string;
    /** Admin URL for the new-document form. */
    create: string;
  };
}

/**
 * Custom component overrides passed to `<DyrectedAdmin />`.
 *
 * @example
 * ```tsx
 * <DyrectedAdmin
 *   components={{
 *     fields: { color: ColorPickerField },
 *     dashboard: { analytics: AnalyticsWidget },
 *     collectionList: { posts: PostsListView },
 *   }}
 * />
 * ```
 */
export interface AdminComponents {
  /**
   * Custom field renderers keyed by field type name.
   * A component registered here replaces the built-in renderer for every
   * field whose `type` matches the key.
   */
  fields?: Record<string, ComponentType<any>>;
  /**
   * Custom dashboard slot components keyed by a slot name of your choice.
   * All registered components are rendered inside the dashboard page.
   */
  dashboard?: Record<string, ComponentType<DashboardSlotProps>>;
  /**
   * Custom collection list slot components keyed by collection slug.
   * The registered component replaces the entire list view for that collection.
   */
  collectionList?: Record<string, ComponentType<CollectionListSlotProps>>;
}
