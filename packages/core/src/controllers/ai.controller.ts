import type { Context } from 'hono';
import { HTTPException } from 'hono/http-exception';
import type { DyrectedContext } from '../app.js';
import type { DyrectedConfig } from '../types/index.js';
import { AIAgent } from '../services/ai.service.js';

export class AIController {
  private config: DyrectedConfig;

  constructor(config: DyrectedConfig) {
    this.config = config;
  }

  private getAgent(c: Context<DyrectedContext>): AIAgent {
    const user = c.get('user');
    const projectId = c.req.header('X-Site-Id') || c.get('siteId') || 'default';
    const db = c.get('config')?.db || this.config.db;

    if (!db) {
      throw new HTTPException(500, { message: 'Database not initialized' });
    }

    return new AIAgent({
      db,
      config: this.config,
      projectId,
      userId: user?.sub || 'anonymous',
      userName: user?.name || 'Editor',
      userRole: user?.roles?.[0] || 'editor',
      user: user as any,
    });
  }

  async chat(c: Context<DyrectedContext>) {
    const agent = this.getAgent(c);
    const body = await c.req.json().catch(() => ({}));

    let threadId = typeof body.threadId === 'string' ? body.threadId : undefined;
    let content = body.content || body.prompt;

    if (!content && Array.isArray(body.messages) && body.messages.length > 0) {
      const last = body.messages[body.messages.length - 1];
      content = last.content || (last.parts?.[0]?.text ?? '');
    }

    if (!content || typeof content !== 'string' || !content.trim()) {
      throw new HTTPException(400, { message: 'Message content is required' });
    }

    content = content.trim();

    let thread = threadId ? await agent.getThread(threadId) : null;
    if (!thread) {
      thread = await agent.createThread();
      threadId = thread.id;
    }

    const targetThreadId = threadId || thread.id;
    await agent.persistUserMessage(targetThreadId, content);

    if (!thread.title || thread.title === 'New Conversation') {
      agent.generateTitle(content).then((title) => {
        agent.updateThreadTitle(targetThreadId, title).catch(console.error);
      }).catch(console.error);
    }

    return agent.createStreamResponse(targetThreadId, content);
  }

  async createThread(c: Context<DyrectedContext>) {
    const agent = this.getAgent(c);
    const body = await c.req.json().catch(() => ({}));
    const thread = await agent.createThread(typeof body.title === 'string' ? body.title : undefined);
    return c.json({ thread }, 201);
  }

  async listThreads(c: Context<DyrectedContext>) {
    const agent = this.getAgent(c);
    const limit = parseInt(c.req.query('limit') || '20', 10);
    const threads = await agent.listThreads(limit);
    return c.json({ threads });
  }

  async getThread(c: Context<DyrectedContext>) {
    const agent = this.getAgent(c);
    const threadId = c.req.param('threadId');
    if (!threadId) {
      throw new HTTPException(400, { message: 'Thread ID required' });
    }

    const thread = await agent.getThread(threadId);
    if (!thread) {
      throw new HTTPException(404, { message: 'Thread not found' });
    }

    const messages = await agent.getMessages(threadId);
    return c.json({ thread, messages });
  }

  async postMessage(c: Context<DyrectedContext>) {
    const agent = this.getAgent(c);
    const threadId = c.req.param('threadId');
    if (!threadId) {
      throw new HTTPException(400, { message: 'Thread ID required' });
    }

    const thread = await agent.getThread(threadId);
    if (!thread) {
      throw new HTTPException(404, { message: 'Thread not found' });
    }

    const body = await c.req.json().catch(() => ({}));
    let content = body.content || body.prompt;

    if (!content && Array.isArray(body.messages) && body.messages.length > 0) {
      const last = body.messages[body.messages.length - 1];
      content = last.content || (last.parts?.[0]?.text ?? '');
    }

    if (!content || typeof content !== 'string' || !content.trim()) {
      throw new HTTPException(400, { message: 'Message content is required' });
    }

    content = content.trim();

    await agent.persistUserMessage(threadId, content);

    if (!thread.title || thread.title === 'New Conversation') {
      agent.generateTitle(content).then((title) => {
        agent.updateThreadTitle(threadId, title).catch(console.error);
      }).catch(console.error);
    }

    return agent.createStreamResponse(threadId, content);
  }

  async deleteThread(c: Context<DyrectedContext>) {
    const agent = this.getAgent(c);
    const threadId = c.req.param('threadId');
    if (!threadId) {
      throw new HTTPException(400, { message: 'Thread ID required' });
    }
    await agent.deleteThread(threadId);
    return c.json({ success: true });
  }

  async clearThreads(c: Context<DyrectedContext>) {
    const agent = this.getAgent(c);
    const count = await agent.clearAllThreads();
    return c.json({ success: true, count });
  }
}