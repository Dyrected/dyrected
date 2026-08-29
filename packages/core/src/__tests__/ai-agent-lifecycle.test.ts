import { describe, it, expect, vi } from 'vitest';
import { AIAgent } from '../services/ai.service.js';
import type { DatabaseAdapter, DyrectedConfig } from '../types/index.js';

describe('AIAgent Thread Lifecycle & Message Persistence', () => {
  const mockConfig: DyrectedConfig = {
    collections: [],
    globals: [],
    ai: {
      provider: 'google',
      apiKey: 'test-key',
    },
  };

  const createMockDb = () => {
    const store: Record<string, any[]> = {
      _dyrected_ai_threads: [],
      _dyrected_ai_messages: [],
    };

    return {
      find: vi.fn(async ({ collection, where }) => {
        let items = store[collection] || [];
        if (where?.threadId) {
          items = items.filter((i) => i.threadId === where.threadId);
        }
        if (where?.projectId) {
          items = items.filter((i) => i.projectId === where.projectId);
        }
        return { docs: items, total: items.length, totalPages: 1 };
      }),
      findOne: vi.fn(async ({ collection, id }) => {
        const items = store[collection] || [];
        return items.find((i) => i.id === id) || null;
      }),
      create: vi.fn(async ({ collection, data }) => {
        const item = { ...data };
        if (!store[collection]) store[collection] = [];
        store[collection].push(item);
        return item;
      }),
      update: vi.fn(async ({ collection, id, data }) => {
        const items = store[collection] || [];
        const index = items.findIndex((i) => i.id === id);
        if (index >= 0) {
          items[index] = { ...items[index], ...data };
          return items[index];
        }
        return null;
      }),
      delete: vi.fn(async ({ collection, id }) => {
        const items = store[collection] || [];
        const index = items.findIndex((i) => i.id === id);
        if (index >= 0) {
          items.splice(index, 1);
          return true;
        }
        return false;
      }),
      _store: store,
    } as unknown as DatabaseAdapter & { _store: typeof store };
  };

  it('createThread generates custom ID when provided', async () => {
    const db = createMockDb();
    const agent = new AIAgent({
      db,
      config: mockConfig,
      projectId: 'proj-1',
      userId: 'user-1',
    });

    const thread = await agent.createThread('Custom Thread', 'custom-session-123');
    expect(thread.id).toBe('custom-session-123');
    expect(thread.title).toBe('Custom Thread');

    const retrieved = await agent.getThread('custom-session-123');
    expect(retrieved?.id).toBe('custom-session-123');
  });

  it('getOrCreateThread retrieves existing thread if present, or creates with given ID', async () => {
    const db = createMockDb();
    const agent = new AIAgent({
      db,
      config: mockConfig,
      projectId: 'proj-1',
      userId: 'user-1',
    });

    // 1. First call creates it with given ID
    const thread1 = await agent.getOrCreateThread('session-abc', 'Session ABC');
    expect(thread1.id).toBe('session-abc');
    expect(thread1.title).toBe('Session ABC');

    // 2. Second call returns the existing one without duplicating in DB
    const thread2 = await agent.getOrCreateThread('session-abc', 'Session ABC 2');
    expect(thread2.id).toBe('session-abc');
    expect(thread2.title).toBe('Session ABC');
    expect(db._store._dyrected_ai_threads.length).toBe(1);
  });

  it('persistUserMessage records message and updates thread timestamp', async () => {
    const db = createMockDb();
    const agent = new AIAgent({
      db,
      config: mockConfig,
      projectId: 'proj-1',
      userId: 'user-1',
    });

    const thread = await agent.createThread('Test Thread', 'thread-1');
    const msg = await agent.persistUserMessage('thread-1', 'Hello world');

    expect(msg.role).toBe('user');
    expect(msg.content).toBe('Hello world');
    expect(msg.threadId).toBe('thread-1');

    const messages = await agent.getMessages('thread-1');
    expect(messages.length).toBe(1);
    expect(messages[0].content).toBe('Hello world');
  });
});
