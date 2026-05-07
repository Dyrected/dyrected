import { describe, it, expect } from 'vitest';
import { defineConfig, defineCollection, defineGlobal } from '../index';

describe('Configuration Helpers', () => {
  it('should define a collection correctly', () => {
    const posts = defineCollection({
      slug: 'posts',
      fields: [
        { name: 'title', type: 'text', required: true },
      ],
    });

    expect(posts.slug).toBe('posts');
    expect(posts.fields[0].name).toBe('title');
  });

  it('should define a global correctly', () => {
    const navbar = defineGlobal({
      slug: 'navbar',
      fields: [
        { name: 'logo', type: 'text' },
      ],
    });

    expect(navbar.slug).toBe('navbar');
  });

  it('should define a main config correctly', () => {
    const config = defineConfig({
      collections: [],
      globals: [],
      db: { type: 'mock' },
    });

    expect(config.collections).toEqual([]);
    expect(config.db.type).toBe('mock');
  });
});
