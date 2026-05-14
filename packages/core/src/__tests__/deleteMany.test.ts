import { describe, it, expect, beforeEach } from 'vitest';
import { createDyrectedApp } from '../app.js';
import { defineConfig, defineCollection } from '../index.js';
import { InMemoryAdapter } from './mocks.js';

describe('DELETE /delete-many', () => {
  let db: InMemoryAdapter;
  let app: any;

  beforeEach(async () => {
    db = new InMemoryAdapter();
    db.seed('posts', [
      { id: '1', title: 'Post 1' },
      { id: '2', title: 'Post 2' },
      { id: '3', title: 'Post 3' },
    ]);

    const config = defineConfig({
      collections: [
        defineCollection({ slug: 'posts', fields: [{ name: 'title', type: 'text' }] }),
      ],
      globals: [],
      db,
    });
    app = await createDyrectedApp(config);
  });

  it('deletes all provided ids and returns the deleted list', async () => {
    const res = await app.request('/api/collections/posts/delete-many', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: ['1', '2'] }),
    });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.deleted).toEqual(expect.arrayContaining(['1', '2']));
    expect(data.deleted).toHaveLength(2);

    // Verify docs are actually gone
    const listRes = await app.request('/api/collections/posts');
    const list = await listRes.json();
    expect(list.total).toBe(1);
    expect(list.docs[0].id).toBe('3');
  });

  it('returns 400 when no ids are provided', async () => {
    const res = await app.request('/api/collections/posts/delete-many', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: [] }),
    });
    expect(res.status).toBe(400);
  });

  it('returns 400 when body is missing', async () => {
    const res = await app.request('/api/collections/posts/delete-many', {
      method: 'DELETE',
    });
    expect(res.status).toBe(400);
  });

  it('response shape includes deleted array and no failed key on full success', async () => {
    const res = await app.request('/api/collections/posts/delete-many', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: ['1'] }),
    });
    const data = await res.json();
    expect(data).toHaveProperty('message');
    expect(data).toHaveProperty('deleted');
    expect(data.failed).toBeUndefined();
  });

  it('deletes a single id', async () => {
    const res = await app.request('/api/collections/posts/delete-many', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: ['3'] }),
    });
    const data = await res.json();
    expect(data.deleted).toContain('3');
  });
});
