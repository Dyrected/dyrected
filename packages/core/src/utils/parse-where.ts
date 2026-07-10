/**
 * Dyrected Where Clause DSL — shared query language across all database adapters.
 *
 * Adapters translate this DSL into their native format:
 *   - SQL adapters (SQLite, Postgres, MySQL): use parseSqlWhere()
 *   - MongoDB adapter: use parseMongoWhere()
 *   - Future adapters: implement their own translator against WhereClause
 *
 * Exhaustive operator handling is enforced at compile time via `assertNever`,
 * so adding a new operator without handling it will produce a TypeScript error
 * in every adapter translator.
 */

// ─── DSL Types ──────────────────────────────────────────────────────────────

export type WhereOperatorName =
  | 'equals'
  | 'not_equals'
  | 'in'
  | 'not_in'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'contains'
  | 'starts_with'
  | 'exists';

export type WhereOperator =
  | { equals: any }
  | { not_equals: any }
  | { in: any[] }
  | { not_in: any[] }
  | { gt: any }
  | { gte: any }
  | { lt: any }
  | { lte: any }
  | { contains: string }
  | { starts_with: string }
  | { exists: boolean };

/** Top-level where clause. Fields map to operator objects or shorthand scalar values. */
export type WhereClause = {
  [field: string]: WhereOperator | any;
  OR?: WhereClause[];
  AND?: WhereClause[];
};

/** Compile-time exhaustiveness guard. Any unhandled operator becomes a type error. */
function assertNever(op: never, context: string): never {
  throw new Error(`[dyrected/core] Unhandled where operator "${op}" in ${context}`);
}

// ─── SQL Translator ─────────────────────────────────────────────────────────
//  Used by: @dyrected/db-sqlite, @dyrected/db-postgres, @dyrected/db-mysql

export interface SqlWhereResult {
  sql: string;
  params: any[];
}

/**
 * Translates a WhereClause into a parameterized SQL WHERE fragment.
 *
 * @param where         The Dyrected where DSL object
 * @param getJsonField  Returns the SQL expression for a JSON-stored field (dialect-specific):
 *                        SQLite:   (f) => `json_extract(data, '$.${f}')`
 *                        Postgres: (f) => `data->>'${f}'`
 *                        MySQL:    (f) => `JSON_UNQUOTE(JSON_EXTRACT(data, '$.${f}'))`
 * @param placeholder   '?' for SQLite/MySQL, 'pg' for auto-incrementing Postgres $1/$2/…
 */
export function parseSqlWhere(
  where: WhereClause,
  getJsonField: (field: string) => string,
  placeholder: '?' | 'pg' = '?',
  /**
   * SQL keyword used for `contains`/`starts_with`. Postgres `LIKE` is
   * case-sensitive, so the Postgres adapter passes `'ILIKE'` to keep substring
   * matching case-insensitive like SQLite and MySQL.
   */
  likeOperator: 'LIKE' | 'ILIKE' = 'LIKE',
): SqlWhereResult {
  const params: any[] = [];
  let pgIndex = 1;

  function next(): string {
    return placeholder === 'pg' ? `$${pgIndex++}` : '?';
  }

  function col(field: string): string {
    return field === 'id' ? 'id' : getJsonField(field);
  }

  function buildOperator(field: string, value: WhereOperator | any): string {
    const c = col(field);

    // Shorthand scalar: { slug: 'hello' } → treat as equals
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      params.push(value);
      return `${c} = ${next()}`;
    }

    const entries = Object.entries(value);
    if (entries.length !== 1) {
      // Multiple keys inside an operator object — treat as AND of conditions on same field
      return entries
        .map(([op, operand]) => buildSingleOp(c, op as WhereOperatorName, operand))
        .join(' AND ');
    }

    const [op, operand] = entries[0];
    return buildSingleOp(c, op as WhereOperatorName, operand);
  }

  function buildSingleOp(c: string, op: WhereOperatorName, operand: any): string {
    switch (op) {
      case 'equals':
        params.push(typeof operand === 'boolean' ? String(operand) : operand);
        return `${c} = ${next()}`;

      case 'not_equals':
        params.push(typeof operand === 'boolean' ? String(operand) : operand);
        return `${c} != ${next()}`;

      case 'in': {
        const vals: any[] = Array.isArray(operand) ? operand : [operand];
        if (vals.length === 0) return '1=0'; // IN () is invalid SQL
        const placeholders = vals.map((v) => { params.push(v); return next(); });
        return `${c} IN (${placeholders.join(', ')})`;
      }

      case 'not_in': {
        const vals: any[] = Array.isArray(operand) ? operand : [operand];
        if (vals.length === 0) return '1=1';
        const placeholders = vals.map((v) => { params.push(v); return next(); });
        return `${c} NOT IN (${placeholders.join(', ')})`;
      }

      case 'gt':
        params.push(operand);
        return `${c} > ${next()}`;

      case 'gte':
        params.push(operand);
        return `${c} >= ${next()}`;

      case 'lt':
        params.push(operand);
        return `${c} < ${next()}`;

      case 'lte':
        params.push(operand);
        return `${c} <= ${next()}`;

      case 'contains':
        params.push(`%${operand}%`);
        return `${c} ${likeOperator} ${next()}`;

      case 'starts_with':
        params.push(`${operand}%`);
        return `${c} ${likeOperator} ${next()}`;

      case 'exists':
        return operand ? `${c} IS NOT NULL` : `${c} IS NULL`;

      default:
        // If you hit this, you added an operator to WhereOperatorName but forgot to handle it here.
        return assertNever(op, 'parseSqlWhere');
    }
  }

  function buildClause(w: WhereClause): string {
    const parts: string[] = [];
    for (const [field, value] of Object.entries(w)) {
      const upperField = field.toUpperCase();
      if (upperField === 'OR' && Array.isArray(value)) {
        const sub = (value as WhereClause[]).map((v) => `(${buildClause(v)})`).join(' OR ');
        parts.push(`(${sub})`);
      } else if (upperField === 'AND' && Array.isArray(value)) {
        const sub = (value as WhereClause[]).map((v) => `(${buildClause(v)})`).join(' AND ');
        parts.push(`(${sub})`);
      } else {
        parts.push(buildOperator(field, value));
      }
    }
    return parts.length ? parts.join(' AND ') : '1=1';
  }

  const sql = buildClause(where);
  return { sql, params };
}

// ─── MongoDB Translator ──────────────────────────────────────────────────────
//  Used by: @dyrected/db-mongodb

/**
 * Translates a WhereClause into a MongoDB filter object.
 * Handles nested OR/AND via $or/$and, and all operators via $eq/$in/$gt etc.
 */
export function parseMongoWhere(where: WhereClause): Record<string, any> {
  function buildOperator(field: string, value: WhereOperator | any): Record<string, any> {
    // Shorthand scalar
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      return { [field]: { $eq: value } };
    }

    const entries = Object.entries(value);
    if (entries.length !== 1) {
      // Multiple operators on same field — merge into one field condition
      const merged: Record<string, any> = {};
      for (const [op, operand] of entries) {
        Object.assign(merged, buildSingleOp(field, op as WhereOperatorName, operand)[field]);
      }
      return { [field]: merged };
    }

    const [op, operand] = entries[0];
    return buildSingleOp(field, op as WhereOperatorName, operand);
  }

  function buildSingleOp(field: string, op: WhereOperatorName, operand: any): Record<string, any> {
    switch (op) {
      case 'equals':
        return { [field]: { $eq: operand } };

      case 'not_equals':
        return { [field]: { $ne: operand } };

      case 'in':
        return { [field]: { $in: Array.isArray(operand) ? operand : [operand] } };

      case 'not_in':
        return { [field]: { $nin: Array.isArray(operand) ? operand : [operand] } };

      case 'gt':
        return { [field]: { $gt: operand } };

      case 'gte':
        return { [field]: { $gte: operand } };

      case 'lt':
        return { [field]: { $lt: operand } };

      case 'lte':
        return { [field]: { $lte: operand } };

      case 'contains':
        return { [field]: { $regex: operand, $options: 'i' } };

      case 'starts_with':
        return { [field]: { $regex: `^${operand}`, $options: 'i' } };

      case 'exists':
        return { [field]: { $exists: operand } };

      default:
        // Compile-time exhaustiveness: adding an operator without handling it here = build error.
        return assertNever(op, 'parseMongoWhere');
    }
  }

  function buildClause(w: WhereClause): Record<string, any> {
    const conditions: Record<string, any>[] = [];

    for (const [field, value] of Object.entries(w)) {
      const upperField = field.toUpperCase();
      if (upperField === 'OR' && Array.isArray(value)) {
        conditions.push({ $or: (value as WhereClause[]).map(buildClause) });
      } else if (upperField === 'AND' && Array.isArray(value)) {
        conditions.push({ $and: (value as WhereClause[]).map(buildClause) });
      } else {
        conditions.push(buildOperator(field, value));
      }
    }

    if (conditions.length === 0) return {};
    if (conditions.length === 1) return conditions[0];
    return { $and: conditions };
  }

  return buildClause(where);
}
