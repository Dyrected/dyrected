import { stringify, stringifyQuery } from "./utils/stringify.js";
import type {
  PaginatedResult,
  FileData as Media,
  Field,
  Block,
  CollectionConfig,
  GlobalConfig,
  FieldType,
} from "@dyrected/core";
import { QueryBuilder, type QueryArgs } from "./query-builder.js";

export type { PaginatedResult, Media, Field, Block, CollectionConfig, GlobalConfig, FieldType };

type ExtractDoc<T> =
  T extends CollectionConfig<infer TDoc> ? TDoc :
  T extends GlobalConfig<infer TDoc>     ? TDoc :
  never;

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
  TCollections extends Record<string, CollectionConfig<any>>,
  TGlobals extends Record<string, GlobalConfig<any>> = Record<never, never>,
> = {
  collections: { [K in keyof TCollections]: ExtractDoc<TCollections[K]> };
  globals:     { [K in keyof TGlobals]:     ExtractDoc<TGlobals[K]>     };
};

/**
 * Structured error thrown by the SDK when the server returns a non-2xx response.
 */
export class DyrectedError extends Error {
  readonly statusCode: number;
  readonly errors: { field?: string; message: string }[];

  constructor(message: string, statusCode: number, errors: { field?: string; message: string }[] = []) {
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
  /** Default depth for relationship population. Applied to every request unless overridden per-call. */
  defaultDepth?: number;
}

export interface BaseSchema {
  collections: Record<string, any>;
  globals: Record<string, any>;
}

export class DyrectedClient<TSchema extends BaseSchema = any> {
  private baseUrl: string;
  private headers: Record<string, string>;
  private fetch: typeof fetch;
  private defaultDepth: number;

  constructor(config: DyrectedClientConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, "");
    this.fetch = (config.fetch || fetch).bind(globalThis);
    this.defaultDepth = config.defaultDepth ?? 1;
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

  async getSchemas(): Promise<{ collections: any[]; globals: any[] }> {
    return this.request("/api/schemas");
  }

  async getPreference<T = unknown>(key: string): Promise<{ key: string; value: T | null }> {
    return this.request(`/api/preferences/${encodeURIComponent(key)}`);
  }

  async setPreference<T = unknown>(key: string, value: T): Promise<{ key: string; value: T }> {
    return this.request(`/api/preferences/${encodeURIComponent(key)}`, {
      method: "PUT",
      body: JSON.stringify({ value }),
    });
  }

  /**
   * Fetch draft data for a specific preview token.
   * Used in "token" preview mode.
   */
  async getPreviewData(token: string): Promise<any> {
    return this.request(`/api/preview-data?token=${token}`);
  }

  async find<K extends keyof TSchema["collections"]>(
    collection: K & string,
    args: QueryArgs = {},
  ): Promise<PaginatedResult<TSchema["collections"][K]>> {
    const { initialData, ...queryArgs } = args;

    // Normalize where clause for the server (expects JSON string)
    const normalizedArgs = { ...queryArgs };
    if (normalizedArgs.where && typeof normalizedArgs.where === "object") {
      normalizedArgs.where = JSON.stringify(normalizedArgs.where);
    }

    const query = stringifyQuery(normalizedArgs, { addQueryPrefix: true });
    const res = (await this.request(`/api/collections/${collection}${query}`)) as PaginatedResult<
      TSchema["collections"][K]
    >;

    if (res.docs.length === 0 && initialData && initialData.length > 0) {
      // Trigger background seed
      this.request(`/api/collections/${collection}/seed`, {
        method: "POST",
        body: JSON.stringify({ data: initialData }),
      }).catch((err) => console.error(`[dyrected/sdk] Failed to auto-seed collection "${collection}":`, err));

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
      find: (args?: QueryArgs) => {
        const qb = new QueryBuilder<TSchema["collections"][K]>(slug, (c, a) => this.find(c as any, a));
        if (args) {
          if (args.where) qb.where(args.where);
          if (args.sort) qb.sort(args.sort);
          if (args.limit) qb.limit(args.limit);
          if (args.page) qb.page(args.page);
          if (args.depth) qb.depth(args.depth);
          if (args.initialData) qb.seed(args.initialData);
        }
        return qb;
      },
      findOne: (id: string, args: { depth?: number; initialData?: TSchema["collections"][K] } = {}) =>
        this.findOne<TSchema["collections"][K]>(slug, id, args),
      create: (data: any) => this.create<TSchema["collections"][K]>(slug, data),
      update: (id: string, data: any) => this.update<TSchema["collections"][K]>(slug, id, data),
      delete: (id: string) => this.delete(slug, id),
      deleteMany: (ids: string[]) => this.deleteMany(slug, ids),
      /**
       * Upload a file to this collection. Sends as multipart/form-data.
       * @param file - A File or Blob (browser) or Buffer with filename/mimeType (Node.js)
       * @param data - Additional metadata fields to save alongside the file (e.g. alt, caption)
       */
      upload: (file: File | Blob, data?: Record<string, string>) => this._upload(slug, file, data),
      // ---- Auth methods (only meaningful when the collection has auth: true) ----
      /**
       * Log in with email + password. Returns a JWT token and the user document.
       * Call `client.setToken(token)` afterwards to authenticate subsequent requests.
       */
      login: (email: string, password: string): Promise<{ token: string; user: TSchema["collections"][K] }> =>
        this.request(`/api/collections/${slug}/login`, {
          method: "POST",
          body: JSON.stringify({ email, password }),
        }),
      /** Log out. Stateless — token must be discarded client-side; call client.clearToken() too. */
      logout: (): Promise<{ success: boolean }> => this.request(`/api/collections/${slug}/logout`, { method: "POST" }),
      /** Return the currently authenticated user (requires a token via setToken). */
      me: (): Promise<TSchema["collections"][K]> => this.request(`/api/collections/${slug}/me`),
      /** Issue a fresh token for the currently authenticated user. */
      refreshToken: (): Promise<{ token: string }> =>
        this.request(`/api/collections/${slug}/refresh-token`, { method: "POST" }),
      /** Check if this auth collection has any users (initialized). */
      isInitialized: (): Promise<{ initialized: boolean }> => this.request(`/api/collections/${slug}/init`),
      /** Register the very first user in an empty auth collection. */
      registerFirstUser: (data: any): Promise<{ token: string; user: TSchema["collections"][K] }> =>
        this.request(`/api/collections/${slug}/first-user`, {
          method: "POST",
          body: JSON.stringify(data),
        }),
      /** Send an invitation email to a new user. Requires authentication. */
      invite: (email: string): Promise<{ success: boolean; message: string }> =>
        this.request(`/api/collections/${slug}/invite`, {
          method: "POST",
          body: JSON.stringify({ email }),
        }),
      /** Accept an invitation and create an account. Returns token + user. */
      acceptInvite: (
        token: string,
        password: string,
        extraFields?: Record<string, any>,
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
        payload: { oldPassword?: string; newPassword: string; confirmPassword: string },
      ): Promise<{ success: boolean; message: string }> =>
        this.request(`/api/collections/${slug}/${id}/change-password`, {
          method: "POST",
          body: JSON.stringify(payload),
        }),
      /**
       * Admin-initiated password reset. Sends a reset link to the given email address.
       * Wraps the existing POST /forgot-password endpoint.
       */
      sendResetLink: (email: string, resetUrl?: string): Promise<{ success: boolean; message: string }> =>
        this.request(`/api/collections/${slug}/forgot-password`, {
          method: "POST",
          body: JSON.stringify({ email, resetUrl }),
        }),
      /**
       * Reset password using a reset token.
       * Wraps the POST /reset-password endpoint.
       */
      resetPassword: (token: string, password: string): Promise<{ success: boolean; message: string }> =>
        this.request(`/api/collections/${slug}/reset-password`, {
          method: "POST",
          body: JSON.stringify({ token, password }),
        }),
    };
  }

  /**
   * Access a global by its slug with a fluent builder.
   * @example client.global('site-settings').get()
   * @example client.global('site-settings').update({ siteName: 'My Site' })
   */
  global<K extends keyof TSchema["globals"]>(slug: K & string) {
    return {
      get: (args: { depth?: number; initialData?: TSchema["globals"][K] } = {}) =>
        this.getGlobal<TSchema["globals"][K]>(slug, args),
      update: (data: any) => this.updateGlobal<TSchema["globals"][K]>(slug, data),
    };
  }

  async findOne<T = any>(collection: string, id: string, args: { depth?: number; initialData?: T } = {}): Promise<T> {
    const { initialData, ...queryArgs } = args;
    const query = stringifyQuery(queryArgs, { addQueryPrefix: true });

    try {
      return await this.request(`/api/collections/${collection}/${id}${query}`);
    } catch (err) {
      if (err instanceof DyrectedError && err.statusCode === 404 && initialData) {
        // Trigger background seed for this specific document
        this.request(`/api/collections/${collection}/seed`, {
          method: "POST",
          body: JSON.stringify({ data: [{ id, ...initialData }] }),
        }).catch((err) =>
          console.error(`[dyrected/sdk] Failed to auto-seed document "${id}" in collection "${collection}":`, err),
        );

        return initialData;
      }
      throw err;
    }
  }

  async create<T = any>(collection: string, data: any): Promise<T> {
    return this.request(`/api/collections/${collection}`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async update<T = any>(collection: string, id: string, data: any): Promise<T> {
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

  async deleteMany(collection: string, ids: string[]): Promise<{ message: string }> {
    return this.request(`/api/collections/${collection}/delete-many`, {
      method: "DELETE",
      body: stringify({ ids }),
    });
  }

  async getGlobal<T = any>(slug: string, args: { depth?: number; initialData?: T } = {}): Promise<T> {
    const { initialData, ...queryArgs } = args;
    const query = stringifyQuery(queryArgs, { addQueryPrefix: true });

    try {
      const res = await this.request(`/api/globals/${slug}${query}`);
      // Check if global is empty (some adapters return {} for missing globals)
      if ((!res || Object.keys(res).length === 0) && initialData) {
        this.request(`/api/globals/${slug}/seed`, {
          method: "POST",
          body: JSON.stringify({ data: initialData }),
        }).catch((err) => console.error(`[dyrected/sdk] Failed to auto-seed global "${slug}":`, err));
        return initialData;
      }
      return res;
    } catch (err) {
      if (err instanceof DyrectedError && err.statusCode === 404 && initialData) {
        this.request(`/api/globals/${slug}/seed`, {
          method: "POST",
          body: JSON.stringify({ data: initialData }),
        }).catch((err) => console.error(`[dyrected/sdk] Failed to auto-seed global "${slug}":`, err));
        return initialData;
      }
      throw err;
    }
  }

  async updateGlobal<T = any>(slug: string, data: any): Promise<T> {
    return this.request(`/api/globals/${slug}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  }

  async listMedia(args: QueryArgs = {}, collection: string = "media"): Promise<PaginatedResult<Media>> {
    return this.find(collection as any, args) as any;
  }

  /** @deprecated Use client.collection('media').upload(file, data) instead */
  async uploadMedia(file: File, collection: string = "media"): Promise<Media> {
    return this._upload(collection, file);
  }

  /**
   * Internal upload implementation shared by collection().upload() and uploadMedia().
   */
  private async _upload(collection: string, file: File | Blob, data?: Record<string, string>): Promise<any> {
    const formData = new FormData();
    formData.append("file", file);

    // Append any extra metadata fields (e.g. alt, caption)
    if (data) {
      for (const [key, value] of Object.entries(data)) {
        formData.append(key, value);
      }
    }

    // Remove Content-Type so the browser/fetch sets the multipart boundary automatically
    const { "Content-Type": _, ...headers } = this.headers;

    return this.request(`/api/collections/${collection}`, {
      method: "POST",
      headers: {
        ...headers,
        "Content-Type": undefined as any,
      },
      body: formData,
    });
  }

  async deleteMedia(id: string, collection: string = "media"): Promise<{ message: string }> {
    return this.delete(collection, id);
  }

  private async request(path: string, init?: RequestInit): Promise<any> {
    const url = `${this.baseUrl}${path}`;

    const allHeaders: any = {
      ...this.headers,
      ...init?.headers,
    };

    // Remove undefined headers (allows overriding and removing defaults)
    Object.keys(allHeaders).forEach((key) => {
      if (allHeaders[key] === undefined) {
        delete allHeaders[key];
      }
    });

    const res = await this.fetch(url, {
      ...init,
      headers: allHeaders,
    });

    // Support both standard fetch (Response object) and Nuxt $fetch (parsed data)
    if (res && typeof res.ok === "boolean") {
      if (!res.ok) {
        const body = await res.json().catch(() => ({ message: "Unknown error" }));
        if (res.status === 429 && typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("dyrected:rate-limit", {
            detail: { message: body.message, code: body.code },
          }));
        }
        throw new DyrectedError(body.message || `Request failed with status ${res.status}`, res.status, body.code);
      }
      return res.json();
    }

    return res;
  }
}

export function createClient<TSchema extends { collections: any; globals: any } = any>(
  config: DyrectedClientConfig,
): DyrectedClient<TSchema> {
  return new DyrectedClient<TSchema>(config);
}

// Setup prompt utilities (browser-safe, no server deps)
export * from "./utils/setup-prompt.js";
