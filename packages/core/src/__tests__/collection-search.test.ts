import { describe, expect, it } from 'vitest';
import { getCollectionSearchableFields } from '../utils/collection-search.js';
import type { CollectionConfig } from '../types/index.js';

const names = (c: Partial<CollectionConfig>) =>
  getCollectionSearchableFields({ slug: 'posts', fields: [], ...c } as CollectionConfig).map((f) => f.name);

describe('getCollectionSearchableFields', () => {
  it('selects text-like fields by type, regardless of name', () => {
    expect(
      names({
        fields: [
          { name: 'fullName', type: 'text' },
          { name: 'bio', type: 'textarea' },
          { name: 'age', type: 'number' },
          { name: 'active', type: 'checkbox' },
          { name: 'secret', type: 'text', admin: { hidden: true } },
        ],
      } as any),
    ).toEqual(['fullName', 'bio']);
  });

  it('puts useAsTitle first and descends into rows', () => {
    expect(
      names({
        admin: { useAsTitle: 'sku' },
        fields: [
          { type: 'row', fields: [{ name: 'note', type: 'text' }, { name: 'sku', type: 'text' }] },
        ],
      } as any),
    ).toEqual(['sku', 'note']);
  });

  it('lets admin.searchableFields win', () => {
    expect(
      names({
        admin: { searchableFields: ['bio'] },
        fields: [
          { name: 'title', type: 'text' },
          { name: 'bio', type: 'textarea' },
        ],
      } as any),
    ).toEqual(['bio']);
  });
});
