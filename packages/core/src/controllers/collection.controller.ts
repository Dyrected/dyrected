import { Context } from 'hono';
import { CollectionConfig } from '../types/index.js';
import { DyrectedContext } from '../app.js';
import { PopulationService } from '../services/population.service.js';
import { DefaultsService } from '../services/defaults.service.js';

export class CollectionController {
  constructor(private collection: CollectionConfig) {}

  async find(c: Context<DyrectedContext>) {
    const config = c.get('config');
    const db = config.db;
    if (!db) return c.json({ message: 'Database not configured' }, 500);

    const limit = Number(c.req.query('limit')) || 10;
    const page = Number(c.req.query('page')) || 1;
    const depth = c.req.query('depth') !== undefined ? Number(c.req.query('depth')) : 1;

    let result = await db!.find({
      collection: this.collection.slug,
      limit,
      page,
    });
    
    // Apply default values to each document
    result.docs = result.docs.map(doc => DefaultsService.apply(this.collection.fields, doc));

    if (depth > 0) {
      const populationService = new PopulationService(db!, config.collections);
      result = await populationService.populateResult(result, this.collection.fields, depth);
    }

    return c.json(result);
  }

  async findOne(c: Context<DyrectedContext>) {
    const config = c.get('config');
    const db = config.db;
    if (!db) return c.json({ message: 'Database not configured' }, 500);

    const id = c.req.param('id');
    const depth = c.req.query('depth') !== undefined ? Number(c.req.query('depth')) : 1;

    if (!id) return c.json({ message: 'Missing ID' }, 400);
    const doc = await db!.findOne({ collection: this.collection.slug, id });
    if (!doc) return c.json({ message: 'Not Found' }, 404);

    const docWithDefaults = DefaultsService.apply(this.collection.fields, doc);

    if (depth > 0 && docWithDefaults) {
      const populationService = new PopulationService(db!, config.collections);
      const populatedDoc = await populationService.populate({
        data: docWithDefaults,
        fields: this.collection.fields,
        currentDepth: 0,
        maxDepth: depth,
      });
      return c.json(populatedDoc);
    }

    return c.json(docWithDefaults);
  }

  async create(c: Context<DyrectedContext>) {
    const config = c.get('config');
    const db = config.db;
    if (!db) return c.json({ message: 'Database not configured' }, 500);

    const contentType = c.req.header('Content-Type') || '';

    if (contentType.toLowerCase().includes('multipart/form-data')) {
      return this.upload(c);
    }

    const body = await c.req.json();
    const doc = await db!.create({ collection: this.collection.slug, data: body });
    return c.json(doc, 201);
  }

  async upload(c: Context<DyrectedContext>) {
    const config = c.get('config');
    const storage = config.storage;
    if (!storage) return c.json({ message: 'Storage not configured' }, 500);

    const formData = await c.req.formData();
    const file = formData.get('file') as any; // Hono File type
    if (!file) return c.json({ message: 'No file uploaded' }, 400);

    const buffer = Buffer.from(await file.arrayBuffer());
    const siteId = c.get('siteId');
    const workspaceId = c.get('workspaceId');
    const prefix = workspaceId ? `${workspaceId}/${siteId}` : siteId;

    const fileData = await storage.upload({
      filename: file.name,
      buffer,
      mimeType: file.type,
      prefix,
    });

    const otherData: any = {};
    formData.forEach((value, key) => {
      if (key !== 'file' && typeof value === 'string') {
        otherData[key] = value;
      }
    });

    const doc = await config.db!.create({
      collection: this.collection.slug,
      data: {
        ...otherData,
        ...fileData,
      },
    });

    return c.json(doc, 201);
  }

  async update(c: Context<DyrectedContext>) {
    const db = c.get('config').db;
    if (!db) return c.json({ message: 'Database not configured' }, 500);

    const id = c.req.param('id');
    if (!id) return c.json({ message: 'Missing ID' }, 400);
    const body = await c.req.json();
    const doc = await db!.update({ collection: this.collection.slug, id, data: body });
    return c.json(doc);
  }

  async delete(c: Context<DyrectedContext>) {
    const db = c.get('config').db;
    if (!db) return c.json({ message: 'Database not configured' }, 500);

    const id = c.req.param('id');
    if (!id) return c.json({ message: 'Missing ID' }, 400);
    await db!.delete({ collection: this.collection.slug, id });
    return c.json({ message: 'Deleted' });
  }
}
