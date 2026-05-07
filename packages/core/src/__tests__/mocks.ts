import { DatabaseAdapter } from '../types/index.js';

export class MockDatabaseAdapter implements DatabaseAdapter {
  async find() { return []; }
  async findOne() { return null; }
  async create({ data }: { data: any }) { return { id: '1', ...data }; }
  async update({ data }: { data: any }) { return { id: '1', ...data }; }
  async delete() { return { id: '1' }; }
  async getGlobal() { return {}; }
  async updateGlobal({ data }: { data: any }) { return data; }
}
