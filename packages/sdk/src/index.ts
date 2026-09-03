import { stringify, stringifyQuery } from "./utils/stringify.js";
export {
  when,
  formatJexlValue,
  MatchBuilder,
  FieldConditionBuilder,
  type WhenFunction,
  type AccessConditions,
} from "@dyrected/core";
import type {
  AdminConfig,
  PublicAdminAuthConfig,
  PaginatedResult,
  FileData as Media,
  ConfigDiagnostic,
  Field,
  Block,
  TextField,
  TextareaField,
  EmailField,
  UrlField,
  IconField,
  NumberField,
  CollectionConfig,
  GlobalConfig,
  FieldType,
  AdminIconName,
  WorkflowMetadata,
  LifecycleEvent,
  AggregateInput,
  InferAggregateResult,
} from "@dyrected/core";
import { QueryBuilder, type QueryArgs } from "./query-builder.js";

type UnknownRecord = Record<string, unknown>;
type SchemaResponse = {
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
};

export type {
  PaginatedResult,
  Media,
  Field,
  Block,
  TextField,
  TextareaField,
  EmailField,
  UrlField,
  IconField,
  NumberField,
  CollectionConfig,
  GlobalConfig,
  FieldType,
  AdminIconName,
  WorkflowMetadata,
  LifecycleEvent,
};

/** Shape of a media folder document in the DAM system. */
export interface MediaFolder {
  id: string;
  name: string;
  slug: string;
  collection: string;
  parentId: string | null;
  path: string;
  color?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

/** Shape of a document returned from a workflow-enabled collection. */
export interface WorkflowDocument {
  id: string;
  _workflow: WorkflowMetadata;
  [key: string]: unknown;
}

/** Options accepted by `client.transition()`. */
export interface TransitionOptions {
  /**
   * The revision number currently shown to the user. When provided, the server
   * rejects the transition if the document has changed since it was loaded,
   * preventing lost-update races.
   */
  expectedRevision?: number;
  /** Required for transitions that have `requireComment: true` (e.g. `reject`). */
  comment?: string;
}

/** A single workflow history entry returned by `client.workflowHistory()`. */
export interface WorkflowHistoryEntry {
  id: string;
  collection: string;
  documentId: string;
  transition: string;
  from: string;
  to: string;
  revision: number;
  comment: string | null;
  actorId: string | null;
  createdAt: string;
}

/** Arguments accepted by `client.collection(slug).runAction()`. */
export interface RunActionArgs {
  /** Target a single document (row action). */
  id?: string;
  /** Target multiple documents (bulk action). */
  ids?: string[];
  /** Values collected from the action's input form dialog. */
  input?: Record<string, unknown>;
}

/** A single audit entry returned by `client.audit()` or `client.collection(slug).audit()`. */
export interface AuditEntry {
  id: string;
  collection: string;
  documentId: string | null;
  operation: string;
  user: string | null;
  timestamp: string;
  changes?: string | Record<string, unknown> | null;
}

type ExtractDoc<T> =
  T extends CollectionConfig<infer TDoc>
    ? TDoc
    : T extends GlobalConfig<infer TDoc>
      ? TDoc
      : never;

/**
 * Derives a typed `TSchema` from your exported collection and global config constants.
 *
 * Pass it to `createClient<Schema>()` so every `find`, `findOne`, `create`,
 * `update`, `global().get()` call returns the inferred document shape — no
 * manual interfaces required.
 *
 * @example
 * ```ts
 * // dyrected.config.ts — export the typed constants alongside the default export
 * export const Products = defineCollection({ slug: 'products', fields: [...] })
 * export const Settings = defineGlobal({ slug: 'settings', fields: [...] })
 * export default defineConfig({ collections: [Products], globals: [Settings], ... })
 *
 * // client.ts
 * import type { Products, Settings } from './dyrected.config'
 * import { createClient, type InferSchema } from '@dyrected/sdk'
 *
 * type Schema = InferSchema<
 *   { products: typeof Products },
 *   { settings: typeof Settings }
 * >
 * const client = createClient<Schema>({ baseUrl: '...' })
 * // client.find('products')          → PaginatedResult<{ id: string; title: string; ... }>
 * // client.global('settings').get()  → { siteName?: string; ... }
 * ```
 */
export type InferSchema<
  TCollections extends Record<string, CollectionConfig<UnknownRecord>>,
  TGlobals extends Record<string, GlobalConfig<UnknownRecord>> = Record<
    never,
    never
  >,
> = {
  collections: { [K in keyof TCollections]: ExtractDoc<TCollections[K]> };
  globals: { [K in keyof TGlobals]: ExtractDoc<TGlobals[K]> };
};

/**
 * Structured error thrown by the SDK when the server returns a non-2xx response.
 */
export class DyrectedError extends Error {
  readonly statusCode: number;
  readonly errors: { field?: string; message: string }[];

  constructor(
    message: string,
    statusCode: number,
    errors: { field?: string; message: string }[] = [],
  ) {
    super(message);
    this.name = "DyrectedError";
    this.statusCode = statusCode;
    this.errors = errors;
  }
}

export interface DyrectedClientConfig {
  baseUrl: string;
  apiKey?: string;
  siteId?: string;
  headers?: Record<string, string>;
  fetch?: typeof fetch;
  /**
   * Callback invoked when a 401 Unauthorized response is returned from an authenticated endpoint.
   */
  onAuthError?: (error: DyrectedError) => void;
  /**
   * Default relationship population depth applied to document reads
   * (`find`, `findOne`, `global().get()`, and media listing) when a call
   * does not pass its own `depth`. Defaults to `1`.
   */
  defaultDepth?: number;
}

export interface BaseSchema {
  collections: Record<string, UnknownRecord>;
  globals: Record<string, UnknownRecord>;
}

/**
 * The structural bound used as the generic *constraint* for {@link DyrectedClient}
 * and the framework hooks. Its map values are `object` rather than
 * `Record<string, unknown>`.
 *
 * This matters because a generated `DyrectedSchema` is built from named
 * `interface`s (one per collection/global), and TypeScript interfaces have **no
 * implicit index signature** — so they are assignable to `object` but *not* to
 * `Record<string, unknown>`. Constraining against {@link BaseSchema} would
 * reject every real generated schema; constraining against `SchemaShape`
 * accepts them while {@link BaseSchema} remains the rich fallback default.
 */
export interface SchemaShape {
  collections: Record<string, object>;
  globals: Record<string, object>;
}

/**
 * Global registration seam for your generated schema.
 *
 * `dyrected generate:types` emits a module augmentation that registers your
 * `DyrectedSchema` here:
 *
 * ```ts
 * declare module "@dyrected/sdk" {
 *   interface Register { schema: DyrectedSchema }
 * }
 * ```
 *
 * Once that generated file is part of your compilation, every client and
 * framework hook is typed against your schema automatically — no per-call
 * generics. Until then, this stays empty and everything falls back to the
 * loosely-typed {@link BaseSchema}.
 */
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface Register {}

/**
 * The schema the SDK and framework hooks type themselves against. Resolves to
 * your registered {@link Register} schema when the generated types are present,
 * otherwise to {@link BaseSchema}. This is the default type parameter for
 * {@link DyrectedClient} and {@link createClient}, so `client.collection("...")`
 * and the React/Vue hooks pick up your collections and document shapes with no
 * explicit generic.
 */
export type RegisteredSchema = Register extends { schema: infer S }
  ? S extends SchemaShape
    ? S
    : BaseSchema
  : BaseSchema;

/**
 * Options for file uploads.
 * When `onProgress` is provided and the runtime supports XMLHttpRequest (browsers),
 * the upload reports real byte-level progress. In other environments (SSR, custom
 * fetch) the callback is ignored and the standard fetch path is used.
 */
export interface UploadOptions {
  /** Called with an integer 0–100 as the file bytes are sent. */
  onProgress?: (percent: number) => void;
  /** Abort the in-flight upload. */
  signal?: AbortSignal;
}

export class DyrectedClient<TSchema extends SchemaShape = RegisteredSchema> {
  private baseUrl: string;
  private headers: Record<string, string>;
  private fetch: typeof fetch;
  private defaultDepth: number;
  private onAuthError?: (error: DyrectedError) => void;

  constructor(config: DyrectedClientConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, "");
    this.fetch = (config.fetch || fetch).bind(globalThis);
    this.defaultDepth = config.defaultDepth ?? 1;
    this.onAuthError = config.onAuthError;
    this.headers = {
      "Content-Type": "application/json",
      ...(config.apiKey ? { "x-api-key": config.apiKey } : {}),
      ...(config.siteId ? { "x-site-id": config.siteId } : {}),
      ...config.headers,
    };
  }

  /**
   * Update the Authorization header with a Bearer token.
   * Call this after a successful login.
   */
  setToken(token: string): void {
    this.headers["Authorization"] = `Bearer ${token}`;
  }

  /**
   * Remove the Authorization header.
   * Call this after logout.
   */
  clearToken(): void {
    delete this.headers["Authorization"];
  }

  /**
   * Returns the headers needed to authenticate raw `fetch()` calls made outside
   * the SDK client (e.g. streaming endpoints, dynamic options).  Includes the
   * Authorization bearer token (if set), x-api-key, and x-site-id.
   */
  getAuthHeaders(): Record<string, string> {
    const safe: Record<string, string> = {};
    const fwd = ["Authorization", "x-api-key", "x-site-id"];
    for (const key of fwd) {
      if (this.headers[key]) safe[key] = this.headers[key];
    }
    return safe;
  }

  getBaseUrl() {
    return this.baseUrl;
  }

  /**
   * Inject the client's configured `defaultDepth` when a read did not specify
   * its own `depth`. A per-call `depth` (including `0`) always wins.
   */
  private applyDefaultDepth(
    args: Record<string, unknown>,
  ): Record<string, unknown> {
    return args.depth === undefined
      ? { ...args, depth: this.defaultDepth }
      : args;
  }

  async getSchemas(): Promise<SchemaResponse> {
    return this.request("/api/schemas");
  }

  async getAdminAuthConfig(): Promise<PublicAdminAuthConfig> {
    return this.request("/api/admin/auth/providers");
  }

  async exchangeAdminAuth(
    providerId: string,
    body: Record<string, unknown>,
  ): Promise<{ token: string; collectionSlug: string; providerId: string }> {
    return this.request(`/api/admin/auth/${providerId}/exchange`, {
      method: "POST",
      body: JSON.stringify(body),
    });
  }

  async getPreference<T = unknown>(
    key: string,
    options?: { scope?: "personal" | "global" },
  ): Promise<{ key: string; value: T | null }> {
    const scopeParam = options?.scope ? `?scope=${options.scope}` : "";
    return this.request(
      `/api/preferences/${encodeURIComponent(key)}${scopeParam}`,
    );
  }

  async setPreference<T = unknown>(
    key: string,
    value: T,
    options?: { scope?: "personal" | "global" },
  ): Promise<{ key: string; value: T }> {
    const scopeParam = options?.scope ? `?scope=${options.scope}` : "";
    return this.request(
      `/api/preferences/${encodeURIComponent(key)}${scopeParam}`,
      {
        method: "PUT",
        body: JSON.stringify({ value }),
      },
    );
  }

  async deletePreference(
    key: string,
    options?: { scope?: "personal" | "global" },
  ): Promise<{ success: boolean }> {
    const scopeParam = options?.scope ? `?scope=${options.scope}` : "";
    return this.request(
      `/api/preferences/${encodeURIComponent(key)}${scopeParam}`,
      {
        method: "DELETE",
      },
    );
  }

  /**
   * Fetch draft data for a specific preview token.
   * Used in "token" preview mode.
   */
  async getPreviewData<T = unknown>(token: string): Promise<T> {
    return this.request(`/api/preview-data?token=${encodeURIComponent(token)}`);
  }

  /**
   * Mint a short-lived preview token that carries the current (unsaved) draft
   * data. Used by the Admin in `previewMode: "token"` to hand draft content to
   * a server-rendered frontend that cannot receive it over `postMessage`.
   *
   * Requires an authenticated request (the Admin is logged in).
   */
  async createPreviewToken(input: {
    collectionSlug: string;
    documentId?: string;
    data: unknown;
  }): Promise<{ token: string; expiresAt: string }> {
    return this.request(`/api/preview-token`, {
      method: "POST",
      body: JSON.stringify(input),
    });
  }

  async find<K extends keyof TSchema["collections"]>(
    collection: K & string,
    args: QueryArgs<TSchema["collections"][K]> = {},
  ): Promise<PaginatedResult<TSchema["collections"][K]>> {
    const { initialData, ...queryArgs } = args;

    // Normalize where clause for the server (expects JSON string)
    const normalizedArgs: Record<string, unknown> = { ...queryArgs };
    if (queryArgs.where && typeof queryArgs.where === "object") {
      normalizedArgs.where = JSON.stringify(queryArgs.where);
    }

    const query = stringifyQuery(this.applyDefaultDepth(normalizedArgs), {
      addQueryPrefix: true,
    });
    const res = (await this.request(
      `/api/collections/${collection}${query}`,
    )) as PaginatedResult<TSchema["collections"][K]>;

    if (res.docs.length === 0 && initialData && initialData.length > 0) {
      // Trigger background seed
      this.request(`/api/collections/${collection}/seed`, {
        method: "POST",
        body: JSON.stringify({ data: initialData }),
      }).catch((err) =>
        console.error(
          `[dyrected/sdk] Failed to auto-seed collection "${collection}":`,
          err,
        ),
      );

      return {
        docs: initialData,
        total: initialData.length,
        limit: initialData.length,
        page: 1,
        totalPages: 1,
        hasNextPage: false,
        hasPrevPage: false,
      };
    }

    return res;
  }

  /**
   * Returns a fluent query builder for a collection.
   */
  collection<K extends keyof TSchema["collections"]>(slug: K & string) {
    return {
      find: (args?: QueryArgs<TSchema["collections"][K]>) => {
        const qb = new QueryBuilder<TSchema["collections"][K]>(
          slug,
          (collectionName, queryArgs) =>
            this.find(collectionName as K & string, queryArgs),
        );
        if (args) {
          if (args.where && typeof args.where === "object")
            qb.where(args.where);
          if (args.sort) qb.sort(args.sort);
          if (args.limit) qb.limit(args.limit);
          if (args.page) qb.page(args.page);
          if (args.depth !== undefined) qb.depth(args.depth);
          if (args.search) qb.search(args.search);
          if (args.initialData) qb.seed(args.initialData);
        }
        return qb;
      },
      findOne: (
        id: string,
        args: { depth?: number; initialData?: TSchema["collections"][K] } = {},
      ) => this.findOne<TSchema["collections"][K]>(slug, id, args),
      create: (data: Partial<TSchema["collections"][K]>) =>
        this.create<TSchema["collections"][K]>(slug, data),
      update: (id: string, data: Partial<TSchema["collections"][K]>) =>
        this.update<TSchema["collections"][K]>(slug, id, data),
      delete: (id: string) => this.delete(slug, id),
      deleteMany: (ids: string[]) => this.deleteMany(slug, ids),
      /**
       * Upload a file to this collection. Sends as multipart/form-data.
       * @param file - A File or Blob (browser) or Buffer with filename/mimeType (Node.js)
       * @param data - Additional metadata fields to save alongside the file (e.g. alt, caption)
       * @param options - Upload options, including an `onProgress` callback for byte-level progress.
       */
      upload: (
        file: File | Blob,
        data?: Record<string, string>,
        options?: UploadOptions,
      ) => this._upload(slug, file, data, options),
      // ---- Auth methods (only meaningful when the collection has auth: true) ----
      /**
       * Log in with email + password. Returns a JWT token and the user document.
       * Call `client.setToken(token)` afterwards to authenticate subsequent requests.
       */
      login: (
        email: string,
        password: string,
      ): Promise<{ token: string; user: TSchema["collections"][K] }> =>
        this.request(`/api/collections/${slug}/login`, {
          method: "POST",
          body: JSON.stringify({ email, password }),
        }),
      /** Log out. Stateless — token must be discarded client-side; call client.clearToken() too. */
      logout: (): Promise<{ success: boolean }> =>
        this.request(`/api/collections/${slug}/logout`, { method: "POST" }),
      /** Return the currently authenticated user (requires a token via setToken). */
      me: (): Promise<TSchema["collections"][K]> =>
        this.request(`/api/collections/${slug}/me`),
      /** Issue a fresh token for the currently authenticated user. */
      refreshToken: (): Promise<{ token: string }> =>
        this.request(`/api/collections/${slug}/refresh-token`, {
          method: "POST",
        }),
      /** Check if this auth collection has any users (initialized). */
      isInitialized: (): Promise<{ initialized: boolean }> =>
        this.request(`/api/collections/${slug}/init`),
      /** Register the very first user in an empty auth collection. */
      registerFirstUser: (
        data: UnknownRecord,
      ): Promise<{ token: string; user: TSchema["collections"][K] }> =>
        this.request(`/api/collections/${slug}/first-user`, {
          method: "POST",
          body: JSON.stringify(data),
        }),
      /** Send an invitation email to a new user. Requires authentication. Pass inviteUrl to send a clickable acceptance link. */
      invite: (
        email: string,
        inviteUrlOrOptions?: string | { inviteUrl?: string; data?: UnknownRecord },
      ): Promise<{ success: boolean; message: string; token: string; inviteUrl?: string }> => {
        const options =
          typeof inviteUrlOrOptions === "string"
            ? { inviteUrl: inviteUrlOrOptions, data: undefined }
            : inviteUrlOrOptions ?? {};

        return this.request(`/api/collections/${slug}/invite`, {
          method: "POST",
          body: JSON.stringify({ email, inviteUrl: options.inviteUrl, data: options.data }),
        });
      },
      /** Accept an invitation and create an account. Returns token + user. */
      acceptInvite: (
        token: string,
        password: string,
        extraFields?: UnknownRecord,
      ): Promise<{ token: string; user: TSchema["collections"][K] }> =>
        this.request(`/api/collections/${slug}/accept-invite`, {
          method: "POST",
          body: JSON.stringify({ token, password, ...extraFields }),
        }),
      /**
       * Change the password for a specific user document.
       * Non-admins must supply oldPassword. newPassword and confirmPassword must match.
       */
      changePassword: (
        id: string,
        payload: {
          oldPassword?: string;
          newPassword: string;
          confirmPassword: string;
        },
      ): Promise<{ success: boolean; message: string }> =>
        this.request(`/api/collections/${slug}/${id}/change-password`, {
          method: "POST",
          body: JSON.stringify(payload),
        }),
      /**
       * Admin-initiated password reset. Sends a reset link to the given email address.
       * Wraps the existing POST /forgot-password endpoint.
       */
      sendResetLink: (
        email: string,
        resetUrl?: string,
      ): Promise<{ success: boolean; message: string }> =>
        this.request(`/api/collections/${slug}/forgot-password`, {
          method: "POST",
          body: JSON.stringify({ email, resetUrl }),
        }),
      /**
       * Reset password using a reset token.
       * Wraps the POST /reset-password endpoint.
       */
      resetPassword: (
        token: string,
        password: string,
      ): Promise<{ success: boolean; message: string }> =>
        this.request(`/api/collections/${slug}/reset-password`, {
          method: "POST",
          body: JSON.stringify({ token, password }),
        }),
      /**
       * Perform a workflow transition on a single document.
       *
       * @param id - Document ID to transition.
       * @param transitionName - The transition key (e.g. `'submit'`, `'publish'`, `'reject'`).
       * @param opts - Optional `expectedRevision` (optimistic concurrency) and `comment`.
       * @returns The updated document with refreshed `_workflow` metadata.
       *
       * @example
       * // Publisher approves a submission
       * const updated = await client.collection('posts').transition(id, 'publish')
       *
       * // Editor requests changes with a comment
       * const updated = await client.collection('posts').transition(id, 'reject', {
       *   expectedRevision: doc._workflow.revision,
       *   comment: 'Please add more detail to section 2.',
       * })
       */
      transition: (
        id: string,
        transitionName: string,
        opts?: TransitionOptions,
      ) =>
        this.transition<TSchema["collections"][K]>(
          slug,
          id,
          transitionName,
          opts,
        ),
      /**
       * Fetch the workflow history for a single document — every transition that
       * has ever been performed, newest first.
       *
       * @param id - Document ID.
       * @param args - Optional `limit` (default 50, max 100).
       */
      workflowHistory: (id: string, args: { limit?: number } = {}) =>
        this.workflowHistory(slug, id, args),
      /**
       * Fetch audit entries for this collection.
       *
       * Sends `GET /api/collections/:collection/__audit`.
       */
      audit: (args: QueryArgs<AuditEntry> = {}) =>
        this.collectionAudit(slug, args),
      /**
       * Compute aggregate statistics across this collection without returning documents.
       *
       * Each named key maps to a `count`, `sum`, `avg`, `min`, or `max` operation.
       * Per-aggregate `where` filtering and `cast` type conversion are both supported.
       *
       * Sends `POST /api/collections/:collection/aggregate`.
       *
       * @example
       * ```ts
       * const result = await client.collection('rsvp_records').aggregate({
       *   totalSubmitted: { count: '*' },
       *   totalAttending: { count: '*', where: { attending: { equals: true } } },
       *   totalYards: { sum: 'asoebiYards', cast: 'number' },
       * });
       * // result.totalSubmitted: number | null
       * // result.totalAttending: number | null
       * // result.totalYards:     number | null
       * ```
       */
      aggregate: <TInput extends AggregateInput>(input: TInput) =>
        this.request<InferAggregateResult<TInput>>(
          `/api/collections/${slug}/aggregate`,
          {
            method: "POST",
            body: JSON.stringify(input),
          },
        ),
      /**
       * List media folders for this upload-enabled collection.
       */
      listFolders: (): Promise<PaginatedResult<MediaFolder>> =>
        this.listFolders(slug),
      /**
       * Create a media folder in this collection.
       */
      createFolder: (data: { name: string; parentId?: string | null; color?: string | null }): Promise<MediaFolder> =>
        this.createFolder(slug, data),
      /**
       * Update an existing media folder in this collection.
       */
      updateFolder: (id: string, data: { name?: string; parentId?: string | null; color?: string | null }): Promise<MediaFolder> =>
        this.updateFolder(slug, id, data),
      /**
       * Delete a media folder from this collection.
       */
      deleteFolder: (id: string): Promise<{ success: boolean; id: string }> =>
        this.deleteFolder(slug, id),
      /**
       * Run an operational view action (`defineAction`) against one or more documents.
       *
       * Sends `POST /api/collections/:collection/views/:viewSlug/actions/:action`.
       *
       * @example
       * ```ts
       * // Row action
       * const doc = await client.collection('guest-responses').runAction(
       *   'attending-guests', 'checkIn', { id: guest.id },
       * );
       * // Bulk action
       * await client.collection('guest-responses').runAction(
       *   'asoebi-pipeline', 'markPaid', { ids: selectedIds, input: { method: 'cash' } },
       * );
       * ```
       */
      runAction: <T = UnknownRecord>(
        viewSlug: string,
        actionName: string,
        args: RunActionArgs = {},
      ) =>
        this.request<T>(
          `/api/collections/${slug}/views/${encodeURIComponent(viewSlug)}/actions/${encodeURIComponent(actionName)}`,
          {
            method: "POST",
            body: JSON.stringify(args),
          },
        ),
    };
  }

  /**
   * Access a global by its slug with a fluent builder.
   * @example client.global('site-settings').get()
   * @example client.global('site-settings').update({ siteName: 'My Site' })
   */
  global<K extends keyof TSchema["globals"]>(slug: K & string) {
    return {
      get: (
        args: { depth?: number; initialData?: TSchema["globals"][K] } = {},
      ) => this.getGlobal<TSchema["globals"][K]>(slug, args),
      update: (data: Partial<TSchema["globals"][K]>) =>
        this.updateGlobal<TSchema["globals"][K]>(slug, data),
    };
  }

  async findOne<T = UnknownRecord>(
    collection: string,
    id: string,
    args: { depth?: number; initialData?: T } = {},
  ): Promise<T> {
    const { initialData, ...queryArgs } = args;
    const query = stringifyQuery(this.applyDefaultDepth(queryArgs), {
      addQueryPrefix: true,
    });

    try {
      return await this.request(`/api/collections/${collection}/${id}${query}`);
    } catch (err) {
      if (
        err instanceof DyrectedError &&
        err.statusCode === 404 &&
        initialData
      ) {
        // Trigger background seed for this specific document
        this.request(`/api/collections/${collection}/seed`, {
          method: "POST",
          body: JSON.stringify({ data: [{ id, ...initialData }] }),
        }).catch((err) =>
          console.error(
            `[dyrected/sdk] Failed to auto-seed document "${id}" in collection "${collection}":`,
            err,
          ),
        );

        return initialData;
      }
      throw err;
    }
  }

  async create<T = UnknownRecord>(
    collection: string,
    data: Partial<T>,
  ): Promise<T> {
    return this.request(`/api/collections/${collection}`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async update<T = UnknownRecord>(
    collection: string,
    id: string,
    data: Partial<T>,
  ): Promise<T> {
    return this.request(`/api/collections/${collection}/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  }

  async delete(collection: string, id: string): Promise<{ message: string }> {
    return this.request(`/api/collections/${collection}/${id}`, {
      method: "DELETE",
    });
  }

  /**
   * Perform a workflow transition on a document.
   *
   * Sends `POST /api/collections/:collection/:id/transitions/:transition`.
   * Requires the client to have a valid bearer token set via `setToken()`.
   *
   * @param collection - Collection slug.
   * @param id - Document ID.
   * @param transitionName - Transition key defined in `WorkflowConfig.transitions`.
   * @param opts - Optional concurrency guard and comment.
   *
   * @example
   * const updated = await client.transition('posts', postId, 'publish')
   */
  async transition<T = WorkflowDocument>(
    collection: string,
    id: string,
    transitionName: string,
    opts: TransitionOptions = {},
  ): Promise<T> {
    return this.request(
      `/api/collections/${collection}/${id}/transitions/${encodeURIComponent(transitionName)}`,
      {
        method: "POST",
        body: JSON.stringify(opts),
      },
    );
  }

  /**
   * Fetch the workflow history for a document.
   *
   * Sends `GET /api/collections/:collection/:id/workflow-history`.
   *
   * @param collection - Collection slug.
   * @param id - Document ID.
   * @param args - Optional `limit` (max 100).
   */
  async workflowHistory(
    collection: string,
    id: string,
    args: { limit?: number } = {},
  ): Promise<PaginatedResult<WorkflowHistoryEntry>> {
    const query = args.limit ? `?limit=${args.limit}` : "";
    return this.request(
      `/api/collections/${collection}/${id}/workflow-history${query}`,
    );
  }

  /**
   * Fetch audit entries across every audited collection the current caller can read.
   *
   * Sends `GET /api/audit`.
   */
  async audit(
    args: QueryArgs<AuditEntry> = {},
  ): Promise<PaginatedResult<AuditEntry>> {
    const query = stringifyQuery(normalizeQueryArgs(args), {
      addQueryPrefix: true,
    });
    return this.request(`/api/audit${query}`);
  }

  /**
   * Fetch audit entries for a single collection.
   *
   * Sends `GET /api/collections/:collection/__audit`.
   */
  async collectionAudit(
    collection: string,
    args: QueryArgs<AuditEntry> = {},
  ): Promise<PaginatedResult<AuditEntry>> {
    const query = stringifyQuery(normalizeQueryArgs(args), {
      addQueryPrefix: true,
    });
    return this.request(`/api/collections/${collection}/__audit${query}`);
  }

  async deleteMany(
    collection: string,
    ids: string[],
  ): Promise<{ message: string }> {
    return this.request(`/api/collections/${collection}/delete-many`, {
      method: "DELETE",
      body: stringify({ ids }),
    });
  }

  async getGlobal<T = UnknownRecord>(
    slug: string,
    args: { depth?: number; initialData?: T } = {},
  ): Promise<T> {
    const { initialData, ...queryArgs } = args;
    const query = stringifyQuery(this.applyDefaultDepth(queryArgs), {
      addQueryPrefix: true,
    });

    try {
      const res = await this.request(`/api/globals/${slug}${query}`);
      // Check if global is empty (some adapters return {} for missing globals)
      if (
        (!res || isFunctionallyEmpty(res)) &&
        !isFunctionallyEmpty(initialData)
      ) {
        console.log("[getGlobal] We are seeding", res);
        this.request(`/api/globals/${slug}/seed`, {
          method: "POST",
          body: JSON.stringify({ data: initialData }),
        }).catch((err) =>
          console.error(
            `[dyrected/sdk] Failed to auto-seed global "${slug}":`,
            err,
          ),
        );
        return initialData as T;
      }
      return res as T;
    } catch (err) {
      if (
        err instanceof DyrectedError &&
        err.statusCode === 404 &&
        initialData
      ) {
        this.request(`/api/globals/${slug}/seed`, {
          method: "POST",
          body: JSON.stringify({ data: initialData }),
        }).catch((err) =>
          console.error(
            `[dyrected/sdk] Failed to auto-seed global "${slug}":`,
            err,
          ),
        );
        return initialData;
      }
      throw err;
    }
  }

  async updateGlobal<T = UnknownRecord>(
    slug: string,
    data: Partial<T>,
  ): Promise<T> {
    return this.request(`/api/globals/${slug}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  }

  async listMedia(
    args: QueryArgs<Media> = {},
    collection: string = "media",
  ): Promise<PaginatedResult<Media>> {
    const query = stringifyQuery(
      this.applyDefaultDepth(normalizeQueryArgs(args)),
      { addQueryPrefix: true },
    );
    return this.request<PaginatedResult<Media>>(
      `/api/collections/${collection}${query}`,
    );
  }

  /**
   * List all media folders in an upload-enabled collection.
   */
  async listFolders(collection: string = "media"): Promise<PaginatedResult<MediaFolder>> {
    return this.request<PaginatedResult<MediaFolder>>(
      `/api/collections/${collection}/folders`,
    );
  }

  /**
   * Create a new media folder in an upload-enabled collection.
   */
  async createFolder(
    collection: string = "media",
    data: { name: string; parentId?: string | null; color?: string | null },
  ): Promise<MediaFolder> {
    return this.request<MediaFolder>(`/api/collections/${collection}/folders`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  /**
   * Update an existing media folder in an upload-enabled collection.
   */
  async updateFolder(
    collection: string = "media",
    id: string,
    data: { name?: string; parentId?: string | null; color?: string | null },
  ): Promise<MediaFolder> {
    return this.request<MediaFolder>(`/api/collections/${collection}/folders/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  }

  /**
   * Delete a media folder from an upload-enabled collection.
   */
  async deleteFolder(
    collection: string = "media",
    id: string,
  ): Promise<{ success: boolean; id: string }> {
    return this.request<{ success: boolean; id: string }>(
      `/api/collections/${collection}/folders/${id}`,
      {
        method: "DELETE",
      },
    );
  }

  /** @deprecated Use client.collection('media').upload(file, data) instead */
  async uploadMedia(file: File, collection: string = "media"): Promise<Media> {
    return this._upload(collection, file);
  }

  /**
   * Internal upload implementation shared by collection().upload() and uploadMedia().
   */
  private async _upload(
    collection: string,
    file: File | Blob,
    data?: Record<string, string>,
    options?: UploadOptions,
  ): Promise<Media> {
    const formData = new FormData();
    formData.append("file", file);

    // Append any extra metadata fields (e.g. alt, caption)
    if (data) {
      for (const [key, value] of Object.entries(data)) {
        formData.append(key, value);
      }
    }

    // When the caller wants progress and we're in a browser with XHR available, use an
    // XHR-based upload so we can emit real byte-level progress. Otherwise (SSR, custom
    // fetch, or no callback) fall back to the standard fetch path with identical behavior.
    if (options?.onProgress && typeof XMLHttpRequest !== "undefined") {
      return this._uploadWithProgress(collection, formData, options);
    }

    // Pass undefined to trigger mergeHeaders' delete path, so fetch sets the multipart boundary
    return this.request(`/api/collections/${collection}`, {
      method: "POST",
      headers: { "Content-Type": undefined } as unknown as HeadersInit,
      body: formData,
    });
  }

  /**
   * XHR-based upload used when a caller requests progress. Mirrors `request()`'s auth
   * headers and error handling (rate-limit event + DyrectedError) while exposing the
   * upload's byte-level progress via `options.onProgress`.
   */
  private _uploadWithProgress(
    collection: string,
    formData: FormData,
    options: UploadOptions,
  ): Promise<Media> {
    const url = `${this.baseUrl}/api/collections/${collection}`;

    return new Promise<Media>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", url, true);

      // Forward auth/site headers, but NOT Content-Type — the browser sets the
      // multipart boundary automatically from the FormData body.
      for (const [key, value] of Object.entries(this.headers)) {
        if (key.toLowerCase() === "content-type") continue;
        xhr.setRequestHeader(key, value);
      }

      if (options.signal) {
        if (options.signal.aborted) {
          reject(new DyrectedError("Upload aborted", 0));
          return;
        }
        options.signal.addEventListener("abort", () => xhr.abort(), {
          once: true,
        });
      }

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          options.onProgress?.(Math.round((event.loaded / event.total) * 100));
        }
      };

      const parse = (): Record<string, any> => {
        try {
          return JSON.parse(xhr.responseText);
        } catch {
          return { message: "Unknown error" };
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          options.onProgress?.(100);
          resolve(parse() as Media);
          return;
        }

        const body = parse();
        if (xhr.status === 429 && typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent("dyrected:rate-limit", {
              detail: { message: body.message, code: body.code },
            }),
          );
        }
        reject(
          new DyrectedError(
            body.message || `Request failed with status ${xhr.status}`,
            xhr.status,
            body.code,
          ),
        );
      };

      xhr.onerror = () =>
        reject(new DyrectedError("Network error during upload", 0));
      xhr.onabort = () => reject(new DyrectedError("Upload aborted", 0));

      xhr.send(formData);
    });
  }

  async deleteMedia(
    id: string,
    collection: string = "media",
  ): Promise<{ message: string }> {
    return this.delete(collection, id);
  }

  private async request<T = unknown>(
    path: string,
    init?: RequestInit,
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;

    const allHeaders = mergeHeaders(this.headers, init?.headers);

    const res = await this.fetch(url, {
      ...init,
      headers: allHeaders,
    });

    // Support both standard fetch (Response object) and Nuxt $fetch (parsed data)
    if (res && typeof res.ok === "boolean") {
      if (!res.ok) {
        const body = await res
          .json()
          .catch((): { message: string; code?: string } => ({
            message: "Unknown error",
          }));
        if (res.status === 429 && typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent("dyrected:rate-limit", {
              detail: { message: body.message, code: body.code },
            }),
          );
        }
        const error = new DyrectedError(
          body.message || `Request failed with status ${res.status}`,
          res.status,
          body.code,
        );
        if (
          res.status === 401 &&
          !path.endsWith("/login") &&
          !path.endsWith("/init") &&
          !path.endsWith("/first-user")
        ) {
          if (typeof window !== "undefined") {
            window.dispatchEvent(
              new CustomEvent("dyrected:auth-unauthorized", {
                detail: { message: body.message, code: body.code, path },
              }),
            );
          }
          this.onAuthError?.(error);
        }
        console.log("[DyrectedError]", body, res.status);
        throw error;
      }
      return res.json() as Promise<T>;
    }

    return res as T;
  }
}

export function createClient<TSchema extends SchemaShape = RegisteredSchema>(
  config: DyrectedClientConfig,
): DyrectedClient<TSchema> {
  return new DyrectedClient<TSchema>(config);
}

/**
 * The query-string parameter the Admin appends to a preview URL in
 * `previewMode: "token"`. Read it on your frontend to decide whether to fetch
 * draft data instead of published content.
 */
export const PREVIEW_TOKEN_PARAM = "dyPreview";

/**
 * Extract the preview token from a request's query string. Accepts a raw query
 * string, a `URLSearchParams`, or a plain params object (e.g. Nuxt's
 * `route.query` or Next's `searchParams`). Returns `null` when absent.
 *
 * @example
 *   const token = getPreviewToken(route.query);
 *   const doc = token
 *     ? (await client.getPreviewData(token)).data
 *     : (await client.find("pages", { where })).docs[0];
 */
export function getPreviewToken(
  search: string | URLSearchParams | Record<string, unknown> | undefined | null,
): string | null {
  if (!search) return null;

  let value: unknown;
  if (typeof search === "string") {
    value = new URLSearchParams(
      search.startsWith("?") ? search.slice(1) : search,
    ).get(PREVIEW_TOKEN_PARAM);
  } else if (search instanceof URLSearchParams) {
    value = search.get(PREVIEW_TOKEN_PARAM);
  } else {
    value = search[PREVIEW_TOKEN_PARAM];
  }

  if (Array.isArray(value)) value = value[0];
  return typeof value === "string" && value.length > 0 ? value : null;
}

function isFunctionallyEmpty(obj: unknown): boolean {
  if (obj === null || obj === undefined || obj === "") return true;
  if (Array.isArray(obj)) {
    if (obj.length === 0) return true;
    return obj.every(isFunctionallyEmpty);
  }
  if (typeof obj === "object") {
    const keys = Object.keys(obj);
    if (keys.length === 0) return true;
    return keys.every((key) =>
      isFunctionallyEmpty((obj as UnknownRecord)[key]),
    );
  }
  return false;
}

function mergeHeaders(
  baseHeaders: Record<string, string>,
  overrideHeaders?: HeadersInit,
): Record<string, string> {
  const merged = new Headers(baseHeaders);

  if (overrideHeaders instanceof Headers) {
    overrideHeaders.forEach((value, key) => merged.set(key, value));
  } else if (Array.isArray(overrideHeaders)) {
    for (const [key, value] of overrideHeaders) {
      merged.set(key, value);
    }
  } else if (overrideHeaders) {
    for (const [key, value] of Object.entries(overrideHeaders)) {
      if (value === undefined) {
        merged.delete(key);
      } else {
        merged.set(key, String(value));
      }
    }
  }

  return Object.fromEntries(merged.entries());
}

function normalizeQueryArgs<TDoc>(
  args: QueryArgs<TDoc>,
): Record<string, unknown> {
  const normalizedArgs: Record<string, unknown> = { ...args };
  if (args.where && typeof args.where === "object") {
    normalizedArgs.where = JSON.stringify(args.where);
  }
  return normalizedArgs;
}
