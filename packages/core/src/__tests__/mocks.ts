import type { DatabaseAdapter, PaginatedResult } from '../types/index.js';

/**
 * Stateful in-memory adapter for testing.
 * Supports where clause filtering via parseSqlWhere logic for correctness in tests.
 */
export class InMemoryAdapter implements DatabaseAdapter {
  private store: Record<string, Record<string, any>> = {};

  private getValue(doc: any, field: string) {
    if (!field.includes(".")) return doc[field];
    return field.split(".").reduce((value, segment) => value?.[segment], doc);
  }

  private getCollection(slug: string): Record<string, any> {
    if (!this.store[slug]) this.store[slug] = {};
    return this.store[slug];
  }

  /** Seed data for tests without going through the create lifecycle. */
  seed(collection: string, docs: any[]) {
    const col = this.getCollection(collection);
    for (const doc of docs) {
      col[doc.id] = doc;
    }
  }

  private matchesWhere(doc: any, where: any): boolean {
    if (!where) return true;
    for (const [field, condition] of Object.entries(where)) {
      if (field === 'OR' && Array.isArray(condition)) {
        if (!(condition as any[]).some((sub) => this.matchesWhere(doc, sub))) return false;
        continue;
      }
      if (field === 'AND' && Array.isArray(condition)) {
        if (!(condition as any[]).every((sub) => this.matchesWhere(doc, sub))) return false;
        continue;
      }

      const docVal = this.getValue(doc, field);
      if (typeof condition !== 'object' || condition === null) {
        if (docVal !== condition) return false;
        continue;
      }

      const [[op, operand]] = Object.entries(condition as object);
      switch (op) {
        case 'equals':      if (docVal !== operand) return false; break;
        case 'not_equals':  if (docVal === operand) return false; break;
        case 'in':          if (!Array.isArray(operand) || !operand.includes(docVal)) return false; break;
        case 'not_in':      if (Array.isArray(operand) && operand.includes(docVal)) return false; break;
        case 'gt':          if (!(docVal > operand)) return false; break;
        case 'gte':         if (!(docVal >= operand)) return false; break;
        case 'lt':          if (!(docVal < operand)) return false; break;
        case 'lte':         if (!(docVal <= operand)) return false; break;
        case 'contains':
          if (Array.isArray(docVal)) {
            const needle = typeof operand === "string" ? operand.replaceAll('"', '') : operand;
            if (!docVal.some((value) => String(value).includes(String(needle)))) return false;
            break;
          }
          if (typeof docVal !== 'string' || !docVal.includes(operand)) return false;
          break;
        case 'starts_with': if (typeof docVal !== 'string' || !docVal.startsWith(operand)) return false; break;
        case 'exists':      if (operand ? docVal == null : docVal != null) return false; break;
      }
    }
    return true;
  }

  async find(args: { collection: string; where?: any; limit?: number; page?: number; sort?: string }): Promise<PaginatedResult> {
    const col = this.getCollection(args.collection);
    const all = Object.values(col).filter((doc) => this.matchesWhere(doc, args.where));
    const limit = args.limit ?? 10;
    const page = args.page ?? 1;
    const offset = (page - 1) * limit;
    const docs = all.slice(offset, offset + limit);
    const totalPages = Math.ceil(all.length / limit);
    return {
      docs,
      total: all.length,
      limit,
      page,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    };
  }

  async findOne(params: { collection: string; id: string }) {
    const col = this.getCollection(params.collection);
    return col[params.id] ?? null;
  }

  async create(params: { collection: string; data: any }) {
    const col = this.getCollection(params.collection);
    const id = params.data.id ?? Math.random().toString(36).substring(7);
    const doc = { id, ...params.data };
    col[id] = doc;
    return doc;
  }

  async update(params: { collection: string; id: string; data: any }) {
    const col = this.getCollection(params.collection);
    const existing = col[params.id] ?? {};
    const updated = { ...existing, ...params.data, id: params.id };
    col[params.id] = updated;
    return updated;
  }

  async delete(params: { collection: string; id: string }) {
    const col = this.getCollection(params.collection);
    delete col[params.id];
  }

  async getGlobal(params: { slug: string }) {
    return this.store[`__global_${params.slug}`]?.['__data'] ?? {};
  }

  async updateGlobal(params: { slug: string; data: any }) {
    if (!this.store[`__global_${params.slug}`]) this.store[`__global_${params.slug}`] = {};
    this.store[`__global_${params.slug}`]['__data'] = params.data;
    return params.data;
  }

  async aggregate(args: { collection: string; aggregates: Record<string, any> }) {
    const col = this.getCollection(args.collection);
    const allDocs = Object.values(col);
    const result: Record<string, number | null> = {};

    for (const [name, op] of Object.entries(args.aggregates)) {
      const filtered = op.where
        ? allDocs.filter((doc) => this.matchesWhere(doc, op.where))
        : allDocs;

      if ("count" in op) {
        result[name] = filtered.length;
        continue;
      }

      const field = op.sum || op.avg || op.min || op.max;
      const values: number[] = [];

      for (const doc of filtered) {
        const raw = this.getValue(doc, field);
        if (raw === null || raw === undefined) continue;
        if (typeof raw === "number" && !isNaN(raw)) {
          values.push(raw);
        } else if (
          op.cast === "number" ||
          op.cast === "integer" ||
          op.cast === "float"
        ) {
          const num = Number(raw);
          if (!isNaN(num) && typeof raw !== "boolean") {
            values.push(num);
          }
        }
      }

      if (values.length === 0) {
        result[name] = null;
        continue;
      }

      if (op.sum) {
        result[name] = values.reduce((acc, v) => acc + v, 0);
      } else if (op.avg) {
        result[name] = values.reduce((acc, v) => acc + v, 0) / values.length;
      } else if (op.min) {
        result[name] = Math.min(...values);
      } else if (op.max) {
        result[name] = Math.max(...values);
      } else {
        result[name] = filtered.length;
      }
    }

    return result;
  }

  /**
   * In-memory transaction: just runs the callback with `this` as the adapter.
   * The in-memory store is synchronous so there is nothing to roll back, but
   * this satisfies the DatabaseAdapter interface so workflow tests can run.
   */
  async transaction<T>(fn: (txAdapter: DatabaseAdapter) => Promise<T>): Promise<T> {
    return fn(this);
  }
}


/** Legacy mock kept for backward compat with existing tests. */
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
