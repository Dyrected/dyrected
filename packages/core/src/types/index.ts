import type { AdminAuthConfig } from "./admin-auth.js";
import type { AdminConfig, AdminIconName, CollectionListComponentSlots } from "./admin.js";
import type { BaseDocument, FileData, PaginatedResult } from "./documents.js";
import type { AuthenticatedUser, HookRequestContext } from "./request.js";
import type { Block, DynamicOptionsConfig, DynamicOptionsResolver, Field, UploadConfig } from "./schema-core.js";
import type { AuthDocFields, InferDocShape, Prettify, SystemDocFields, UploadDocFields } from "./schema-inference.js";
import type { LifecycleEventHandler, WorkflowConfig } from "./workflows.js";

export * from "./admin.js";
export * from "./admin-auth.js";
export * from "./documents.js";
export * from "./request.js";
export * from "./schema-core.js";
export * from "./schema-inference.js";
export * from "./workflows.js";

// ─── Field-level hook types ───────────────────────────────────────────────────

/**
 * A hook that runs **before a field value is saved** to the database.
 *
 * Return the transformed value to persist. Return `undefined` to leave the
 * value unchanged (same as returning the original `value`).
 *
 * Field `beforeChange` hooks run recursively inside `array`, `object`, and
 * `blocks` fields — every nested item is processed automatically.
 *
 * @template TValue  The TypeScript type of this field's value.
 * @template TDoc    The document shape of the parent collection/global.
 *
 * @example
 * // Normalise email to lowercase
 * const normaliseEmail: FieldBeforeChangeHook<string> = ({ value }) =>
 *   value?.toLowerCase().trim()
 *
 * @example
 * // Hash a password with bcrypt
 * const hashPassword: FieldBeforeChangeHook<string> = async ({ value }) =>
 *   value ? bcrypt.hash(value, 10) : value
 */
export type FieldBeforeChangeHook<TValue = unknown, TDoc extends object = Record<string, unknown>> = (args: {
  /** The current value of this field (after any previous hooks in the chain). */
  value: TValue;
  /** The full document as it existed before this update. `undefined` on create. */
  originalDoc?: TDoc;
  /** The full incoming data payload being written. */
  data: Partial<TDoc>;
  /** The authenticated user, or `undefined` for unauthenticated requests. */
  user?: AuthenticatedUser;
  /**
   * Database adapter for cross-collection reads. Write operations (create,
   * update, delete) will throw — use `afterChange`/`afterDelete` for writes.
   */
  db: ReadonlyDatabaseAdapter;
}) => TValue | undefined | Promise<TValue | undefined>;

/**
 * A hook that runs **after a field value is read** from the database, before
 * the response is sent to the client.
 *
 * Return the transformed value to return to the client. Use this for masking,
 * formatting, or adding computed properties.
 *
 * @template TValue  The TypeScript type of this field's value.
 * @template TDoc    The document shape of the parent collection/global.
 *
 * @example
 * // Mask sensitive value for non-admins
 * const maskForPublic: FieldAfterReadHook<string> = ({ value, user }) =>
 *   user?.role === 'admin' ? value : '••••••••'
 */
export type FieldAfterReadHook<TValue = unknown, TDoc extends object = Record<string, unknown>> = (args: {
  /** The raw field value as stored in the database. */
  value: TValue;
  /** The full document being returned (with defaults applied). */
  doc: TDoc;
  /** The authenticated user, or `undefined` for unauthenticated requests. */
  user?: AuthenticatedUser;
  /**
   * Database adapter for cross-collection reads. Write operations (create,
   * update, delete) will throw — use `afterChange`/`afterDelete` for writes.
   */
  db: ReadonlyDatabaseAdapter;
}) => TValue | undefined | Promise<TValue | undefined>;

/**
 * @deprecated Use {@link FieldBeforeChangeHook} or {@link FieldAfterReadHook} instead.
 * This alias remains for backwards compatibility.
 */
export type FieldHook<TDoc extends object = Record<string, unknown>, TValue = unknown> = FieldBeforeChangeHook<
  TValue,
  TDoc
>;

// ─── Collection-level hook types ──────────────────────────────────────────────

/**
 * Runs before Dyrected queries the database for a list or single-document fetch.
 *
 * Return a new `where` query object to override or extend the current filter.
 * Return `undefined` (or nothing) to leave the query unchanged.
 *
 * @example
 * // Scope all reads to the current user's own documents
 * const scopeToUser: CollectionBeforeReadHook = ({ user, query }) => ({
 *   ...query,
 *   owner: { equals: user?.sub },
 * })
 */
export type CollectionBeforeReadHook = (args: {
  /** The HTTP request context. */
  req: HookRequestContext;
  /** The current `where` query filter. Modify and return to override. */
  query?: Record<string, unknown>;
  /** The authenticated user, or `undefined` for unauthenticated requests. */
  user?: AuthenticatedUser;
  /**
   * Database adapter for cross-collection reads. Write operations (create,
   * update, delete) will throw — use `afterChange`/`afterDelete` for writes.
   */
  db: ReadonlyDatabaseAdapter;
}) => Record<string, unknown> | void | Promise<Record<string, unknown> | void>;

/**
 * Runs after a document (or list of documents) is fetched from the database,
 * before the response is sent to the client.
 *
 * Return a modified document to send instead. Useful for adding computed
 * virtual fields or transforming the shape of the response.
 *
 * @template TDoc  The shape of the collection's document.
 *
 * @example
 * // Add a computed fullName field
 * const addFullName: CollectionAfterReadHook<User> = ({ doc }) => ({
 *   ...doc,
 *   fullName: `${doc.firstName} ${doc.lastName}`.trim(),
 * })
 */
export type CollectionAfterReadHook<TDoc extends object = Record<string, unknown>> = (args: {
  /** The document as fetched from the database (with defaults applied). */
  doc: TDoc;
  /** The HTTP request context. */
  req: HookRequestContext;
  /** The authenticated user, or `undefined` for unauthenticated requests. */
  user?: AuthenticatedUser;
  /**
   * Database adapter for cross-collection reads. Write operations (create,
   * update, delete) will throw — use `afterChange`/`afterDelete` for writes.
   */
  db: ReadonlyDatabaseAdapter;
}) => TDoc | Promise<TDoc>;

/**
 * Runs **before** a document is created or updated in the database.
 *
 * Return a modified data object to write instead of the original. This is the
 * right place for data transformation, normalisation, slug generation, and
 * validation (throw to abort the write).
 *
 * @template TDoc  The shape of the collection's document.
 *
 * @example
 * // Auto-generate a slug on create
 * const generateSlug: CollectionBeforeChangeHook<Post> = ({ data, operation }) => {
 *   if (operation === 'create' || data.title !== undefined) {
 *     return { ...data, slug: slugify(data.title ?? '') }
 *   }
 *   return data
 * }
 *
 * @example
 * // Abort the write with a validation error
 * const validateStock: CollectionBeforeChangeHook<Product> = ({ data }) => {
 *   if ((data.stock ?? 0) < 0) throw new Error('Stock cannot be negative.')
 *   return data
 * }
 */
export type CollectionBeforeChangeHook<TDoc extends object = Record<string, unknown>> = (args: {
  /** The incoming data payload being written. */
  data: Partial<TDoc>;
  /**
   * The existing document before this update. Only present on `'update'`
   * operations; `undefined` on `'create'`.
   */
  doc?: TDoc;
  /** The HTTP request context. */
  req: HookRequestContext;
  /** The authenticated user, or `undefined` for unauthenticated requests. */
  user?: AuthenticatedUser;
  /** Whether this is a new document or an update to an existing one. */
  operation: "create" | "update";
  /**
   * Database adapter for cross-collection reads. Write operations (create,
   * update, delete) will throw — use `afterChange`/`afterDelete` for writes.
   */
  db: ReadonlyDatabaseAdapter;
}) => Partial<TDoc> | void | Promise<Partial<TDoc> | void>;

/**
 * Runs **after** a document is created or updated in the database.
 *
 * **Isolation**: errors thrown inside this hook are caught by the framework,
 * logged to the console, and then discarded. The HTTP response returns the
 * saved document as if nothing went wrong — because from the database's
 * perspective, nothing did. This means a transient email failure or webhook
 * timeout will never turn a successful write into a 500 for the caller.
 *
 * The return value is ignored — this hook is for side-effects only (emails,
 * webhooks, cache revalidation, search index updates, etc.).
 *
 * **Awaiting vs fire-and-forget**: `await`ing inside this hook is fine for
 * fast, reliable calls. For slow or unreliable external services prefer
 * fire-and-forget with your own `.catch()` so the response doesn't block:
 *
 * ```ts
 * // ✓ fast & reliable — safe to await
 * afterChange: [async ({ doc }) => {
 *   await revalidatePath(`/posts/${doc.slug}`)
 * }]
 *
 * // ✓ slow or unreliable — fire-and-forget
 * afterChange: [({ doc }) => {
 *   sendEmail({ to: doc.email, ... }).catch(console.error)
 * }]
 * ```
 *
 * @template TDoc  The shape of the collection's document.
 *
 * @example
 * // Send a webhook after every save
 * const sendWebhook: CollectionAfterChangeHook<Post> = async ({ doc, operation }) => {
 *   await fetch('https://hooks.example.com/content', {
 *     method: 'POST',
 *     body: JSON.stringify({ event: operation, doc }),
 *   })
 * }
 *
 * @example
 * // Only act when a specific field changed
 * const onStatusChange: CollectionAfterChangeHook<Post> = async ({ doc, previousDoc, operation }) => {
 *   if (operation === 'update' && doc.status !== previousDoc?.status) {
 *     await notifySubscribers(doc)
 *   }
 * }
 */
export type CollectionAfterChangeHook<TDoc extends object = Record<string, unknown>> = (args: {
  /** The document as it was written to the database. */
  doc: TDoc;
  /**
   * Snapshot of the document before the write. Only present on `'update'`
   * operations; `undefined` on `'create'`.
   */
  previousDoc?: TDoc;
  /** The HTTP request context. */
  req: HookRequestContext;
  /** The authenticated user, or `undefined` for unauthenticated requests. */
  user?: AuthenticatedUser;
  /** Whether this was a new document or an update. */
  operation: "create" | "update";
  /**
   * Database adapter with full read/write access. The DB write for this
   * operation has already committed — safe for side-effect writes.
   */
  db: DatabaseAdapter;
}) => void | Promise<void>;

/**
 * Runs **before** a document is deleted from the database.
 *
 * Throw an error to cancel the deletion — the document will not be removed
 * and the API will return a `500` with your error message.
 *
 * @template TDoc  The shape of the collection's document.
 *
 * @example
 * // Prevent deletion when other documents reference this one
 * const guardReferences: CollectionBeforeDeleteHook<Category> = async ({ id, doc }) => {
 *   const refs = await db.find({ collection: 'posts', where: { category: { equals: id } } })
 *   if (refs.total > 0) throw new Error(`${refs.total} post(s) still reference this category.`)
 * }
 */
export type CollectionBeforeDeleteHook<TDoc extends object = Record<string, unknown>> = (args: {
  /** The ID of the document about to be deleted. */
  id: string;
  /** The full document about to be deleted. */
  doc: TDoc;
  /** The HTTP request context. */
  req: HookRequestContext;
  /** The authenticated user, or `undefined` for unauthenticated requests. */
  user?: AuthenticatedUser;
  /**
   * Database adapter for cross-collection reads. Write operations (create,
   * update, delete) will throw — use `afterDelete` for post-deletion writes.
   */
  db: ReadonlyDatabaseAdapter;
}) => void | Promise<void>;

/**
 * Runs **after** a document has been deleted from the database.
 *
 * **Isolation**: same as {@link CollectionAfterChangeHook} — errors are caught,
 * logged, and discarded. The deletion is already committed; a hook failure will
 * never cause the deleted ID to appear in the `failed` list of a bulk delete or
 * turn a successful single delete into a 500.
 *
 * Use for cleanup side-effects — removing related media, invalidating caches,
 * notifying downstream services, etc.
 *
 * @template TDoc  The shape of the collection's document.
 */
export type CollectionAfterDeleteHook<TDoc extends object = Record<string, unknown>> = (args: {
  /** The ID of the deleted document. */
  id: string;
  /** The document as it was just before deletion. */
  doc: TDoc;
  /** The HTTP request context. */
  req: HookRequestContext;
  /** The authenticated user, or `undefined` for unauthenticated requests. */
  user?: AuthenticatedUser;
  /**
   * Database adapter with full read/write access. The deletion has already
   * committed — safe for cascade deletes or cleanup writes.
   */
  db: DatabaseAdapter;
}) => void | Promise<void>;

// ─── Global-level hook types (mirrors collection, minus delete) ───────────────

/** @see {@link CollectionBeforeReadHook} */
export type GlobalBeforeReadHook = CollectionBeforeReadHook;

/**
 * Runs after the global document is fetched, before the response is sent.
 * @see {@link CollectionAfterReadHook}
 */
export type GlobalAfterReadHook<TDoc extends object = Record<string, unknown>> = (args: {
  doc: TDoc;
  req: HookRequestContext;
  user?: AuthenticatedUser;
  /**
   * Database adapter for cross-collection reads. Write operations (create,
   * update, delete) will throw — use `afterChange` for writes.
   */
  db: ReadonlyDatabaseAdapter;
}) => TDoc | Promise<TDoc>;

/**
 * Runs before the global document is updated.
 * Operation is always `'update'` (globals cannot be created or deleted).
 * @see {@link CollectionBeforeChangeHook}
 */
export type GlobalBeforeChangeHook<TDoc extends object = Record<string, unknown>> = (args: {
  data: Partial<TDoc>;
  doc?: TDoc;
  req: HookRequestContext;
  user?: AuthenticatedUser;
  operation: "update";
  /**
   * Database adapter for cross-collection reads. Write operations (create,
   * update, delete) will throw — use `afterChange` for writes.
   */
  db: ReadonlyDatabaseAdapter;
}) => Partial<TDoc> | void | Promise<Partial<TDoc> | void>;

/**
 * Runs after the global document is updated. Side-effects only.
 *
 * **Isolation**: errors are caught, logged, and discarded — same behaviour as
 * {@link CollectionAfterChangeHook}. The update is already committed.
 *
 * @see {@link CollectionAfterChangeHook}
 */
export type GlobalAfterChangeHook<TDoc extends object = Record<string, unknown>> = (args: {
  doc: TDoc;
  previousDoc?: TDoc;
  req: HookRequestContext;
  user?: AuthenticatedUser;
  operation: "update";
  /**
   * Database adapter with full read/write access. The DB write for this
   * operation has already committed — safe for side-effect writes.
   */
  db: DatabaseAdapter;
}) => void | Promise<void>;

/**
 * @deprecated Use the specific hook types instead:
 * {@link CollectionBeforeChangeHook}, {@link CollectionAfterReadHook}, etc.
 *
 * This broad type remains for backwards compatibility with the internal hook runner.
 */
export type HookFunction<TDoc extends object = Record<string, unknown>> = (args: {
  data?: Partial<TDoc>;
  doc?: TDoc;
  user?: AuthenticatedUser;
  req?: HookRequestContext;
  operation?: "create" | "update" | "delete";
  db?: DatabaseAdapter;
  [key: string]: unknown;
}) => unknown | Promise<unknown>;

// ─── Access control ───────────────────────────────────────────────────────────

/**
 * A function that determines whether the current user can perform an operation.
 *
 * Return `true` to allow, `false` to deny.
 * Return a `where`-style object to allow access only to matching documents
 * (useful for multi-tenant setups where users can only see their own data).
 *
 * Can also be expressed as a Jexl expression **string** for simple role checks
 * that need to be serialised (e.g. stored in the database or sent to the Admin UI).
 *
 * @template TDoc  The shape of the collection's document.
 *
 * @example
 * // Simple role check
 * access: {
 *   delete: ({ user }) => user?.roles?.includes('admin') ?? false,
 * }
 *
 * @example
 * // Row-level: users can only read their own documents
 * access: {
 *   read: ({ user }) => ({ owner: { equals: user?.sub } }),
 * }
 *
 * @example
 * // Jexl string — evaluated server-side
 * access: {
 *   update: "user.roles contains 'editor'",
 * }
 */
export type AccessFunction<TDoc extends object = Record<string, unknown>> = (args: {
  user: AuthenticatedUser | undefined;
  doc?: TDoc;
  data?: Partial<TDoc>;
  req: HookRequestContext;
}) => boolean | Record<string, unknown> | Promise<boolean | Record<string, unknown>>;

// ─── Collection config ────────────────────────────────────────────────────────

/**
 * Defines a Dyrected collection — a named set of documents with a shared schema.
 *
 * Pass your document's TypeScript type as the generic parameter `TDoc` to get
 * fully typed hooks and access functions:
 *
 * ```ts
 * interface Post {
 *   id: string
 *   title: string
 *   slug: string
 *   status: 'draft' | 'published'
 *   publishedAt?: string
 * }
 *
 * export const Posts = defineCollection<Post>({
 *   slug: 'posts',
 *   hooks: {
 *     beforeChange: [({ data, operation }) => {
 *       // `data` is typed as Partial<Post>
 *       if (operation === 'create') return { ...data, status: 'draft' }
 *       return data
 *     }],
 *     afterChange: [({ doc, previousDoc }) => {
 *       // `doc` and `previousDoc` are typed as Post
 *       if (doc.status !== previousDoc?.status) notifySubscribers(doc)
 *     }],
 *   },
 *   fields: [...],
 * })
 * ```
 *
 * @template TDoc  The TypeScript shape of a document in this collection.
 *                 Defaults to `Record<string, unknown>` for untyped usage.
 */
export interface CollectionConfig<TDoc extends object = Record<string, unknown>> {
  /**
   * Unique identifier for this collection.
   * Used as the URL segment (`/api/collections/:slug`) and the database table/collection name.
   * Use kebab-case, e.g. `'blog-posts'`.
   */
  slug: string;

  /**
   * Restricts this collection to a specific site in a multi-tenant deployment.
   * When set, only requests bearing a matching `X-Site-Id` header can access it.
   */
  siteId?: string;

  /**
   * If `true`, this collection is shared across all sites in a multi-tenant
   * deployment and accessible regardless of the `X-Site-Id` header.
   */
  shared?: boolean;

  /** Human-readable names for documents in this collection, shown in the Admin UI. */
  labels?: {
    singular: string;
    plural: string;
  };

  /**
   * If `true`, this collection is an **auth collection** — it gains
   * `POST /api/collections/:slug/login` and `POST /api/collections/:slug/logout`
   * endpoints, and documents are expected to have a `password` field.
   */
  auth?: boolean;

  /**
   * If `true` (or a config object), this collection supports **file uploads**.
   * Documents gain file-related fields (`url`, `filename`, `mimeType`, etc.)
   * and the create endpoint accepts `multipart/form-data`.
   */
  upload?: boolean | UploadConfig;

  /** Field definitions that make up the document schema for this collection. */
  fields: Field[];

  /**
   * If `true`, Dyrected automatically adds `createdAt` and `updatedAt`
   * timestamp fields to every document. Defaults to `true`.
   */
  timestamps?: boolean;

  /**
   * Initial documents to seed into this collection the first time it is
   * fetched and found to be empty (e.g. for demo data or defaults).
   */
  initialData?: Partial<TDoc>[];

  /**
   * If `true`, every create, update, and delete operation on this collection
   * is logged to the `__audit` collection with before/after snapshots and the
   * acting user's identity.
   */
  audit?: boolean;

  /**
   * Optional state-machine workflow for this collection. Workflow-enabled
   * entries keep an editable working revision and an independent public
   * snapshot, so editing published content never changes the live response.
   */
  workflow?: WorkflowConfig<TDoc>;

  /**
   * Collection-level access control.
   *
   * Each key is an operation; the value is a function (or Jexl string) that
   * returns `true` to allow or `false` to deny. Returning a `where`-style
   * object grants access only to matching documents.
   *
   * @example
   * access: {
   *   read: () => true,               // public read
   *   create: ({ user }) => !!user,   // logged-in users only
   *   update: ({ user }) => user?.roles?.includes('editor') ?? false,
   *   delete: ({ user }) => user?.roles?.includes('admin') ?? false,
   * }
   */
  access?: {
    read?: AccessFunction<TDoc> | string;
    create?: AccessFunction<TDoc> | string;
    update?: AccessFunction<TDoc> | string;
    delete?: AccessFunction<TDoc> | string;
  };

  /**
   * Collection-level lifecycle hooks.
   *
   * Hooks run in the order they appear in the array. The return value of each
   * hook is passed as the input to the next. Throwing inside any hook aborts
   * the operation and returns a `500` error.
   *
   * See the [Hooks reference](/docs/concepts/hooks) for the full lifecycle diagram.
   */
  hooks?: {
    /**
     * Runs before the database is queried. Return a modified `where` object
     * to override the query filter.
     */
    beforeRead?: CollectionBeforeReadHook[];

    /**
     * Runs after documents are fetched. Return a modified doc to change what
     * the client receives. Runs on every document in a list response.
     */
    afterRead?: CollectionAfterReadHook<TDoc>[];

    /**
     * Runs before create or update. Return modified data to change what is
     * written to the database. Throw to abort the write entirely.
     */
    beforeChange?: CollectionBeforeChangeHook<TDoc>[];

    /**
     * Runs after create or update is committed. For side-effects only —
     * webhooks, cache busting, notifications. Return value is ignored.
     *
     * Errors are **isolated**: caught, logged, and discarded so a failing
     * side-effect never turns a successful write into an HTTP 500.
     * See {@link CollectionAfterChangeHook} for the await-vs-fire-and-forget guidance.
     */
    afterChange?: CollectionAfterChangeHook<TDoc>[];

    /**
     * Runs before a document is deleted. Throw to cancel the deletion.
     */
    beforeDelete?: CollectionBeforeDeleteHook<TDoc>[];

    /**
     * Runs after a document has been deleted. For cleanup side-effects only.
     *
     * Errors are **isolated**: caught, logged, and discarded — the deletion is
     * already committed and will not be undone.
     */
    afterDelete?: CollectionAfterDeleteHook<TDoc>[];
  };

  /** Admin UI configuration for this collection. */
  admin?: {
    /**
     * Lucide icon displayed beside this collection in the Admin sidebar.
     * Uses Lucide component names, e.g. `'Newspaper'` or `'ShoppingBag'`.
     */
    icon?: AdminIconName;

    /** Custom component slots for this collection's list view. */
    components?: CollectionListComponentSlots;

    /**
     * The field name used as the document's display title in the Admin list
     * view and breadcrumbs. Defaults to `'title'` if the field exists.
     */
    useAsTitle?: string;

    /**
     * Field names to show as columns in the Admin list view.
     * Defaults to a sensible set of the first few non-structural fields.
     */
    defaultColumns?: string[];

    /**
     * Groups this collection under a named section in the Admin sidebar.
     * Collections with the same `group` are visually grouped together.
     */
    group?: string;

    /** If `true`, this collection is not shown in the Admin UI sidebar. */
    hidden?: boolean;

    /** If `false`, disables the filter UI entirely for this collection. Defaults to `true`. */
    filterable?: boolean;

    /**
     * URL to open in the Live Preview pane when editing a document.
     * Pass a function to derive the URL from the document's fields.
     *
     * @example
     * previewUrl: (doc) => `https://mysite.com/blog/${doc.slug}`
     */
    previewUrl?: string | ((doc: TDoc, opts: { locale?: string }) => string | null);

    /**
     * How the Live Preview pane communicates with the frontend.
     * - `'postMessage'` (default) — sends a `postMessage` with the current doc data.
     * - `'token'` — passes a short-lived preview token as a query parameter.
     */
    previewMode?: "postMessage" | "token";

    /**
     * Frontend URL pattern for this collection, used by `url` fields to
     * resolve internal links. Use `{fieldName}` placeholders.
     *
     * @example
     * urlPattern: '/blog/{slug}'   // → /blog/my-post
     * urlPattern: '/{slug}'        // → /about
     */
    urlPattern?: string;
  };
}

// ─── Global config ────────────────────────────────────────────────────────────

/**
 * Defines a Dyrected global — a singleton document without pagination or IDs.
 *
 * Globals are ideal for site-wide settings, feature flags, or any data where
 * there is always exactly one record (e.g. `site-settings`, `navigation`, `theme`).
 *
 * Pass your document's TypeScript type as the generic parameter `TDoc` to get
 * fully typed hooks:
 *
 * ```ts
 * interface SiteSettings {
 *   siteName: string
 *   tagline: string
 *   maintenanceMode: boolean
 * }
 *
 * export const Settings = defineGlobal<SiteSettings>({
 *   slug: 'site-settings',
 *   hooks: {
 *     afterChange: [({ doc }) => {
 *       // `doc` is typed as SiteSettings
 *       if (doc.maintenanceMode) alertOnCall()
 *     }],
 *   },
 *   fields: [...],
 * })
 * ```
 *
 * @template TDoc  The TypeScript shape of this global's document.
 */
export interface GlobalConfig<TDoc extends object = Record<string, unknown>> {
  /**
   * Unique identifier for this global.
   * Used as the URL segment (`/api/globals/:slug`) and the storage key.
   */
  slug: string;

  /** Restricts this global to a specific site in a multi-tenant deployment. */
  siteId?: string;

  /**
   * If `true`, this global is shared across all sites in a multi-tenant
   * deployment.
   */
  shared?: boolean;

  /** Human-readable label shown in the Admin UI sidebar. */
  label?: string;

  /** Field definitions for this global's document schema. */
  fields: Field[];

  /** Access control for reading and updating this global. */
  access?: {
    read?: AccessFunction<TDoc>;
    update?: AccessFunction<TDoc>;
  };

  /**
   * Global-level lifecycle hooks.
   * Globals support `beforeRead`, `afterRead`, `beforeChange`, and `afterChange`.
   * There are no delete hooks since globals cannot be deleted.
   */
  hooks?: {
    beforeRead?: GlobalBeforeReadHook[];
    afterRead?: GlobalAfterReadHook<TDoc>[];
    beforeChange?: GlobalBeforeChangeHook<TDoc>[];
    afterChange?: GlobalAfterChangeHook<TDoc>[];
  };

  /** Admin UI configuration for this global. */
  admin?: {
    /**
     * Lucide icon displayed beside this global in the Admin sidebar.
     * Uses Lucide component names, e.g. `'Settings2'` or `'Palette'`.
     */
    icon?: AdminIconName;
    /** Groups this global under a named section in the Admin sidebar. */
    group?: string;
    /** If `true`, this global is not shown in the Admin UI sidebar. */
    hidden?: boolean;
  };

  /**
   * Initial data to seed this global with the first time it is fetched and
   * found to be empty.
   */
  initialData?: Partial<TDoc>;
}

// ─── Database adapter ─────────────────────────────────────────────────────────

/**
 * The interface every database adapter must implement.
 *
 * Dyrected ships adapters for PostgreSQL, MySQL, SQLite, and MongoDB.
 * Implement this interface to connect any other database.
 */
export interface DatabaseAdapter {
  /** Find a paginated list of documents in a collection. */
  find(args: {
    collection: string;
    where?: Record<string, unknown>;
    limit?: number;
    page?: number;
    sort?: string;
  }): Promise<PaginatedResult>;

  /** Find a single document by its ID. Returns `null` if not found. */
  findOne(args: { collection: string; id: string }): Promise<BaseDocument | null>;

  /** Insert a new document and return it with its generated `id`. */
  create(args: { collection: string; data: Record<string, unknown> }): Promise<BaseDocument>;

  /** Update a document by ID and return the updated document. */
  update(args: { collection: string; id: string; data: Record<string, unknown> }): Promise<BaseDocument>;

  /** Delete a document by ID. Return value is intentionally untyped — callers do not use it. */
  delete(args: { collection: string; id: string }): Promise<unknown>;

  /** Fetch the singleton document for a global. Returns an empty object if not yet initialised. */
  getGlobal(args: { slug: string }): Promise<Record<string, unknown>>;

  /** Create or replace the singleton document for a global. */
  updateGlobal(args: { slug: string; data: Record<string, unknown> }): Promise<Record<string, unknown>>;

  /**
   * Sync the database schema with the current collection and global configs.
   * Called on startup to create tables/collections that don't exist yet.
   * Not all adapters implement this (e.g. MongoDB is schema-less).
   */
  sync?(collections: CollectionConfig[], globals: GlobalConfig[]): Promise<void>;

  /**
   * Execute a raw SQL query or database command.
   * Optional — not all adapters support raw access.
   */
  execute?(query: string, params?: unknown[]): Promise<unknown>;

  /**
   * Run all adapter operations in `callback` as one atomic transaction.
   * Shipped adapters implement this; workflow transitions require it.
   */
  transaction?<T>(callback: (db: DatabaseAdapter) => Promise<T>): Promise<T>;
}

/**
 * Read-only view of the database adapter. Exposes only `find`, `findOne`,
 * and `getGlobal` — no write operations.
 *
 * Passed to `beforeChange`, `beforeDelete`, `beforeRead`, `afterRead`,
 * and field-level hooks. Write operations are available in `afterChange`
 * and `afterDelete` hooks where the full {@link DatabaseAdapter} is provided.
 */
export type ReadonlyDatabaseAdapter = Pick<DatabaseAdapter, "find" | "findOne" | "getGlobal">;

/**
 * The interface every storage adapter must implement.
 *
 * Dyrected ships adapters for local disk, S3, Cloudflare R2, Cloudinary, and
 * Backblaze B2. Implement this interface to use any other storage provider.
 */
export interface StorageAdapter {
  /**
   * Upload a file and return its metadata (URL, dimensions, etc.).
   * The `prefix` is a path prefix used for multi-tenant setups.
   */
  upload(args: { filename: string; buffer: Uint8Array; mimeType: string; prefix?: string }): Promise<FileData>;

  /** Delete a file by its stored filename. */
  delete(args: { filename: string }): Promise<void>;

  /** Return the public URL for a stored file. */
  getURL(args: { filename: string }): string;

  /**
   * Retrieve the file's raw bytes and MIME type for serving via the API.
   * Only needed by adapters that serve files through the Dyrected API
   * (e.g. `LocalStorage`). Cloud adapters return `null` here and rely on
   * direct CDN URLs instead.
   */
  resolve?(args: { filename: string }): Promise<{ buffer: Uint8Array; mimeType: string } | null>;
}

// ─── Image service ────────────────────────────────────────────────────────────

/**
 * Processes uploaded images — generates metadata (dimensions, BlurHash) and
 * produces resized variants defined in `UploadConfig.imageSizes`.
 *
 * @example
 * import { SharpImageService } from '@dyrected/image-sharp'
 * defineConfig({ image: new SharpImageService(), ... })
 */
export interface ImageService {
  process(args: {
    buffer: Uint8Array;
    mimeType: string;
    config?: boolean | UploadConfig;
    focalPoint?: { x: number; y: number };
  }): Promise<{
    metadata: {
      width?: number;
      height?: number;
      /** Base64-encoded BlurHash for progressive loading. */
      blurhash?: string;
    };
    /** Generated image sizes keyed by their `name`. */
    sizes?: Record<string, { buffer: Uint8Array; width: number; height: number; filename: string }>;
  }>;
}

// ─── Root config ──────────────────────────────────────────────────────────────

/**
 * The root configuration object passed to `createDyrectedApp`.
 *
 * This is the single source of truth for your entire Dyrected instance —
 * collections, globals, database adapter, storage, email, and more.
 *
 * @example
 * import { defineConfig } from '@dyrected/core'
 * import { SQLiteAdapter } from '@dyrected/db-sqlite'
 *
 * export default defineConfig({
 *   db: new SQLiteAdapter({ filename: './db.sqlite' }),
 *   collections: [Posts, Users],
 *   globals: [SiteSettings],
 * })
 */
export interface DyrectedConfig {
  /** Collection definitions. Each collection maps to a database table/collection. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  collections: CollectionConfig<any>[];

  /** Global (singleton) definitions. Each global maps to a single document. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  globals: GlobalConfig<any>[];

  /**
   * The database adapter. Required for all data operations.
   * @see {@link DatabaseAdapter}
   */
  db?: DatabaseAdapter;

  /**
   * The storage adapter for file uploads.
   * Required when any collection has `upload: true`.
   * @see {@link StorageAdapter}
   */
  storage?: StorageAdapter;

  /**
   * The image processing service. Required when any upload collection
   * defines `imageSizes`.
   * @see {@link ImageService}
   */
  image?: ImageService;

  /** Admin UI branding and metadata. */
  admin?: AdminConfig;

  /**
   * Deployment-level authentication strategy for the CMS dashboard (`/admin`).
   * This is separate from collection-level `auth: true`, which continues to
   * power application/customer auth independently.
   */
  adminAuth?: AdminAuthConfig;

  /**
   * Email transport configuration. Required for welcome emails, password
   * resets, and invite links.
   *
   * @example
   * email: {
   *   from: 'no-reply@myapp.com',
   *   send: async ({ to, subject, html }) => {
   *     await resend.emails.send({ from, to, subject, html })
   *   },
   * }
   */
  email?: {
    /** The `From` address for all outbound emails. */
    from: string;
    /** The send function. Wire in any email provider (Resend, SendGrid, SES, etc.). */
    send: (args: { to: string; subject: string; html: string }) => Promise<void>;
    /** Override the default email templates. */
    templates?: {
      welcome?: (args: { email: string }) => { subject?: string; html: string };
      invite?: (args: { token: string; invitedByEmail?: string }) => {
        subject?: string;
        html: string;
      };
      resetPassword?: (args: { token: string; url?: string }) => {
        subject?: string;
        html: string;
      };
      passwordChanged?: (args: { email: string }) => {
        subject?: string;
        html: string;
      };
    };
  };

  /**
   * Redis connection URL. Required for distributed caching of dynamic option
   * resolvers and other server-side caches in multi-instance deployments.
   *
   * @example
   * redis: { url: process.env.REDIS_URL }
   */
  redis?: {
    url: string;
  };

  /** Durable lifecycle-event delivery configuration. */
  events?: {
    handlers: LifecycleEventHandler[];
    /** Maximum delivery attempts before an event remains failed. Defaults to 8. */
    maxAttempts?: number;
    /** Initial exponential-backoff delay in milliseconds. Defaults to 1000. */
    retryDelayMs?: number;
  };

  /**
   * Cross-Origin Resource Sharing (CORS) configuration.
   * List all origins that are allowed to call the Dyrected API.
   *
   * @example
   * cors: { origins: ['https://myapp.com', 'https://www.myapp.com'] }
   */
  cors?: {
    origins: string[];
  };

  /**
   * Callback to dynamically fetch additional collections and globals for a
   * given site ID at request time. Used in multi-tenant deployments where each
   * site has its own schema stored in the database.
   *
   * @param siteId  The `X-Site-Id` header value from the incoming request.
   * @returns       Extra collections and globals to merge into the config for this request.
   *
   * @example
   * onSchemaFetch: async (siteId) => {
   *   const site = await db.findOne({ collection: 'sites', id: siteId })
   *   return buildSchemaFromSiteConfig(site)
   * }
   */
  onSchemaFetch?: (
    siteId: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ) => Promise<{
    collections?: CollectionConfig<any>[];
    globals?: GlobalConfig<any>[];
    admin?: AdminConfig;
    adminAuth?: AdminAuthConfig;
  }>;
}
