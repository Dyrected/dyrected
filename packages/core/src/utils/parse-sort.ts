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
