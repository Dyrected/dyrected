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
import type { DyrectedClient, PaginatedResult, RegisteredComponentKeys } from "@dyrected/sdk";

/** All collection and global schemas returned by the backend, plus optional admin config. */
export interface AdminSchemas {
  blocks?: Block[];
  collections: CollectionConfig[];
  globals: GlobalConfig[];
  admin?: AdminConfig;
  adminAuth?: PublicAdminAuthConfig;
  hasStorage?: boolean;
  configDiagnostics?: ConfigDiagnostic[];
  trash?: {
    enabled?: boolean;
    retentionDays?: number | null;
    allowPermanentDelete?: boolean;
  };
  adminHealth?: {
    emailConfigured?: boolean;
    secureAuthSecretConfigured?: boolean;
    authCollectionConfigured?: boolean;
    uploadCollectionConfigured?: boolean;
    trashPurgeOverdue?: boolean;
  };
  ai?: {
    enabled: boolean;
    provider?: string;
    model?: string;
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
 * Props passed into custom create and edit form components. Identity only: read
 * the form, the saved document, and `submit()` with `useDocumentForm()`.
 */
export interface AdminFormComponentProps {
  /** Collection slug (or global slug) the form belongs to. */
  collection: string;
  /** `"create"` for a new record, `"edit"` for an existing record or a global. */
  mode: "create" | "edit";
  /** The record's ID when editing. `undefined` when creating, and for globals. */
  documentId?: string;
  /** Where the form is shown: a full `"page"`, or a `"drawer"` (inline relationship creation). */
  presentation: "page" | "drawer";
}

/** Props passed into custom operational view layout components (spec 3). Identity only; view state accessed via composables/hooks. */
export interface AdminViewLayoutProps {
  /** Collection slug of the view. */
  collection: string;
  /** Operational view slug. */
  viewSlug: string;
}

/** Props passed into custom admin page components (spec 4). Identity only; page metadata accessed via composables/hooks. */
export interface AdminPageProps {
  /** Slug of the custom admin page. */
  slug: string;
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
  /**
   * Custom document forms keyed by component key. Replaces the built-in form
   * for a collection or global when its `admin.components` sets `createForm`, `editForm` or `form`.
   */
  forms?: Record<string, ComponentType<AdminFormComponentProps>>;
  /**
   * Custom operational view layouts keyed by layout key. Replaces the layout
   * for an operational view when configured in `view.layout`.
   */
  viewLayouts?: Record<string, ComponentType<AdminViewLayoutProps>>;
  /**
   * Custom full admin pages keyed by page slug or component key.
   */
  pages?: Record<string, ComponentType<AdminPageProps>>;
  /**
   * Custom components rendered inside Detail Views via `displayCustom` / `displayCustomComponent`.
   */
  customComponents?: Record<string, ComponentType<any>>;
}

/**
 * Type-safe component map structure mapped against registered component keys.
 */
export type TypedAdminComponents<K extends Record<string, any> = RegisteredComponentKeys> = {
  fields?: Record<K["fields"] extends string ? K["fields"] : string, ComponentType<AdminFieldComponentProps>>;
  dashboard?: Record<K["dashboard"] extends string ? K["dashboard"] : string, ComponentType<DashboardSlotProps>>;
  collectionList?: Record<K["collectionList"] extends string ? K["collectionList"] : string, ComponentType<CollectionListSlotProps>>;
  collectionView?: Record<K["collectionView"] extends string ? K["collectionView"] : string, ComponentType<CollectionViewSlotProps>>;
  forms?: Record<K["forms"] extends string ? K["forms"] : string, ComponentType<AdminFormComponentProps>>;
  viewLayouts?: Record<K["viewLayouts"] extends string ? K["viewLayouts"] : string, ComponentType<AdminViewLayoutProps>>;
  pages?: Record<K["pages"] extends string ? K["pages"] : string, ComponentType<AdminPageProps>>;
  customComponents?: Record<K["customComponents"] extends string ? K["customComponents"] : string, ComponentType<any>>;
};

/**
 * Type-safe helper for authoring custom component registration maps.
 * Ensures provided keys match those generated in `Register.componentKeys`.
 */
export function defineAdminComponents<T extends TypedAdminComponents>(components: T): T {
  return components;
}

