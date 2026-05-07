import { describe, it, expect } from 'vitest';
import { createDyrectedApp } from '../app.js';
import { defineConfig, defineCollection, defineGlobal } from '../index.js';

describe('Dynamic Router', () => {
  const config = defineConfig({
    collections: [
      defineCollection({
        slug: 'posts',
        fields: [{ name: 'title', type: 'text' }],
      }),
    ],
    globals: [
      defineGlobal({
        slug: 'settings',
        fields: [{ name: 'siteName', type: 'text' }],
      }),
    ],
    db: { type: 'mock' },
  });

  const app = createDyrectedApp(config);

  it('should expose the schema endpoint', async () => {
    const res = await app.request('/api/schemas');
    const data = await res.json();
    
    expect(res.status).toBe(200);
    expect(data.collections).toHaveLength(1);
    expect(data.collections[0].slug).toBe('posts');
    expect(data.globals[0].slug).toBe('settings');
  });

  it('should register collection routes', async () => {
    const res = await app.request('/api/collections/posts');
    const data = await res.json();
    
    expect(res.status).toBe(200);
    expect(data.message).toBe('List posts');
  });

  it('should register global routes', async () => {
    const res = await app.request('/api/globals/settings');
    const data = await res.json();
    
    expect(res.status).toBe(200);
    expect(data.message).toBe('Get global settings');
  });

  it('should return 404 for non-existent collections', async () => {
    const res = await app.request('/api/collections/missing');
    expect(res.status).toBe(404);
  });
});
