import qs from 'qs';
import { PaginatedResult, FileData as Media } from '@dyrected/core';
import { QueryBuilder, QueryArgs } from './query-builder.js';

export { Media };

export interface DyrectedClientConfig {
  baseUrl: string;
  apiKey?: string;
  siteId?: string;
  headers?: Record<string, string>;
  fetch?: typeof fetch;
}

export class DyrectedClient {
  private baseUrl: string;
  private headers: Record<string, string>;
  private fetch: typeof fetch;

  constructor(config: DyrectedClientConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, '');
    this.fetch = config.fetch || fetch;
    this.headers = {
      'Content-Type': 'application/json',
      ...(config.apiKey ? { 'X-API-Key': config.apiKey } : {}),
      ...(config.siteId ? { 'X-Site-Id': config.siteId } : {}),
      ...config.headers,
    };
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

  async listMedia(args: QueryArgs = {}, collection?: string): Promise<PaginatedResult<Media>> {
    const query = qs.stringify(args, { addQueryPrefix: true });
    const path = collection ? `/api/collections/${collection}/media` : '/api/media';
    return this.request(`${path}${query}`);
  }

  async uploadMedia(file: File, collection?: string): Promise<Media> {
    const formData = new FormData();
    formData.append('file', file);

    // Remove Content-Type header to let the browser set the boundary
    const { 'Content-Type': _, ...headers } = this.headers;

    const path = collection ? `/api/collections/${collection}/media` : '/api/media';

    return this.request(path, {
      method: 'POST',
      headers,
      body: formData,
    });
  }

  async deleteMedia(id: string, collection?: string): Promise<{ message: string }> {
    const path = collection ? `/api/collections/${collection}/media/${id}` : `/api/media/${id}`;
    return this.request(path, {
      method: 'DELETE',
    });
  }

  private async request(path: string, init?: RequestInit): Promise<any> {
    const url = `${this.baseUrl}${path}`;
    const res = await this.fetch(url, {
      ...init,
      headers: {
        ...this.headers,
        ...init?.headers,
      },
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({ message: 'Unknown error' }));
      throw new Error(error.message || `Request failed with status ${res.status}`);
    }

    return res.json();
  }
}

export function createClient(config: DyrectedClientConfig): DyrectedClient {
  return new DyrectedClient(config);
}
