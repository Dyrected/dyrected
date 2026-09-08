import { describe, it, expect, beforeEach } from 'vitest';
import { estimateTokenCost, DEFAULT_MODEL_PRICING } from '../utils/ai-cost.js';
import { AIController } from '../controllers/ai.controller.js';
import { AI_ACTIONS_COLLECTION, AI_AUDIT_COLLECTION } from '../types/ai.js';
import type { DyrectedConfig } from '../types/index.js';

class MockAuditDB {
  records: Record<string, any[]> = {
    [AI_ACTIONS_COLLECTION]: [],
    [AI_AUDIT_COLLECTION]: [],
  };

  async findOne({ collection, id }: { collection: string; id: string }) {
    return this.records[collection]?.find((r) => r.id === id) || null;
  }

  async find({ collection }: { collection: string }) {
    return { docs: this.records[collection] || [] };
  }

  async create({ collection, data }: { collection: string; data: any }) {
    this.records[collection] = this.records[collection] || [];
    this.records[collection].push(data);
    return data;
  }

  async update({ collection, id, data }: { collection: string; id: string; data: any }) {
    const list = this.records[collection] || [];
    const index = list.findIndex((r) => r.id === id);
    if (index >= 0) {
      list[index] = { ...list[index], ...data };
      return list[index];
    }
    return null;
  }

  async delete({ collection, id }: { collection: string; id: string }) {
    const list = this.records[collection] || [];
    this.records[collection] = list.filter((r) => r.id !== id);
    return { success: true };
  }
}

describe('AI Audit & Token Economics Telemetry', () => {
  describe('estimateTokenCost', () => {
    it('calculates cost correctly for gemini-2.0-flash', () => {
      // 1M prompt = $0.10, 1M completion = $0.40
      const cost = estimateTokenCost({
        model: 'gemini-2.0-flash',
        promptTokens: 100_000, // $0.01
        completionTokens: 50_000, // $0.02
      });
      expect(cost).toBe(0.03);
    });

    it('calculates cost correctly for claude-3-5-sonnet-20241022', () => {
      // 1M prompt = $3.00, 1M completion = $15.00
      const cost = estimateTokenCost({
        model: 'claude-3-5-sonnet-20241022',
        promptTokens: 10_000, // $0.03
        completionTokens: 2_000, // $0.03
      });
      expect(cost).toBe(0.06);
    });

    it('falls back to default pricing for unrecognized models', () => {
      const cost = estimateTokenCost({
        model: 'my-custom-unlisted-model',
        promptTokens: 1_000_000,
        completionTokens: 1_000_000,
      });
      const expected = Number(
        (DEFAULT_MODEL_PRICING.default.promptPerMillion + DEFAULT_MODEL_PRICING.default.completionPerMillion).toFixed(6)
      );
      expect(cost).toBe(expected);
    });

    it('honors custom pricing override', () => {
      const cost = estimateTokenCost({
        model: 'any',
        promptTokens: 100_000,
        completionTokens: 100_000,
        customPricing: { promptPerMillion: 10.0, completionPerMillion: 20.0 },
      });
      // 0.1 * 10 = 1.0, 0.1 * 20 = 2.0 -> total 3.0
      expect(cost).toBe(3.0);
    });
  });

  describe('Audit Trail for Action Rejection', () => {
    let db: MockAuditDB;
    let controller: AIController;
    const config: DyrectedConfig = {
      ai: { enabled: true },
    } as any;

    beforeEach(() => {
      db = new MockAuditDB();
      config.db = db as any;
      controller = new AIController(config);
    });

    it('creates an immutable rejection audit record when rejectAction is called', async () => {
      const actionId = 'act_test_123';
      await db.create({
        collection: AI_ACTIONS_COLLECTION,
        data: {
          id: actionId,
          projectId: 'tenant-a',
          type: 'createDocument',
          targetCollection: 'posts',
          proposedData: { title: 'Proposed Title' },
          status: 'pending',
          expiresAt: new Date(Date.now() + 60000),
          createdAt: new Date(),
        },
      });

      const mockCtx: any = {
        req: {
          param: (p: string) => (p === 'actionId' ? actionId : undefined),
          header: (h: string) => (h.toLowerCase() === 'x-site-id' ? 'tenant-a' : undefined),
        },
        get: (key: string) => {
          if (key === 'config') return config;
          if (key === 'user') return { id: 'user_456', role: 'admin' };
          return undefined;
        },
        json: (data: any) => data,
      };

      const res: any = await controller.rejectAction(mockCtx);
      expect(res.success).toBe(true);
      expect(res.action.status).toBe('rejected');

      // Verify audit collection has the rejection record
      const auditRecords = db.records[AI_AUDIT_COLLECTION];
      expect(auditRecords.length).toBe(1);
      const audit = auditRecords[0];
      expect(audit.actionType).toBe('action_rejected');
      expect(audit.actionId).toBe(actionId);
      expect(audit.projectId).toBe('tenant-a');
      expect(audit.executedBy).toBe('user_456');
      expect(audit.target).toBe('posts');
    });
  });
});
