import type { ComponentType } from "react";
import type {
  AdminConfig,
  Block,
  CollectionConfig,
  ConfigDiagnostic,
  Field as FieldSchema,
  GlobalConfig,
  PublicAdminAuthConfig,
} from "@dyrected/core";
import type { DyrectedClient, PaginatedResult } from "@dyrected/sdk";

/** All collection and global schemas returned by the backend, plus optional admin config. */
export interface AdminSchemas {
  blocks?: Block[];
  collections: CollectionConfig[];
  globals: GlobalConfig[];
  admin?: AdminConfig;
  adminAuth?: PublicAdminAuthConfig;
  hasStorage?: boolean;
  configDiagnostics?: ConfigDiagnostic[];
  adminHealth?: {
    emailConfigured?: boolean;
    secureAuthSecretConfigured?: boolean;
    authCollectionConfigured?: boolean;
    uploadCollectionConfigured?: boolean;
  };
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

/** Props injected into custom operational-view slot components. */
export interface CollectionViewSlotProps {
  /** Authenticated SDK client. */
  client: DyrectedClient;
  /** Currently logged-in user document, or `null` when unauthenticated. */
  user: Record<string, unknown> | null;
  /** Schema config for the collection being rendered. */
  collection: CollectionConfig;
  /** URL slug of the collection (e.g. `"posts"`). */
  collectionSlug: string;
  /** Slug of the operational view being rendered. */
  viewSlug: string;
  /** The serialized view config (`layout`, `columns`, `metrics`, …). */
  view: Record<string, unknown>;
  /** Documents loaded for the current view. */
  documents: Record<string, unknown>[];
  /** `true` while the view query is in-flight. */
  isLoading: boolean;
  permissions: {
    canCreate: boolean;
  };
  urls: {
    /** Admin URL for the collection list view. */
    collection: string;
    /** Admin URL for the new-document form. */
    create: string;
  };
}

export interface AdminFieldComponentContext {
  user: Record<string, unknown> | null;
  schemas?: AdminSchemas;
  siblingData: Record<string, unknown>;
  doc?: Record<string, unknown>;
  docs?: Record<string, unknown>[];
  data?: Record<string, unknown>;
  record?: Record<string, unknown>;
  row?: Record<string, unknown>;
  document?: Record<string, unknown>;
  documents?: Record<string, unknown>[];
  formData?: Record<string, unknown>;
}

export interface AdminFieldComponentProps {
  value: unknown;
  onChange: (...event: any[]) => void;
  field: FieldSchema;
  path: string;
  disabled?: boolean;
  collection: string;
  context?: AdminFieldComponentContext;
  doc?: Record<string, unknown>;
  docs?: Record<string, unknown>[];
  data?: Record<string, unknown>;
  record?: Record<string, unknown>;
  row?: Record<string, unknown>;
}

/**
 * Custom component overrides passed to `<DyrectedAdmin />`. Each key is a
 * registry: you reference a component by a string key in your schema config,
 * then provide the real component under that same key here.
 *
 * @example
 * ```tsx
 * <DyrectedAdmin
 *   components={{
 *     // field's admin.component: 'brand-color'
 *     fields: { 'brand-color': ColorPickerField },
 *     // admin.components.beforeDashboard: ['analytics']
 *     dashboard: { analytics: AnalyticsWidget },
 *     // collection admin.components.beforeList: ['posts-header']
 *     collectionList: { 'posts-header': PostsHeader },
 *   }}
 * />
 * ```
 */
export interface AdminComponents {
  /**
   * Custom field inputs keyed by the `admin.component` string set on a field.
   * A field opts in by setting `admin.component: '<key>'`; the component
   * registered under that key replaces the built-in input for that field.
   * Keys are arbitrary — this is a per-field override, not a per-type one.
   */
  fields?: Record<string, ComponentType<AdminFieldComponentProps>>;
  /**
   * Dashboard slot components keyed by the slot-key names declared in the
   * top-level `admin.components` (`beforeDashboard` / `afterDashboard`).
   * The registered components render around the built-in dashboard.
   */
  dashboard?: Record<string, ComponentType<DashboardSlotProps>>;
  /**
   * Collection-list slot components keyed by the slot-key names declared in a
   * collection's `admin.components` (`beforeList` / `beforeListTable` /
   * `afterListTable` / `afterList`). They inject content around the built-in
   * list — they do not replace it.
   */
  collectionList?: Record<string, ComponentType<CollectionListSlotProps>>;
  /**
   * Operational-view slot components keyed by the slot-key names declared in a
   * collection's `admin.components.collectionView` object (`beforeViewHeader` /
   * `afterViewHeader` / `beforeViewContent` / `afterViewContent`). They inject
   * content around any operational view layout — table, spreadsheet, kanban,
   * calendar, or cards.
   */
  collectionView?: Record<string, ComponentType<CollectionViewSlotProps>>;
}
