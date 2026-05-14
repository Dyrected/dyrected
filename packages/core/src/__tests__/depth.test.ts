import { describe, it, expect, beforeEach } from 'vitest';
import { createDyrectedApp } from '../app.js';
import { defineConfig, defineCollection } from '../index.js';
import { InMemoryAdapter } from './mocks.js';

describe('depth — relation population', () => {
  let db: InMemoryAdapter;
  let app: any;

  beforeEach(async () => {
    db = new InMemoryAdapter();

    // Authors
    db.seed('authors', [
      { id: 'author-1', name: 'Alice' },
      { id: 'author-2', name: 'Bob' },
    ]);

    // Posts with author relation stored as a plain ID string
    db.seed('posts', [
      { id: 'post-1', title: 'Hello', author: 'author-1', status: 'published' },
      { id: 'post-2', title: 'World', author: 'author-2', status: 'draft' },
    ]);

    const config = defineConfig({
      collections: [
        defineCollection({
          slug: 'posts',
          fields: [
            { name: 'title',  type: 'text' },
            { name: 'status', type: 'text' },
            { name: 'author', type: 'relationship', relationTo: 'authors' },
          ],
        }),
        defineCollection({
          slug: 'authors',
          fields: [{ name: 'name', type: 'text' }],
        }),
      ],
      globals: [],
      db,
    });
    app = await createDyrectedApp(config);
  });

  it('depth=0 returns raw relation IDs, not populated objects', async () => {
    const res = await app.request('/api/collections/posts?depth=0');
    const data = await res.json();
    expect(res.status).toBe(200);
    // author should still be the raw ID string
    expect(typeof data.docs[0].author).toBe('string');
    expect(data.docs[0].author).toBe('author-1');
  });

  it('depth=1 (default) populates one level of relations', async () => {
    const res = await app.request('/api/collections/posts');
    const data = await res.json();
    expect(res.status).toBe(200);
    // author should be the populated object
    expect(typeof data.docs[0].author).toBe('object');
    expect(data.docs[0].author.name).toBe('Alice');
  });

  it('depth=1 explicit — same as default', async () => {
    const res = await app.request('/api/collections/posts?depth=1');
    const data = await res.json();
    expect(data.docs[0].author.name).toBe('Alice');
  });

  it('depth=0 on findOne returns raw ID', async () => {
    const res = await app.request('/api/collections/posts/post-1?depth=0');
    const doc = await res.json();
    expect(res.status).toBe(200);
    expect(typeof doc.author).toBe('string');
  });

  it('depth=1 on findOne populates author', async () => {
    const res = await app.request('/api/collections/posts/post-1?depth=1');
    const doc = await res.json();
    expect(res.status).toBe(200);
    expect(doc.author.name).toBe('Alice');
  });

  it('depth + where combined — filtered result is also populated', async () => {
    const res = await app.request(
      `/api/collections/posts?depth=1&where=${encodeURIComponent(JSON.stringify({ status: { equals: 'published' } }))}`,
    );
    const data = await res.json();
    expect(data.total).toBe(1);
    expect(data.docs[0].title).toBe('Hello');
    expect(data.docs[0].author.name).toBe('Alice');
  });
});
