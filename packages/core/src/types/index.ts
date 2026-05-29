// ─── Shared request context ───────────────────────────────────────────────────

/**
 * Minimum HTTP request context passed to every server-side hook and resolver.
 *
 * The full Web Standard `Request` is available as `raw` when you need it, but
 * most hooks only need `query` (URL search parameters).
 */
export interface HookRequestContext {
  /** Parsed URL query-string parameters, e.g. `{ page: '2', search: 'hello' }`. */
  query: Record<string, string>;
  /** Incoming HTTP headers, lowercased. */
  headers: Record<string, string>;
  /** The raw Web Standard `Request` object. Useful for streaming or advanced header inspection. */
  raw?: Request;
}

/**
 * Base shape of an authenticated user as decoded from the JWT.
 *
 * The actual shape will include every field on your auth collection — this
 * interface only guarantees the properties that Dyrected always stamps on the
 * token. Extend it in your own codebase for stronger typing:
 *
 * @example
 * declare module '@dyrected/core' {
 *   interface AuthenticatedUser {
 *     role: 'admin' | 'editor'
 *     organizationId: string
 *   }
 * }
 */
export interface AuthenticatedUser {
  /** The user's document ID in the database. */
  sub: string;
  /** The user's email address. */
  email?: string;
  /** Slug of the collection this user was authenticated against. */
  collection: string;
  /** Array of role strings, if your auth collection has a `roles` field. */
  roles?: string[];
  /** Any additional fields from the auth collection document. */
  [key: string]: unknown;
}

// ─── Field type literals ─────────────────────────────────────────────────────

/**
 * Every field type supported by Dyrected.
 *
 * - Text group:    `text`, `textarea`, `richText`, `email`, `url`, `icon`
 * - Number/Bool:   `number`, `boolean`
 * - Date:          `date`
 * - Selection:     `select`, `multiSelect`, `radio`
 * - Relationship:  `relationship`, `join`
 * - Structural:    `array`, `object`, `blocks`, `json`
 * - Layout:        `row`
 * - Media:         `image`
 */
export type FieldType =
  | "text"
  | "textarea"
  | "richText"
  | "number"
  | "boolean"
  | "date"
  | "datetime"
  | "select"
  | "multiSelect"
  | "radio"
  | "relationship"
  | "array"
  | "object"
  | "json"
  | "blocks"
  | "image"
  | "email"
  | "url"
  | "icon"
  | "join"
  | "row";

// ─── Dynamic options ──────────────────────────────────────────────────────────

/**
 * Arguments passed to a server-side dynamic options resolver.
 *
 * All properties are optional so simple resolvers that fetch from an external
 * API without needing any context (`async () => fetch(...)`) still compile
 * without errors.
 */
export interface DynamicOptionsResolverArgs {
  /**
   * The configured database adapter. Use it to query any collection.
   *
   * @example
   * options: async ({ db }) => {
   *   const result = await db.find({ collection: 'categories' })
   *   return result.docs.map(c => ({ label: c.name, value: c.id }))
   * }
   */
  db?: DatabaseAdapter;
  /**
   * The authenticated user making the request, or `undefined` for
   * unauthenticated requests. Use it to filter options per user.
   *
   * @example
   * options: async ({ user, db }) => {
   *   if (!user) return []
   *   const teams = await db.find({ collection: 'teams', where: { owner: { equals: user.sub } } })
   *   return teams.docs.map(t => ({ label: t.name, value: t.id }))
   * }
   */
  user?: AuthenticatedUser;
  /**
   * HTTP request context. Sibling field values selected in the Admin UI are
   * forwarded as query parameters and accessible via `req.query`.
   *
   * @example
   * // Cascading dropdown: the Admin UI appends ?country=ca
   * options: async ({ req }) => {
   *   const country = req.query.country ?? 'us'
   *   const regions = await fetch(`/api/regions?country=${country}`)
   *   return regions.json()
   * }
   */
  req: HookRequestContext;
}

/** A function that returns option items for a `select`, `multiSelect`, or `radio` field. */
export type DynamicOptionsResolver = (
  args: DynamicOptionsResolverArgs,
) => Promise<DynamicOptionItem[]> | DynamicOptionItem[];

/**
 * Config-object form for a dynamic options resolver. Use this when you also
 * want server-side caching via `cacheTTL`.
 *
 * @example
 * options: {
 *   resolve: async () => fetchCountriesFromApi(),
 *   cacheTTL: 300, // cache for 5 minutes
 * }
 */
export interface DynamicOptionsConfig {
  /** The resolver function. Receives the same args as a bare function resolver. */
  resolve: DynamicOptionsResolver;
  /**
   * Time-to-live in **seconds** for caching the resolver result on the server.
   *
   * Useful for resolvers that call rate-limited external APIs. When set, the
   * result is reused for all identical requests within the TTL window.
   *
   * Not applied when the resolver uses query parameters (`req.query`), since
   * parameterised results are request-specific.
   */
  cacheTTL?: number;
}

/** A single option item — either a plain string or a label/value pair. */
export type DynamicOptionItem = string | { label: string; value: unknown };

// ─── Block (for blocks fields) ───────────────────────────────────────────────

/**
 * A single block type for use inside a `blocks` field.
 *
 * Each block has its own field schema. At runtime, every block item in the
 * array carries a `blockType` property that matches the block's `slug`.
 *
 * @example
 * const HeroBlock: Block = {
 *   slug: 'hero',
 *   labels: { singular: 'Hero', plural: 'Heroes' },
 *   fields: [
 *     { name: 'heading', type: 'text', required: true },
 *     { name: 'image', type: 'relationship', relationTo: 'media' },
 *   ],
 * }
 */
export interface Block {
  /** Unique identifier for this block type. Stored as `blockType` on each item. */
  slug: string;
  /** Human-readable labels shown in the Admin UI block picker. */
  labels?: {
    singular: string;
    plural: string;
  };
  /** Fields that make up this block's data shape. */
  fields: Field[];
}

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
export type FieldBeforeChangeHook<
  TValue = unknown,
  TDoc extends object = Record<string, unknown>,
> = (args: {
  /** The current value of this field (after any previous hooks in the chain). */
  value: TValue;
  /** The full document as it existed before this update. `undefined` on create. */
  originalDoc?: TDoc;
  /** The full incoming data payload being written. */
  data: Partial<TDoc>;
  /** The authenticated user, or `undefined` for unauthenticated requests. */
  user?: AuthenticatedUser;
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
export type FieldAfterReadHook<
  TValue = unknown,
  TDoc extends object = Record<string, unknown>,
> = (args: {
  /** The raw field value as stored in the database. */
  value: TValue;
  /** The full document being returned (with defaults applied). */
  doc: TDoc;
  /** The authenticated user, or `undefined` for unauthenticated requests. */
  user?: AuthenticatedUser;
}) => TValue | undefined | Promise<TValue | undefined>;

/**
 * @deprecated Use {@link FieldBeforeChangeHook} or {@link FieldAfterReadHook} instead.
 * This alias remains for backwards compatibility.
 */
export type FieldHook<
  TDoc extends object = Record<string, unknown>,
  TValue = unknown,
> = FieldBeforeChangeHook<TValue, TDoc>;

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
export type CollectionAfterReadHook<
  TDoc extends object = Record<string, unknown>,
> = (args: {
  /** The document as fetched from the database (with defaults applied). */
  doc: TDoc;
  /** The HTTP request context. */
  req: HookRequestContext;
  /** The authenticated user, or `undefined` for unauthenticated requests. */
  user?: AuthenticatedUser;
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
export type CollectionBeforeChangeHook<
  TDoc extends object = Record<string, unknown>,
> = (args: {
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
export type CollectionAfterChangeHook<
  TDoc extends object = Record<string, unknown>,
> = (args: {
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
export type CollectionBeforeDeleteHook<
  TDoc extends object = Record<string, unknown>,
> = (args: {
  /** The ID of the document about to be deleted. */
  id: string;
  /** The full document about to be deleted. */
  doc: TDoc;
  /** The HTTP request context. */
  req: HookRequestContext;
  /** The authenticated user, or `undefined` for unauthenticated requests. */
  user?: AuthenticatedUser;
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
export type CollectionAfterDeleteHook<
  TDoc extends object = Record<string, unknown>,
> = (args: {
  /** The ID of the deleted document. */
  id: string;
  /** The document as it was just before deletion. */
  doc: TDoc;
  /** The HTTP request context. */
  req: HookRequestContext;
  /** The authenticated user, or `undefined` for unauthenticated requests. */
  user?: AuthenticatedUser;
}) => void | Promise<void>;

// ─── Global-level hook types (mirrors collection, minus delete) ───────────────

/** @see {@link CollectionBeforeReadHook} */
export type GlobalBeforeReadHook = CollectionBeforeReadHook;

/**
 * Runs after the global document is fetched, before the response is sent.
 * @see {@link CollectionAfterReadHook}
 */
export type GlobalAfterReadHook<
  TDoc extends object = Record<string, unknown>,
> = (args: {
  doc: TDoc;
  req: HookRequestContext;
  user?: AuthenticatedUser;
}) => TDoc | Promise<TDoc>;

/**
 * Runs before the global document is updated.
 * Operation is always `'update'` (globals cannot be created or deleted).
 * @see {@link CollectionBeforeChangeHook}
 */
export type GlobalBeforeChangeHook<
  TDoc extends object = Record<string, unknown>,
> = (args: {
  data: Partial<TDoc>;
  doc?: TDoc;
  req: HookRequestContext;
  user?: AuthenticatedUser;
  operation: "update";
}) => Partial<TDoc> | void | Promise<Partial<TDoc> | void>;

/**
 * Runs after the global document is updated. Side-effects only.
 *
 * **Isolation**: errors are caught, logged, and discarded — same behaviour as
 * {@link CollectionAfterChangeHook}. The update is already committed.
 *
 * @see {@link CollectionAfterChangeHook}
 */
export type GlobalAfterChangeHook<
  TDoc extends object = Record<string, unknown>,
> = (args: {
  doc: TDoc;
  previousDoc?: TDoc;
  req: HookRequestContext;
  user?: AuthenticatedUser;
  operation: "update";
}) => void | Promise<void>;

/**
 * @deprecated Use the specific hook types instead:
 * {@link CollectionBeforeChangeHook}, {@link CollectionAfterReadHook}, etc.
 *
 * This broad type remains for backwards compatibility with the internal hook runner.
 */
export type HookFunction<
  TDoc extends object = Record<string, unknown>,
> = (args: {
  data?: Partial<TDoc>;
  doc?: TDoc;
  user?: AuthenticatedUser;
  req?: HookRequestContext;
  operation?: "create" | "update" | "delete";
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
export type AccessFunction<
  TDoc extends object = Record<string, unknown>,
> = (args: {
  user: AuthenticatedUser | undefined;
  doc?: TDoc;
  data?: Partial<TDoc>;
  req: HookRequestContext;
}) => boolean | Record<string, unknown> | Promise<boolean | Record<string, unknown>>;

// ─── Field definition ─────────────────────────────────────────────────────────

/**
 * Shared base properties present on every field type.
 * The exported `Field` union type extends this with a typed `hooks` block.
 */
interface FieldBase {
  /**
   * The database column / JSON key for this field.
   * Use camelCase. Omit for layout-only fields (`row`, `join`).
   */
  name?: string;

  /**
   * Human-readable label shown next to the field in the Admin UI.
   * Defaults to a title-cased version of `name` if omitted.
   */
  label?: string;

  /**
   * If `true`, the field must have a non-empty value.
   * Enforced on both client (Admin UI) and server (API).
   */
  required?: boolean;

  /**
   * If `true`, the database adapter enforces a unique constraint for this
   * field across the collection.
   */
  unique?: boolean;

  /**
   * The initial value written to new documents when no value is provided.
   * The type should match the field type.
   */
  defaultValue?: unknown;

  /**
   * Available choices for `select`, `multiSelect`, and `radio` fields.
   *
   * Three forms are accepted:
   *
   * **1. Static array** — fixed list known at build time:
   * ```ts
   * options: [{ label: 'Draft', value: 'draft' }, { label: 'Published', value: 'published' }]
   * ```
   *
   * **2. Server-side resolver** — runs on the server (never in the browser).
   * Use for DB queries, secret API keys, or user-filtered lists.
   * The Admin UI fetches results from `GET /api/dyrected/options/:slug/:field`.
   * ```ts
   * options: async ({ db, user }) => {
   *   const cats = await db.find({ collection: 'categories' })
   *   return cats.docs.map(c => ({ label: c.name, value: c.id }))
   * }
   * ```
   *
   * **3. With caching** (`{ resolve, cacheTTL }`) — same as above but the
   * result is cached on the server for `cacheTTL` seconds:
   * ```ts
   * options: { resolve: async () => fetchFromSlowApi(), cacheTTL: 300 }
   * ```
   *
   * For **instant client-side cascading dropdowns** driven by another field's
   * value, use `admin.hooks.options` instead (no network round-trip).
   */
  options?:
    | string[]
    | { label: string; value: unknown }[]
    | DynamicOptionsResolver
    | DynamicOptionsConfig;

  /** For `relationship` fields — the slug of the collection to link to. */
  relationTo?: string;

  /**
   * For `relationship` and `image` fields — if `true`, stores an array of
   * IDs instead of a single ID.
   */
  hasMany?: boolean;

  /** Sub-fields for `array` and `object` field types. */
  fields?: Field[];

  /** Block type definitions for `blocks` fields. */
  blocks?: Block[];

  /**
   * For `join` fields — the slug of the target collection to show linked
   * documents from. Paired with `on`.
   */
  collection?: string;

  /**
   * For `join` fields — the name of the `relationship` field on the target
   * collection that points back to this collection.
   */
  on?: string;

  /**
   * Field-level read/update access control.
   *
   * - `read`: if it returns `false`, the field is stripped from API responses.
   * - `update`: if it returns `false`, incoming values for this field are silently ignored.
   */
  access?: {
    read?: AccessFunction | string;
    update?: AccessFunction | string;
  };

  /**
   * Admin UI options for this field. None of these properties affect the API
   * or the database — they are purely presentational.
   */
  admin?: {
    /** Placeholder text shown when the input is empty. */
    placeholder?: string;

    /** Help text rendered below the field in the Admin UI. */
    description?: string;

    /**
     * If `true`, the field is hidden from the Admin form entirely.
     * Its value is preserved in the database and still returned by the API.
     */
    hidden?: boolean;

    /**
     * If `true`, the field is rendered as non-editable in the Admin UI.
     * The value is still included in form submissions.
     */
    readOnly?: boolean;

    /**
     * A function (or Jexl expression string) evaluated reactively as the
     * editor types. Return `true` to show the field, `false` to hide it.
     *
     * Receives the current form values as `data` and sibling-level values
     * as `siblingData`.
     *
     * @example
     * // Only show the discount field when a coupon code is entered
     * condition: (data) => !!data.couponCode
     */
    condition?: ((data: Record<string, unknown>, siblingData: Record<string, unknown>) => boolean) | string;

    /**
     * For `select` fields — render as radio buttons instead of a dropdown.
     * Recommended for 2–5 options.
     */
    layout?: "radio" | "select" | string;

    /**
     * For `select` fields with `layout: 'radio'` — orientation of the radio buttons.
     * @default 'vertical'
     */
    direction?: "horizontal" | "vertical";

    /**
     * Assigns this field to a named tab in the Admin form.
     * When any field in the collection has a `tab`, the form switches to a
     * tabbed layout. Fields without a `tab` are grouped under "General".
     */
    tab?: string;

    /**
     * CSS width of this field when it is a child of a `row` field.
     * Accepts any CSS length value, e.g. `'50%'`, `'200px'`, `'1fr'`.
     */
    width?: string;

    /**
     * Client-side Admin UI hooks for this field.
     *
     * These run **in the browser** every time any sibling field value changes.
     * They are completely separate from the server-side `hooks` property.
     *
     * `onChange` is typed per-field via the discriminated `Field` union —
     * see `FieldAdminHooks<TValue>` below.
     */
    hooks?: {
      /**
       * For `select`, `multiSelect`, and `radio` fields only.
       *
       * Computes the **available choices** for this field based on other
       * field values — instant, zero-latency cascading dropdowns.
       *
       * Runs in the browser every time any sibling field changes. When the
       * returned list changes, the field's current value is automatically
       * cleared if it is no longer a valid choice.
       *
       * Use the top-level `options` resolver (server-side) when:
       * - Your option list requires a DB query or a secret API key
       * - You want server-side caching (`cacheTTL`)
       *
       * @example
       * // Country → State/Province cascading dropdown
       * options: ({ siblingData }) => {
       *   if (siblingData.country === 'us') {
       *     return [{ label: 'California', value: 'CA' }, { label: 'New York', value: 'NY' }]
       *   }
       *   return []
       * }
       */
      options?: (args: {
        /** Current values of all fields at the same nesting level. */
        siblingData: Record<string, unknown>;
        /** Current values of the entire form. */
        data: Record<string, unknown>;
      }) =>
        | Array<string | { label: string; value: unknown }>
        | Promise<Array<string | { label: string; value: unknown }>>;
    };
  };

  /**
   * For database migrations: if set, data stored under this key in the database
   * will be migrated to the current field `name` on next schema sync.
   */
  renameTo?: string;

  /**
   * For SQL adapters: if `true`, this field is extracted to a real column
   * instead of being stored inside a JSON blob. Improves query performance
   * for frequently-filtered fields.
   */
  promoted?: boolean;
}

/**
 * Typed hooks block for a field whose stored value is `TValue`.
 *
 * The return type of the callbacks is kept as `unknown` here so that TypeScript
 * can narrow the contextual type from the discriminated `Field` union without
 * bidirectional inference conflicts. Use the explicit `FieldBeforeChangeHook<T>`
 * and `FieldAfterReadHook<T>` types when you need checked return types.
 */
type FieldHooks<TValue> = {
  /**
   * Field-level lifecycle hooks.
   *
   * - `beforeChange` — transform or validate the value before it is saved.
   *   `value` is typed to the field's own value type (e.g. `string` for
   *   `text`, `number` for `number`, `boolean` for `boolean`).
   * - `afterRead` — transform the value after it is read, before the API response.
   *
   * Both hook types run **recursively** inside `array`, `object`, and `blocks` fields.
   *
   * @example
   * hooks: {
   *   beforeChange: [({ value }) => value.trim()],          // value: string ✓
   *   afterRead:    [({ value, user }) => user?.role === 'admin' ? value : '****'],
   * }
   */
  hooks?: {
    beforeChange?: Array<(args: { value: TValue; originalDoc?: Record<string, unknown>; data: Record<string, unknown>; user?: AuthenticatedUser }) => unknown>;
    afterRead?: Array<(args: { value: TValue; doc: Record<string, unknown>; user?: AuthenticatedUser }) => unknown>;
  };
};

/**
 * Typed client-side admin hook block for a field whose value type is `TValue`.
 *
 * Intersected into each discriminated `Field` union member so that
 * `admin.hooks.onChange` receives a `value` typed to the field's own type.
 * The return type is `unknown` for the same reason as `FieldHooks` — to
 * prevent bidirectional inference from conflicting with union discrimination.
 */
type FieldAdminHooks<TValue> = {
  admin?: {
    hooks?: {
      /**
       * Derives or computes this field's **value** from other field values in
       * real time — without any network request.
       *
       * Return a new value to update this field. Return `undefined` to leave
       * it unchanged.
       *
       * Use `setValue` for imperative updates inside async callbacks.
       *
       * ⚠️ Never return an options array here — use `admin.hooks.options` for that.
       *
       * @example
       * // Auto-generate a URL slug from the title field
       * onChange: ({ value, siblingData }) => {
       *   const base = (siblingData.title ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '-');
       *   return base.includes(value) ? base : value;
       * }
       */
      onChange?: (args: {
        /** The current value of this field — typed to match the field's `type`. */
        value: TValue;
        /** Current values of all fields at the same nesting level. */
        siblingData: Record<string, unknown>;
        /** Current values of the entire form. */
        data: Record<string, unknown>;
        /** Imperative setter — use inside async callbacks when you can't return a value. */
        setValue: (value: unknown) => void;
      }) => unknown;
    };
  };
};

/**
 * Defines a single field on a collection or global.
 *
 * ## Typed `value` in hook callbacks
 *
 * Three hook callbacks automatically receive a `value` typed to the field's
 * own value type — no manual annotations needed:
 *
 * | Hook | When it runs |
 * |------|-------------|
 * | `hooks.beforeChange` | Server — before the value is written to the DB |
 * | `hooks.afterRead`    | Server — after the value is read, before the API response |
 * | `admin.hooks.onChange` | Browser — whenever a sibling field changes in the Admin UI |
 *
 * Type mapping by `type` property:
 * - `text / textarea / email / url / icon / date / select / radio` → `string`
 * - `number` → `number`
 * - `boolean` → `boolean`
 * - `multiSelect` → `string[]`
 * - `relationship / image` → `string | string[]`
 * - `richText / json` → `Record<string, unknown>`
 * - `object / array / blocks` → `unknown`
 *
 * ```ts
 * {
 *   name: 'slug', type: 'text',
 *   hooks: {
 *     beforeChange: [({ value }) => value.toLowerCase()],  // value: string ✓
 *     afterRead:    [({ value }) => value.trim()],         // value: string ✓
 *   },
 *   admin: {
 *     hooks: {
 *       onChange: ({ value, siblingData }) =>              // value: string ✓
 *         (siblingData.title as string ?? '').toLowerCase().replace(/\s+/g, '-'),
 *     },
 *   },
 * }
 * ```
 *
 * **Important**: write `type` as a plain string literal — do **not** use `as const`.
 * TypeScript's `const` generic inference already preserves literal types, and
 * adding `as const` to the discriminant property prevents the contextual type
 * from flowing into the hook callbacks.
 *
 * ```ts
 * // ✓ correct
 * { name: 'slug', type: 'text', hooks: { beforeChange: [({ value }) => value.toLowerCase()] } }
 *
 * // ✗ breaks value typing
 * { name: 'slug', type: 'text' as const, hooks: { beforeChange: [({ value }) => value.toLowerCase()] } }
 * ```
 */
export type Field = FieldBase & (
  | ({ type: 'text' | 'textarea' | 'email' | 'url' | 'icon' | 'date' | 'datetime' | 'select' | 'radio' } & FieldHooks<string> & FieldAdminHooks<string>)
  | ({ type: 'number' } & FieldHooks<number> & FieldAdminHooks<number>)
  | ({ type: 'boolean' } & FieldHooks<boolean> & FieldAdminHooks<boolean>)
  | ({ type: 'multiSelect' } & FieldHooks<string[]> & FieldAdminHooks<string[]>)
  | ({ type: 'relationship' | 'image' } & FieldHooks<string | string[]> & FieldAdminHooks<string | string[]>)
  | ({ type: 'richText' | 'json' } & FieldHooks<Record<string, unknown>> & FieldAdminHooks<Record<string, unknown>>)
  | ({ type: 'object' | 'array' | 'blocks' | 'join' | 'row' } & FieldHooks<unknown> & FieldAdminHooks<unknown>)
);

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
export interface CollectionConfig<
  TDoc extends object = Record<string, unknown>,
> {
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

// ─── Upload config ────────────────────────────────────────────────────────────

/**
 * Upload configuration for collections that store files.
 * Set `upload: true` on the collection to use all defaults, or pass this
 * object to customise allowed types, size limits, and image processing.
 */
export interface UploadConfig {
  /**
   * Allowed MIME types. Requests with other MIME types are rejected with `400`.
   * @example ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
   */
  allowedMimeTypes?: string[];

  /**
   * Maximum file size in **bytes**.
   * @example 10 * 1024 * 1024  // 10 MB
   */
  maxFileSize?: number;

  /**
   * Local filesystem path where files are stored.
   * Only used by the `LocalStorage` adapter.
   */
  staticDir?: string;

  /**
   * Public URL prefix prepended to filenames when generating download URLs.
   * Only used by the `LocalStorage` adapter.
   * @example '/uploads'
   */
  staticURL?: string;

  /**
   * The `imageSizes` entry name to use as the thumbnail in the Admin media grid.
   * @example 'thumbnail'
   */
  adminThumbnail?: string;

  /**
   * Additional image sizes to generate when an image is uploaded.
   * Requires an `ImageService` to be configured (e.g. `@dyrected/image-sharp`).
   *
   * @example
   * imageSizes: [
   *   { name: 'thumbnail', width: 300, height: 300, fit: 'cover' },
   *   { name: 'card', width: 800 },
   * ]
   */
  imageSizes?: {
    /** Identifier used to access this size, e.g. `doc.sizes.thumbnail`. */
    name: string;
    /** Target width in pixels. */
    width?: number;
    /** Target height in pixels. */
    height?: number;
    /** sharp crop strategy (`'entropy'`, `'attention'`, etc.). */
    crop?: string;
    /**
     * sharp fit strategy.
     * @see https://sharp.pixelplumbing.com/api-resize#parameters
     */
    fit?: string;
    /**
     * If `true`, images smaller than the target size are not upscaled.
     * @default true
     */
    withoutEnlargement?: boolean;
    /** Additional sharp format options forwarded to the output pipeline. */
    formatOptions?: Record<string, unknown>;
  }[];
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
export interface GlobalConfig<
  TDoc extends object = Record<string, unknown>,
> {
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

// ─── Base document ────────────────────────────────────────────────────────────

/**
 * The minimum shape of every document returned by the database layer.
 *
 * All documents have an `id` field assigned by the adapter. Additional fields
 * are stored as `unknown` until you narrow them with your own interface.
 *
 * Use this as the base when declaring your collection document types:
 * ```ts
 * interface Post extends BaseDocument {
 *   title: string
 *   slug: string
 * }
 * ```
 */
export interface BaseDocument {
  /** The document's unique identifier, assigned by the database adapter. */
  id: string;
  [key: string]: unknown;
}

// ─── Paginated result ─────────────────────────────────────────────────────────

/**
 * The envelope returned by collection list endpoints (`GET /api/collections/:slug`).
 *
 * @template T  The document type.
 */
export interface PaginatedResult<T = Record<string, unknown>> {
  /** The documents on the current page. */
  docs: T[];
  /** Total number of documents matching the query (across all pages). */
  total: number;
  /** Maximum number of documents per page as requested. */
  limit: number;
  /** The current page number (1-indexed). */
  page: number;
  /** Total number of pages given the current `limit`. */
  totalPages: number;
  /** Whether a next page exists. */
  hasNextPage: boolean;
  /** Whether a previous page exists. */
  hasPrevPage: boolean;
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
  update(args: {
    collection: string;
    id: string;
    data: Record<string, unknown>;
  }): Promise<BaseDocument>;

  /** Delete a document by ID. Return value is intentionally untyped — callers do not use it. */
  delete(args: { collection: string; id: string }): Promise<unknown>;

  /** Fetch the singleton document for a global. Returns `null` if not yet initialised. */
  getGlobal(args: { slug: string }): Promise<Record<string, unknown> | null>;

  /** Create or replace the singleton document for a global. */
  updateGlobal(args: {
    slug: string;
    data: Record<string, unknown>;
  }): Promise<Record<string, unknown>>;

  /**
   * Sync the database schema with the current collection and global configs.
   * Called on startup to create tables/collections that don't exist yet.
   * Not all adapters implement this (e.g. MongoDB is schema-less).
   */
  sync?(
    collections: CollectionConfig[],
    globals: GlobalConfig[],
  ): Promise<void>;

  /**
   * Execute a raw SQL query or database command.
   * Optional — not all adapters support raw access.
   */
  execute?(query: string, params?: unknown[]): Promise<unknown>;
}

// ─── File / storage ───────────────────────────────────────────────────────────

/**
 * Metadata returned after a file is uploaded and stored.
 * Stored on the document in upload collections.
 */
export interface FileData {
  filename: string;
  filesize?: number;
  mimeType: string;
  /** Public URL of the stored file. */
  url: string;
  width?: number;
  height?: number;
  focalPoint?: { x: number; y: number };
  /** Base64-encoded BlurHash string for progressive image loading. */
  blurhash?: string;
  /** `'upload'` for server-stored files; `'external'` for provider-managed files. */
  type?: "upload" | "external";
  provider?: string;
  provider_metadata?: unknown;
  [key: string]: unknown;
}

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
  upload(args: {
    filename: string;
    buffer: Uint8Array;
    mimeType: string;
    prefix?: string;
  }): Promise<FileData>;

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
  resolve?(args: {
    filename: string;
  }): Promise<{ buffer: Uint8Array; mimeType: string } | null>;
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
    config?: CollectionConfig["upload"];
    focalPoint?: { x: number; y: number };
  }): Promise<{
    metadata: {
      width?: number;
      height?: number;
      /** Base64-encoded BlurHash for progressive loading. */
      blurhash?: string;
    };
    /** Generated image sizes keyed by their `name`. */
    sizes?: Record<
      string,
      { buffer: Uint8Array; width: number; height: number; filename: string }
    >;
  }>;
}

// ─── Admin branding ───────────────────────────────────────────────────────────

/**
 * Branding and metadata options for the Dyrected Admin UI.
 *
 * @example
 * admin: {
 *   branding: {
 *     logo: '/logo.svg',
 *     primaryColor: '#6366f1',
 *   },
 *   meta: {
 *     titleSuffix: '- My App',
 *   },
 * }
 */
export interface AdminConfig {
  branding?: {
    /** Full logo image shown in the expanded sidebar. URL or imported image asset. */
    logo?: string;
    /** Compact logo mark used in the collapsed sidebar state. */
    logoMark?: string;
    /**
     * Primary accent colour as any CSS colour value.
     * @example '#6366f1'
     * @example 'hsl(240 50% 60%)'
     */
    primaryColor?: string;
    /** Browser tab favicon URL. */
    favicon?: string;
    /** Font family for body and UI text. Must be loaded separately. */
    fontSans?: string;
    /** Font family for headings. Must be loaded separately. */
    fontSerif?: string;
  };
  meta?: {
    /**
     * String appended to every Admin page's `<title>`.
     * @default '- Dyrected'
     */
    titleSuffix?: string;
  };
}

// ─── Field inference helpers ──────────────────────────────────────────────────

/**
 * Collapses intersection types into a flat object type for readable IDE tooltips.
 *
 * @example
 * type T = Prettify<{ a: string } & { b: number }>
 * // → { a: string; b: number }
 */
export type Prettify<T> = { [K in keyof T]: T[K] };

/** Maps a field's runtime type tag to its TypeScript value type. @internal */
type FieldValueType<F extends Field> =
  F['type'] extends 'text' | 'textarea' | 'email' | 'url' | 'icon' | 'date' | 'select' | 'radio'
    ? string
    : F['type'] extends 'number'
    ? number
    : F['type'] extends 'boolean'
    ? boolean
    : F['type'] extends 'multiSelect'
    ? string[]
    : F['type'] extends 'relationship'
    ? F extends { hasMany: true } ? string[] : string
    : F['type'] extends 'image'
    ? string
    : F['type'] extends 'richText' | 'json'
    ? Record<string, unknown>
    : F['type'] extends 'object'
    ? F extends { fields: infer SF extends readonly Field[] }
      ? Prettify<InferDocShape<SF>>
      : Record<string, unknown>
    : F['type'] extends 'array'
    ? F extends { fields: infer SF extends readonly Field[] }
      ? Array<Prettify<InferDocShape<SF>>>
      : unknown[]
    : F['type'] extends 'blocks'
    ? F extends { blocks: infer B extends readonly Block[] }
      ? Array<InferBlocksUnion<B>>
      : Array<{ blockType: string } & Record<string, unknown>>
    : unknown;

/** Build a discriminated-union type covering all possible block shapes. @internal */
type InferBlocksUnion<Blocks extends readonly Block[]> =
  Blocks extends readonly [infer B extends Block, ...infer Rest extends readonly Block[]]
    ? B['fields'] extends readonly Field[]
      ? ({ blockType: B['slug'] } & Prettify<InferDocShape<B['fields']>>) | InferBlocksUnion<Rest>
      : ({ blockType: B['slug'] } & Record<string, unknown>) | InferBlocksUnion<Rest>
    : never;

/** Converts one field definition to its corresponding document key/value pair. @internal */
type InferFieldEntry<F extends Field> =
  F extends { type: 'row'; fields: infer SF extends readonly Field[] }
    ? InferDocShape<SF>
    : F extends { type: 'join' }
    ? Record<never, never>
    : F extends { name: infer N extends string; required: true }
    ? { [K in N]: FieldValueType<F> }
    : F extends { name: infer N extends string }
    ? { [K in N]?: FieldValueType<F> }
    : Record<never, never>;

/**
 * Infer a document shape from a literal fields tuple.
 *
 * This is used automatically by {@link defineCollection} and {@link defineGlobal}
 * when no explicit `TDoc` type argument is provided — TypeScript derives the
 * document type straight from the `fields` array you write inline.
 *
 * For collections, the inferred type is wrapped with `{ id: string }` (the
 * database adapter always stamps an `id` on created documents). Globals don't
 * get an `id`.
 *
 * @example
 * const fields = [
 *   { name: 'title', type: 'text', required: true },
 *   { name: 'published', type: 'boolean' },
 * ] as const satisfies Field[];
 *
 * type Doc = InferDocShape<typeof fields>;
 * // → { title: string; published?: boolean }
 */
export type InferDocShape<Fields extends readonly Field[]> =
  Fields extends readonly []
    ? Record<never, never>
    : Fields extends readonly [infer Head extends Field, ...infer Tail extends readonly Field[]]
    ? InferFieldEntry<Head> & InferDocShape<Tail>
    : Record<string, unknown>;

// ─── Automatic system / collection-kind doc fields ───────────────────────────

/**
 * Audit fields automatically injected into every collection document at runtime.
 * They are always present in API responses but hidden in the Admin UI by default.
 */
export type SystemDocFields = {
  createdAt?: string;
  updatedAt?: string;
  /** ID of the user who created the document. */
  createdBy?: string;
  /** ID of the user who last updated the document. */
  updatedBy?: string;
};

/**
 * Fields automatically injected into collections with `auth: true`.
 * `password` is part of the schema but is stripped from API read responses.
 */
export type AuthDocFields = {
  email: string;
  password?: string;
  roles?: string;
};

/**
 * Fields automatically added to upload/media collection documents.
 * These mirror the `FileData` interface returned by storage adapters.
 */
export type UploadDocFields = {
  filename: string;
  filesize?: number;
  mimeType: string;
  /** Public URL of the stored file. */
  url: string;
  width?: number;
  height?: number;
  focalPoint?: { x: number; y: number };
  /** Base64 BlurHash for progressive image loading. */
  blurhash?: string;
  sizes?: Record<string, { filename?: string; url?: string; width?: number; height?: number }>;
};

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
      invite?: (args: { token: string; invitedByEmail?: string }) => { subject?: string; html: string };
      resetPassword?: (args: { token: string }) => { subject?: string; html: string };
      passwordChanged?: (args: { email: string }) => { subject?: string; html: string };
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
  ) => Promise<{ collections?: CollectionConfig<any>[]; globals?: GlobalConfig<any>[] }>;
}
