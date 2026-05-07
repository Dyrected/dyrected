import { PaginatedResult } from '@dyrected/core';

export interface QueryArgs {
  limit?: number;
  page?: number;
  depth?: number;
  where?: any;
  sort?: string;
}

export class QueryBuilder<T = any> {
  private args: QueryArgs = {};

  constructor(
    private collection: string,
    private executor: (collection: string, args: QueryArgs) => Promise<PaginatedResult<T>>
  ) {}

  where(where: any): this {
    this.args.where = { ...this.args.where, ...where };
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

  async exec(): Promise<PaginatedResult<T>> {
    return this.executor(this.collection, this.args);
  }

  // Thenable support for convenience
  then<TResult1 = PaginatedResult<T>, TResult2 = never>(
    onfulfilled?: ((value: PaginatedResult<T>) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null
  ): Promise<TResult1 | TResult2> {
    return this.exec().then(onfulfilled, onrejected);
  }
}
