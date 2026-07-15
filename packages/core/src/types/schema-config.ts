import type { AdminIconName, CollectionListComponentSlots } from "./admin.js";
import type { AccessRule } from "./access.js";
import type {
  CollectionAfterChangeHook,
  CollectionAfterDeleteHook,
  CollectionAfterReadHook,
  CollectionBeforeChangeHook,
  CollectionBeforeDeleteHook,
  CollectionBeforeReadHook,
  GlobalAfterChangeHook,
  GlobalAfterReadHook,
  GlobalBeforeChangeHook,
  GlobalBeforeReadHook,
} from "./hooks.js";
import type { Field, UploadConfig } from "./schema-core.js";
import type { WorkflowConfig } from "./workflows.js";

/**
 * Configures account lockout behavior for an auth-enabled collection.
 *
 * This protects collection login endpoints from repeated password guessing by
 * temporarily locking an account after too many failed attempts.
 */
export interface AuthConfig {
  /**
   * How many failed login attempts are allowed before the account is locked.
   *
   * Defaults to `5`. Set to `0` to disable Dyrected's built-in account lockout
   * for this collection.
   */
  maxLoginAttempts?: number;

  /**
   * How long, in milliseconds, an account stays locked after reaching the
   * failed-attempt limit.
   *
   * Defaults to `10 * 60 * 1000` (10 minutes).
   */
  lockTime?: number;
}

/**
 * Use this contract when you want the exact shape of a collection config.
 *
 * Most collection work comes down to a small set of top-level options: giving
 * the collection a stable slug, defining its fields, deciding how it should
 * appear in the Admin UI, and choosing whether it also handles access, hooks,
 * auth, uploads, workflows, or other optional behavior.
 *
 * Pass your document's TypeScript type as the generic parameter `TDoc` to get
 * fully typed hooks and access functions.
 *
 * @example
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
 * @see {@link https://dyrected.com/docs/basics/configuration/collections Collections documentation}
 * @template TDoc The TypeScript shape of a document in this collection.
 * Defaults to `Record<string, unknown>` for untyped usage.
 */
export interface CollectionConfig<
  TDoc extends object = Record<string, unknown>,
> {
  /**
   * Unique identifier for this collection.
   *
   * Dyrected uses the slug for API routes, SDK calls, Admin URLs, and as the
   * underlying database table or collection name. Treat it as part of the
   * long-term data contract rather than a cosmetic label.
   *
   * Use kebab-case, for example `'blog-posts'`, `'team-members'`, or
   * `'contact-submissions'`.
   */
  slug: string;

  /**
   * Restricts this collection to one specific site in a multi-tenant setup.
   *
   * Use this when the collection should belong to a single site rather than
   * the whole installation. When set, only requests bearing a matching
   * `X-Site-Id` header can access it.
   */
  siteId?: string;

  /**
   * If `true`, this collection is shared across all sites in a multi-tenant
   * setup and accessible regardless of the `X-Site-Id` header.
   *
   * Use this for content that should stay common across sites, such as shared
   * taxonomies, reusable assets, or centrally managed reference data.
   */
  shared?: boolean;

  /**
   * Human-readable names for documents in this collection, shown in the Admin UI.
   *
   * Use this when the slug is technical or when you want the dashboard to read
   * more naturally. For example, `slug: 'people'` might use
   * `labels: { singular: 'Person', plural: 'People' }`.
   *
   * @see {@link https://dyrected.com/docs/basics/configuration/collections#labels Collections labels}
   */
  labels?: {
    singular: string;
    plural: string;
  };

  /**
   * If `true` or an auth config object, this collection is an auth collection. It gains
   * `POST /api/collections/:slug/login` and `POST /api/collections/:slug/logout`
   * endpoints, and documents are expected to have a `password` field.
   *
   * Turn this on when each document should behave like an account that can log
   * in, hold credentials, and participate in user flows. Typical examples are
   * `users`, `admins`, `members`, or `customers`.
   *
   * Pass an object when you want to tune built-in account lockout behavior for
   * repeated failed logins.
   *
   * @see {@link https://dyrected.com/docs/features/authentication/overview Authentication overview}
   */
  auth?: boolean | AuthConfig;

  /**
   * If `true` or a config object, this collection supports file uploads.
   * Documents gain file-related fields (`url`, `filename`, `mimeType`, etc.)
   * and the create endpoint accepts `multipart/form-data`.
   *
   * Turn this on when each document in the collection should represent a
   * stored file, such as an image, PDF, video, or downloadable asset.
   *
   * @see {@link https://dyrected.com/docs/features/upload/overview Upload overview}
   */
  upload?: boolean | UploadConfig;

  /**
   * Field definitions that make up the document schema for this collection.
   *
   * This is the main schema contract for every document in the collection. It
   * decides what editors can fill in, how data is validated, how records are
   * stored, and what the API and SDK return.
   *
   * In practice, fields are where you model the actual content structure of the
   * collection: simple values such as text and dates, relationships to other
   * collections, nested objects and arrays, and flexible `blocks` fields for
   * reusable page sections or long-form layouts.
   *
   * @see {@link https://dyrected.com/docs/basics/fields/overview Fields overview}
   * @see {@link https://dyrected.com/docs/basics/fields/blocks Blocks and page sections}
   */
  fields: Field[];

  /**
   * If `true`, Dyrected automatically adds the built-in system fields
   * `createdAt`, `updatedAt`, `createdBy`, and `updatedBy` to every document.
   * Defaults to `true`.
   */
  timestamps?: boolean;

  /**
   * Initial documents to seed into this collection the first time it is
   * fetched and found to be empty.
   *
   * Use this for starter records, demo content, or sensible defaults that
   * should appear automatically before editors create anything themselves.
   */
  initialData?: Partial<TDoc>[];

  /**
   * If `true`, every create, update, and delete operation on this collection
   * is logged to the `__audit` collection with before/after snapshots and the
   * acting user's identity.
   *
   * Turn this on when you need accountability around changes, such as knowing
   * who changed what, inspecting before-and-after state, or supporting
   * compliance and operational review.
   */
  audit?: boolean;

  /**
   * Optional state-machine workflow for this collection. Workflow-enabled
   * entries keep an editable working revision and an independent public
   * snapshot, so editing published content never changes the live response.
   *
   * Use this when content moves through stages such as draft, review, and
   * published, or when teams need an approval process before changes go live.
   */
  workflow?: WorkflowConfig<TDoc>;

  /**
   * If `true`, enables zero-config draft and publish functionality.
   * Documents start as drafts, editors can save working drafts without affecting
   * live content, and any authorized editor can publish or unpublish entries.
   */
  drafts?: boolean;

  /**
   * Collection-level access control.
   *
   * Each key is an operation; the value can be a function, a Jexl string, a
   * boolean, or a named policy reference. Returning `true` allows access and
   * `false` denies it. Returning a `where`-style object grants access only to
   * matching documents.
   *
   * @example
   * access: {
   *   read: () => true,
   *   create: ({ user }) => !!user,
   *   update: ({ user }) => user?.roles?.includes('editor') ?? false,
   *   delete: ({ user }) => user?.roles?.includes('admin') ?? false,
   * }
   *
   * @see {@link https://dyrected.com/docs/basics/access-control/overview Access control overview}
   */
  access?: {
    read?: AccessRule<TDoc>;
    create?: AccessRule<TDoc>;
    update?: AccessRule<TDoc>;
    delete?: AccessRule<TDoc>;
    /**
     * Controls who can read this collection's audit log (`GET /:slug/__audit`),
     * for collections with `audit` enabled. Falls back to the `read` rule when
     * omitted, so the audit trail is visible to whoever can read the documents.
     * Set it explicitly to gate the audit log separately — for example, admins
     * only, even on a collection anyone can read.
     */
    readAudit?: AccessRule<TDoc>;
  };

  /**
   * Collection-level lifecycle hooks.
   *
   * Hooks run in the order they appear in the array. The return value of each
   * hook is passed as the input to the next. Throwing inside any hook aborts
   * the operation and returns a `500` error.
   *
   * See the Hooks reference for the full lifecycle diagram.
   *
   * @see {@link https://dyrected.com/docs/basics/hooks/overview Hooks overview}
   * @see {@link https://dyrected.com/docs/basics/hooks/collections Collection hooks}
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
     * Runs after create or update is committed. For side-effects only:
     * webhooks, cache busting, and notifications. Return value is ignored.
     *
     * Errors are isolated: caught, logged, and discarded so a failing
     * side-effect never turns a successful write into an HTTP 500.
     * See `CollectionAfterChangeHook` for await-vs-fire-and-forget guidance.
     */
    afterChange?: CollectionAfterChangeHook<TDoc>[];

    /** Runs before a document is deleted. Throw to cancel the deletion. */
    beforeDelete?: CollectionBeforeDeleteHook<TDoc>[];

    /**
     * Runs after a document has been deleted. For cleanup side-effects only.
     *
     * Errors are isolated: caught, logged, and discarded. The deletion is
     * already committed and will not be undone.
     */
    afterDelete?: CollectionAfterDeleteHook<TDoc>[];
  };

  /**
   * Admin UI configuration for this collection.
   *
   * @see {@link https://dyrected.com/docs/basics/configuration/collections#admin-options Admin options}
   */
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
     *
     * Pass a Jexl string to keep the config serializable, for example
     * `'slug == "home" ? "/" : "/blog/" + slug'`. This is usually the best
     * default, especially when the schema needs to stay portable across
     * environments such as Dyrected Cloud.
     *
     * Pass a function when you need custom runtime logic in a self-hosted
     * project.
     *
     * @example
     * previewUrl: 'slug == "home" ? "/" : "/blog/" + slug'
     *
     * @example
     * previewUrl: (doc) => `https://mysite.com/blog/${doc.slug}`
     */
    previewUrl?:
      string | ((doc: TDoc, opts: { locale?: string }) => string | null);

    /**
     * How the Live Preview pane communicates with the frontend.
     * - `postMessage` sends a `postMessage` with the current doc data.
     * - `token` passes a short-lived preview token as a query parameter.
     */
    previewMode?: "postMessage" | "token";

    /**
     * Frontend URL pattern for this collection, used by `url` fields to
     * resolve internal links. Use `{fieldName}` placeholders.
     *
     * This is a plain route pattern string, not a Jexl expression.
     *
     * @example
     * urlPattern: '/blog/{slug}' // /blog/my-post
     * urlPattern: '/{slug}' // /about
     */
    urlPattern?: string;
  };
}

/**
 * Defines a Dyrected global — a singleton document without pagination or IDs.
 *
 * Globals are ideal for site-wide settings, feature flags, or any data where
 * there is always exactly one record, such as `site-settings`, `navigation`,
 * or `theme`.
 *
 * Pass your document's TypeScript type as the generic parameter `TDoc` to get
 * fully typed hooks.
 *
 * @example
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
 * @template TDoc The TypeScript shape of this global's document.
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
    read?: AccessRule<TDoc>;
    update?: AccessRule<TDoc>;
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
