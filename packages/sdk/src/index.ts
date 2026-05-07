import qs from 'qs';
import { PaginatedResult } from '@dyrected/core';

export interface DyrectedClientConfig {
  baseUrl: string;
  apiKey?: string;
  headers?: Record<string, string>;
  fetch?: typeof fetch;
}

export interface FindArgs {
  limit?: number;
  page?: number;
  depth?: number;
  where?: any;
  sort?: string;
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
      ...config.headers,
    };
  }

  async find<T = any>(collection: string, args: FindArgs = {}): Promise<PaginatedResult<T>> {
    const query = qs.stringify(args, { addQueryPrefix: true });
    const res = await this.request(`/api/collections/${collection}${query}`);
    return res as PaginatedResult<T>;
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
