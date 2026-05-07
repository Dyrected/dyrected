import { Context } from 'hono';
import { DyrectedContext } from '../app.js';
import { GlobalConfig } from '../types/index.js';
import { PopulationService } from '../services/population.service.js';

export class GlobalController {
  constructor(private global: GlobalConfig) {}

  async get(c: Context<DyrectedContext>) {
    const config = c.get('config');
    const db = config.db;
    const depth = Number(c.req.query('depth')) || 0;
    const data = await db.getGlobal({ slug: this.global.slug });

    if (depth > 0 && data) {
      const populationService = new PopulationService(db, config.collections);
      const populatedData = await populationService.populate({
        data,
        fields: this.global.fields,
        currentDepth: 0,
        maxDepth: depth,
      });
      return c.json(populatedData);
    }

    return c.json(data || {});
  }

  async update(c: Context<DyrectedContext>) {
    const db = c.get('config').db;
    const body = await c.req.json();
    const data = await db.updateGlobal({ slug: this.global.slug, data: body });
    return c.json(data);
  }
}
