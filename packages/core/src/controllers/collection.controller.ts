import { Context } from 'hono';
import { CollectionConfig } from '../types/index.js';
import { DyrectedContext } from '../app.js';
import { PopulationService } from '../services/population.service.js';

export class CollectionController {
  constructor(private collection: CollectionConfig) {}

  async find(c: Context<DyrectedContext>) {
    const config = c.get('config');
    const db = config.db;
    const limit = Number(c.req.query('limit')) || 10;
    const page = Number(c.req.query('page')) || 1;
    const depth = Number(c.req.query('depth')) || 0;

    let result = await db.find({
      collection: this.collection.slug,
      limit,
      page,
    });

    if (depth > 0) {
      const populationService = new PopulationService(db, config.collections);
      result = await populationService.populateResult(result, this.collection.fields, depth);
    }

    return c.json(result);
  }

  async findOne(c: Context<DyrectedContext>) {
    const config = c.get('config');
    const db = config.db;
    const id = c.req.param('id');
    const depth = Number(c.req.query('depth')) || 0;

    if (!id) return c.json({ message: 'Missing ID' }, 400);
    const doc = await db.findOne({ collection: this.collection.slug, id });
    if (!doc) return c.json({ message: 'Not Found' }, 404);

    if (depth > 0 && doc) {
      const populationService = new PopulationService(db, config.collections);
      const populatedDoc = await populationService.populate({
        data: doc,
        fields: this.collection.fields,
        currentDepth: 0,
        maxDepth: depth,
      });
      return c.json(populatedDoc);
    }

    return c.json(doc);
  }

  async create(c: Context<DyrectedContext>) {
    const db = c.get('config').db;
    const body = await c.req.json();
    const doc = await db.create({ collection: this.collection.slug, data: body });
    return c.json(doc, 201);
  }

  async update(c: Context<DyrectedContext>) {
    const db = c.get('config').db;
    const id = c.req.param('id');
    if (!id) return c.json({ message: 'Missing ID' }, 400);
    const body = await c.req.json();
    const doc = await db.update({ collection: this.collection.slug, id, data: body });
    return c.json(doc);
  }

  async delete(c: Context<DyrectedContext>) {
    const db = c.get('config').db;
    const id = c.req.param('id');
    if (!id) return c.json({ message: 'Missing ID' }, 400);
    await db.delete({ collection: this.collection.slug, id });
    return c.json({ message: 'Deleted' });
  }
}
