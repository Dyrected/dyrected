import { describe, it, expect, beforeEach } from 'vitest';
import { createDyrectedApp } from '../app.js';
import { defineConfig, defineCollection } from '../index.js';
import { InMemoryAdapter } from './mocks.js';

describe('where clause filtering', () => {
  let db: InMemoryAdapter;
  let app: any;

  beforeEach(async () => {
    db = new InMemoryAdapter();
    db.seed('posts', [
      { id: '1', title: 'Hello World', status: 'published', views: 100, tags: ['news'] },
      { id: '2', title: 'Hello Again', status: 'draft',     views: 5,   tags: ['tech'] },
      { id: '3', title: 'Goodbye',     status: 'published', views: 200, tags: ['news', 'tech'] },
    ]);

    const config = defineConfig({
      collections: [
        defineCollection({
          slug: 'posts',
          fields: [
            { name: 'title', type: 'text' },
            { name: 'status', type: 'text' },
            { name: 'views', type: 'number' },
            { name: 'tags', type: 'text', hasMany: true }
          ]
        }),
      ],
      globals: [],
      db,
    });
    app = await createDyrectedApp(config);
  });

  it('equals — returns only matching docs', async () => {
    const res = await app.request(
      `/api/collections/posts?where=${encodeURIComponent(JSON.stringify({ status: { equals: 'published' } }))}`,
    );
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.total).toBe(2);
    expect(data.docs.every((d: any) => d.status === 'published')).toBe(true);
  });

  it('not_equals — excludes matching docs', async () => {
    const res = await app.request(
      `/api/collections/posts?where=${encodeURIComponent(JSON.stringify({ status: { not_equals: 'published' } }))}`,
    );
    const data = await res.json();
    expect(data.total).toBe(1);
    expect(data.docs[0].status).toBe('draft');
  });

  it('in — matches any of the values', async () => {
    const res = await app.request(
      `/api/collections/posts?where=${encodeURIComponent(JSON.stringify({ id: { in: ['1', '3'] } }))}`,
    );
    const data = await res.json();
    expect(data.total).toBe(2);
  });

  it('gt — greater than comparison', async () => {
    const res = await app.request(
      `/api/collections/posts?where=${encodeURIComponent(JSON.stringify({ views: { gt: 50 } }))}`,
    );
    const data = await res.json();
    expect(data.total).toBe(2);
    expect(data.docs.every((d: any) => d.views > 50)).toBe(true);
  });

  it('lte — less than or equal comparison', async () => {
    const res = await app.request(
      `/api/collections/posts?where=${encodeURIComponent(JSON.stringify({ views: { lte: 100 } }))}`,
    );
    const data = await res.json();
    expect(data.total).toBe(2);
  });

  it('contains — substring match', async () => {
    const res = await app.request(
      `/api/collections/posts?where=${encodeURIComponent(JSON.stringify({ title: { contains: 'Hello' } }))}`,
    );
    const data = await res.json();
    expect(data.total).toBe(2);
    expect(data.docs.every((d: any) => d.title.includes('Hello'))).toBe(true);
  });

  it('starts_with — prefix match', async () => {
    const res = await app.request(
      `/api/collections/posts?where=${encodeURIComponent(JSON.stringify({ title: { starts_with: 'Hello' } }))}`,
    );
    const data = await res.json();
    expect(data.total).toBe(2);
  });

  it('exists — field is present', async () => {
    const res = await app.request(
      `/api/collections/posts?where=${encodeURIComponent(JSON.stringify({ status: { exists: true } }))}`,
    );
    const data = await res.json();
    expect(data.total).toBe(3);
  });

  it('OR — matches either branch', async () => {
    const where = {
      OR: [
        { status: { equals: 'draft' } },
        { views: { gte: 200 } },
      ],
    };
    const res = await app.request(
      `/api/collections/posts?where=${encodeURIComponent(JSON.stringify(where))}`,
    );
    const data = await res.json();
    expect(data.total).toBe(2);
  });

  it('shorthand scalar — treats as equals', async () => {
    const res = await app.request(
      `/api/collections/posts?where=${encodeURIComponent(JSON.stringify({ status: 'published' }))}`,
    );
    const data = await res.json();
    expect(data.total).toBe(2);
  });

  it('id field — filters by id directly', async () => {
    const res = await app.request(
      `/api/collections/posts?where=${encodeURIComponent(JSON.stringify({ id: { equals: '1' } }))}`,
    );
    const data = await res.json();
    expect(data.total).toBe(1);
    expect(data.docs[0].id).toBe('1');
  });

  it('empty where — returns all docs', async () => {
    const res = await app.request('/api/collections/posts');
    const data = await res.json();
    expect(data.total).toBe(3);
  });
});
