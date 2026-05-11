import type { Context } from 'hono';
import type { CollectionConfig } from '../types/index.js';
import type { DyrectedContext } from '../app.js';
import { PopulationService } from '../services/population.service.js';
import { DefaultsService } from '../services/defaults.service.js';
import { AuditService } from '../services/audit.service.js';

export class CollectionController {
  private collection: CollectionConfig;

  constructor(collection: CollectionConfig) {
    this.collection = collection;
  }

  async find(c: Context<DyrectedContext>) {
    const config = c.get('config');
    const db = config.db;
    if (!db) return c.json({ message: 'Database not configured' }, 500);

    const limit = Number(c.req.query('limit')) || 10;
    const page = Number(c.req.query('page')) || 1;
    const depth = c.req.query('depth') !== undefined ? Number(c.req.query('depth')) : 1;
    const sort = c.req.query('sort') || undefined;

    let where: any = undefined;
    const whereRaw = c.req.query('where');
    if (whereRaw) {
      try {
        where = JSON.parse(decodeURIComponent(whereRaw));
      } catch {
        // Not valid JSON — fall through without a where clause
      }
    }

    let result = await db!.find({
      collection: this.collection.slug,
      limit,
      page,
      sort,
      where,
    });

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
    const user = c.get('user');
    const now = new Date().toISOString();

    const data = {
      ...body,
      createdAt: now,
      updatedAt: now,
      createdBy: user?.sub ?? null,
      updatedBy: user?.sub ?? null,
    };

    const doc = await db!.create({ collection: this.collection.slug, data });

    if (this.collection.audit && db) {
      AuditService.log(db, {
        operation: 'create',
        collection: this.collection.slug,
        documentId: doc.id,
        user: user ? { id: user.sub, collection: user.collection, email: user.email } : undefined,
        before: null,
        after: doc,
      });
    }

    return c.json(doc, 201);
  }

  async upload(c: Context<DyrectedContext>) {
    const config = c.get('config');
    const storage = config.storage;
    if (!storage) return c.json({ message: 'Storage not configured' }, 500);

    const formData = await c.req.formData();
    const file = formData.get('file') as any;
    if (!file) return c.json({ message: 'No file uploaded' }, 400);

    const buffer = new Uint8Array(await file.arrayBuffer());
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

    const user = c.get('user');
    const now = new Date().toISOString();

    const doc = await config.db!.create({
      collection: this.collection.slug,
      data: {
        ...otherData,
        ...fileData,
        createdAt: now,
        updatedAt: now,
        createdBy: user?.sub ?? null,
        updatedBy: user?.sub ?? null,
      },
    });

    return c.json(doc, 201);
  }

  async update(c: Context<DyrectedContext>) {
    const config = c.get('config');
    const db = config.db;
    if (!db) return c.json({ message: 'Database not configured' }, 500);

    const id = c.req.param('id');
    if (!id) return c.json({ message: 'Missing ID' }, 400);

    const body = await c.req.json();
    const user = c.get('user');

    const data = {
      ...body,
      updatedAt: new Date().toISOString(),
      updatedBy: user?.sub ?? null,
    };

    let before: any = null;
    if (this.collection.audit) {
      before = await db!.findOne({ collection: this.collection.slug, id });
    }

    const doc = await db!.update({ collection: this.collection.slug, id, data });

    if (this.collection.audit && db) {
      AuditService.log(db, {
        operation: 'update',
        collection: this.collection.slug,
        documentId: id,
        user: user ? { id: user.sub, collection: user.collection, email: user.email } : undefined,
        before,
        after: doc,
      });
    }

    return c.json(doc);
  }

  async delete(c: Context<DyrectedContext>) {
    const config = c.get('config');
    const db = config.db;
    if (!db) return c.json({ message: 'Database not configured' }, 500);

    const id = c.req.param('id');
    if (!id) return c.json({ message: 'Missing ID' }, 400);

    const user = c.get('user');

    let before: any = null;
    if (this.collection.audit) {
      before = await db!.findOne({ collection: this.collection.slug, id });
    }

    await db!.delete({ collection: this.collection.slug, id });

    if (this.collection.audit && db) {
      AuditService.log(db, {
        operation: 'delete',
        collection: this.collection.slug,
        documentId: id,
        user: user ? { id: user.sub, collection: user.collection, email: user.email } : undefined,
        before,
        after: null,
      });
    }

    return c.json({ message: 'Deleted' });
  }

  async seed(c: Context<DyrectedContext>) {
    const config = c.get('config');
    const db = config.db;
    if (!db) return c.json({ message: 'Database not configured' }, 500);

    const body = await c.req.json();
    const initialData = body.data;

    if (!initialData || !Array.isArray(initialData)) {
      return c.json({ message: 'Invalid initial data' }, 400);
    }

    const result = await db.find({ collection: this.collection.slug, limit: 1 });
    if (result.total > 0) {
      return c.json({ message: 'Collection is not empty, skipping seed' });
    }

    console.log(`[dyrected/core] Auto-seeding collection: ${this.collection.slug}`);
    const createdDocs = [];
    for (const data of initialData) {
      const doc = await db.create({ collection: this.collection.slug, data });
      createdDocs.push(doc);
    }

    return c.json({ message: 'Seed successful', count: createdDocs.length }, 201);
  }
}
