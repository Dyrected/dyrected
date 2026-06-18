import { describe, expect, it } from 'vitest';
import { parseSort } from '../utils/parse-sort.js';

describe('parseSort', () => {
  it('parses leading dash as descending sort direction', () => {
    expect(parseSort('-updatedAt')).toEqual([{ field: 'updatedAt', direction: 'DESC' }]);
  });

  it('parses explicit SQL-style sort directions', () => {
    expect(parseSort('updatedAt DESC')).toEqual([{ field: 'updatedAt', direction: 'DESC' }]);
    expect(parseSort('title ASC')).toEqual([{ field: 'title', direction: 'ASC' }]);
  });

  it('defaults bare fields to ascending order', () => {
    expect(parseSort('title')).toEqual([{ field: 'title', direction: 'ASC' }]);
  });

  it('supports comma-separated sort clauses', () => {
    expect(parseSort('title,-updatedAt')).toEqual([
      { field: 'title', direction: 'ASC' },
      { field: 'updatedAt', direction: 'DESC' },
    ]);
  });

  it('falls back when the sort string is not in the supported grammar', () => {
    expect(parseSort('updatedAt; DROP TABLE posts')).toEqual([{ field: 'createdAt', direction: 'DESC' }]);
  });
});
