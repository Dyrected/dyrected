import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createDyrectedAITools } from '../services/ai-tools.js';
import { AIController } from '../controllers/ai.controller.js';
import {
  AI_ACTIONS_COLLECTION,
  AI_AUDIT_COLLECTION,
  isAICollection,
} from '../types/ai.js';
import type { DyrectedConfig, DatabaseAdapter } from '../types/index.js';

describe('Day 4 & Day 5 — Intent Routing, HITL Content Mutations & Audit Trail', () => {
  let mockDb: any;
  let mockConfig: DyrectedConfig;
  let inMemoryDb: Record<string, any[]>;

  beforeEach(() => {
    inMemoryDb = {
      services: [
        { id: 'srv_1', title: 'Executive Coaching', price: 75000, status: 'published' },
        { id: 'srv_2', title: 'Group Workshop', price: 25000, status: 'published' },
        { id: 'srv_3', title: 'Draft Strategy Session', price: 50000, status: 'draft' },
      ],
      globals_homepage: [{ slug: 'homepage', heroTitle: 'Build websites faster' }],
      [AI_ACTIONS_COLLECTION]: [],
      [AI_AUDIT_COLLECTION]: [],
    };

    mockDb = {
      find: vi.fn(async ({ collection, where, sort, limit = 10, page = 1 }: any) => {
        let items = [...(inMemoryDb[collection] || [])];
        if (where) {
          for (const [k, v] of Object.entries(where)) {
            if (typeof v === 'object' && v !== null) {
              if ((v as any).greater_than !== undefined) {
                items = items.filter((it) => it[k] > (v as any).greater_than);
              }
            } else {
              items = items.filter((it) => it[k] === v);
            }
          }
        }
        return { docs: items.slice(0, limit), total: items.length, totalPages: 1, page, limit };
      }),

      findOne: vi.fn(async ({ collection, id }: any) => {
        return (inMemoryDb[collection] || []).find((it) => it.id === id) || null;
      }),

      create: vi.fn(async ({ collection, data }: any) => {
        const item = { ...data, id: data.id || `doc_${Date.now()}` };
        if (!inMemoryDb[collection]) inMemoryDb[collection] = [];
        inMemoryDb[collection].push(item);
        return item;
      }),

      update: vi.fn(async ({ collection, id, data }: any) => {
        const items = inMemoryDb[collection] || [];
        const idx = items.findIndex((it) => it.id === id);
        if (idx === -1) throw new Error(`Document ${id} not found`);
        items[idx] = { ...items[idx], ...data };
        return items[idx];
      }),

      delete: vi.fn(async ({ collection, id }: any) => {
        const items = inMemoryDb[collection] || [];
        const idx = items.findIndex((it) => it.id === id);
        if (idx !== -1) items.splice(idx, 1);
        return { success: true };
      }),

      aggregate: vi.fn(async ({ collection, aggregates }: any) => {
        const items = inMemoryDb[collection] || [];
        return { totalCount: items.length };
      }),

      getGlobal: vi.fn(async ({ slug }: any) => {
        const items = inMemoryDb[`globals_${slug}`] || [];
        return items[0] || null;
      }),

      updateGlobal: vi.fn(async ({ slug, data }: any) => {
        const key = `globals_${slug}`;
        if (!inMemoryDb[key]) inMemoryDb[key] = [{ slug }];
        inMemoryDb[key][0] = { ...inMemoryDb[key][0], ...data };
        return inMemoryDb[key][0];
      }),
    };

    mockConfig = {
      db: mockDb,
      collections: [
        {
          slug: 'services',
          fields: [
            { name: 'title', type: 'text', required: true },
            { name: 'price', type: 'number', required: true },
            { name: 'status', type: 'select' },
          ],
        },
      ],
      globals: [
        {
          slug: 'homepage',
          fields: [
            { name: 'heroTitle', type: 'text', required: true },
          ],
        },
      ],
    } as any;
  });

  describe('Internal Collections Registration', () => {
    it('recognizes _dyrected_ai_actions and _dyrected_ai_audit as protected AI collections', () => {
      expect(isAICollection(AI_ACTIONS_COLLECTION)).toBe(true);
      expect(isAICollection(AI_AUDIT_COLLECTION)).toBe(true);
      expect(isAICollection('services')).toBe(false);
    });
  });

  describe('Day 4: Structured Query & Aggregation Tools', () => {
    it('executes structured queryCollection with exact filtering', async () => {
      const tools = createDyrectedAITools({
        db: mockDb,
        config: mockConfig,
        projectId: 'test_site',
      });

      const res = await tools.queryCollection.execute({
        collection: 'services',
        where: { price: { greater_than: 30000 } },
      });

      expect(res.docs).toHaveLength(2);
      expect(res.docs[0].title).toBe('Executive Coaching');
    });

    it('executes aggregateCollection for mathematical counting', async () => {
      const tools = createDyrectedAITools({
        db: mockDb,
        config: mockConfig,
        projectId: 'test_site',
      });

      const res = await tools.aggregateCollection.execute({
        collection: 'services',
        aggregates: { totalCount: { count: '*' } },
      });

      expect(res.result.totalCount).toBe(3);
    });
  });

  describe('Day 5: Mutation Proposal Tools (HITL Gates)', () => {
    it('proposes document creation without immediately modifying database', async () => {
      const tools = createDyrectedAITools({
        db: mockDb,
        config: mockConfig,
        projectId: 'test_site',
        user: { id: 'usr_admin', email: 'admin@dyrected.com' } as any,
      });

      const proposal = await tools.proposeCreateDocument.execute({
        collection: 'services',
        data: { title: 'New Onboarding Bootcamp', price: 95000 },
        summary: 'Create a premium onboarding coaching tier',
      });

      expect(proposal.requiresApproval).toBe(true);
      expect(proposal.actionId).toMatch(/^act_/);
      expect(proposal.status).toBe('pending');
      expect(inMemoryDb.services).toHaveLength(3); // untouched until approved
      expect(inMemoryDb[AI_ACTIONS_COLLECTION]).toHaveLength(1);
    });

    it('rejects proposal with schema validation error if required fields are missing', async () => {
      const tools = createDyrectedAITools({
        db: mockDb,
        config: mockConfig,
        projectId: 'test_site',
      });

      const proposal = await tools.proposeCreateDocument.execute({
        collection: 'services',
        data: { price: 50000 }, // missing required 'title'
        summary: 'Invalid creation',
      });

      expect(proposal.error).toContain('Required field "title" is missing');
    });

    it('proposes updating document and captures beforeSnapshot', async () => {
      const tools = createDyrectedAITools({
        db: mockDb,
        config: mockConfig,
        projectId: 'test_site',
      });

      const proposal = await tools.proposeUpdateDocument.execute({
        collection: 'services',
        id: 'srv_1',
        data: { price: 85000 },
        summary: 'Raise Executive Coaching price to 85,000',
      });

      expect(proposal.requiresApproval).toBe(true);
      expect(proposal.beforeSnapshot.price).toBe(75000);
      expect(proposal.proposedData.price).toBe(85000);
      expect(inMemoryDb.services.find((s) => s.id === 'srv_1')?.price).toBe(75000); // untouched
    });

    it('proposes updating global configuration', async () => {
      const tools = createDyrectedAITools({
        db: mockDb,
        config: mockConfig,
        projectId: 'test_site',
      });

      const proposal = await tools.proposeUpdateGlobal.execute({
        global: 'homepage',
        data: { heroTitle: 'Build better websites with Dyrected' },
        summary: 'Update homepage headline',
      });

      expect(proposal.requiresApproval).toBe(true);
      expect(proposal.beforeSnapshot.heroTitle).toBe('Build websites faster');
      expect(proposal.proposedData.heroTitle).toBe('Build better websites with Dyrected');
    });
  });

  describe('Day 5: Action Execution & Immutable Audit Trail', () => {
    it('executes approved action and logs to audit collection', async () => {
      const controller = new AIController(mockConfig);

      // Create a pending action
      const actionId = 'act_test_123';
      inMemoryDb[AI_ACTIONS_COLLECTION].push({
        id: actionId,
        projectId: 'test_site',
        type: 'updateDocument',
        targetCollection: 'services',
        documentId: 'srv_1',
        summary: 'Increase price',
        beforeSnapshot: { id: 'srv_1', title: 'Executive Coaching', price: 75000 },
        proposedData: { price: 85000 },
        status: 'pending',
        expiresAt: new Date(Date.now() + 100000).toISOString(),
        createdAt: new Date().toISOString(),
      });

      const mockContext: any = {
        get: vi.fn((key: string) => {
          if (key === 'config') return mockConfig;
          if (key === 'user') return { id: 'usr_admin', role: 'admin' };
          return null;
        }),
        req: {
          param: vi.fn(() => actionId),
          header: vi.fn(() => 'test_site'),
        },
        json: vi.fn((data: any) => data),
      };

      const result = await controller.executeAction(mockContext);

      expect(result.success).toBe(true);
      expect(result.action.status).toBe('executed');

      // Verify CMS database was actually updated
      const updatedSrv = inMemoryDb.services.find((s) => s.id === 'srv_1');
      expect(updatedSrv?.price).toBe(85000);

      // Verify immutable audit log entry
      expect(inMemoryDb[AI_AUDIT_COLLECTION]).toHaveLength(1);
      const auditEntry = inMemoryDb[AI_AUDIT_COLLECTION][0];
      expect(auditEntry.actionId).toBe(actionId);
      expect(auditEntry.executedBy).toBe('usr_admin');
      expect(auditEntry.snapshotBefore.price).toBe(75000);
      expect(auditEntry.snapshotAfter.price).toBe(85000);
    });

    it('rejects an action and marks it as rejected', async () => {
      const controller = new AIController(mockConfig);

      const actionId = 'act_test_456';
      inMemoryDb[AI_ACTIONS_COLLECTION].push({
        id: actionId,
        projectId: 'test_site',
        type: 'deleteDocument',
        targetCollection: 'services',
        documentId: 'srv_2',
        summary: 'Delete workshop',
        status: 'pending',
        expiresAt: new Date(Date.now() + 100000).toISOString(),
        createdAt: new Date().toISOString(),
      });

      const mockContext: any = {
        get: vi.fn((key: string) => {
          if (key === 'config') return mockConfig;
          return null;
        }),
        req: {
          param: vi.fn(() => actionId),
        },
        json: vi.fn((data: any) => data),
      };

      const result = await controller.rejectAction(mockContext);
      expect(result.success).toBe(true);
      expect(result.action.status).toBe('rejected');
      expect(inMemoryDb.services).toHaveLength(3); // service not deleted
    });
  });
});
