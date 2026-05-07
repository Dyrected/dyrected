import { Context } from 'hono';
import { DyrectedContext } from '../app.js';

export class MediaController {
  private collection: string;

  constructor(collection: string = 'media') {
    this.collection = collection;
  }

  async upload(c: Context<DyrectedContext>) {
    const config = c.get('config');
    const storage = config.storage;

    if (!storage) {
      return c.json({ message: 'Storage not configured' }, 500);
    }

    const body = await c.req.parseBody();
    const file = body['file'] as File;

    if (!file) {
      return c.json({ message: 'No file uploaded' }, 400);
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    
    const fileData = await storage.upload({
      filename: file.name,
      buffer,
      mimeType: file.type
    });

    // Save to database
    const db = config.db;
    const doc = await db.create({
      collection: this.collection,
      data: fileData
    });

    return c.json(doc, 201);
  }

  async find(c: Context<DyrectedContext>) {
    const db = c.get('config').db;
    const limit = Number(c.req.query('limit')) || 10;
    const page = Number(c.req.query('page')) || 1;
    const result = await db.find({
      collection: this.collection,
      limit,
      page,
    });
    return c.json(result);
  }

  async delete(c: Context<DyrectedContext>) {
    const config = c.get('config');
    const storage = config.storage;
    const db = config.db;
    const id = c.req.param('id');

    if (!id) return c.json({ message: 'Missing ID' }, 400);

    const doc = await db.findOne({ collection: this.collection, id });
    if (!doc) return c.json({ message: 'Not Found' }, 404);

    if (storage) {
      await storage.delete({ filename: doc.filename });
    }

    await db.delete({ collection: this.collection, id });
    return c.json({ message: 'Deleted' });
  }
}
