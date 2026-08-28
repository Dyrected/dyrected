import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createDyrectedAITools } from '../services/ai-tools.js';
import { DyrectedAIError } from '../types/ai-errors.js';
import { aiRateLimit } from '../middleware/ai-rate-limit.js';
import type { DyrectedConfig } from '../types/index.js';

describe('Dyrected AI Day 6: Reliability, Resilience & Tenant Isolation', () => {
  const mockConfig: DyrectedConfig = {
    collections: [
      {
        slug: 'articles',
        fields: [
          { name: 'title', type: 'text', required: true },
          { name: 'category', type: 'text' },
          { name: 'views', type: 'number' },
        ],
      },
      {
        slug: 'services',
        fields: [
          { name: 'name', type: 'text', required: true },
          { name: 'price', type: 'number' },
        ],
      },
    ],
    globals: [
      {
        slug: 'site-settings',
        fields: [
          { name: 'siteTitle', type: 'text', required: true },
          { name: 'tagline', type: 'text' },
        ],
      },
    ],
    ai: {
      provider: 'google',
      apiKey: 'test-key',
      rateLimit: {
        userMax: 5,
        projectMax: 10,
      },
    },
  };

  const createMockDb = (existingDocs: Record<string, any[]> = {}) => {
    const store: Record<string, any[]> = {
      articles: existingDocs.articles || [],
      services: existingDocs.services || [],
      _dyrected_ai_actions: existingDocs._dyrected_ai_actions || [],
      _dyrected_ai_audit: existingDocs._dyrected_ai_audit || [],
    };

    return {
      find: vi.fn(async ({ collection, where }) => {
        const items = store[collection] || [];
        const filtered = items.filter((item) => {
          if (where?.projectId && item.projectId !== where.projectId) return false;
          if (where?.category && item.category !== where.category) return false;
          return true;
        });
        return { docs: filtered, total: filtered.length, totalPages: 1 };
      }),
      findOne: vi.fn(async ({ collection, id }) => {
        const items = store[collection] || [];
        return items.find((i) => i.id === id) || null;
      }),
      create: vi.fn(async ({ collection, data }) => {
        const item = { id: `doc_${Date.now()}`, ...data };
        if (!store[collection]) store[collection] = [];
        store[collection].push(item);
        return item;
      }),
      update: vi.fn(async ({ collection, id, data }) => {
        const items = store[collection] || [];
        const index = items.findIndex((i) => i.id === id);
        if (index === -1) throw new Error('Not found');
        items[index] = { ...items[index], ...data };
        return items[index];
      }),
      delete: vi.fn(async ({ collection, id }) => {
        const items = store[collection] || [];
        store[collection] = items.filter((i) => i.id !== id);
        return true;
      }),
      aggregate: vi.fn(async () => [{ total: 42 }]),
      getGlobal: vi.fn(async ({ slug }) => ({ siteTitle: 'Dyrected CMS', tagline: 'Headless CMS' })),
      updateGlobal: vi.fn(async ({ slug, data }) => ({ slug, ...data })),
    };
  };

  describe('1. Tool Self-Healing & Error Recovery', () => {
    it('returns a structured self-healing envelope with available collections when given an invalid collection', async () => {
      const mockDb = createMockDb();
      const tools = createDyrectedAITools({
        db: mockDb as any,
        config: mockConfig,
        projectId: 'proj_alpha',
      });

      const result = await tools.queryCollection.execute({
        collection: 'non_existent_collection',
      });

      expect(result).toHaveProperty('error');
      expect(result).toHaveProperty('suggestion');
      expect(result.recoverable).toBe(true);
      expect(result.suggestion).toContain('articles');
      expect(result.suggestion).toContain('services');
    });

    it('returns a helpful self-healing suggestion when global slug is invalid', async () => {
      const mockDb = createMockDb();
      const tools = createDyrectedAITools({
        db: mockDb as any,
        config: mockConfig,
        projectId: 'proj_alpha',
      });

      const result = await tools.getGlobalSchema.execute({
        global: 'unknown_global',
      });

      expect(result).toHaveProperty('error');
      expect(result.recoverable).toBe(true);
      expect(result.suggestion).toContain('site-settings');
    });

    it('validates required fields on proposal and provides self-healing feedback', async () => {
      const mockDb = createMockDb();
      const tools = createDyrectedAITools({
        db: mockDb as any,
        config: mockConfig,
        projectId: 'proj_alpha',
      });

      const result = await tools.proposeCreateDocument.execute({
        collection: 'articles',
        data: { category: 'Tech' }, // missing required 'title'
        summary: 'Create article without title',
      });

      expect(result).toHaveProperty('error');
      expect(result.error).toContain('Required field "title" is missing');
      expect(result.recoverable).toBe(true);
    });
  });

  describe('2. Strict Multi-Tenant Isolation', () => {
    it('prevents cross-tenant document leakage by enforcing projectId scoping', async () => {
      const mockDb = createMockDb({
        articles: [
          { id: 'art_1', title: 'Project A Article', projectId: 'proj_alpha' },
          { id: 'art_2', title: 'Project B Secret Article', projectId: 'proj_beta' },
        ],
      });

      const toolsAlpha = createDyrectedAITools({
        db: mockDb as any,
        config: mockConfig,
        projectId: 'proj_alpha',
      });

      const result = await toolsAlpha.queryCollection.execute({
        collection: 'articles',
        where: { projectId: 'proj_alpha' },
      });

      expect(result.docs).toHaveLength(1);
      expect(result.docs[0].title).toBe('Project A Article');
      expect(result.docs.some((d: any) => d.projectId === 'proj_beta')).toBe(false);
    });
  });

  describe('3. Rate Limiting Middleware', () => {
    it('enforces sliding-window rate limits and returns 429 when threshold exceeded', async () => {
      const middleware = aiRateLimit(mockConfig);

      const mockContext = (userId: string, count: number) => {
        const headers: Record<string, string> = {};
        return {
          get: (key: string) => {
            if (key === 'config') return mockConfig;
            if (key === 'user') return { id: userId };
            return null;
          },
          req: {
            header: (name: string) => (name === 'X-Site-Id' ? 'proj_alpha' : null),
          },
          header: (key: string, val: string) => {
            headers[key] = val;
          },
          headers,
        };
      };

      const testUserId = `user_rate_test_${Date.now()}`;
      const nextFn = vi.fn(async () => {});

      // 5 requests within limit
      for (let i = 0; i < 5; i++) {
        const c = mockContext(testUserId, i);
        await middleware(c as any, nextFn);
      }
      expect(nextFn).toHaveBeenCalledTimes(5);

      // 6th request should trigger 429 DyrectedAIError
      const c6 = mockContext(testUserId, 6);
      await expect(middleware(c6 as any, nextFn)).rejects.toThrow(DyrectedAIError);
    });
  });

  describe('4. Typed DyrectedAIError Taxonomy', () => {
    it('correctly constructs and serializes error codes and status', () => {
      const err = new DyrectedAIError('AI_RATE_LIMITED', 'Rate limit exceeded', 429, { retryAfter: 30 });

      expect(err.code).toBe('AI_RATE_LIMITED');
      expect(err.status).toBe(429);
      expect(err.details).toEqual({ retryAfter: 30 });

      const json = err.toJSON();
      expect(json.error).toBe(true);
      expect(json.code).toBe('AI_RATE_LIMITED');
      expect(json.status).toBe(429);
    });
  });
});
