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
    if (!user) {
      throw new HTTPException(401, { message: 'Authentication required' });
    }

    const projectId = c.req.header('X-Site-Id') || c.get('siteId') || 'default';

    return new AIAgent({
      db: c.get('config').db,
      config: this.config,
      projectId,
      userId: user.sub,
      userName: user.name,
      userRole: user.roles?.[0],
    });
  }

  async createThread(c: Context<DyrectedContext>) {
    const agent = this.getAgent(c);
    const body = await c.req.json().catch(() => ({}));
    const thread = await agent.createThread(body.title);
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

    const thread = await agent.getThread(threadId);
    if (!thread) {
      throw new HTTPException(404, { message: 'Thread not found' });
    }

    const body = await c.req.json().catch(() => ({}));
    const content = body.content?.trim();

    if (!content) {
      throw new HTTPException(400, { message: 'Message content is required' });
    }

    await agent.persistUserMessage(threadId, content);

    if (!thread.title || thread.title === 'New Conversation') {
      const title = await agent.generateTitle(content);
      await agent.updateThreadTitle(threadId, title);
    }

    const stream = agent.streamReply(threadId, content);

    return new Response(
      new ReadableStream({
        async start(controller) {
          const encoder = new TextEncoder();
          try {
            for await (const chunk of stream) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: chunk })}\n\n`));
            }
            controller.enqueue(encoder.encode('data: [DONE]\n\n'));
            controller.close();
          } catch (error) {
            controller.error(error);
          }
        },
      }),
      {
        headers: {
          'Content-Type': 'text/event-stream; charset=utf-8',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
        },
      }
    );
  }
}