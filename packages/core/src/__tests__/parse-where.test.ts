import { describe, expect, it } from 'vitest';
import { parseSqlWhere, parseMongoWhere } from '../utils/parse-where.js';

describe('parseSqlWhere', () => {
  const getJsonField = (field: string) => `data->>'${field}'`;

  it('translates shorthand operators correctly', () => {
    const res = parseSqlWhere(
      { age: { gt: 18, lt: 65 } },
      getJsonField,
      'pg',
    );
    expect(res.sql).toBe("data->>'age' > $1 AND data->>'age' < $2");
    expect(res.params).toEqual([18, 65]);
  });

  it('translates verbose operator aliases (greater_than, less_than, etc.) correctly', () => {
    const res = parseSqlWhere(
      {
        createdAt: { less_than: '2026-08-19T00:00:00Z' },
        score: { greater_than_or_equal: 100 },
        title: { like: 'test' },
      },
      getJsonField,
      'pg',
    );
    expect(res.sql).toBe(
      "data->>'createdAt' < $1 AND data->>'score' >= $2 AND data->>'title' LIKE $3",
    );
    expect(res.params).toEqual(['2026-08-19T00:00:00Z', 100, '%test%']);
  });
});

describe('parseMongoWhere', () => {
  it('translates verbose operator aliases correctly', () => {
    const res = parseMongoWhere({
      createdAt: { less_than: '2026-08-19T00:00:00Z' },
      score: { greater_than_or_equal: 100 },
      title: { like: 'test' },
    });
    expect(res).toEqual({
      $and: [
        { createdAt: { $lt: '2026-08-19T00:00:00Z' } },
        { score: { $gte: 100 } },
        { title: { $regex: 'test', $options: 'i' } },
      ],
    });
  });
});
