import type { PaginatedResult } from '@dyrected/core';

type UnknownRecord = Record<string, unknown>;

export interface QueryArgs<TDoc = UnknownRecord> {
  limit?: number;
  page?: number;
  depth?: number;
  where?: UnknownRecord | string;
  sort?: string;
  initialData?: TDoc[];
}

export class QueryBuilder<T = UnknownRecord> {
  private args: QueryArgs<T> = {};

  constructor(
    private collection: string,
    private executor: (collection: string, args: QueryArgs<T>) => Promise<PaginatedResult<T>>
  ) {}

  where(where: UnknownRecord): this {
    const currentWhere = this.args.where;
    this.args.where =
      currentWhere && typeof currentWhere === "object"
        ? { ...currentWhere, ...where }
        : { ...where };
    return this;
  }

  sort(sort: string): this {
    this.args.sort = sort;
    return this;
  }

  limit(limit: number): this {
    this.args.limit = limit;
    return this;
  }

  page(page: number): this {
    this.args.page = page;
    return this;
  }

  depth(depth: number): this {
    this.args.depth = depth;
    return this;
  }

  seed(data: T[]): this {
    this.args.initialData = data;
    return this;
  }

  async exec(): Promise<PaginatedResult<T>> {
    return this.executor(this.collection, this.args);
  }

  // Thenable support for convenience
  then<TResult1 = PaginatedResult<T>, TResult2 = never>(
    onfulfilled?: ((value: PaginatedResult<T>) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
  ): Promise<TResult1 | TResult2> {
    return this.exec().then(onfulfilled, onrejected);
  }
}
