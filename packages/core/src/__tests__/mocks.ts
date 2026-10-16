import type { DatabaseAdapter, PaginatedResult } from '../types/index.js';

export { InMemoryAdapter } from '../conformance/memory-adapter.js';

export class MockDatabaseAdapter implements DatabaseAdapter {
  async find(params: { collection: string; limit?: number; page?: number; where?: any; sort?: string }): Promise<PaginatedResult> {
    return { docs: [], total: 0, limit: params.limit ?? 10, page: params.page ?? 1, totalPages: 1, hasNextPage: false, hasPrevPage: false };
  }
  async findOne() { return null; }
  async create({ data }: { data: any }) { return { id: '1', ...data }; }
  async update({ data }: { data: any }) { return { id: '1', ...data }; }
  async delete() { return { id: '1' }; }
  async getGlobal() { return {}; }
  async updateGlobal({ data }: { data: any }) { return data; }
  async aggregate() { return {}; }
}
