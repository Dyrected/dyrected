import { describe, it, expect } from 'vitest';
import { defineConfig, defineCollection, defineGlobal, type AdminIconName } from '../index.js';
import { MockDatabaseAdapter } from './mocks.js';

describe('Configuration Helpers', () => {
  it('only accepts valid Lucide names for admin navigation icons', () => {
    const icon: AdminIconName = 'Newspaper';
    // @ts-expect-error — invalid names must fail during configuration authoring.
    const invalidIcon: AdminIconName = 'DefinitelyNotALucideIcon';

    expect(icon).toBe('Newspaper');
    expect(invalidIcon).toBe('DefinitelyNotALucideIcon');
  });

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
      db: new MockDatabaseAdapter(),
    });

    expect(config.collections).toEqual([]);
    expect(config.db).toBeInstanceOf(MockDatabaseAdapter);
  });
});
