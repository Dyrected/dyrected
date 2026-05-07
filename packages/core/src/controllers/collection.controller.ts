import { Context } from 'hono';
import { CollectionConfig } from '../types/index.js';
import { DyrectedContext } from '../app.js';

export class CollectionController {
  constructor(private collection: CollectionConfig) {}

  async find(c: Context<DyrectedContext>) {
    const db = c.get('config').db;
    const limit = Number(c.req.query('limit')) || 10;
    const page = Number(c.req.query('page')) || 1;
    const result = await db.find({
      collection: this.collection.slug,
      limit,
      page,
    });
    return c.json(result);
  }

  async findOne(c: Context<DyrectedContext>) {
    const db = c.get('config').db;
    const id = c.req.param('id');
    if (!id) return c.json({ message: 'Missing ID' }, 400);
    const doc = await db.findOne({ collection: this.collection.slug, id });
    if (!doc) return c.json({ message: 'Not Found' }, 404);
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
