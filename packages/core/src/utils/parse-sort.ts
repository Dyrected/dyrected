import type { Field } from '../types/schema-core.js';

export type SortDirection = 'ASC' | 'DESC';

export interface SortClause {
  field: string;
  direction: SortDirection;
}

const SORT_FIELD_PATTERN = /^([A-Za-z_][A-Za-z0-9_]*)(?:\s+(ASC|DESC))?$/i;

export function parseSort(sort: string | undefined, fallback: SortClause = { field: 'createdAt', direction: 'DESC' }): SortClause[] {
  if (!sort) return [fallback];

  const clauses = sort
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part): SortClause | null => {
      const descByPrefix = part.startsWith('-');
      const withoutPrefix = descByPrefix ? part.slice(1).trim() : part;
      const match = withoutPrefix.match(SORT_FIELD_PATTERN);
      if (!match) return null;

      return {
        field: match[1],
        direction: descByPrefix || match[2]?.toUpperCase() === 'DESC' ? 'DESC' : 'ASC',
      };
    })
    .filter((clause): clause is SortClause => Boolean(clause));

  return clauses.length > 0 ? clauses : [fallback];
}

/**
 * Collects the names of top-level fields declared as numbers. SQL adapters use
 * this to decide which JSON-extracted sort fields need a numeric cast.
 */
export function numericFieldNames(fields?: Field[]): Set<string> {
  const names = new Set<string>();
  for (const field of fields ?? []) {
    if (field.type === 'number' && 'name' in field && field.name) {
      names.add(field.name);
    }
  }
  return names;
}

/**
 * Dialect hooks for turning a parsed sort into a SQL `ORDER BY` body.
 * Each SQL adapter supplies its own quoting, JSON extraction, and numeric cast.
 */
export interface SqlSortDialect {
  /** Quote a real column identifier (e.g. `"created_at"` or \`created_at\`). */
  quoteIdent: (identifier: string) => string;
  /** SQL expression that reads a top-level field out of the JSON `data` column. */
  jsonExtract: (field: string) => string;
  /**
   * Wrap a JSON-extracted expression so it sorts numerically instead of
   * lexicographically. Adapters whose JSON extraction already preserves number
   * types (SQLite) can return the expression unchanged.
   */
  castNumeric: (expr: string) => string;
}

const TIMESTAMP_COLUMNS: Record<string, string> = {
  createdat: 'created_at',
  created_at: 'created_at',
  updatedat: 'updated_at',
  updated_at: 'updated_at',
};

/**
 * Builds the `ORDER BY` body shared by the SQL adapters.
 *
 * Real (promoted) columns and the `created_at`/`updated_at` timestamps are
 * ordered by their typed column directly. Everything else is read out of the
 * JSON `data` column — and when a field is declared as a `number`, its extracted
 * value is cast so it orders by magnitude rather than as text ("9" < "10").
 *
 * @param sort            The raw sort string (e.g. `"-createdAt"`, `"priority,-views"`).
 * @param existingColumns Real column names present on the table.
 * @param numericFields   Names of top-level fields declared with `type: 'number'`.
 * @param dialect         Adapter-specific quoting, extraction, and numeric cast.
 */
export function buildSqlOrderBy(
  sort: string | undefined,
  existingColumns: string[],
  numericFields: Set<string>,
  dialect: SqlSortDialect,
): string {
  return parseSort(sort)
    .map(({ field, direction }) => {
      const timestamp = TIMESTAMP_COLUMNS[field.toLowerCase()];
      if (timestamp) return `${dialect.quoteIdent(timestamp)} ${direction}`;

      if (existingColumns.includes(field) && field !== 'id' && field !== 'data') {
        return `${dialect.quoteIdent(field)} ${direction}`;
      }

      const extracted = dialect.jsonExtract(field);
      const expr = numericFields.has(field) ? dialect.castNumeric(extracted) : extracted;
      return `${expr} ${direction}`;
    })
    .join(', ');
}
