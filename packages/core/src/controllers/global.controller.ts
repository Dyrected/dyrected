import { Context } from 'hono';
import { DyrectedContext } from '../app.js';
import { GlobalConfig } from '../types/index.js';

export class GlobalController {
  constructor(private global: GlobalConfig) {}

  async get(c: Context<DyrectedContext>) {
    const db = c.get('config').db;
    const data = await db.getGlobal({ slug: this.global.slug });
    return c.json(data || {});
  }

  async update(c: Context<DyrectedContext>) {
    const db = c.get('config').db;
    const body = await c.req.json();
    const data = await db.updateGlobal({ slug: this.global.slug, data: body });
    return c.json(data);
  }
}
