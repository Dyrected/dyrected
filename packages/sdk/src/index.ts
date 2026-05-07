import qs from 'qs';
import { PaginatedResult, FileData as Media } from '@dyrected/core';
import { QueryBuilder, QueryArgs } from './query-builder.js';

export { Media };

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
    this.name = 'DyrectedError';
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

export class DyrectedClient {
  private baseUrl: string;
  private headers: Record<string, string>;
  private fetch: typeof fetch;
  private defaultDepth: number;

  constructor(config: DyrectedClientConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, '');
    this.fetch = config.fetch || fetch;
    this.defaultDepth = config.defaultDepth ?? 1;
    this.headers = {
      'Content-Type': 'application/json',
      ...(config.apiKey ? { 'x-api-key': config.apiKey } : {}),
      ...(config.siteId ? { 'x-site-id': config.siteId } : {}),
      ...config.headers,
    };
  }

  /**
   * Update the Authorization header with a Bearer token.
   * Call this after a successful login.
   */
  setToken(token: string): void {
    this.headers['Authorization'] = `Bearer ${token}`;
  }

  /**
   * Remove the Authorization header.
   * Call this after logout.
   */
  clearToken(): void {
    delete this.headers['Authorization'];
  }

  getBaseUrl() {
    return this.baseUrl;
  }

  async getSchemas(): Promise<{ collections: any[], globals: any[] }> {
    return this.request('/api/schemas');
  }

  async find<T = any>(collection: string, args: QueryArgs = {}): Promise<PaginatedResult<T>> {
    const query = qs.stringify(args, { addQueryPrefix: true });
    const res = await this.request(`/api/collections/${collection}${query}`);
    return res as PaginatedResult<T>;
  }

  /**
   * Returns a fluent query builder for a collection.
   */
  collection<T = any>(slug: string) {
    return {
      find: (args?: QueryArgs) => {
        const qb = new QueryBuilder<T>(slug, (c, a) => this.find<T>(c, a));
        if (args) {
          if (args.where) qb.where(args.where);
          if (args.sort) qb.sort(args.sort);
          if (args.limit) qb.limit(args.limit);
          if (args.page) qb.page(args.page);
          if (args.depth) qb.depth(args.depth);
        }
        return qb;
      },
      findOne: (id: string, args: { depth?: number } = {}) => this.findOne<T>(slug, id, args),
      create: (data: any) => this.create<T>(slug, data),
      update: (id: string, data: any) => this.update<T>(slug, id, data),
      delete: (id: string) => this.delete(slug, id),
      /**
       * Upload a file to this collection. Sends as multipart/form-data.
       * @param file - A File or Blob (browser) or Buffer with filename/mimeType (Node.js)
       * @param data - Additional metadata fields to save alongside the file (e.g. alt, caption)
       */
      upload: (file: File | Blob, data?: Record<string, string>) =>
        this._upload(slug, file, data),
      // ---- Auth methods (only meaningful when the collection has auth: true) ----
      /**
       * Log in with email + password. Returns a JWT token and the user document.
       * Call `client.setToken(token)` afterwards to authenticate subsequent requests.
       */
      login: (email: string, password: string): Promise<{ token: string; user: T }> =>
        this.request(`/api/collections/${slug}/login`, {
          method: 'POST',
          body: JSON.stringify({ email, password }),
        }),
      /** Log out. Stateless — token must be discarded client-side; call client.clearToken() too. */
      logout: (): Promise<{ success: boolean }> =>
        this.request(`/api/collections/${slug}/logout`, { method: 'POST' }),
      /** Return the currently authenticated user (requires a token via setToken). */
      me: (): Promise<T> =>
        this.request(`/api/collections/${slug}/me`),
      /** Issue a fresh token for the currently authenticated user. */
      refreshToken: (): Promise<{ token: string }> =>
        this.request(`/api/collections/${slug}/refresh-token`, { method: 'POST' }),
    };
  }


  /**
   * Access a global by its slug with a fluent builder.
   * @example client.global('site-settings').get()
   * @example client.global('site-settings').update({ siteName: 'My Site' })
   */
  global<T = any>(slug: string) {
    return {
      get: (args: { depth?: number } = {}) => this.getGlobal<T>(slug, args),
      update: (data: any) => this.updateGlobal<T>(slug, data),
    };
  }

  async findOne<T = any>(collection: string, id: string, args: { depth?: number } = {}): Promise<T> {
    const query = qs.stringify(args, { addQueryPrefix: true });
    return this.request(`/api/collections/${collection}/${id}${query}`);
  }

  async create<T = any>(collection: string, data: any): Promise<T> {
    return this.request(`/api/collections/${collection}`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async update<T = any>(collection: string, id: string, data: any): Promise<T> {
    return this.request(`/api/collections/${collection}/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async delete(collection: string, id: string): Promise<{ message: string }> {
    return this.request(`/api/collections/${collection}/${id}`, {
      method: 'DELETE',
    });
  }

  async getGlobal<T = any>(slug: string, args: { depth?: number } = {}): Promise<T> {
    const query = qs.stringify(args, { addQueryPrefix: true });
    return this.request(`/api/globals/${slug}${query}`);
  }

  async updateGlobal<T = any>(slug: string, data: any): Promise<T> {
    return this.request(`/api/globals/${slug}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async listMedia(args: QueryArgs = {}, collection: string = 'media'): Promise<PaginatedResult<Media>> {
    return this.find<Media>(collection, args);
  }

  /** @deprecated Use client.collection('media').upload(file, data) instead */
  async uploadMedia(file: File, collection: string = 'media'): Promise<Media> {
    return this._upload(collection, file);
  }

  /**
   * Internal upload implementation shared by collection().upload() and uploadMedia().
   */
  private async _upload(
    collection: string,
    file: File | Blob,
    data?: Record<string, string>,
  ): Promise<any> {
    const formData = new FormData();
    formData.append('file', file);

    // Append any extra metadata fields (e.g. alt, caption)
    if (data) {
      for (const [key, value] of Object.entries(data)) {
        formData.append(key, value);
      }
    }

    // Remove Content-Type so the browser/fetch sets the multipart boundary automatically
    const { 'Content-Type': _, ...headers } = this.headers;

    return this.request(`/api/collections/${collection}`, {
      method: 'POST',
      headers: {
        ...headers,
        'Content-Type': undefined as any,
      },
      body: formData,
    });
  }

  async deleteMedia(id: string, collection: string = 'media'): Promise<{ message: string }> {
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

    if (!res.ok) {
      const body = await res.json().catch(() => ({ message: 'Unknown error' }));
      throw new DyrectedError(
        body.message || `Request failed with status ${res.status}`,
        res.status,
        body.errors || [],
      );
    }

    return res.json();
  }
}

export function createClient(config: DyrectedClientConfig): DyrectedClient {
  return new DyrectedClient(config);
}
